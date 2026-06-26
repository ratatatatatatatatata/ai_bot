/*!
 * TBPlan Chat Bot System — embeddable widget
 * Usage:
 *   <script src="https://YOUR-APP.com/widget.js"
 *           data-bot-id="THE_CHATBOT_ID"
 *           data-api="https://YOUR-APP.com" defer></script>
 *
 * Self-contained: renders inside a Shadow DOM so host-page CSS can't leak in.
 */
(function () {
  "use strict";

  var script =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll("script[data-bot-id]");
      return all[all.length - 1];
    })();
  if (!script) {
    console.error("[tbplan] widget <script> tag not found.");
    return;
  }

  var botId = script.getAttribute("data-bot-id");
  if (!botId) {
    console.error("[tbplan] missing data-bot-id.");
    return;
  }

  var api = (
    script.getAttribute("data-api") ||
    (function () {
      try {
        return new URL(script.src).origin;
      } catch (e) {
        return "";
      }
    })()
  ).replace(/\/+$/, "");

  var SKEY = "tbp_session_" + botId;
  var LKEY = "tbp_lead_" + botId;
  var sessionId;
  try {
    sessionId = localStorage.getItem(SKEY);
    if (!sessionId) {
      sessionId = "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SKEY, sessionId);
    }
  } catch (e) {
    sessionId = "sess-" + Date.now().toString(36);
  }

  var config = {
    name: "Assistant",
    status: "active",
    welcomeMessage: "Hi! Ask me anything.",
    primaryColor: "#4f46e5",
    theme: "light",
    position: "right",
    logoUrl: null,
    avatarUrl: null,
    launcherText: null,
    fallbackMessage: "Sorry, that information is not available on this website.",
    suggestedQuestions: [],
    leadCapture: false,
    leadMessage: "Leave your contact details and we'll get back to you.",
  };

  var host = document.createElement("div");
  host.id = "tbp-host";
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var STYLE =
    ":host,*{box-sizing:border-box;}" +
    ".w{--p:#4f46e5;--bg:#fff;--fg:#1e293b;--body:#f8fafc;--botbg:#fff;--botfg:#1e293b;--bd:#e2e8f0;--inbg:#fff;" +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
    ".w.dark{--bg:#0f172a;--fg:#e2e8f0;--body:#0b1220;--botbg:#1e293b;--botfg:#e2e8f0;--bd:#334155;--inbg:#1e293b;}" +
    ".btn{position:fixed;bottom:20px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;color:#fff;background:var(--p);box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483000;transition:transform .15s;overflow:hidden;}" +
    ".btn:hover{transform:scale(1.06);}" +
    ".btn svg{width:28px;height:28px;}" +
    ".btn img{width:100%;height:100%;object-fit:cover;}" +
    ".pos-right .btn{right:20px;}.pos-left .btn{left:20px;}" +
    ".bubble{position:fixed;bottom:34px;background:var(--bg);color:var(--fg);border:1px solid var(--bd);box-shadow:0 6px 20px rgba(0,0,0,.15);padding:8px 12px;border-radius:14px;font-size:13px;max-width:200px;z-index:2147482999;cursor:pointer;}" +
    ".pos-right .bubble{right:92px;}.pos-left .bubble{left:92px;}" +
    ".panel{position:fixed;bottom:92px;width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 120px);background:var(--bg);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;}" +
    ".pos-right .panel{right:20px;}.pos-left .panel{left:20px;}" +
    ".panel.open{display:flex;}" +
    ".head{display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;background:var(--p);}" +
    ".head img{width:32px;height:32px;border-radius:50%;background:#fff;object-fit:contain;}" +
    ".avatar{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;}" +
    ".title{font-weight:600;font-size:15px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".x{background:none;border:none;color:#fff;cursor:pointer;opacity:.85;font-size:20px;line-height:1;padding:4px;}.x:hover{opacity:1;}" +
    ".body{flex:1;overflow-y:auto;padding:16px;background:var(--body);display:flex;flex-direction:column;gap:10px;}" +
    ".msg{max-width:82%;padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;}" +
    ".bot{align-self:flex-start;background:var(--botbg);color:var(--botfg);border:1px solid var(--bd);border-top-left-radius:4px;}" +
    ".user{align-self:flex-end;color:#fff;background:var(--p);border-top-right-radius:4px;}" +
    ".chips{display:flex;flex-wrap:wrap;gap:6px;}" +
    ".chip{border:1px solid var(--p);color:var(--p);background:transparent;border-radius:16px;padding:6px 12px;font-size:13px;cursor:pointer;}" +
    ".chip:hover{background:var(--p);color:#fff;}" +
    ".src{margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);display:flex;flex-direction:column;gap:4px;}" +
    ".src a{font-size:12px;color:var(--p);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".src a:hover{text-decoration:underline;}" +
    ".typing{display:flex;gap:4px;align-items:center;}" +
    ".typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:tbp 1.2s infinite;}" +
    ".typing span:nth-child(2){animation-delay:.2s;}.typing span:nth-child(3){animation-delay:.4s;}" +
    "@keyframes tbp{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-5px);opacity:1;}}" +
    ".lead{background:var(--botbg);color:var(--botfg);border:1px solid var(--bd);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}" +
    ".lead input{border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--inbg);color:var(--fg);}" +
    ".lead button{background:var(--p);color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;}" +
    ".foot{display:flex;gap:8px;padding:12px;border-top:1px solid var(--bd);background:var(--bg);}" +
    ".in{flex:1;border:1px solid var(--bd);border-radius:10px;padding:10px 12px;font-size:14px;outline:none;resize:none;max-height:90px;font-family:inherit;background:var(--inbg);color:var(--fg);}" +
    ".send{border:none;border-radius:10px;color:#fff;background:var(--p);width:42px;cursor:pointer;display:flex;align-items:center;justify-content:center;}" +
    ".send:disabled{opacity:.5;cursor:not-allowed;}.send svg{width:20px;height:20px;}" +
    ".credit{text-align:center;font-size:11px;color:#94a3b8;padding:0 0 8px;background:var(--bg);}" +
    "@media (max-width:480px){.panel{bottom:0;right:0;left:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;}}";

  var CHAT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var SEND_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  var wrap = document.createElement("div");
  wrap.className = "w pos-right";
  wrap.innerHTML =
    "<style>" + STYLE + "</style>" +
    '<button class="btn" aria-label="Open chat">' + CHAT_ICON + "</button>" +
    '<div class="bubble" style="display:none"></div>' +
    '<div class="panel" role="dialog" aria-label="Chat">' +
    '<div class="head"><span class="logo"></span><span class="title"></span>' +
    '<button class="x" aria-label="Close chat">&times;</button></div>' +
    '<div class="body" aria-live="polite"></div>' +
    '<div class="foot"><textarea class="in" rows="1" placeholder="Type your message…" aria-label="Message"></textarea>' +
    '<button class="send" aria-label="Send">' + SEND_ICON + "</button></div>" +
    '<div class="credit">Powered by TBPlan</div>' +
    "</div>";
  root.appendChild(wrap);

  var els = {
    btn: wrap.querySelector(".btn"),
    bubble: wrap.querySelector(".bubble"),
    panel: wrap.querySelector(".panel"),
    logo: wrap.querySelector(".logo"),
    title: wrap.querySelector(".title"),
    x: wrap.querySelector(".x"),
    body: wrap.querySelector(".body"),
    input: wrap.querySelector(".in"),
    send: wrap.querySelector(".send"),
  };

  function resolveDark() {
    if (config.theme === "dark") return true;
    if (config.theme === "auto") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  }

  function applyTheme() {
    wrap.classList.toggle("dark", resolveDark());
    wrap.classList.remove("pos-left", "pos-right");
    wrap.classList.add(config.position === "left" ? "pos-left" : "pos-right");
    wrap.style.setProperty("--p", config.primaryColor);
    els.title.textContent = config.name;

    // launcher icon: avatar image or chat icon
    if (config.avatarUrl) {
      els.btn.innerHTML = '<img src="' + escapeAttr(config.avatarUrl) + '" alt="">';
    } else {
      els.btn.innerHTML = CHAT_ICON;
    }

    // header logo
    var newLogo;
    if (config.logoUrl) {
      newLogo = document.createElement("img");
      newLogo.src = config.logoUrl;
      newLogo.alt = "";
      newLogo.className = "logo";
    } else {
      newLogo = document.createElement("span");
      newLogo.className = "logo avatar";
      newLogo.textContent = "💬";
    }
    els.logo.replaceWith(newLogo);
    els.logo = newLogo;

    if (config.launcherText) {
      els.bubble.textContent = config.launcherText;
    }
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  function addMessage(text, who, sources) {
    var el = document.createElement("div");
    el.className = "msg " + (who === "user" ? "user" : "bot");
    el.textContent = text;
    if (who === "bot" && sources && sources.length) {
      var box = document.createElement("div");
      box.className = "src";
      sources.forEach(function (s) {
        var a = document.createElement("a");
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "🔗 " + (s.title || s.url);
        box.appendChild(a);
      });
      el.appendChild(box);
    }
    els.body.appendChild(el);
    els.body.scrollTop = els.body.scrollHeight;
    return el;
  }

  function showChips() {
    if (!config.suggestedQuestions || !config.suggestedQuestions.length) return;
    var box = document.createElement("div");
    box.className = "chips";
    config.suggestedQuestions.forEach(function (q) {
      var b = document.createElement("button");
      b.className = "chip";
      b.textContent = q;
      b.addEventListener("click", function () {
        box.remove();
        sendMessage(q);
      });
      box.appendChild(b);
    });
    els.body.appendChild(box);
    els.body.scrollTop = els.body.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "msg bot";
    el.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    els.body.appendChild(el);
    els.body.scrollTop = els.body.scrollHeight;
    return el;
  }

  var leadShown = false;
  function maybeShowLead() {
    if (!config.leadCapture || leadShown) return;
    try {
      if (localStorage.getItem(LKEY)) return;
    } catch (e) {}
    leadShown = true;

    var form = document.createElement("form");
    form.className = "lead";
    form.innerHTML =
      "<div style='font-size:13px'>" + escapeHtml(config.leadMessage) + "</div>" +
      '<input name="name" placeholder="Name" autocomplete="name">' +
      '<input name="email" type="email" placeholder="Email" autocomplete="email">' +
      "<button type='submit'>Send</button>";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.namedItem("name").value.trim();
      var email = form.elements.namedItem("email").value.trim();
      if (!name && !email) return;
      fetch(api + "/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: botId, name: name, email: email, sessionId: sessionId }),
      }).catch(function () {});
      try { localStorage.setItem(LKEY, "1"); } catch (e2) {}
      form.replaceWith(addMessageNode("Thank you! We'll be in touch."));
    });
    els.body.appendChild(form);
    els.body.scrollTop = els.body.scrollHeight;
  }

  function addMessageNode(text) {
    var el = document.createElement("div");
    el.className = "msg bot";
    el.textContent = text;
    return el;
  }
  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  var welcomed = false;
  function openPanel() {
    els.panel.classList.add("open");
    els.bubble.style.display = "none";
    if (!welcomed) {
      welcomed = true;
      if (config.status === "paused") {
        addMessage("This assistant is currently unavailable.", "bot");
        els.input.disabled = true;
        els.send.disabled = true;
      } else {
        addMessage(config.welcomeMessage, "bot");
        showChips();
      }
    }
    setTimeout(function () { els.input.focus(); }, 50);
  }
  function closePanel() {
    els.panel.classList.remove("open");
  }

  var sending = false;
  function sendMessage(text) {
    text = (text || "").trim();
    if (!text || sending || config.status === "paused") return;
    sending = true;
    els.send.disabled = true;
    addMessage(text, "user");
    els.input.value = "";
    els.input.style.height = "auto";
    var typing = showTyping();

    fetch(api + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: botId, message: text, sessionId: sessionId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        addMessage(data.answer || config.fallbackMessage, "bot", data.sources || []);
        if (data.leadCapture) {
          config.leadCapture = true;
          if (data.leadMessage) config.leadMessage = data.leadMessage;
          maybeShowLead();
        }
      })
      .catch(function () {
        typing.remove();
        addMessage(config.fallbackMessage, "bot");
      })
      .finally(function () {
        sending = false;
        els.send.disabled = false;
        els.input.focus();
      });
  }

  els.btn.addEventListener("click", function () {
    els.panel.classList.contains("open") ? closePanel() : openPanel();
  });
  els.bubble.addEventListener("click", openPanel);
  els.x.addEventListener("click", closePanel);
  els.send.addEventListener("click", function () { sendMessage(els.input.value); });
  els.input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(els.input.value); }
  });
  els.input.addEventListener("input", function () {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 90) + "px";
  });

  applyTheme();
  if (api) {
    fetch(api + "/api/widget/" + botId)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (cfg && !cfg.error) {
          config.name = cfg.name || config.name;
          config.status = cfg.status || config.status;
          config.welcomeMessage = cfg.welcomeMessage || config.welcomeMessage;
          config.primaryColor = cfg.primaryColor || config.primaryColor;
          config.theme = cfg.theme || config.theme;
          config.position = cfg.position || config.position;
          config.logoUrl = cfg.logoUrl || null;
          config.avatarUrl = cfg.avatarUrl || null;
          config.launcherText = cfg.launcherText || null;
          config.fallbackMessage = cfg.fallbackMessage || config.fallbackMessage;
          config.suggestedQuestions = cfg.suggestedQuestions || [];
          config.leadCapture = !!cfg.leadCapture;
          config.leadMessage = cfg.leadMessage || config.leadMessage;
          applyTheme();
          if (config.launcherText) els.bubble.style.display = "block";
        }
      })
      .catch(function () {});
  }
})();
