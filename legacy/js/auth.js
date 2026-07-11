/* MediFile — auth.js */

/* ═══════════════════════════════════════════
   MEDIFILE — AUTH PAGES
   Login, Inscription Patient/Médecin
═══════════════════════════════════════════ */

/* ── PAGE LOGIN ───────────────────────────── */
function login(){
  return`
  <div class="auth-wrap ani">
    <div class="auth-brand">
      <div class="logo-wrap"><div class="logo-icon" style="width:46px;height:46px;font-size:1.4rem">🩺</div><div class="logo-txt" style="font-size:1.5rem">Medi<span>File</span></div></div>
      <h2 class="auth-tag">Le dossier patient<br><span>numérique</span> pour<br>l'Afrique</h2>
      <p class="auth-desc">Accédez à l'historique médical complet de vos patients en moins de 20 secondes. Données sécurisées, accès contrôlé par le patient.</p>
      <div class="auth-feats">
        <div class="auth-feat"><div class="auth-feat-ic">🔐</div>Consentement patient — accès contrôlé par code ou QR</div>
        <div class="auth-feat"><div class="auth-feat-ic">📶</div>Mode hors-ligne — fonctionne avec connexion limitée</div>
        <div class="auth-feat"><div class="auth-feat-ic">🌍</div>Partageable entre hôpitaux — Douala, Bafoussam…</div>
        <div class="auth-feat"><div class="auth-feat-ic">🔒</div>Chiffrement RGPD — journaux d'audit complets</div>
      </div>
      <!-- Démo rapide -->
      <div style="margin-top:32px;background:rgba(255,255,255,.07);border-radius:var(--rs);padding:16px;position:relative;z-index:1">
        <div style="font-size:.7rem;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;margin-bottom:10px">Accès démo rapide</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn btn-s btn-sm" style="justify-content:flex-start" onclick="demoLogin('doctor')">👨‍⚕️ Dr. Amara Koné — CHU Douala</button>
          <button class="btn btn-sm" style="background:rgba(200,134,42,.2);color:var(--gold-l);justify-content:flex-start" onclick="demoLogin('patient')">🧑 Jean Diallo — Patient (Douala → Bafoussam)</button>
          <button class="btn btn-sm" style="background:rgba(107,70,193,.2);color:#c4b5fd;justify-content:flex-start" onclick="demoLogin('admin')">🏥 Administrateur — CHU Douala</button>
        </div>
      </div>
    </div>
    <div class="auth-side">
      <div class="auth-box">
        <h1 class="auth-ttl">Connexion</h1>
        <p class="auth-sub">Bienvenue sur MediFile — santé numérique sécurisée</p>

        <div style="margin-bottom:18px">
          <div style="font-size:.75rem;font-weight:700;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Je me connecte en tant que</div>
          <div class="role-sel">
            <div class="role-c sel" id="rc-doc" onclick="selectLoginRole('doctor')"><div class="role-ic">👨‍⚕️</div><div class="role-lb">Médecin</div></div>
            <div class="role-c" id="rc-pat" onclick="selectLoginRole('patient')"><div class="role-ic">🧑</div><div class="role-lb">Patient</div></div>
          </div>
          <div class="role-c" id="rc-adm" style="margin-top:8px;display:flex;align-items:center;gap:12px;padding:11px 14px" onclick="selectLoginRole('admin')">
            <span style="font-size:1.3rem">🏥</span>
            <div class="role-lb">Administrateur d'hôpital</div>
          </div>
        </div>

        <div class="auth-form">
          <div class="fg">
            <label class="lbl">Email ou identifiant</label>
            <div class="input-wrap">
              <span class="input-icon">📧</span>
              <input class="fc" type="email" id="login-email" placeholder="votre@email.cm">
            </div>
          </div>
          <div class="fg">
            <label class="lbl">Mot de passe</label>
            <div class="input-wrap">
              <span class="input-icon">🔑</span>
              <input class="fc fc-pass" type="password" id="login-pwd" placeholder="••••••••" style="padding-right:40px">
              <span class="toggle-pass" onclick="togglePwd('login-pwd',this)">👁️</span>
            </div>
          </div>
          <button class="btn btn-p btn-lg btn-full" onclick="doLogin()">Se connecter →</button>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <a href="#" class="auth-link" onclick="toast('Lien de réinitialisation envoyé','info');return false">Mot de passe oublié ?</a>
            <a href="#" class="auth-link" onclick="go('register');return false">Créer un compte →</a>
          </div>
          <div style="background:var(--teal-pale);border-radius:var(--rs);padding:11px 13px;font-size:.78rem;color:var(--teal)">
            💡 <strong>Démo :</strong> Utilisez les boutons rapides à gauche, ou cliquez <em>Se connecter</em> directement.
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── PAGE INSCRIPTION ─────────────────────── */
function register(){
  const step=S.sub||1;
  return`
  <div class="auth-wrap ani">
    <div class="auth-brand">
      <div class="logo-wrap"><div class="logo-icon" style="width:46px;height:46px;font-size:1.4rem">🩺</div><div class="logo-txt" style="font-size:1.5rem">Medi<span>File</span></div></div>
      <h2 class="auth-tag">Rejoignez<br><span>MediFile</span></h2>
      <p class="auth-desc">Créez votre compte patient ou médecin en quelques minutes. Votre dossier médical vous appartient.</p>
      <div style="margin-top:32px;position:relative;z-index:1">
        <div style="font-size:.72rem;color:rgba(255,255,255,.5);font-weight:700;text-transform:uppercase;margin-bottom:12px">Comment ça marche ?</div>
        ${[['1','Créer votre compte','Email + informations de base'],['2','Choisir votre hôpital','Rejoindre un établissement partenaire'],['3','Valider votre identité','Via votre médecin référent'],['4','Accéder à votre dossier','Consultez, partagez, contrôlez']].map(([n,t,s])=>`
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
            <div style="width:26px;height:26px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;flex-shrink:0">${n}</div>
            <div><div style="color:#fff;font-weight:600;font-size:.88rem">${t}</div><div style="color:rgba(255,255,255,.5);font-size:.78rem;margin-top:2px">${s}</div></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="auth-side">
      <div class="auth-box" style="max-width:460px">
        <!-- Indicateur d'étapes -->
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:0;margin-bottom:6px">
            ${[1,2,3,4].map((n,i,arr)=>`
              <div style="display:flex;flex-direction:column;align-items:center;flex:1">
                <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;${n<step?'background:var(--green);color:#fff':n===step?'background:var(--teal);color:#fff;box-shadow:0 0 0 4px rgba(10,126,110,.2)':'background:var(--border);color:var(--slate)'}">
                  ${n<step?'✓':n}
                </div>
                <div style="font-size:.58rem;font-weight:600;margin-top:4px;color:${n===step?'var(--teal)':'var(--slate)'};text-align:center;max-width:52px">
                  ${['Compte','Rôle','Hôpital','Confirmation'][i]}
                </div>
              </div>
              ${i<arr.length-1?`<div style="flex:none;width:30px;height:2px;background:${n<step?'var(--green)':'var(--border)'};margin-top:-16px"></div>`:''}`).join('')}
          </div>
        </div>

        ${step===1?registerStep1():step===2?registerStep2():step===3?registerStep3():registerStep4()}

        <div style="text-align:center;margin-top:16px">
          <a href="#" class="auth-link" onclick="go('login');return false">← Retour à la connexion</a>
        </div>
      </div>
    </div>
  </div>`;
}

function registerStep1(){
  return`
  <h1 class="auth-ttl">Créer un compte</h1>
  <p class="auth-sub">Étape 1 — Vos informations de base</p>
  <div class="auth-form">
    <div class="fgrid">
      <div class="fg"><label class="lbl">Prénom *</label><input class="fc" id="r-prenom" placeholder="Jean"></div>
      <div class="fg"><label class="lbl">Nom *</label><input class="fc" id="r-nom" placeholder="Diallo"></div>
    </div>
    <div class="fg">
      <label class="lbl">Email *</label>
      <div class="input-wrap"><span class="input-icon">📧</span><input class="fc" type="email" id="r-email" placeholder="jean@email.cm"></div>
    </div>
    <div class="fg">
      <label class="lbl">Téléphone</label>
      <div class="input-wrap"><span class="input-icon">📞</span><input class="fc" type="tel" id="r-tel" placeholder="+237 6XX XXX XXX"></div>
    </div>
    <div class="fg">
      <label class="lbl">Mot de passe *</label>
      <div class="input-wrap"><span class="input-icon">🔑</span><input class="fc fc-pass" type="password" id="r-pwd" placeholder="Min. 8 caractères" oninput="checkRegPwd(this.value)" style="padding-right:40px"><span class="toggle-pass" onclick="togglePwd('r-pwd',this)">👁️</span></div>
      <div class="pbar" style="margin-top:4px"><div class="pfill" id="reg-str" style="width:0;background:var(--red)"></div></div>
      <span id="reg-hint" style="font-size:.72rem;color:var(--slate)">Choisissez un mot de passe fort</span>
    </div>
    <div class="fg">
      <label class="lbl">Confirmer le mot de passe *</label>
      <div class="input-wrap"><span class="input-icon">🔑</span><input class="fc" type="password" id="r-pwd2" placeholder="Répétez le mot de passe"></div>
    </div>
    <div style="background:var(--teal-pale);border-radius:var(--rs);padding:10px 13px;font-size:.78rem;color:var(--teal)">
      🔒 Données chiffrées — conformité RGPD & loi camerounaise sur la cybersécurité
    </div>
    <button class="btn btn-p btn-lg btn-full" onclick="regNext1()">Continuer →</button>
  </div>`;
}

function registerStep2(){
  return`
  <h1 class="auth-ttl">Quel est votre rôle ?</h1>
  <p class="auth-sub">Étape 2 — Choisissez comment vous utilisez MediFile</p>
  <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
    <div class="role-c" id="rr-pat" onclick="selectRegRole('patient')" style="display:flex;align-items:center;gap:14px;padding:16px;text-align:left">
      <span style="font-size:2rem;flex-shrink:0">🧑</span>
      <div>
        <div class="role-lb" style="font-size:.95rem;margin-bottom:4px">Patient</div>
        <div style="font-size:.78rem;color:var(--slate)">Consultez votre dossier, contrôlez l'accès à vos données médicales</div>
      </div>
    </div>
    <div class="role-c" id="rr-doc" onclick="selectRegRole('doctor')" style="display:flex;align-items:center;gap:14px;padding:16px;text-align:left">
      <span style="font-size:2rem;flex-shrink:0">👨‍⚕️</span>
      <div>
        <div class="role-lb" style="font-size:.95rem;margin-bottom:4px">Médecin</div>
        <div style="font-size:.78rem;color:var(--slate)">Gérez vos patients, consultez les dossiers avec autorisation</div>
      </div>
    </div>
  </div>
  <div style="display:flex;gap:10px">
    <button class="btn btn-g btn-lg" style="flex:1" onclick="go('register',null,1)">← Retour</button>
    <button class="btn btn-p btn-lg" style="flex:2" onclick="regNext2()">Continuer →</button>
  </div>`;
}

function registerStep3(){
  const role=window._regRole||'patient';
  return`
  <h1 class="auth-ttl">${role==='patient'?'Votre hôpital':'Votre établissement'}</h1>
  <p class="auth-sub">Étape 3 — ${role==='patient'?'Choisissez votre établissement de santé':'Choisissez votre hôpital de rattachement'}</p>
  <div style="max-height:260px;overflow-y:auto;margin-bottom:18px">
    ${DB.hopitaux.filter(h=>h.statut==='Actif').map(h=>`
      <div class="hosp-card" id="hc-${h.id}" onclick="selectRegHosp('${h.id}')">
        <div class="hosp-logo" style="background:var(--teal-pale)">${h.logo}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.93rem">${h.nom}</div>
          <div style="font-size:.78rem;color:var(--slate);margin-top:2px">📍 ${h.ville}, ${h.region}</div>
          <div style="font-size:.72rem;color:var(--slate)">${h.medecins} médecin(s) enregistré(s)</div>
        </div>
        <span class="badge b-ok" style="flex-shrink:0">Actif</span>
      </div>`).join('')}
  </div>
  ${role==='patient'?`
  <div style="background:var(--teal-pale);border-radius:var(--rs);padding:10px 13px;font-size:.78rem;color:var(--teal);margin-bottom:16px">
    ℹ️ Vous pourrez accéder à votre dossier depuis n'importe quel hôpital partenaire avec votre consentement.
  </div>`:`
  <div style="background:#FFFBEB;border:1px solid #F6E05E;border-radius:var(--rs);padding:10px 13px;font-size:.78rem;color:#744210;margin-bottom:16px">
    ⚠️ Votre compte doit être validé par l'administrateur de l'hôpital avant activation.
  </div>`}
  <div style="display:flex;gap:10px">
    <button class="btn btn-g btn-lg" style="flex:1" onclick="go('register',null,2)">← Retour</button>
    <button class="btn btn-p btn-lg" style="flex:2" onclick="regNext3()">Continuer →</button>
  </div>`;
}

function registerStep4(){
  const role=window._regRole||'patient';
  const hosp=getHopital(window._regHosp)||DB.hopitaux[0];
  return`
  <div style="text-align:center;padding:20px 0">
    <div style="font-size:4rem;margin-bottom:16px">🎉</div>
    <h1 class="auth-ttl" style="margin-bottom:8px">Compte créé !</h1>
    <p style="color:var(--slate);font-size:.9rem;margin-bottom:24px;line-height:1.6">
      ${role==='patient'
        ?`Votre dossier patient a été créé et rattaché à <strong>${hosp.nom}</strong>.<br>Connectez-vous pour accéder à votre espace.`
        :`Votre compte médecin a été soumis à <strong>${hosp.nom}</strong>.<br>L'administrateur doit valider votre compte avant que vous puissiez vous connecter.`}
    </p>
    ${role==='patient'?`
    <div style="background:var(--teal-pale);border-radius:var(--rs);padding:16px;margin-bottom:20px;text-align:left">
      <div style="font-weight:700;font-size:.88rem;color:var(--teal);margin-bottom:8px">🆔 Vos identifiants de connexion</div>
      <div style="font-size:.83rem;color:var(--navy)">Email : <strong>${window._regEmail||'jean@email.cm'}</strong></div>
      <div style="font-size:.83rem;color:var(--navy);margin-top:4px">Numéro patient : <strong>PAT${Date.now().toString().slice(-3)}</strong></div>
    </div>`:`
    <div style="background:#FFFBEB;border:1px solid #F6E05E;border-radius:var(--rs);padding:14px;margin-bottom:20px;text-align:left">
      <div style="font-weight:700;font-size:.85rem;color:#744210;margin-bottom:4px">⏳ Validation en cours</div>
      <div style="font-size:.8rem;color:#7B341E">Vous recevrez un SMS de confirmation dès que l'administrateur de ${hosp.nom} aura validé votre compte.</div>
    </div>`}
    <button class="btn btn-p btn-xl btn-full" onclick="go('login')">← Aller à la connexion</button>
  </div>`;
}

/* ── AUTH ACTIONS ─────────────────────────── */
let _loginRole='doctor';
function selectLoginRole(r){
  _loginRole=r;
  ['rc-doc','rc-pat','rc-adm'].forEach(id=>{ const el=document.getElementById(id); if(el)el.classList.remove('sel'); });
  const map={doctor:'rc-doc',patient:'rc-pat',admin:'rc-adm'};
  document.getElementById(map[r])?.classList.add('sel');
}

function doLogin(){
  const email=document.getElementById('login-email')?.value.trim();
  const pwd=document.getElementById('login-pwd')?.value;
  // Demo : on accepte tout
  DB.session.role=_loginRole;
  if(_loginRole==='doctor'){ DB.session.userId='MED001'; DB.session.hopId='HOP001'; toast('Bienvenue, Dr. Koné !','ok'); setTimeout(()=>go('d-home'),400); }
  else if(_loginRole==='patient'){ DB.session.userId='PAT001'; toast('Bienvenue, Jean Diallo !','ok'); setTimeout(()=>go('p-home'),400); }
  else { DB.session.hopId='HOP001'; toast('Bienvenue, Administrateur !','ok'); setTimeout(()=>go('a-home'),400); }
}

function demoLogin(role){
  _loginRole=role;
  DB.session.role=role;
  if(role==='doctor'){ DB.session.userId='MED001'; DB.session.hopId='HOP001'; go('d-home'); toast('Connecté en tant que Dr. Amara Koné','ok'); }
  else if(role==='patient'){ DB.session.userId='PAT001'; go('p-home'); toast('Connecté en tant que Jean Diallo','ok'); }
  else { DB.session.hopId='HOP001'; go('a-home'); toast('Connecté en tant qu\'Administrateur','ok'); }
}

let _regRole='patient', _regHosp=null, _regEmail='';
function selectRegRole(r){
  _regRole=r; window._regRole=r;
  ['rr-pat','rr-doc'].forEach(id=>document.getElementById(id)?.classList.remove('sel'));
  document.getElementById(r==='patient'?'rr-pat':'rr-doc')?.classList.add('sel');
}
function selectRegHosp(id){
  _regHosp=id; window._regHosp=id;
  document.querySelectorAll('.hosp-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('hc-'+id)?.classList.add('selected');
}
function regNext1(){
  const p=document.getElementById('r-prenom')?.value.trim();
  const n=document.getElementById('r-nom')?.value.trim();
  const e=document.getElementById('r-email')?.value.trim();
  const pw=document.getElementById('r-pwd')?.value;
  const pw2=document.getElementById('r-pwd2')?.value;
  if(!p||!n||!e){ toast('Prénom, nom et email requis','er'); return; }
  if(pw&&pw!==pw2){ toast('Les mots de passe ne correspondent pas','er'); return; }
  window._regEmail=e;
  go('register',null,2);
}
function regNext2(){
  if(!_regRole){ toast('Choisissez un rôle','er'); return; }
  go('register',null,3);
}
function regNext3(){
  if(!_regHosp){ toast('Choisissez un hôpital','er'); return; }
  go('register',null,4);
}

function checkRegPwd(v){
  const bar=document.getElementById('reg-str');
  const hint=document.getElementById('reg-hint');
  if(!bar||!hint)return;
  let s=0;
  if(v.length>=8)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
  bar.style.width=[0,25,50,75,100][s]+'%';
  bar.style.background=['var(--red)','var(--red)','var(--orange)','var(--gold)','var(--green)'][s];
  hint.textContent=['','Faible — ajoutez des chiffres','Moyen — ajoutez des majuscules','Fort','Très fort ✓'][s]||'';
}

function togglePwd(id,btn){
  const inp=document.getElementById(id);
  if(!inp)return;
  inp.type=inp.type==='password'?'text':'password';
  btn.textContent=inp.type==='password'?'👁️':'🙈';
}
