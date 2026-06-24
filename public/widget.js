/*!
 * Website Knowledge Chatbot — embeddable widget
 * Usage:
 *   <script src="https://YOUR-APP.com/widget.js"
 *           data-bot-id="THE_CHATBOT_ID"
 *           data-api="https://YOUR-APP.com" defer></script>
 *
 * Self-contained: renders inside a Shadow DOM so host-page CSS can't leak in.
 */
(function () {
  "use strict";

  // --- Resolve the script tag + config ------------------------------------
  var script =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll("script[data-bot-id]");
      return all[all.length - 1];
    })();

  if (!script) {
    console.error("[chatbot] could not locate the widget <script> tag.");
    return;
  }

  var botId = script.getAttribute("data-bot-id");
  if (!botId) {
    console.error("[chatbot] missing data-bot-id attribute.");
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

  // --- Per-visitor session id ---------------------------------------------
  var SKEY = "wkb_session_" + botId;
  var sessionId;
  try {
    sessionId = localStorage.getItem(SKEY);
    if (!sessionId) {
      sessionId =
        "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SKEY, sessionId);
    }
  } catch (e) {
    sessionId = "sess-" + Date.now().toString(36);
  }

  // --- Default config (overwritten by /api/widget/:botId) -----------------
  var config = {
    name: "Assistant",
    welcomeMessage: "Hi! Ask me anything about this site.",
    primaryColor: "#4f46e5",
    logoUrl: null,
    fallbackMessage: "Sorry, that information is not available on this website.",
  };

  // --- Build the UI inside a Shadow DOM -----------------------------------
  var host = document.createElement("div");
  host.setAttribute("id", "wkb-host");
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var STYLE =
    "" +
    ":host,*{box-sizing:border-box;}" +
    ".wkb{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
    ".wkb-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483000;transition:transform .15s ease;}" +
    ".wkb-btn:hover{transform:scale(1.06);}" +
    ".wkb-btn svg{width:28px;height:28px;}" +
    ".wkb-panel{position:fixed;bottom:92px;right:20px;width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;}" +
    ".wkb-panel.open{display:flex;}" +
    ".wkb-head{display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;}" +
    ".wkb-head img{width:32px;height:32px;border-radius:50%;background:#fff;object-fit:contain;}" +
    ".wkb-avatar{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;}" +
    ".wkb-title{font-weight:600;font-size:15px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".wkb-close{background:none;border:none;color:#fff;cursor:pointer;opacity:.85;font-size:20px;line-height:1;padding:4px;}" +
    ".wkb-close:hover{opacity:1;}" +
    ".wkb-body{flex:1;overflow-y:auto;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:10px;}" +
    ".wkb-msg{max-width:82%;padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;}" +
    ".wkb-bot{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-top-left-radius:4px;}" +
    ".wkb-user{align-self:flex-end;color:#fff;border-top-right-radius:4px;}" +
    ".wkb-sources{margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;flex-direction:column;gap:4px;}" +
    ".wkb-sources a{font-size:12px;color:#4f46e5;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".wkb-sources a:hover{text-decoration:underline;}" +
    ".wkb-typing{display:flex;gap:4px;align-items:center;}" +
    ".wkb-typing span{width:7px;height:7px;border-radius:50%;background:#cbd5e1;animation:wkb-bounce 1.2s infinite;}" +
    ".wkb-typing span:nth-child(2){animation-delay:.2s;}" +
    ".wkb-typing span:nth-child(3){animation-delay:.4s;}" +
    "@keyframes wkb-bounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-5px);opacity:1;}}" +
    ".wkb-foot{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#fff;}" +
    ".wkb-input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;resize:none;max-height:90px;font-family:inherit;}" +
    ".wkb-input:focus{border-color:#94a3b8;}" +
    ".wkb-send{border:none;border-radius:10px;color:#fff;width:42px;cursor:pointer;display:flex;align-items:center;justify-content:center;}" +
    ".wkb-send:disabled{opacity:.5;cursor:not-allowed;}" +
    ".wkb-send svg{width:20px;height:20px;}" +
    ".wkb-credit{text-align:center;font-size:11px;color:#94a3b8;padding:0 0 8px;background:#fff;}" +
    "@media (max-width:480px){.wkb-panel{bottom:0;right:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;}.wkb-btn{bottom:16px;right:16px;}}";

  var CHAT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var SEND_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  var wrap = document.createElement("div");
  wrap.className = "wkb";
  wrap.innerHTML =
    "<style>" +
    STYLE +
    "</style>" +
    '<button class="wkb-btn" aria-label="Open chat">' +
    CHAT_ICON +
    "</button>" +
    '<div class="wkb-panel" role="dialog" aria-label="Chat">' +
    '<div class="wkb-head">' +
    '<span class="wkb-logo"></span>' +
    '<span class="wkb-title"></span>' +
    '<button class="wkb-close" aria-label="Close chat">&times;</button>' +
    "</div>" +
    '<div class="wkb-body" aria-live="polite"></div>' +
    '<div class="wkb-foot">' +
    '<textarea class="wkb-input" rows="1" placeholder="Type your message…" aria-label="Message"></textarea>' +
    '<button class="wkb-send" aria-label="Send">' +
    SEND_ICON +
    "</button>" +
    "</div>" +
    '<div class="wkb-credit">Powered by your website</div>' +
    "</div>";
  root.appendChild(wrap);

  var els = {
    btn: wrap.querySelector(".wkb-btn"),
    panel: wrap.querySelector(".wkb-panel"),
    logo: wrap.querySelector(".wkb-logo"),
    title: wrap.querySelector(".wkb-title"),
    close: wrap.querySelector(".wkb-close"),
    body: wrap.querySelector(".wkb-body"),
    input: wrap.querySelector(".wkb-input"),
    send: wrap.querySelector(".wkb-send"),
  };

  // --- Helpers ------------------------------------------------------------
  function applyTheme() {
    els.btn.style.background = config.primaryColor;
    els.send.style.background = config.primaryColor;
    var head = wrap.querySelector(".wkb-head");
    head.style.background = config.primaryColor;
    els.title.textContent = config.name;

    // Build a fresh logo node and swap it in. We keep the ".wkb-logo" class and
    // reassign els.logo so this stays correct when applyTheme() runs twice
    // (defaults first, then again after config loads).
    var newLogo;
    if (config.logoUrl) {
      newLogo = document.createElement("img");
      newLogo.src = config.logoUrl;
      newLogo.alt = "";
      newLogo.className = "wkb-logo";
    } else {
      newLogo = document.createElement("span");
      newLogo.className = "wkb-logo wkb-avatar";
      newLogo.textContent = "💬";
    }
    els.logo.replaceWith(newLogo);
    els.logo = newLogo;
  }

  function addMessage(text, who, sources) {
    var el = document.createElement("div");
    el.className = "wkb-msg " + (who === "user" ? "wkb-user" : "wkb-bot");
    if (who === "user") el.style.background = config.primaryColor;
    el.textContent = text;

    if (who === "bot" && sources && sources.length) {
      var box = document.createElement("div");
      box.className = "wkb-sources";
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

  function showTyping() {
    var el = document.createElement("div");
    el.className = "wkb-msg wkb-bot";
    el.innerHTML =
      '<div class="wkb-typing"><span></span><span></span><span></span></div>';
    els.body.appendChild(el);
    els.body.scrollTop = els.body.scrollHeight;
    return el;
  }

  var welcomed = false;
  function openPanel() {
    els.panel.classList.add("open");
    els.btn.setAttribute("aria-label", "Close chat");
    if (!welcomed) {
      addMessage(config.welcomeMessage, "bot");
      welcomed = true;
    }
    setTimeout(function () {
      els.input.focus();
    }, 50);
  }
  function closePanel() {
    els.panel.classList.remove("open");
    els.btn.setAttribute("aria-label", "Open chat");
  }

  var sending = false;
  function send() {
    var text = (els.input.value || "").trim();
    if (!text || sending) return;
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
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        typing.remove();
        addMessage(
          data.answer || config.fallbackMessage,
          "bot",
          data.sources || []
        );
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

  // --- Events -------------------------------------------------------------
  els.btn.addEventListener("click", function () {
    els.panel.classList.contains("open") ? closePanel() : openPanel();
  });
  els.close.addEventListener("click", closePanel);
  els.send.addEventListener("click", send);
  els.input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  els.input.addEventListener("input", function () {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 90) + "px";
  });

  // --- Load config then theme --------------------------------------------
  applyTheme(); // apply defaults immediately
  if (api) {
    fetch(api + "/api/widget/" + botId)
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (cfg) {
        if (cfg && !cfg.error) {
          config = {
            name: cfg.name || config.name,
            welcomeMessage: cfg.welcomeMessage || config.welcomeMessage,
            primaryColor: cfg.primaryColor || config.primaryColor,
            logoUrl: cfg.logoUrl || null,
            fallbackMessage: cfg.fallbackMessage || config.fallbackMessage,
          };
          applyTheme();
        }
      })
      .catch(function () {
        /* keep defaults */
      });
  }
})();
