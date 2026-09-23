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
  var SPRITES = [makeGlow(255, 150, 70), makeGlow(255, 190, 110), makeGlow(214, 100, 45)];

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
        hue: 22 + Math.random() * 26,
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

  if (hero && seam) {
    var cs = getComputedStyle(document.documentElement);
    var delay = parseFloat(cs.getPropertyValue("--slam-delay")) * 1000 || 350;
    var dur = parseFloat(cs.getPropertyValue("--slam-dur")) * 1000 || 1300;
    var IMPACTO = delay + dur * 0.7;

    if (reduced) {
      hero.classList.add("is-fused");
    } else {
      setTimeout(function () {
        var p = centro();
        hero.style.setProperty("--cx", p.x + "px");
        hero.style.setProperty("--cy", p.y + "px");
        hero.classList.add("is-impact");
        burst(p.x, p.y);
        spawnEmbersAt(p.vx, p.vy, 36);
      }, IMPACTO);

      setTimeout(function () { hero.classList.add("is-fused"); }, IMPACTO + 600);
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
