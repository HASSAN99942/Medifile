/* MediFile — base.js
   UI helpers repris de legacy/js/app.js (burger, toast, modal, tabs).
   Pas de routeur SPA : la navigation est servie par Django. */

/* ── BURGER (global, toujours dispo) ─────── */
function toggleSidebar(){
  const s=document.getElementById('sidebar'),o=document.getElementById('overlay'),b=document.getElementById('burger');
  if(!s)return;
  const open=s.classList.toggle('open');
  if(o)o.classList.toggle('on',open);
  if(b)b.textContent=open?'✕':'☰';
}
function closeSidebar(){
  const s=document.getElementById('sidebar'),o=document.getElementById('overlay'),b=document.getElementById('burger');
  if(s)s.classList.remove('open');
  if(o)o.classList.remove('on');
  if(b)b.textContent='☰';
}

/* ── TOAST ────────────────────────────────── */
function toast(msg,type='ok',dur=3500){
  const c=document.getElementById('toasts');
  if(!c)return;
  const icons={ok:'✅',er:'❌',wa:'⚠️',info:'ℹ️'};
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(()=>t.remove(),400); },dur);
}

/* ── MODAL ────────────────────────────────── */
function setModal(html){ document.getElementById('modal-wrap').innerHTML=html; }
function closeModal(e){ if(!e||e.target.classList.contains('mo')) document.getElementById('modal-wrap').innerHTML=''; }
function closeModalForce(){ document.getElementById('modal-wrap').innerHTML=''; }

/* ── TABS ─────────────────────────────────── */
function switchTab(btn,id){
  const tabs=btn.closest('.tabs')?.querySelectorAll('.tab');
  tabs&&tabs.forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  const area=document.querySelector('.content')||document.body;
  area.querySelectorAll('.tc').forEach(tc=>tc.classList.remove('on'));
  const el=document.getElementById(id);
  if(el)el.classList.add('on');
}
