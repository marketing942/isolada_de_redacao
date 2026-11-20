(function () {
  "use strict";

  var CONFIG = {
    checkout: "https://checkout.cppem.com.br/pay/isolada-de-redacao-com-shayenne-cppem-concursos",

    /* Oito sábados, de 05/12/2026 a 23/01/2027, às 15h30, até 17h30 (horário de Brasília). */
    encontros: [
      "2026-12-05T15:30:00-03:00",
      "2026-12-12T15:30:00-03:00",
      "2026-12-19T15:30:00-03:00",
      "2026-12-26T15:30:00-03:00",
      "2027-01-02T15:30:00-03:00",
      "2027-01-09T15:30:00-03:00",
      "2027-01-16T15:30:00-03:00",
      "2027-01-23T15:30:00-03:00"
    ],
    fim: "2027-01-23T17:30:00-03:00"
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
     CONTAGEM REGRESSIVA — próximo encontro da edição 3.0
     Avança automaticamente para o sábado seguinte após cada encontro.
     ========================================================= */
  var countdowns = document.querySelectorAll("[data-countdown]");
  var nextDateNodes = document.querySelectorAll("[data-next-date]");
  var encontros = CONFIG.encontros.map(function (data) { return new Date(data); });
  var fimEdicao = new Date(CONFIG.fim).getTime();

  if (countdowns.length) {
    var formatoLongo = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", timeZone: "America/Recife"
    });
    var formatoCurto = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", timeZone: "America/Recife"
    });
    var dataLegivel = function (data) {
      var texto = formatoLongo.format(data);
      return texto.charAt(0).toUpperCase() + texto.slice(1);
    };
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };

    var tick = function () {
      var agora = Date.now();
      var proximo = null;

      for (var i = 0; i < encontros.length; i++) {
        if (encontros[i].getTime() > agora) {
          proximo = encontros[i];
          break;
        }
      }

      var ultimoEmAndamento = !proximo && agora < fimEdicao;

      countdowns.forEach(function (cd) {
        var label = cd.querySelector(".countdown__label");
        var data = cd.querySelector("[data-cd-date]");
        var linha = cd.querySelector(".countdown__row");

        if (!proximo) {
          if (label) label.textContent = ultimoEmAndamento ? "Último encontro em andamento" : "Edição 3.0 concluída";
          if (data) data.textContent = ultimoEmAndamento
            ? "23 de janeiro de 2027 · até 17h30"
            : "Último encontro: 23 de janeiro de 2027";
          if (linha) linha.hidden = true;
          return;
        }

        if (label) label.textContent = "Próximo encontro em";
        if (data) data.textContent = dataLegivel(proximo) + " · 15h30";
        if (linha) linha.hidden = false;

        var total = Math.max(0, Math.floor((proximo.getTime() - agora) / 1000));
        var valores = {
          d: Math.floor(total / 86400),
          h: Math.floor(total % 86400 / 3600),
          m: Math.floor(total % 3600 / 60),
          s: total % 60
        };

        ["d", "h", "m", "s"].forEach(function (chave) {
          var celula = cd.querySelector('[data-cd="' + chave + '"]');
          if (celula) celula.textContent = pad(valores[chave]);
        });
      });

      /* Cronograma: marca os encontros que já passaram e o próximo */
      document.querySelectorAll("[data-encontro]").forEach(function (el) {
        var i = parseInt(el.getAttribute("data-encontro"), 10);
        el.classList.toggle("is-next", !!proximo && encontros[i] && encontros[i].getTime() === proximo.getTime());
        el.classList.toggle("is-done", !!encontros[i] && encontros[i].getTime() + 2 * 3600e3 <= agora);
      });

      nextDateNodes.forEach(function (el) {
        el.textContent = proximo
          ? "Próximo encontro: " + formatoCurto.format(proximo) + " · 15h30"
          : (ultimoEmAndamento ? "Último encontro em andamento" : "Edição 3.0 concluída");
      });

      if (proximo) setTimeout(tick, 1000);
      else if (ultimoEmAndamento) setTimeout(tick, Math.max(1000, fimEdicao - agora + 1000));
    };

    tick();
  }

  /* =========================================================
     SCROLL — header, barra de progresso, parallax, dock
     ========================================================= */
  var header = document.getElementById("header");
  var progress = document.getElementById("progress");
  var dock = document.getElementById("dock");
  var ticking = false;

  function render() {
    var y = window.scrollY;
    header.classList.toggle("is-stuck", y > 40);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    if (dock) dock.classList.toggle("is-on", y > window.innerHeight * 0.85);
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
     WHATSAPP — ícone flutuante discreto
     ========================================================= */
  var WA = {
    numero: "5581973105354",
    texto: "Olá! Gostaria de saber mais sobre a Isolada de Redação 3.0."
  };

  var waLink = "https://wa.me/" + WA.numero + "?text=" + encodeURIComponent(WA.texto);
  document.querySelectorAll("[data-wa-link]").forEach(function (a) {
    a.href = waLink;
    a.addEventListener("click", function () {
      track("whatsapp_click", { origem: "botao" });
    });
  });

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
