/* Floating Chat Widget — Royce AI Solutions */
(function() {
'use strict';

const API_URL = 'https://chat-api-tawny-zeta.vercel.app/api/chat';

// ---- Styles ----
const CSS = `
#rc-widget-btn {
  position: fixed; bottom: 24px; right: 24px; z-index: 99999;
  width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; cursor: pointer; box-shadow: 0 4px 24px rgba(102,126,234,0.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
  animation: rc-pulse 2.5s ease-in-out infinite;
}
#rc-widget-btn:hover { transform: scale(1.1); }
@keyframes rc-pulse {
  0%,100% { box-shadow: 0 4px 24px rgba(102,126,234,0.4); }
  50% { box-shadow: 0 4px 40px rgba(102,126,234,0.6), 0 0 60px rgba(102,126,234,0.2); }
}
#rc-widget-panel {
  position: fixed; bottom: 96px; right: 24px; z-index: 99998;
  width: 380px; height: 580px; max-height: calc(100vh - 120px);
  background: #111; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; box-shadow: 0 8px 48px rgba(0,0,0,0.5);
  display: none; flex-direction: column; overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px; color: #f5f5f5; line-height: 1.5;
}
#rc-widget-panel.open { display: flex; }
#rc-widget-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06);
  background: #0a0a0a;
}
#rc-widget-header .logo { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; }
#rc-widget-header .logo span { color: #667eea; }
#rc-widget-close {
  background: none; border: none; color: #a1a1aa; font-size: 20px;
  cursor: pointer; padding: 4px; line-height: 1;
}
#rc-widget-close:hover { color: #f5f5f5; }

#rc-widget-lead { padding: 24px 20px; display: flex; flex-direction: column; gap: 0; }
#rc-widget-lead.hidden { display: none; }
#rc-widget-lead h3 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
#rc-widget-lead p { color: #a1a1aa; font-size: 12px; margin-bottom: 18px; }
#rc-widget-lead input {
  width: 100%; padding: 10px 14px; margin-bottom: 10px;
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: #f5f5f5; font-size: 13px; font-family: inherit;
  outline: none; box-sizing: border-box;
}
#rc-widget-lead input:focus { border-color: #667eea; }
#rc-widget-lead input::placeholder { color: #52525b; }
#rc-widget-lead .error { color: #ef4444; font-size: 11px; margin-top: -6px; margin-bottom: 6px; display: none; }

#rc-widget-chat { display: none; flex-direction: column; flex: 1; min-height: 0; }
#rc-widget-chat.open { display: flex; }
#rc-widget-msgs { flex: 1; overflow-y: auto; padding: 16px 16px 8px; display: flex; flex-direction: column; gap: 6px; }
#rc-widget-msgs::-webkit-scrollbar { width: 3px; }
#rc-widget-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
.rc-msg { max-width: 88%; padding: 8px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; animation: rc-fade 0.2s ease; }
@keyframes rc-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.rc-msg.user { align-self: flex-end; background: #667eea; color: white; border-bottom-right-radius: 3px; }
.rc-msg.bot { align-self: flex-start; background: #1a1a1a; color: #f5f5f5; border: 1px solid rgba(255,255,255,0.06); border-bottom-left-radius: 3px; }
.rc-msg.bot a, .rc-msg.bot strong { color: #667eea; }

.rc-typing { align-self: flex-start; background: #1a1a1a; padding: 10px 16px; border-radius: 10px; border-bottom-left-radius: 3px; border: 1px solid rgba(255,255,255,0.06); display: flex; gap: 4px; }
.rc-typing span { width: 6px; height: 6px; background: #a1a1aa; border-radius: 50%; animation: rc-bounce 1.4s infinite ease-in-out; }
.rc-typing span:nth-child(2) { animation-delay: 0.2s; }
.rc-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes rc-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }

#rc-widget-input {
  display: flex; gap: 6px; padding: 10px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: #0a0a0a;
}
#rc-widget-input input {
  flex: 1; border: none; outline: none; font-size: 13px; font-family: inherit;
  background: transparent; color: #f5f5f5;
}
#rc-widget-input input::placeholder { color: #52525b; }
#rc-widget-input button {
  width: 34px; height: 34px; border-radius: 8px;
  background: #667eea; color: white; border: none;
  font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
#rc-widget-input button:hover { background: #7c93f5; }
#rc-widget-input button:disabled { background: rgba(255,255,255,0.06); cursor: not-allowed; }

@media (max-width: 480px) {
  #rc-widget-panel { width: calc(100vw - 20px); right: 10px; bottom: 86px; max-height: calc(100vh - 100px); }
  #rc-widget-btn { width: 52px; height: 52px; font-size: 22px; right: 16px; bottom: 16px; }
}
`;

// ---- Inject styles ----
const styleEl = document.createElement('style');
styleEl.textContent = CSS;
document.head.appendChild(styleEl);

// ---- Build HTML ----
const btn = document.createElement('button');
btn.id = 'rc-widget-btn';
btn.innerHTML = '💬';

const panel = document.createElement('div');
panel.id = 'rc-widget-panel';
panel.innerHTML = `
<div id="rc-widget-header">
  <div class="logo">Royce<span>AI</span></div>
  <button id="rc-widget-close">✕</button>
</div>
<div id="rc-widget-lead">
  <h3>👋 Let's talk</h3>
  <p>Leave your details and I'll connect you right in.</p>
  <input type="text" id="rc-lead-name" placeholder="Your name">
  <div class="error" id="rc-name-err">Please enter your name</div>
  <input type="email" id="rc-lead-email" placeholder="Email">
  <div class="error" id="rc-email-err">Please enter a valid email</div>
  <input type="tel" id="rc-lead-phone" placeholder="Phone">
  <div class="error" id="rc-phone-err">Please enter a valid phone</div>
  <button id="rc-lead-submit" style="width:100%;padding:10px;background:#667eea;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px;">Start Chatting →</button>
</div>
<div id="rc-widget-chat">
  <div id="rc-widget-msgs">
    <div class="rc-msg bot">👋 Hey! I'm RoyceAI. Ask me about AI Receptionists, Tutoring, Websites, or Business AI — what can I help with?</div>
  </div>
  <div id="rc-widget-input">
    <input type="text" id="rc-msg-input" placeholder="Ask me anything..." autocomplete="off">
    <button id="rc-send-btn">➤</button>
  </div>
</div>
`;

document.body.appendChild(btn);
document.body.appendChild(panel);

// ---- State ----
let leadInfo = null;
let history = [];
const PROFILE_KEY = 'royceai_lead';
const HISTORY_KEY = 'royceai_chat_history';

function getProfile() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch(e) { return null; } }
function saveProfile(info) { localStorage.setItem(PROFILE_KEY, JSON.stringify(info)); }
function loadHistory() { try { const d = JSON.parse(localStorage.getItem(HISTORY_KEY)); if (Array.isArray(d)) return d; } catch(e) {} return []; }
function saveHistory() { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100))); }

