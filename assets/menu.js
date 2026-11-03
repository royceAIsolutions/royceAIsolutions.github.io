/* RoyceAI site drawer/menu -- the ONE copy. 33 pages used to carry this script inline and four of
   them shipped with the wrapper cut off, which killed the whole script and left the burger dead.
   Fix it here once. Pages load it with <script src="/assets/menu.js" defer></script>. */

(function(){
  function initMobileMenu(){
    var burger=document.getElementById('navBurger');
    if(!burger||document.getElementById('mobileMenu').dataset.mnInit)return;
    var menu=document.getElementById('mobileMenu');
    var backdrop=document.getElementById('mobileMenuBackdrop');
    var links=document.querySelector('.nav-links');
    if(links&&!menu.querySelector('a[data-mn]')){
      links.querySelectorAll('a').forEach(function(a){if(a.closest('#navLoginBtn'))return;var h=a.getAttribute('href')||'';if(!a.classList.contains('nav-drawer-only')&&h!=='/products'&&h!=='/subscribe')return;var c=a.cloneNode(true);c.setAttribute('data-mn','1');menu.appendChild(c);});
    }
    var p=location.pathname;
    if(p.length>1&&p.endsWith('/'))p=p.slice(0,-1);
    menu.querySelectorAll('a').forEach(function(a){
      var h=a.getAttribute('href')||'';
      h=h.split('?')[0].split('#')[0];
      if(h.length>1&&h.endsWith('/'))h=h.slice(0,-1);
      if(h==='/'?p==='/':p.indexOf(h)===0)a.classList.add('active');
    });
    function open(){menu.classList.add('open');backdrop.classList.add('open');burger.classList.add('open');burger.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';}
    function close(){menu.classList.remove('open');backdrop.classList.remove('open');burger.classList.remove('open');burger.setAttribute('aria-expanded','false');document.body.style.overflow='';}
    burger.addEventListener('click',function(){menu.classList.contains('open')?close():open();});
    backdrop.addEventListener('click',close);
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
    menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',close);});
    menu.dataset.mnInit='1';
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initMobileMenu);}else{initMobileMenu();}
})();