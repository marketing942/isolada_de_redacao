(function () {
  "use strict";

  var CONFIG = {
    checkout: "https://checkout.cppem.com.br/pay/isolada-de-redacao-com-shayenne-cppem-concursos",

    vagasTotal: 25,

    /* Vagas que ainda restam. null = mostra só "25 cadeiras, turma única".
       Ao colocar um número (ex.: 9), as cadeiras ocupadas aparecem apagadas e
       os textos passam a dizer "Restam 9 vagas". Use o número REAL de
       inscritos: escassez inventada queima a confiança da marca. */
    vagasRestantes: null,

    /* Primeiro encontro: sábado, 03/10, às 15h30 (Brasília). */
    inicio: "2026-10-03T15:30:00-03:00"
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- ano ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* =========================================================
     CHECKOUT — repassa UTMs e ids de clique para o link
     ========================================================= */
  var PASSA = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck", "fbclid", "gclid"];
  var params = new URLSearchParams(window.location.search);
  var destino = new URL(CONFIG.checkout);
  PASSA.forEach(function (k) {
    var v = params.get(k);
    if (v) destino.searchParams.set(k, v);
  });
  document.querySelectorAll(".js-checkout").forEach(function (a) {
    a.href = destino.toString();
    a.addEventListener("click", function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "cta_checkout", cta_local: a.getAttribute("data-local") || "" });
    });
  });

  /* =========================================================
     VAGAS
     ========================================================= */
  var restantes = CONFIG.vagasRestantes;
  var temNumero = typeof restantes === "number" && restantes >= 0;
  var ocupadas = temNumero ? CONFIG.vagasTotal - Math.min(restantes, CONFIG.vagasTotal) : 0;

  document.querySelectorAll("[data-seats]").forEach(function (grid) {
    var html = "";
    for (var i = 0; i < CONFIG.vagasTotal; i++) {
      html += '<span class="seat' + (i < ocupadas ? " is-taken" : "") + '" style="--i:' + i + '"></span>';
    }
    grid.innerHTML = html;
  });
  if (temNumero) {
    var txt = restantes === 0
      ? "<b>Turma esgotada</b>"
      : restantes === 1
        ? "Resta <b>1 vaga</b> de 25"
        : "Restam <b>" + restantes + " vagas</b> de 25";
    document.querySelectorAll("[data-vagas-texto]").forEach(function (el) { el.innerHTML = txt; });
    document.querySelectorAll("[data-vagas-curto]").forEach(function (el) {
      el.textContent = restantes === 0 ? "Turma esgotada" : "Restam " + restantes + " de 25 vagas";
    });
  }

  /* =========================================================
     CONTAGEM REGRESSIVA
     ========================================================= */
  var cd = document.getElementById("countdown");
  if (cd) {
    var alvo = new Date(CONFIG.inicio).getTime();
    var cel = {};
    ["d", "h", "m", "s"].forEach(function (k) { cel[k] = cd.querySelector('[data-cd="' + k + '"]'); });
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    var tick = function () {
      var diff = Math.max(0, alvo - Date.now());
      if (diff === 0) {
        cd.querySelector(".countdown__label").textContent = "A turma já começou";
        cd.querySelector(".countdown__row").hidden = true;
        return;
      }
      var s = Math.floor(diff / 1000);
      cel.d.textContent = pad(Math.floor(s / 86400));
      cel.h.textContent = pad(Math.floor(s % 86400 / 3600));
      cel.m.textContent = pad(Math.floor(s % 3600 / 60));
      cel.s.textContent = pad(s % 60);
      setTimeout(tick, 1000);
    };
    tick();
  }

  /* =========================================================
     BRASAS — canvas fixo sobre a página inteira
     Um sprite de brilho pré-renderizado e desenhado com drawImage:
     muito mais barato do que shadowBlur por partícula.
     ========================================================= */
  var embersCanvas = document.getElementById("embers");
  var spawnEmbersAt = function () {};

  function makeGlow(r, g, b) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var x = c.getContext("2d");
    var grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,250,235,1)");
    grd.addColorStop(0.18, "rgba(" + r + "," + g + "," + b + ",0.95)");
    grd.addColorStop(0.45, "rgba(" + r + "," + g + "," + b + ",0.25)");
    grd.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
    x.fillStyle = grd;
    x.fillRect(0, 0, 64, 64);
    return c;
  }
  var SPRITES = [makeGlow(255, 96, 60), makeGlow(255, 160, 110), makeGlow(200, 45, 30)];

  if (embersCanvas && !reduced) {
    var ec = embersCanvas.getContext("2d");
    var W = 0, H = 0, embers = [], running = true;

    var resizeE = function () {
      W = window.innerWidth; H = window.innerHeight;
      embersCanvas.width = W * DPR; embersCanvas.height = H * DPR;
      ec.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resizeE();
    window.addEventListener("resize", resizeE);

    var alvoQtd = function () { return Math.round(Math.min(70, Math.max(26, W / 20))); };

    var nova = function (x, y, burst) {
      return {
        x: x != null ? x : Math.random() * W,
        y: y != null ? y : H + 10 + Math.random() * 40,
        vx: burst ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 0.3,
        vy: burst ? -(1 + Math.random() * 3) : -(0.35 + Math.random() * 1.1),
        r: 0.8 + Math.random() * (burst ? 2.6 : 2.2),
        wob: Math.random() * Math.PI * 2,
        wobS: 0.01 + Math.random() * 0.025,
        life: 0,
        max: burst ? 90 + Math.random() * 120 : 380 + Math.random() * 520,
        sp: SPRITES[(Math.random() * SPRITES.length) | 0],
        fl: Math.random() * 10
      };
    };
    for (var i = 0; i < alvoQtd(); i++) {
      var e = nova(); e.y = Math.random() * H; e.life = Math.random() * e.max * 0.6; embers.push(e);
    }

    spawnEmbersAt = function (x, y, n) {
      for (var j = 0; j < n; j++) embers.push(nova(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 20, true));
    };

    var loopE = function () {
      if (!running) return;
      ec.clearRect(0, 0, W, H);
      var alvoN = alvoQtd();
      for (var k = embers.length - 1; k >= 0; k--) {
        var p = embers[k];
        p.life++;
        p.wob += p.wobS;
        p.x += p.vx + Math.sin(p.wob) * 0.45;
        p.y += p.vy;
        p.vx *= 0.99;
        p.fl += 0.2;
        var t = p.life / p.max;
        if (t >= 1 || p.y < -20) {
          if (embers.length > alvoN) embers.splice(k, 1);
          else embers[k] = nova();
          continue;
        }
        // entra rápido, apaga devagar, e cintila
        var a = Math.min(1, t * 6) * (1 - t) * (0.65 + Math.sin(p.fl) * 0.35);
        var s = p.r * 7;
        ec.globalAlpha = a;
        ec.drawImage(p.sp, p.x - s / 2, p.y - s / 2, s, s);
      }
      ec.globalAlpha = 1;
      requestAnimationFrame(loopE);
    };
    requestAnimationFrame(loopE);

    document.addEventListener("visibilitychange", function () {
      var vis = !document.hidden;
      if (vis && !running) { running = true; requestAnimationFrame(loopE); }
      else if (!vis) running = false;
    });
  }

  /* =========================================================
     HERO — o choque
     ========================================================= */
  var hero = document.getElementById("hero");
  var collide = document.getElementById("collide");
  var row = collide && collide.querySelector(".collide__row");
  // Centro do choque: a faixa entre as duas palavras
  var seam = collide && collide.querySelector(".collide__mid");

  /* Mantém ISOLADA + Redação numa linha só em qualquer largura:
     se a linha não couber, reduz a fonte na proporção exata. */
  function fit() {
    if (!collide || !row) return;
    collide.style.removeProperty("--fit");
    var disp = collide.clientWidth;
    // offsetWidth, e não scrollWidth: o scrollWidth conta as palavras ainda
    // deslocadas pela animação de entrada, fora da tela.
    // A folga de 12% cobre o que a inclinação (skew) projeta para os lados.
    var larg = row.offsetWidth;
    if (larg > disp * 0.88) {
      var atual = parseFloat(getComputedStyle(collide).fontSize);
      collide.style.setProperty("--fit", (atual * disp * 0.88 / larg).toFixed(2) + "px");
    }
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  window.addEventListener("resize", fit);

  function centro() {
    var hr = hero.getBoundingClientRect();
    var sr = seam.getBoundingClientRect();
    return { x: sr.left + sr.width / 2 - hr.left, y: sr.top + sr.height / 2 - hr.top, vx: sr.left + sr.width / 2, vy: sr.top + sr.height / 2 };
  }

  /* Faíscas do impacto: traços incandescentes com arrasto e gravidade */
  function burst(cx, cy) {
    var cv = document.getElementById("sparks");
    if (!cv) return;
    var c = cv.getContext("2d");
    var w = hero.clientWidth, h = hero.clientHeight;
    cv.width = w * DPR; cv.height = h * DPR;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);

    var parts = [];
    var n = w < 600 ? 110 : 190;
    for (var i = 0; i < n; i++) {
      // Espalha mais na horizontal: é um choque lateral, não uma explosão redonda
      var ang = Math.random() * Math.PI * 2;
      var spd = 3 + Math.pow(Math.random(), 1.6) * (w < 600 ? 14 : 22);
      parts.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(ang) * spd * 1.35,
        vy: Math.sin(ang) * spd * 0.75 - 1.5,
        life: 0,
        max: 35 + Math.random() * 55,
        hue: 4 + Math.random() * 30,
        wd: 0.8 + Math.random() * 2
      });
    }

    var loop = function () {
      c.globalCompositeOperation = "source-over";
      c.clearRect(0, 0, w, h);
      c.globalCompositeOperation = "lighter";
      var vivos = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.life >= p.max) continue;
        vivos++;
        var px = p.x, py = p.y;
        p.vx *= 0.94; p.vy = p.vy * 0.94 + 0.22;
        p.x += p.vx; p.y += p.vy; p.life++;
        var t = p.life / p.max;
        var light = 90 - t * 35;
        c.strokeStyle = "hsla(" + p.hue + ",100%," + light + "%," + (1 - t) + ")";
        c.lineWidth = p.wd * (1 - t * 0.6);
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(px - p.vx * 1.6, py - p.vy * 1.6);
        c.lineTo(p.x, p.y);
        c.stroke();
      }
      if (vivos) requestAnimationFrame(loop);
      else c.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(loop);
  }

  /* Posição de partida de cada palavra: na vertical, encostada na sua
     lateral da tela. O transform gira em volta do transform-origin (pé do
     ISOLADA, topo do REDAÇÃO), então o centro visual depois do giro não é o
     centro da caixa — as contas abaixo compensam isso. */
  function posicionar() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 84;
    var meio = nav + (vh - nav) / 2;
    var margem = Math.max(12, vw * 0.035);
    [[".collide__w--l", 1], [".collide__w--r", -1]].forEach(function (par) {
      var el = collide.querySelector(par[0]);
      var lado = par[1];
      el.style.transform = "none";
      var r = el.getBoundingClientRect();
      el.style.transform = "";
      var w = r.width, h = r.height;
      var cx = r.left + w / 2, cy = r.top + h / 2;
      // Na vertical a palavra pode crescer: no celular o título horizontal é
      // pequeno, mas de pé ela tem a altura da tela para ocupar (~60%).
      var big = Math.max(1, Math.min(1.8, (vh * 0.6) / w));
      // centro visual depois de escalar e girar 90° em volta da origem
      var rcx = cx - big * h / 2;
      var rcy = lado === 1 ? cy + h / 2 : cy - h / 2;
      var tx = lado === 1 ? margem + big * h / 2 : vw - margem - big * h / 2;
      el.style.setProperty("--big", big.toFixed(3));
      var curso = Math.min(vh * 0.12, 110);          // quanto anda na câmera lenta
      var comp = w * big;                               // comprimento da palavra em pé
      // Começa inteira fora da tela: ISOLADA abaixo do rodapé da janela,
      // REDAÇÃO acima do topo. Entra rápido e freia no meio.
      var yS = lado === 1 ? vh + comp / 2 + 20 : -comp / 2 - 20;
      var y0 = meio + lado * curso / 2;                 // ISOLADA segue subindo devagar
      var y1 = meio - lado * curso / 2;                 // REDAÇÃO segue descendo devagar
      el.style.setProperty("--dx", (tx - rcx).toFixed(1) + "px");
      el.style.setProperty("--dyS", (yS - rcy).toFixed(1) + "px");
      el.style.setProperty("--dy0", (y0 - rcy).toFixed(1) + "px");
      el.style.setProperty("--dy1", (y1 - rcy).toFixed(1) + "px");
    });
  }

  if (hero && seam) {
    var cs = getComputedStyle(document.documentElement);
    var delay = parseFloat(cs.getPropertyValue("--slam-delay")) * 1000 || 250;
    var dur = parseFloat(cs.getPropertyValue("--slam-dur")) * 1000 || 3600;
    var IMPACTO = delay + dur * 0.88;

    var comecar = function () {
      if (hero.classList.contains("is-intro")) return;
      if (reduced) { hero.classList.add("is-intro", "is-fused"); return; }
      fit();
      posicionar();
      hero.classList.add("is-intro");

      setTimeout(function () {
        var p = centro();
        hero.style.setProperty("--cx", p.x + "px");
        hero.style.setProperty("--cy", p.y + "px");
        hero.classList.add("is-impact");
        burst(p.x, p.y);
        spawnEmbersAt(p.vx, p.vy, 36);
      }, IMPACTO);

      setTimeout(function () { hero.classList.add("is-fused"); }, IMPACTO + 600);
    };

    // Espera a fonte (as medidas dependem dela) e o banner, com teto de 1,2s
    // para a entrada nunca travar por conexão lenta.
    var prontos = [];
    if (document.fonts && document.fonts.ready) prontos.push(document.fonts.ready);
    var foto = hero.querySelector(".hero__photo img");
    if (foto && !foto.complete) prontos.push(new Promise(function (ok) { foto.addEventListener("load", ok); foto.addEventListener("error", ok); }));
    if (window.Promise && prontos.length) {
      Promise.race([Promise.all(prontos), new Promise(function (ok) { setTimeout(ok, 1200); })]).then(comecar);
    } else {
      comecar();
    }
  }


  /* =========================================================
     SCROLL — header, barra de progresso, parallax, dock
     ========================================================= */
  var header = document.getElementById("header");
  var progress = document.getElementById("progress");
  var heroBg = document.getElementById("heroBg");
  var dock = document.getElementById("dock");
  var ticking = false;

  function render() {
    var y = window.scrollY;
    header.classList.toggle("is-stuck", y > 40);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    if (dock) dock.classList.toggle("is-on", y > window.innerHeight * 0.85);
    if (!reduced && heroBg && y < window.innerHeight * 1.2) {
      heroBg.style.transform = "translateY(" + (y * 0.2) + "px)";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }, { passive: true });
  render();

  /* =========================================================
     STORAGE — tudo com try/catch: aba anônima e site data
     bloqueado não podem quebrar a página.
     Prefixo próprio ("isolada"): as landings do CPPEM dividem
     domínio, e um prefixo repetido faria uma travar o popup da outra.
     ========================================================= */
  var Store = {
    get:  function (k)    { try { return localStorage.getItem(k); }   catch (e) { return null; } },
    set:  function (k, v) { try { localStorage.setItem(k, v); }       catch (e) {} },
    sGet: function (k)    { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sSet: function (k, v) { try { sessionStorage.setItem(k, v); }     catch (e) {} }
  };
  var KEY_CHECKOUT = "isolada_checkout";
  function track(evento, dados) {
    window.dataLayer = window.dataLayer || [];
    var p = { event: evento };
    for (var k in dados) if (Object.prototype.hasOwnProperty.call(dados, k)) p[k] = dados[k];
    window.dataLayer.push(p);
  }
  // Quem já foi para o checkout nunca mais vê o popup de saída
  document.querySelectorAll(".js-checkout").forEach(function (a) {
    a.addEventListener("click", function () { Store.set(KEY_CHECKOUT, "1"); });
  });

  /* =========================================================
     EXIT POPUP
     Mesmas regras do kit da Operação Alvorada:
     - só arma depois de 5s na página (?popup=teste zera as travas);
     - desktop: o mouse sai pelo topo (indo para o X ou para as abas);
     - mobile: arremesso de volta ao topo, ou 25s sem mexer;
     - no máximo uma vez por visita; fechou, fica 3 dias quieto;
     - nunca para quem já clicou em algum botão do checkout.
     ========================================================= */
  var XP = {
    armDelay: 5000,
    idleDelay: 25000,
    snoozeDays: 3,
    scrollUpMinPx: 1200,
    scrollUpMinVh: 2,
    scrollUpSpeed: 1.2,
    scrollUpGap: 400,
    scrollUpJitter: 60,
    scrollUpTop: 200
  };
  var KEY_SEEN = "isolada_exit_seen";
  var KEY_SNOOZE = "isolada_exit_snooze";

  // Link de teste: ?popup=teste zera as travas deste navegador (já viu,
  // fechou há menos de 3 dias, já clicou no checkout) e arma em 1s.
  var xpTeste = /[?&]popup=teste(&|$)/.test(window.location.search);
  if (xpTeste) {
    try { sessionStorage.removeItem(KEY_SEEN); localStorage.removeItem(KEY_SNOOZE); localStorage.removeItem(KEY_CHECKOUT); } catch (e) {}
    XP.armDelay = 1000;
  }

  var xp = document.getElementById("xp");
  if (xp) {
    var xpBox = xp.querySelector(".xp__box");
    var xpOpen = false, xpFired = false, xpArmed = false, xpWhy = null, xpLastFocus = null;
    var xpCleanup = [];

    var xpBlocked = function () {
      if (Store.get(KEY_CHECKOUT)) return true;
      if (Store.sGet(KEY_SEEN)) return true;
      var ate = parseInt(Store.get(KEY_SNOOZE) || "0", 10);
      return !!(ate && Date.now() < ate);
    };

    var xpShow = function (why, force) {
      if (!force && (!xpArmed || xpFired || xpOpen || xpBlocked())) return;
      if (xpOpen) return;
      xpFired = true; xpOpen = true; xpWhy = why;
      Store.sSet(KEY_SEEN, "1");
      xpLastFocus = document.activeElement;
      xp.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(function () { xp.classList.add("is-open"); });
      // um punhado de brasas estourando do meio da tela
      setTimeout(function () { spawnEmbersAt(window.innerWidth / 2, window.innerHeight / 2, 40); }, 350);
      setTimeout(function () { var c = xp.querySelector(".xp__cta"); if (c) c.focus({ preventScroll: true }); }, 700);
      track("exit_popup_view", { trigger: why });
      xpCleanup.forEach(function (fn) { fn(); });
      xpCleanup = [];
    };

    var xpHide = function (metodo) {
      if (!xpOpen) return;
      xpOpen = false;
      Store.set(KEY_SNOOZE, String(Date.now() + XP.snoozeDays * 86400000));
      track("exit_popup_close", { trigger: xpWhy, method: metodo });
      xp.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(function () { xp.hidden = true; }, 300);
      if (xpLastFocus && xpLastFocus.focus) xpLastFocus.focus({ preventScroll: true });
    };

    xp.querySelectorAll("[data-xp-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        xpHide(el.hasAttribute("data-xp-decline") ? "recusa" : el.classList.contains("xp__overlay") ? "overlay" : "x");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (!xpOpen) return;
      if (e.key === "Escape") { xpHide("esc"); return; }
      if (e.key !== "Tab") return;
      var itens = Array.prototype.slice.call(xpBox.querySelectorAll("a[href], button"))
        .filter(function (n) { return n.offsetParent !== null; });
      if (!itens.length) return;
      var primeiro = itens[0], ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    var xpOn = function (alvo, tipo, fn, opts) {
      alvo.addEventListener(tipo, fn, opts);
      xpCleanup.push(function () { alvo.removeEventListener(tipo, fn, opts); });
    };

    var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
    var temMouse = mq("(any-hover: hover)") || mq("(any-pointer: fine)");
    var coarse = mq("(pointer: coarse)");

    // Desktop: o mouse sai da página por cima (indo para o X, abas ou barra
    // de endereço). Com mouse rápido o navegador registra a saída alguns px
    // abaixo do topo, e não em 0 — por isso a folga de 20px, ou saída por
    // cima enquanto o mouse vinha subindo perto do topo.
    // Vale também para notebook com tela touch, que tem mouse E toque.
    if (temMouse) {
      var mouseY = null, subindo = false;
      xpOn(document, "mousemove", function (e) {
        if (mouseY !== null) subindo = e.clientY < mouseY;
        mouseY = e.clientY;
      }, { passive: true });
      var saiuPorCima = function (e) {
        if (e.relatedTarget) return;
        if (e.clientY <= 20 || (subindo && mouseY !== null && mouseY < 90 && e.clientY < 90)) xpShow("desktop");
      };
      xpOn(document, "mouseout", saiuPorCima);
      xpOn(document.documentElement, "mouseleave", saiuPorCima);
    }

    if (coarse) {
      // Mobile: só dispara no gesto inteiro — arremesso longo, sem pausa,
      // terminando no começo da página. Rolagem normal para cima não conta.
      var idleT = null;
      var lastY = window.scrollY, lastT = Date.now();
      var burstPx = 0, burstT = 0, burstN = 0;
      var resetIdle = function () {
        clearTimeout(idleT);
        idleT = setTimeout(function () { xpShow("inatividade"); }, XP.idleDelay);
      };
      xpOn(window, "scroll", function () {
        var y = window.scrollY, t = Date.now(), subiu = lastY - y;
        if (subiu <= -XP.scrollUpJitter) { burstPx = 0; burstT = t; burstN = 0; }
        else if (t - lastT > XP.scrollUpGap) { burstPx = Math.max(0, subiu); burstT = t; burstN = 1; }
        else if (subiu > 0) { burstPx += subiu; burstN++; }
        lastY = y; lastT = t;
        var dur = t - burstT;
        var dist = Math.max(XP.scrollUpMinPx, window.innerHeight * XP.scrollUpMinVh);
        if (burstN >= 2 && dur > 0 && burstPx >= dist && burstPx / dur >= XP.scrollUpSpeed && y <= XP.scrollUpTop) {
          xpShow("scroll_up"); return;
        }
        resetIdle();
      }, { passive: true });
      xpOn(document, "touchstart", resetIdle, { passive: true });
      xpOn(document, "click", resetIdle);
      xpCleanup.push(function () { clearTimeout(idleT); });
      resetIdle();
    }

    setTimeout(function () { xpArmed = true; }, XP.armDelay);

    // Para testar sem esperar: ExitPopup.show() no console;
    // ExitPopup.reset() apaga as travas deste navegador.
    window.ExitPopup = {
      show: function () { xpShow("console", true); },
      reset: function () {
        try { sessionStorage.removeItem(KEY_SEEN); localStorage.removeItem(KEY_SNOOZE); localStorage.removeItem(KEY_CHECKOUT); } catch (e) {}
      }
    };
  }

  /* =========================================================
     WHATSAPP — botão fixo + balão de fala
     O balão entra 7s depois de abrir a página, "digita" e troca de
     mensagem a cada ~9s. Fechou no X, some até o fim da visita.
     ========================================================= */
  var WA = {
    numero: "5581973105354",
    texto: "Olá! Tenho uma dúvida sobre a Isolada de Redação com a Prof.ª Shayenne.",
    atraso: 7000,
    troca: 9000,
    mensagens: [
      "Ficou com alguma <b>dúvida</b> sobre a turma? Chama a gente aqui.",
      "Quer saber se a isolada serve para o <b>seu concurso</b>? Fala com o time CPPEM.",
      "São só <b>25 vagas</b>. Tira sua dúvida antes que a turma feche.",
      "Dúvida sobre pagamento ou parcelamento? A gente responde <b>rapidinho</b>."
    ]
  };
  var KEY_WA = "isolada_wa_fechado";

  var waLink = "https://wa.me/" + WA.numero + "?text=" + encodeURIComponent(WA.texto);
  document.querySelectorAll("[data-wa-link]").forEach(function (a) {
    a.href = waLink;
    a.addEventListener("click", function () {
      track("whatsapp_click", { origem: a.classList.contains("wa__btn") ? "botao" : "balao" });
    });
  });

  var bubble = document.getElementById("waBubble");
  var waMsg = document.getElementById("waMsg");
  var waBadge = document.getElementById("waBadge");
  if (bubble && waMsg && !Store.sGet(KEY_WA)) {
    var iMsg = 0, waTimer = null;

    var digitar = function (html) {
      bubble.classList.add("is-typing");
      setTimeout(function () {
        waMsg.innerHTML = html;
        bubble.classList.remove("is-typing");
      }, reduced ? 0 : 1200);
    };

    var proxima = function () {
      // não fica trocando mensagem por trás do popup de saída
      if (!xp || xp.hidden) {
        iMsg = (iMsg + 1) % WA.mensagens.length;
        digitar(WA.mensagens[iMsg]);
      }
      waTimer = setTimeout(proxima, WA.troca);
    };

    setTimeout(function () {
      if (Store.sGet(KEY_WA)) return;
      bubble.hidden = false;
      if (waBadge) waBadge.hidden = false;
      digitar(WA.mensagens[0]);
      waTimer = setTimeout(proxima, WA.troca);
    }, WA.atraso);

    document.getElementById("waBubbleX").addEventListener("click", function () {
      Store.sSet(KEY_WA, "1");
      clearTimeout(waTimer);
      bubble.classList.add("is-out");
      setTimeout(function () { bubble.hidden = true; }, 300);
    });
  }

  /* =========================================================
     REVELAÇÃO NO SCROLL
     ========================================================= */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        // escalona irmãos que entram juntos
        var irmaos = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.transitionDelay = Math.min(irmaos, 8) * 70 + "ms";
        el.classList.add("is-in");
        // tira o atraso depois, para não atrasar o hover dos cards
        setTimeout(function () { el.style.transitionDelay = ""; }, 1400);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
