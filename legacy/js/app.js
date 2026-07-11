/* MediFile — app.js */

/* ═══════════════════════════════════════════
   MEDIFILE — APP CORE
   Routeur SPA, UI helpers, burger, modals
═══════════════════════════════════════════ */

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

/* ── STATE ────────────────────────────────── */
const S = { page:'login', sub:null, pid:null, q:'', online:navigator.onLine };

/* ── ROUTER ───────────────────────────────── */
function go(page, pid=null, sub=null){
  S.page=page; S.pid=pid; S.sub=sub;
  closeSidebar();
  render();
  window.scrollTo(0,0);
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

/* ── SIDEBAR DOCTOR ───────────────────────── */
function sidebarDoctor(){
  const m=getCurrentMedecin()||DB.medecins[0];
  const h=getHopital(m.hop);
  const links=[
    {ic:'🏠',lb:'Tableau de bord',pg:'d-home'},
    {ic:'👥',lb:'Mes patients',pg:'d-patients'},
    {ic:'📅',lb:'Rendez-vous',pg:'d-rdv',nb:DB.rdvs.filter(r=>r.medId===m.id).length},
    {ic:'💊',lb:'Ordonnances',pg:'d-ordos'},
    {ic:'🧪',lb:'Résultats',pg:'d-results'},
  ];
  return`
  <aside class="sidebar" id="sidebar" style="background:linear-gradient(180deg,#0D1F3C 0%,#0a2a22 100%)">
    <div class="s-logo">
      <div class="logo-wrap"><div class="logo-icon">🩺</div><div class="logo-txt">Medi<span>File</span></div></div>
      <div class="s-role-tag">Espace Médecin · ${h?h.nom:'—'}</div>
    </div>
    <nav class="s-nav">
      <div class="s-sect">Navigation</div>
      ${links.map(l=>`<button class="ni${S.page===l.pg?' act':''}" onclick="go('${l.pg}')"><span class="ic">${l.ic}</span>${l.lb}${l.nb?`<span class="nb">${l.nb}</span>`:''}</button>`).join('')}
      <div class="s-sect" style="margin-top:10px">Compte</div>
      <button class="ni${S.page==='d-settings'?' act':''}" onclick="go('d-settings')"><span class="ic">⚙️</span>Paramètres</button>
      <button class="ni" onclick="logout()"><span class="ic">🚪</span>Déconnexion</button>
    </nav>
    <div class="s-foot">
      <div class="u-chip" onclick="go('d-settings')">
        <div class="av">${m.av}</div>
        <div><div class="u-name">${m.prenom} ${m.nom}</div><div class="u-role">${m.spec}</div></div>
      </div>
    </div>
  </aside>`;
}

/* ── SIDEBAR PATIENT ──────────────────────── */
function sidebarPatient(){
  const p=getCurrentPatient();
  if(!p)return'';
  const links=[
    {ic:'🏠',lb:'Mon tableau de bord',pg:'p-home'},
    {ic:'📋',lb:'Mon historique',pg:'p-histo'},
    {ic:'💊',lb:'Mes ordonnances',pg:'p-ordos'},
    {ic:'🧪',lb:'Mes résultats',pg:'p-results'},
    {ic:'📅',lb:'Mes rendez-vous',pg:'p-rdv'},
    {ic:'📄',lb:'Mes documents',pg:'p-docs'},
    {ic:'🔐',lb:'Accès & Consentements',pg:'p-acces',nb:p.demandes_acces.filter(d=>d.statut==='pending').length||undefined},
  ];
  return`
  <aside class="sidebar" id="sidebar" style="background:linear-gradient(180deg,#0D1F3C 0%,#0a2d27 100%)">
    <div class="s-logo">
      <div class="logo-wrap"><div class="logo-icon">🩺</div><div class="logo-txt">Medi<span>File</span></div></div>
      <div class="s-role-tag">Espace Patient</div>
    </div>
    <nav class="s-nav">
      <div class="s-sect">Navigation</div>
      ${links.map(l=>`<button class="ni${S.page===l.pg?' act':''}" onclick="go('${l.pg}')"><span class="ic">${l.ic}</span>${l.lb}${l.nb?`<span class="nb">${l.nb}</span>`:''}</button>`).join('')}
      <div class="s-sect" style="margin-top:10px">Compte</div>
      <button class="ni${S.page==='p-profil'?' act':''}" onclick="go('p-profil')"><span class="ic">👤</span>Mon profil</button>
      <button class="ni" onclick="showHelpModal()"><span class="ic">❓</span>Aide</button>
      <button class="ni" onclick="logout()"><span class="ic">🚪</span>Déconnexion</button>
    </nav>
    <div class="s-foot">
      <div class="u-chip" onclick="go('p-profil')">
        <div class="av" style="background:var(--gold)">${p.prenom[0]}${p.nom[0]}</div>
        <div><div class="u-name">${p.prenom} ${p.nom}</div><div class="u-role">Patient · ${getHopital(p.hopital_inscrit)?.nom||'—'}</div></div>
      </div>
    </div>
  </aside>`;
}

/* ── SIDEBAR ADMIN ────────────────────────── */
function sidebarAdmin(){
  const hop=getHopital(DB.session.hopId);
  const links=[
    {ic:'🏠',lb:'Vue d\'ensemble',pg:'a-home'},
    {ic:'👨‍⚕️',lb:'Médecins',pg:'a-medecins'},
    {ic:'👥',lb:'Patients',pg:'a-patients'},
    {ic:'🏥',lb:'Mon établissement',pg:'a-hopital'},
    {ic:'📊',lb:'Statistiques',pg:'a-stats'},
  ];
  return`
  <aside class="sidebar" id="sidebar" style="background:linear-gradient(180deg,#0D1F3C 0%,#1a1060 100%)">
    <div class="s-logo">
      <div class="logo-wrap"><div class="logo-icon">🏥</div><div class="logo-txt">Medi<span>File</span></div></div>
      <div class="s-role-tag">Administrateur</div>
    </div>
    <nav class="s-nav">
      <div class="s-sect">Gestion ${hop?'— '+hop.nom:''}</div>
      ${links.map(l=>`<button class="ni${S.page===l.pg?' act':''}" onclick="go('${l.pg}')"><span class="ic">${l.ic}</span>${l.lb}</button>`).join('')}
      <div class="s-sect" style="margin-top:10px">Compte</div>
      <button class="ni" onclick="logout()"><span class="ic">🚪</span>Déconnexion</button>
    </nav>
    <div class="s-foot">
      <div class="u-chip">
        <div class="av" style="background:var(--purple)">AD</div>
        <div><div class="u-name">${hop?hop.admin:'Administrateur'}</div><div class="u-role">${hop?hop.nom:'Super Admin'}</div></div>
      </div>
    </div>
  </aside>`;
}

/* ── TOPBAR ───────────────────────────────── */
function topbar(title,showSearch=true){
  return`
  ${!S.online?`<div class="off-bar">📶 Mode hors-ligne — données locales</div>`:''}
  <header class="topbar">
    <div class="tb-l"><h1 class="pg-ttl">${title}</h1></div>
    <div class="tb-r">
      ${showSearch?`<div class="srch"><span>🔍</span><input type="text" placeholder="Rechercher…" value="${S.q}" oninput="S.q=this.value" onkeydown="if(event.key==='Enter')go('d-patients')"></div>`:''}
      <div class="ibtn" onclick="showNotifs()" title="Notifications">🔔<span class="ndot"></span></div>
      <div class="ibtn" onclick="go(DB.session.role==='patient'?'p-profil':'d-settings')">👤</div>
    </div>
  </header>`;
}
function ptopbar(title){ return topbar(title,false); }

/* ── RENDER ───────────────────────────────── */
function render(){
  const root=document.getElementById('root');
  const sw=document.getElementById('sidebar-wrap');
  const burger=document.getElementById('burger');
  if(!root)return;

  const role=DB.session.role;

  // Sidebar
  if(role==='doctor'){  sw.innerHTML=sidebarDoctor(); if(burger)burger.style.display=''; }
  else if(role==='patient'){ sw.innerHTML=sidebarPatient(); if(burger)burger.style.display=''; }
  else if(role==='admin'){  sw.innerHTML=sidebarAdmin();  if(burger)burger.style.display=''; }
  else{ sw.innerHTML=''; if(burger)burger.style.display='none'; }

  // Page
  const pages={
    login,register,
    'd-home':dHome,'d-patients':dPatients,'d-patient':dPatient,
    'd-rdv':dRdv,'d-ordos':dOrdos,'d-results':dResults,'d-settings':dSettings,
    'd-locked':dLocked,
    'p-home':pHome,'p-histo':pHisto,'p-ordos':pOrdos,'p-results':pResults,
    'p-rdv':pRdv,'p-docs':pDocs,'p-acces':pAcces,'p-profil':pProfil,
    'a-home':aHome,'a-medecins':aMedecins,'a-patients':aPatients,
    'a-hopital':aHopital,'a-stats':aStats,
  };
  const fn=pages[S.page]||login;
  root.innerHTML=fn();
  document.getElementById('modal-wrap').innerHTML='';
}

/* ── AUTH ─────────────────────────────────── */
function logout(){
  if(confirm('Voulez-vous vraiment vous déconnecter ?')){
    DB.session.role=null; DB.session.userId=null; DB.session.hopId=null;
    go('login'); toast('Déconnexion réussie','info');
  }
}

/* ── UTILS ────────────────────────────────── */
function switchTab(btn,id){
  const tabs=btn.closest('.tabs')?.querySelectorAll('.tab');
  tabs&&tabs.forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  const area=document.querySelector('.content')||document.body;
  area.querySelectorAll('.tc').forEach(tc=>tc.classList.remove('on'));
  const el=document.getElementById(id);
  if(el)el.classList.add('on');
}

function showNotifs(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">🔔 Notifications</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        ${[
          {ic:'🔴',txt:'Résultat critique — Emmanuel Nguema : SpO2 91%',t:'Il y a 2h'},
          {ic:'🔐',txt:'Jean Diallo a accordé un accès temporaire au Dr. Fouda',t:'Il y a 1h'},
          {ic:'✅',txt:'RDV confirmé — Fatoumata Diallo, 10 déc. 09h15',t:'Il y a 3h'},
          {ic:'💊',txt:'Ordonnance expirée — Mariam Coulibaly',t:'Il y a 3 jours'},
        ].map(n=>`
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:1.2rem;flex-shrink:0">${n.ic}</span>
            <div style="flex:1"><div style="font-size:.85rem;font-weight:500">${n.txt}</div><div style="font-size:.72rem;color:var(--slate);margin-top:2px">${n.t}</div></div>
          </div>`).join('')}
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="toast('Toutes lues','ok');closeModalForce()">Tout marquer lu</button>
        <button class="btn btn-p" onclick="closeModalForce()">Fermer</button>
      </div>
    </div>
  </div>`);
}

function showHelpModal(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">❓ Aide MediFile</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        ${[
          ['🔐','Accès & Consentements','Gérez qui peut voir votre dossier. Approuvez ou refusez les demandes des médecins.'],
          ['💊','Mes ordonnances','Consultez, téléchargez et partagez vos ordonnances actives.'],
          ['🧪','Mes résultats','Vos analyses avec interprétation code couleur.'],
          ['📅','Mes rendez-vous','Consultez et gérez vos RDV. Demandez-en de nouveaux.'],
          ['📋','Mon historique','Toutes vos consultations passées en langage clair.'],
        ].map(([ic,q,a])=>`
          <div style="background:var(--mist);border-radius:var(--rs);padding:13px;margin-bottom:9px">
            <div style="font-weight:700;margin-bottom:4px">${ic} ${q}</div>
            <div style="font-size:.83rem;color:var(--slate)">${a}</div>
          </div>`).join('')}
      </div>
      <div class="md-ftr"><button class="btn btn-p" onclick="closeModalForce()">Compris !</button></div>
    </div>
  </div>`);
}

/* ── ONLINE/OFFLINE ───────────────────────── */
window.addEventListener('online',()=>{ S.online=true; render(); toast('Connexion rétablie','ok'); });
window.addEventListener('offline',()=>{ S.online=false; render(); toast('Hors ligne — données locales','wa'); });

/* ── BOOT ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>render());
