/* JLR Chat — Royce's private chat with his agent, embedded on the JLR page.
   PIN-gated (SHA-256 client-side), talks to the bridge + Hermes webhook. */
(function () {
  'use strict';
  var API = 'https://love-textbooks-massive-both.trycloudflare.com';
  var AUTH_KEY = 'jlr_chat_pin_hash';
  var HIST_KEY = 'jlr_chat_history';
  var AUTH_TTL = 30 * 24 * 3600 * 1000; // 30 days
  var POLL_MS = 2500;
  var POLL_MAX = 96; // ~4 min

  var S = document.createElement('style');
  S.textContent = [
    '#jlr-btn{position:fixed;bottom:24px;right:24px;z-index:99999;width:60px;height:60px;border-radius:50%;',
    'background:linear-gradient(135deg,#00a651,#00703a);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(0,166,81,.4);',
    'display:flex;align-items:center;justify-content:center;font-size:26px;transition:transform .3s cubic-bezier(.16,1,.3,1);color:#fff}',
    '#jlr-btn:hover{transform:scale(1.1)}',
    '#jlr-panel{position:fixed;bottom:96px;right:24px;z-index:99998;width:480px;height:860px;max-height:calc(100vh - 116px);min-height:480px;resize:both;overflow:auto;',
    'background:#0e0e12;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 8px 48px rgba(0,0,0,.5);',
    'display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:14px;color:#f5f5f8}',
    '#jlr-panel.open{display:flex}',
    '#jlr-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;font-size:15px;flex-shrink:0;background:#07070a}',
    '#jlr-hdr .lg{display:flex;align-items:center;gap:8px}#jlr-hdr .lg b{color:#6fe3a5}#jlr-hdr .lg small{color:#aeaec8;font-weight:400;font-size:11px}',
    '#jlr-close{background:none;border:none;color:#a1a1aa;font-size:16px;cursor:pointer;padding:4px}',
    '#jlr-pin{display:none;flex-direction:column;gap:10px;padding:24px 16px;flex:1;justify-content:center;align-items:stretch;text-align:center}',
    '#jlr-pin.show{display:flex}',
    '#jlr-pin h3{margin:0 0 4px;font-size:16px}#jlr-pin p{font-size:12px;color:#aeaec8;margin:0 0 8px}',
    '#jlr-pin input{padding:12px;border-radius:10px;background:#07070a;border:1.5px solid #00a651;color:#f5f5f8;font-family:inherit;font-size:16px;text-align:center;letter-spacing:.4em;outline:none}',
    '#jlr-pin input:focus{border-color:#6fe3a5}',
    '#jlr-pin .err{color:#ef4444;font-size:11px;display:none;margin:0}',
    '#jlr-pin button{padding:11px;background:#00a651;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}',
    '#jlr-chat{display:none;flex-direction:column;flex:1;min-height:0}#jlr-chat.show{display:flex}',
    '#jlr-msgs{flex:1;overflow-y:auto;padding:12px 12px 4px;display:flex;flex-direction:column;gap:6px}',
    '.jm{position:relative;max-width:88%;padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap;user-select:text}',
    '.jm.user{align-self:flex-end;background:#00a651;color:#fff;border-bottom-right-radius:3px}',
    '.jm.bot{align-self:flex-start;background:#15151b;border:1px solid rgba(255,255,255,.06);border-bottom-left-radius:3px;color:#f5f5f8}',
    '.jm.sys{align-self:center;color:#aeaec8;font-size:11px;background:none;border:none}',
    '.jm-copy{position:absolute;top:5px;right:5px;display:none;padding:3px 9px;font-size:10px;font-weight:600;line-height:1.3;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(10,10,14,.55);color:#d4d4e0;cursor:pointer;font-family:inherit;backdrop-filter:blur(4px)}',
    '.jm:hover .jm-copy{display:block}',
    '.jm-copy:hover{background:rgba(0,166,81,.28);color:#fff}',
    '.jm-copy.done{background:#00a651;border-color:#00a651;color:#fff}',
    '#jlr-typing{display:none;gap:3px;align-self:flex-start;padding:10px 14px;background:#15151b;border-radius:10px;border:1px solid rgba(255,255,255,.06)}',
    '#jlr-typing.on{display:flex}',
    '#jlr-typing span{width:6px;height:6px;border-radius:50%;background:#6fe3a5;animation:jlrB 1.4s infinite}',
    '#jlr-typing span:nth-child(2){animation-delay:.2s}#jlr-typing span:nth-child(3){animation-delay:.4s}',
    '@keyframes jlrB{0%,80%,100%{opacity:.3}40%{opacity:1}}',
    '#jlr-input{display:flex;gap:6px;padding:8px 12px 12px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}',
    '#jlr-input input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#07070a;color:#f5f5f8;font-family:inherit;font-size:13px;outline:none}',
    '#jlr-input input:focus{border-color:#00a651}',
    '#jlr-send{width:40px;height:40px;border-radius:10px;border:none;background:#00a651;color:#fff;font-size:16px;cursor:pointer;flex-shrink:0}',
    '#jlr-send:disabled{opacity:.4}',
    '@media(max-width:480px){#jlr-panel{width:calc(100vw - 12px);right:6px;bottom:86px;max-height:calc(100vh - 96px)}#jlr-btn{width:52px;height:52px;font-size:22px;right:16px;bottom:16px}}'
  ].join('');
  document.head.appendChild(S);

  var B = document.createElement('button');
  B.id = 'jlr-btn'; B.textContent = '💬'; B.title = 'Chat with Royce AI';
  var P = document.createElement('div');
  P.id = 'jlr-panel';
  P.innerHTML =
    '<div id="jlr-hdr"><div class="lg"><span>⚡</span><div><b>Royce AI</b><br><small>JLR assistant</small></div></div><button id="jlr-close">✕</button></div>' +
    '<div id="jlr-pin"><h3>🔒 Private chat</h3><p>Enter your PIN to unlock</p><input id="jlr-pin-in" type="password" inputmode="numeric" maxlength="10" placeholder="••••••"><p class="err" id="jlr-pin-err">Wrong PIN</p><button id="jlr-pin-go">Unlock</button></div>' +
    '<div id="jlr-chat"><div id="jlr-msgs"><div class="jm bot">Hi Royce — JLR drafting assistant here. Ask me to write an email or text for a client, or anything else.</div></div><div id="jlr-typing"><span></span><span></span><span></span></div><div id="jlr-input"><input id="jlr-msg" placeholder="Draft an email to Brittany…"><button id="jlr-send">➤</button></div></div>';
  document.body.appendChild(B); document.body.appendChild(P);

  var pinEl = document.getElementById('jlr-pin');
  var chatEl = document.getElementById('jlr-chat');
  var msgsEl = document.getElementById('jlr-msgs');
  var typingEl = document.getElementById('jlr-typing');
  var inEl = document.getElementById('jlr-msg');
  var sendBtn = document.getElementById('jlr-send');
  var pinIn = document.getElementById('jlr-pin-in');
  var pinErr = document.getElementById('jlr-pin-err');

  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function storedPin() {
    try {
      var o = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (o && o.h && Date.now() - o.t < AUTH_TTL) return o.h;
    } catch (e) {}
    return null;
  }
  function savePin(h) { localStorage.setItem(AUTH_KEY, JSON.stringify({ h: h, t: Date.now() })); }
  function loadHist() {
    try { var d = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(d) ? d : []; } catch (e) { return []; }
  }
  function saveHist(h) { try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-20))); } catch (e) {} }

  function openPanel() {
    P.classList.add('open');
    if (storedPin()) { showChat(); } else { pinEl.classList.add('show'); pinIn.focus(); }
  }
  function showChat() {
    pinEl.classList.remove('show');
    chatEl.classList.add('show');
    inEl.focus();
  }
  function copyText(t, btn) {
    function done() {
      btn.textContent = 'Copied ✓';
      btn.classList.add('done');
      setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1600);
    }
    function fail() {
      btn.textContent = 'Copy failed';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
    }
    function legacy(t) {
      try {
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { legacy(t) ? done() : fail(); });
    } else {
      legacy(t) ? done() : fail();
    }
  }

  function addMsg(role, text) {
    var d = document.createElement('div');
    d.className = 'jm ' + (role === 'user' ? 'user' : (role === 'sys' ? 'sys' : 'bot'));
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    d.textContent = text;
    if (role !== 'sys') {
      var cp = document.createElement('button');
      cp.type = 'button';
      cp.className = 'jm-copy';
      cp.textContent = 'Copy';
      cp.title = 'Copy message — preserves line breaks';
      cp.addEventListener('click', function (ev) {
        ev.stopPropagation();
        copyText(text, cp);
      });
      d.appendChild(cp);
    }
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return d;
  }
  function busy(on) {
    sendBtn.disabled = on;
    typingEl.classList.toggle('on', on);
    inEl.disabled = on;
  }

  function send() {
    var msg = inEl.value.trim();
    if (!msg || sendBtn.disabled) return;
    var pin = storedPin();
    if (!pin) { pinEl.classList.add('show'); chatEl.classList.remove('show'); return; }
    var hist = loadHist();
    var h = hist.slice(-8).map(function (m) { return { role: m.role, content: String(m.content).slice(0, 600) }; });
    addMsg('user', msg);
    hist.push({ role: 'user', content: msg });
    saveHist(hist);
    inEl.value = '';
    busy(true);
    fetch(API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin_hash: pin, message: msg, history: h })
    }).then(function (r) {
      if (r.status === 401) {
        localStorage.removeItem(AUTH_KEY);
        busy(false);
        pinEl.classList.add('show'); chatEl.classList.remove('show');
        throw new Error('pin');
      }
      if (r.status === 429) { addMsg('sys', 'Too many messages — wait a minute.'); busy(false); throw new Error('rate'); }
      if (!r.ok) { addMsg('sys', 'Chat is offline right now — try again in a bit.'); busy(false); throw new Error('offline'); }
      return r.json();
    }).then(function (j) {
      var tries = 0;
      (function poll() {
        tries++;
        fetch(API + '/reply?id=' + encodeURIComponent(j.id), { method: 'GET' })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.reply) {
              busy(false);
              addMsg('bot', d.reply);
              hist.push({ role: 'assistant', content: d.reply });
              saveHist(hist);
            } else if (tries < POLL_MAX) {
              setTimeout(poll, POLL_MS);
            } else {
              busy(false);
              addMsg('sys', 'Timed out waiting for the agent — try again.');
            }
          })
          .catch(function () {
            if (tries < POLL_MAX) { setTimeout(poll, POLL_MS); } else { busy(false); addMsg('sys', 'Timed out — try again.'); }
          });
      })();
    }).catch(function () { busy(false); });
  }

  B.addEventListener('click', function () { P.classList.contains('open') ? P.classList.remove('open') : openPanel(); });
  document.getElementById('jlr-close').addEventListener('click', function () { P.classList.remove('open'); });
  document.getElementById('jlr-pin-go').addEventListener('click', function () {
    var v = pinIn.value.trim();
    if (!v) return;
    sha256(v).then(function (h) {
      // Verify against the bridge before trusting it (no agent run fired)
      return fetch(API + '/auth?pin=' + encodeURIComponent(h), { method: 'GET' }).then(function (r) {
        if (r.status === 401) { pinErr.style.display = 'block'; pinIn.value = ''; throw new Error('badpin'); }
        if (!r.ok) { pinErr.textContent = 'Chat is offline — try again in a bit.'; pinErr.style.display = 'block'; throw new Error('offline'); }
        savePin(h);
        pinErr.style.display = 'none';
        pinErr.textContent = 'Wrong PIN';
        pinIn.value = '';
        showChat();
      }).catch(function (e) { if (e.message !== 'badpin') { pinErr.textContent = 'Chat is offline — try again in a bit.'; pinErr.style.display = 'block'; } });
    });
  });
  pinIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('jlr-pin-go').click(); });
  sendBtn.addEventListener('click', send);
  inEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
})();