// ---- Replay history ----
function replayHistory() {
  const saved = loadHistory();
  if (saved.length === 0) return false;
  history = saved;
  const msgs = document.getElementById('rc-widget-msgs');
  msgs.innerHTML = '';
  for (const msg of history) {
    const d = document.createElement('div');
    d.className = 'rc-msg ' + (msg.role === 'user' ? 'user' : 'bot');
    d.textContent = msg.content;
    msgs.appendChild(d);
  }
  return true;
}

function showChat(hasHistory) {
  document.getElementById('rc-widget-lead').classList.add('hidden');
  document.getElementById('rc-widget-chat').classList.add('open');
  if (hasHistory) {
    const msgs = document.getElementById('rc-widget-msgs');
    const sep = document.createElement('div');
    sep.style.cssText = 'text-align:center;font-size:11px;color:#52525b;padding:4px 0;';
    sep.textContent = '↻ Welcome back — continuing';
    msgs.appendChild(sep);
  }
  document.getElementById('rc-msg-input').focus();
}

// ---- Lead submit ----
document.getElementById('rc-lead-submit').addEventListener('click', function() {
  const name = document.getElementById('rc-lead-name').value.trim();
  const email = document.getElementById('rc-lead-email').value.trim();
  const phone = document.getElementById('rc-lead-phone').value.trim();
  let valid = true;

  if (!name) { document.getElementById('rc-name-err').style.display = 'block'; valid = false; }
  else { document.getElementById('rc-name-err').style.display = 'none'; }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('rc-email-err').style.display = 'block'; valid = false;
  } else { document.getElementById('rc-email-err').style.display = 'none'; }

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (!phone || !(/^(\+?1?\d{10})$/.test(cleaned) || /^\d{10}$/.test(cleaned))) {
    document.getElementById('rc-phone-err').style.display = 'block'; valid = false;
  } else { document.getElementById('rc-phone-err').style.display = 'none'; }

  if (!valid) return;

  leadInfo = { name, email, phone, timestamp: new Date().toISOString() };
  saveProfile(leadInfo);
  const had = replayHistory();
  showChat(had);
});

