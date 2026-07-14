/* Floating Chat Widget — Royce AI Solutions v2 No Telegram */
(function(){'use strict';
const API='https://chat-api-tawny-zeta.vercel.app/api/chat',PK='royceai_lead',HK='royceai_chat_history';
const S=document.createElement('style');S.textContent=`
#rc-btn{position:fixed;bottom:24px;right:24px;z-index:99999;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(102,126,234,0.4);display:flex;align-items:center;justify-content:center;font-size:26px;transition:all .3s cubic-bezier(.16,1,.3,1)}
#rc-btn:hover{transform:scale(1.1)}
#rc-panel{position:fixed;bottom:96px;right:24px;z-index:99998;width:380px;height:580px;max-height:calc(100vh-120px);background:#111;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 8px 48px rgba(0,0,0,.5);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif;font-size:14px;color:#f5f5f5}
#rc-panel.open{display:flex}
#rc-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;font-size:15px;flex-shrink:0}
#rc-hdr .logo{display:flex;align-items:center;gap:6px}#rc-hdr .logo span{color:#667eea}
#rc-close{background:none;border:none;color:#a1a1aa;font-size:16px;cursor:pointer;padding:4px}
#rc-lead{display:none;flex-direction:column;gap:8px;padding:20px 16px;flex:1}
#rc-lead.show{display:flex}
#rc-lead h3{margin:0;font-size:16px}#rc-lead p{font-size:12px;color:#a1a1aa;margin:0 0 4px}
#rc-lead input{padding:10px 12px;border-radius:8px;background:#0a0a0a;border:1px solid rgba(255,255,255,.08);color:#f5f5f5;font-family:inherit;font-size:13px;outline:none}
#rc-lead input:focus{border-color:#667eea}
#rc-lead .err{color:#ef4444;font-size:11px;display:none}
#rc-lead-submit{padding:10px;background:#667eea;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:4px;font-family:inherit}
#rc-chat{display:none;flex-direction:column;flex:1;min-height:0}
#rc-chat.show{display:flex}
#rc-msgs{flex:1;overflow-y:auto;padding:12px 12px 4px;display:flex;flex-direction:column;gap:6px}
.rc-msg{max-width:88%;padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.5;word-wrap:break-word}
.rc-msg.user{align-self:flex-end;background:#667eea;color:white;border-bottom-right-radius:3px}
.rc-msg.bot{align-self:flex-start;background:#1a1a1a;border:1px solid rgba(255,255,255,.06);border-bottom-left-radius:3px}
.rc-typing{display:flex;gap:3px;align-self:flex-start;padding:10px 14px;background:#1a1a1a;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.rc-typing span{width:6px;height:6px;border-radius:50%;background:#a1a1aa;animation:rcB 1.4s infinite}
.rc-typing span:nth-child(2){animation-delay:.2s}.rc-typing span:nth-child(3){animation-delay:.4s}
@keyframes rcB{0%,80%,100%{opacity:.3}40%{opacity:1}}
#rc-input{display:flex;gap:6px;padding:8px 12px 12px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}
#rc-input input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:#0a0a0a;color:#f5f5f5;font-family:inherit;font-size:13px;outline:none}
#rc-input input:focus{border-color:#667eea}
#rc-send{width:40px;height:40px;border-radius:8px;border:none;background:#667eea;color:white;font-size:16px;cursor:pointer;flex-shrink:0}
#rc-send:disabled{opacity:.4}
@media(max-width:480px){#rc-panel{width:calc(100vw-12px);right:6px;bottom:86px;max-height:calc(100vh-96px)}#rc-btn{width:52px;height:52px;font-size:22px;right:16px;bottom:16px}}
`;document.head.appendChild(S);

// Build HTML
const B=document.createElement('button');B.id='rc-btn';B.textContent='💬';
const P=document.createElement('div');P.id='rc-panel';
P.innerHTML=`<div id="rc-hdr"><div class="logo">Royce<span>AI</span></div><button id="rc-close">✕</button></div>
<div id="rc-lead"><h3>👋 Let's talk</h3><p>Your name is all I need.</p><input id="rc-name" placeholder="Your name"><div class="err" id="rc-name-err">Please enter your name</div><button id="rc-lead-submit">Start Chatting →</button></div>
<div id="rc-chat"><div id="rc-msgs"><div class="rc-msg bot">👋 Hey! What can I help with?</div></div><div id="rc-input"><input id="rc-msg" placeholder="Ask me anything..."><button id="rc-send">➤</button></div></div>`;
document.body.appendChild(B);document.body.appendChild(P);

// State
let L=null,H=[];

function gp(){try{return JSON.parse(localStorage.getItem(PK))}catch(e){return null}}
function sp(i){localStorage.setItem(PK,JSON.stringify(i))}
function lh(){try{var d=JSON.parse(localStorage.getItem(HK));if(Array.isArray(d))return d}catch(e){}return[]}
function sh(){localStorage.setItem(HK,JSON.stringify(H.slice(-80)))}
function rh(){var s=lh();if(!s.length)return false;H=s;var m=document.getElementById('rc-msgs');m.innerHTML='';for(var i=0;i<s.length;i++){var msg=s[i];if(msg.role==='user'||msg.role==='assistant'){var d=document.createElement('div');d.className='rc-msg '+(msg.role==='user'?'user':'bot');d.textContent=msg.content;m.appendChild(d)}}return true}

function showChat(had){
  document.getElementById('rc-lead').classList.remove('show');
  document.getElementById('rc-chat').classList.add('show');
  document.getElementById('rc-msg').focus();
  if(had){
    var m=document.getElementById('rc-msgs');
    var sep=document.createElement('div');
    sep.style.cssText='text-align:center;font-size:11px;color:#52525b;padding:4px 0';
    sep.textContent='↻ Welcome back';
    m.appendChild(sep);
  }
}

B.addEventListener('click',function(){
  P.classList.toggle('open');
  if(P.classList.contains('open')){
    var saved=gp();
    if(saved){L=saved;showChat(rh())}
    else{document.getElementById('rc-lead').classList.add('show')}
  }
});

document.getElementById('rc-close').addEventListener('click',function(){P.classList.remove('open')});

document.getElementById('rc-lead-submit').addEventListener('click',function(){
  var n=document.getElementById('rc-name').value.trim();
  if(!n){document.getElementById('rc-name-err').style.display='block';return}
  document.getElementById('rc-name-err').style.display='none';
  L={name:n,email:n.toLowerCase().replace(/\s+/g,'.')+'@c.royceai.com',phone:'000-000-0000',timestamp:new Date().toISOString()};
  sp(L);
  var had=rh();showChat(had);
});

document.getElementById('rc-send').addEventListener('click',sendMsg);
document.getElementById('rc-msg').addEventListener('keydown',function(e){if(e.key==='Enter')sendMsg()});

function sendMsg(){
  var inp=document.getElementById('rc-msg'),t=inp.value.trim();
  if(!t)return;inp.value='';document.getElementById('rc-send').disabled=true;
  var m=document.getElementById('rc-msgs');
  var u=document.createElement('div');u.className='rc-msg user';u.textContent=t;m.appendChild(u);m.scrollTop=m.scrollHeight;
  H.push({role:'user',content:t});sh();
  var ty=document.createElement('div');ty.className='rc-typing';ty.id='rc-ty';ty.innerHTML='<span></span><span></span><span></span>';m.appendChild(ty);m.scrollTop=m.scrollHeight;
  
  fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,lead:L,history:H.slice(-30)})})
  .then(function(r){return r.json()})
  .then(function(data){
    var te=document.getElementById('rc-ty');if(te)te.remove();
    var reply=data.reply||'Thanks for your message!';
    H.push({role:'assistant',content:reply});sh();
    var b=document.createElement('div');b.className='rc-msg bot';b.textContent=reply;m.appendChild(b);m.scrollTop=m.scrollHeight;
    document.getElementById('rc-send').disabled=false;
  })
  .catch(function(){
    var te=document.getElementById('rc-ty');if(te)te.remove();
    var b=document.createElement('div');b.className='rc-msg bot';b.textContent='⚠️ Connection error. Try again.';m.appendChild(b);
    document.getElementById('rc-send').disabled=false;
  });
}
})();