// ---- Send message ----
document.getElementById('rc-send-btn').addEventListener('click', sendMsg);
document.getElementById('rc-msg-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMsg();
});

function sendMsg() {
  const input = document.getElementById('rc-msg-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  document.getElementById('rc-send-btn').disabled = true;
  
  const msgs = document.getElementById('rc-widget-msgs');
  const userDiv = document.createElement('div');
  userDiv.className = 'rc-msg user';
  userDiv.textContent = text;
  msgs.appendChild(userDiv);
  msgs.scrollTop = msgs.scrollHeight;
  
  history.push({ role: 'user', content: text });
  saveHistory();

  // Show typing
  const typing = document.createElement('div');
  typing.className = 'rc-typing';
  typing.id = 'rc-typing-el';
  typing.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  fetch(API_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, lead: leadInfo, history: history.slice(-40) }),
  })
  .then(r => r.json())
  .then(async data => {
    const typingEl = document.getElementById('rc-typing-el');
    if (typingEl) typingEl.remove();

    if (data.sent && data.requestId) {
      let reply = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const r = await fetch(API_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkId: data.requestId }),
          });
          const d = await r.json();
          if (d.found && d.reply) { reply = d.reply; break; }
        } catch(e) {}
      }
      if (reply) {
        history.push({ role: 'assistant', content: reply });
        saveHistory();
        const botDiv = document.createElement('div');
        botDiv.className = 'rc-msg bot';
        botDiv.textContent = reply;
        msgs.appendChild(botDiv);
      } else {
        const botDiv = document.createElement('div');
        botDiv.className = 'rc-msg bot';
        botDiv.textContent = 'Thanks! Royce will get back to you shortly.';
        msgs.appendChild(botDiv);
      }
    } else {
      const botDiv = document.createElement('div');
      botDiv.className = 'rc-msg bot';
      botDiv.textContent = data.reply || 'Thanks for your message!';
      history.push({ role: 'assistant', content: data.reply || '' });
      saveHistory();
      msgs.appendChild(botDiv);
    }
    msgs.scrollTop = msgs.scrollHeight;
    document.getElementById('rc-send-btn').disabled = false;
  })
  .catch(() => {
    const typingEl = document.getElementById('rc-typing-el');
    if (typingEl) typingEl.remove();
    const botDiv = document.createElement('div');
    botDiv.className = 'rc-msg bot';
    botDiv.textContent = '⚠️ Connection error. Try again later.';
    msgs.appendChild(botDiv);
    document.getElementById('rc-send-btn').disabled = false;
  });
}

// ---- Panel toggle ----
btn.addEventListener('click', function() {
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    const saved = getProfile();
    if (saved) {
      leadInfo = saved;
      document.getElementById('rc-widget-lead').classList.add('hidden');
      document.getElementById('rc-widget-chat').classList.add('open');
      const had = replayHistory();
      if (had) {
        const msgs = document.getElementById('rc-widget-msgs');
        const sep = document.createElement('div');
        sep.style.cssText = 'text-align:center;font-size:11px;color:#52525b;padding:4px 0;';
        sep.textContent = '↻ Welcome back';
        msgs.appendChild(sep);
      }
      document.getElementById('rc-msg-input').focus();
    }
  }
});

document.getElementById('rc-widget-close').addEventListener('click', function() {
  panel.classList.remove('open');
});

})();
