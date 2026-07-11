/* MediFile — consent.js */

/* ═══════════════════════════════════════════
   MEDIFILE — SYSTÈME DE CONSENTEMENT
   Code temporaire, QR Code, validation,
   journal d'audit, gestion des accès
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   PAGE MÉDECIN — DOSSIER VERROUILLÉ
   Le médecin voit qu'un dossier existe
   mais ne peut pas y accéder sans autorisation
═══════════════════════════════════════════ */
function dLocked(){
  const p=getPatient(S.pid);
  if(!p) return`<div class="main"><div class="content"><p>Patient introuvable.</p></div></div>`;
  const m=getCurrentMedecin()||DB.medecins[0];
  const hop=getHopital(m.hop);

  // Vérifier si une demande est déjà en attente
  const existing=p.demandes_acces.find(d=>d.medId===m.id&&d.statut==='pending');

  return`
  <div class="main ani">
    ${topbar('Dossier patient',false)}
    <div class="content">
      <button class="btn btn-g btn-sm" style="margin-bottom:16px" onclick="go('d-patients')">← Retour</button>

      <!-- Info de base visible sans autorisation -->
      <div style="background:var(--white);border-radius:var(--r);padding:24px;border:1px solid var(--border);margin-bottom:20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">
        <div class="av av-lg" style="background:var(--slate);opacity:.6">${p.prenom[0]}${p.nom[0]}</div>
        <div>
          <div style="font-family:var(--fh);font-size:1.3rem;font-weight:800">${p.prenom} ${p.nom}</div>
          <div style="font-size:.8rem;color:var(--slate);margin-top:2px">
            <span class="badge b-info">Dossier enregistré</span>
            <span style="margin-left:8px">🏥 ${getHopital(p.hopital_inscrit)?.nom||'—'}</span>
          </div>
          <div style="font-size:.78rem;color:var(--slate);margin-top:4px;font-style:italic">
            ℹ️ Les informations détaillées nécessitent l'autorisation du patient.
          </div>
        </div>
        <div style="margin-left:auto">
          <span class="badge b-warn">🔒 Accès restreint</span>
        </div>
      </div>

      <!-- Écran de verrouillage principal -->
      <div class="locked-dossier">
        <div class="lock-icon">🔐</div>
        <div class="lock-title">Accès protégé par consentement</div>
        <div class="lock-sub">
          Le patient <strong>${p.prenom} ${p.nom}</strong> doit autoriser l'accès à son dossier.<br>
          Choisissez la méthode d'autorisation à utiliser :
        </div>

        <div class="lock-methods">
          <div class="lock-method" id="lm-code" onclick="selectLockMethod('code')">
            <div class="lock-method-ic">🔢</div>
            <div class="lock-method-lb">Code temporaire</div>
          </div>
          <div class="lock-method" id="lm-qr" onclick="selectLockMethod('qr')">
            <div class="lock-method-ic">📱</div>
            <div class="lock-method-lb">QR Code</div>
          </div>
          <div class="lock-method" id="lm-req" onclick="selectLockMethod('req')">
            <div class="lock-method-ic">📨</div>
            <div class="lock-method-lb">Envoyer demande</div>
          </div>
        </div>

        <!-- Zone de saisie du code -->
        <div id="zone-code" style="display:none;width:100%;max-width:340px;margin:0 auto">
          <div style="font-size:.82rem;color:rgba(255,255,255,.7);margin-bottom:10px">
            Demandez au patient de générer un code temporaire dans son application, puis saisissez-le ici :
          </div>
          <div style="display:flex;gap:10px">
            <input id="code-input" class="fc" placeholder="123456" maxlength="6" style="letter-spacing:4px;font-size:1.3rem;font-weight:700;text-align:center;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3);color:#fff" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')validateCode('${p.id}')">
            <button class="btn btn-p" onclick="validateCode('${p.id}')">Valider</button>
          </div>
          <div style="font-size:.72rem;color:rgba(255,255,255,.5);margin-top:8px">Le code expire après 10 minutes.</div>
        </div>

        <!-- Zone QR Code -->
        <div id="zone-qr" style="display:none;width:100%;max-width:340px;margin:0 auto">
          <div style="font-size:.82rem;color:rgba(255,255,255,.7);margin-bottom:10px">
            Demandez au patient de scanner ce QR Code depuis son application :
          </div>
          <div style="background:var(--white);border-radius:var(--rs);padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px">
            <canvas id="qr-canvas" width="160" height="160" style="border-radius:var(--rx)"></canvas>
            <div style="font-size:.72rem;color:var(--slate);text-align:center">Scanner avec l'app MediFile Patient</div>
            <div style="font-family:monospace;font-size:.75rem;color:var(--slate);background:var(--mist);padding:4px 10px;border-radius:4px">REF: ${p.id}-${m.id}</div>
          </div>
          <div style="font-size:.72rem;color:rgba(255,255,255,.5);margin-top:8px">En attente de confirmation du patient…</div>
          <button class="btn btn-s btn-sm" style="margin-top:10px" onclick="simulateQrApproval('${p.id}')">📱 Simuler approbation patient</button>
        </div>

        <!-- Zone demande -->
        <div id="zone-req" style="display:none;width:100%;max-width:340px;margin:0 auto">
          ${existing?`
          <div style="background:rgba(200,134,42,.2);border:1px solid rgba(200,134,42,.4);border-radius:var(--rs);padding:13px;font-size:.83rem">
            ⏳ Une demande est déjà en attente de validation par le patient.
          </div>`:`
          <div style="font-size:.82rem;color:rgba(255,255,255,.7);margin-bottom:10px">
            Une notification sera envoyée au patient. Il devra approuver depuis son application.
          </div>
          <div class="fg" style="margin-bottom:10px">
            <label style="font-size:.72rem;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.06em">Motif de la demande</label>
            <select id="req-motif" class="fc" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
              <option value="consultation" style="color:var(--navy)">Consultation médicale</option>
              <option value="urgence" style="color:var(--navy)">Urgence médicale</option>
              <option value="bilan" style="color:var(--navy)">Bilan de santé</option>
              <option value="suivi" style="color:var(--navy)">Suivi de traitement</option>
            </select>
          </div>
          <div class="fg" style="margin-bottom:10px">
            <label style="font-size:.72rem;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.06em">Durée d'accès souhaitée</label>
            <select id="req-duree" class="fc" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">
              <option value="24h" style="color:var(--navy)">24 heures</option>
              <option value="7j" style="color:var(--navy)">7 jours</option>
              <option value="30j" style="color:var(--navy)">30 jours</option>
              <option value="perm" style="color:var(--navy)">Accès permanent</option>
            </select>
          </div>
          <button class="btn btn-gold btn-full" onclick="sendAccessRequest('${p.id}')">📨 Envoyer la demande</button>`}
        </div>
      </div>

      <!-- Note légale -->
      <div style="background:rgba(107,70,193,.08);border:1px solid rgba(107,70,193,.2);border-radius:var(--rs);padding:13px;margin-top:16px;font-size:.8rem;color:var(--purple)">
        🔒 <strong>Conformité RGPD :</strong> Tout accès à ce dossier est journalisé et visible par le patient. Le consentement est requis conformément à la loi camerounaise sur la cybersécurité (2010) et aux standards HDS.
      </div>
    </div>
  </div>`;
}

function selectLockMethod(m){
  ['code','qr','req'].forEach(id=>{
    document.getElementById('lm-'+id)?.classList.remove('sel');
    const z=document.getElementById('zone-'+id);
    if(z)z.style.display='none';
  });
  document.getElementById('lm-'+m)?.classList.add('sel');
  const zone=document.getElementById('zone-'+m);
  if(zone){ zone.style.display='block'; }
  if(m==='qr') setTimeout(()=>drawQR(),50);
}

function drawQR(){
  const canvas=document.getElementById('qr-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const size=160;
  // Dessiner un QR code stylisé (simulation)
  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#0D1F3C';
  // Coins finder patterns
  [[0,0],[size-42,0],[0,size-42]].forEach(([x,y])=>{
    ctx.fillRect(x+2,y+2,38,38);
    ctx.fillStyle='#ffffff';
    ctx.fillRect(x+7,y+7,28,28);
    ctx.fillStyle='#0D1F3C';
    ctx.fillRect(x+12,y+12,18,18);
  });
  // Data cells (random pattern)
  const rng=(seed)=>{ let x=Math.sin(seed)*10000; return x-Math.floor(x); };
  for(let r=0;r<size;r+=5){
    for(let c=0;c<size;c+=5){
      if(r<50&&(c<50||c>size-55))continue;
      if(r>size-55&&c<50)continue;
      if(rng(r*100+c)>0.5){ ctx.fillStyle='#0D1F3C'; ctx.fillRect(c,r,4,4); }
    }
  }
  // Logo au centre
  ctx.fillStyle='#0A7E6E';
  ctx.fillRect(66,66,28,28);
  ctx.fillStyle='#fff';
  ctx.font='18px serif';
  ctx.textAlign='center';
  ctx.fillText('🩺',80,83);
}

function validateCode(patientId){
  const input=document.getElementById('code-input')?.value.trim();
  const p=getPatient(patientId);
  if(!p){ toast('Patient introuvable','er'); return; }
  const stored=DB.session.temp_code;
  const expires=DB.session.temp_code_expires;

  // Simulation : code 123456 toujours valide en démo, ou code stocké en session
  if(input==='123456'||(stored&&input===stored&&new Date()<new Date(expires))){
    grantAccess(patientId,'code_temporaire');
  } else {
    toast('Code invalide ou expiré. Demandez un nouveau code au patient.','er');
    const inp=document.getElementById('code-input');
    if(inp){ inp.style.borderColor='var(--red)'; inp.style.boxShadow='0 0 0 3px rgba(229,62,62,.2)'; }
  }
}

function simulateQrApproval(patientId){
  toast('📱 Patient a approuvé via QR Code…','info');
  setTimeout(()=>grantAccess(patientId,'qr_code'),1200);
}

function sendAccessRequest(patientId){
  const p=getPatient(patientId);
  const m=getCurrentMedecin()||DB.medecins[0];
  const hop=getHopital(m.hop);
  const motif=document.getElementById('req-motif')?.value||'consultation';
  const duree=document.getElementById('req-duree')?.value||'24h';

  const req={
    id:'REQ'+Date.now().toString().slice(-6),
    medId:m.id,
    med:`Dr. ${m.prenom} ${m.nom}`,
    spec:m.spec,
    hop:hop?.nom||'—',
    hopId:m.hop,
    motif,
    duree,
    statut:'pending',
    date:new Date().toISOString(),
  };
  p.demandes_acces.push(req);
  DB.session.consent_pending=req;

  toast(`Demande envoyée à ${p.prenom} ${p.nom} — notification SMS envoyée`,'ok');
  setTimeout(()=>go('d-locked',patientId),800);
}

function grantAccess(patientId, method){
  const p=getPatient(patientId);
  const m=getCurrentMedecin()||DB.medecins[0];
  const hop=getHopital(m.hop);

  // Ajouter au journal d'audit
  p.journal_audit.unshift({
    id:'AUD'+Date.now().toString().slice(-6),
    date:new Date().toISOString(),
    medId:m.id,
    med:`Dr. ${m.prenom} ${m.nom}`,
    hop:hop?.nom||'—',
    action:`Accès accordé via ${method==='code_temporaire'?'code temporaire':method==='qr_code'?'QR Code':'demande validée'}`,
    ip:'192.168.'+Math.floor(Math.random()*255)+'.'+Math.floor(Math.random()*255),
  });

  // Ajouter accès temporaire si pas déjà présent
  const existing=p.acces_actifs.find(a=>a.medId===m.id);
  if(!existing){
    p.acces_actifs.push({
      id:'ACC'+Date.now().toString().slice(-6),
      medId:m.id,
      med:`Dr. ${m.prenom} ${m.nom}`,
      hop:hop?.nom||'—',
      depuis:new Date().toISOString().split('T')[0],
      expire:method==='code_temporaire'?getDatePlusDays(1):null,
      statut:method==='code_temporaire'?'24h':'permanent',
      portee:['consultations','ordos','results','docs'],
    });
  }

  toast(`✅ Accès accordé ! Dossier de ${p.prenom} ${p.nom} déverrouillé`,'ok');
  setTimeout(()=>go('d-patient',patientId),600);
}

function getDatePlusDays(n){
  const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════
   PAGE PATIENT — ACCÈS & CONSENTEMENTS
═══════════════════════════════════════════ */
function pAcces(){
  const p=getCurrentPatient();
  if(!p) return'';
  const pending=p.demandes_acces.filter(d=>d.statut==='pending');
  const granted=p.acces_actifs;
  const audit=p.journal_audit;

  return`
  <div class="main ani">
    ${ptopbar('Accès & Consentements')}
    <div class="content">

      <!-- Bannière principale -->
      <div style="background:linear-gradient(135deg,var(--purple) 0%,#4a2080 100%);border-radius:var(--r);padding:24px 28px;color:#fff;margin-bottom:24px;position:relative;overflow:hidden">
        <div style="position:absolute;right:-10px;top:-10px;font-size:7rem;opacity:.08">🔐</div>
        <div style="font-family:var(--fh);font-size:1.2rem;font-weight:800;margin-bottom:6px">Votre dossier vous appartient</div>
        <div style="opacity:.8;font-size:.88rem;margin-bottom:16px;max-width:500px">
          Vous contrôlez qui accède à vos informations médicales. Chaque accès est enregistré et visible ici.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="showGenerateCodeModal()">🔢 Générer un code temporaire</button>
          <button class="btn" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="showQrModal()">📱 Mon QR Code d'accès</button>
        </div>
      </div>

      <!-- Demandes en attente -->
      ${pending.length>0?`
      <div class="card" style="margin-bottom:20px;border-left:4px solid var(--orange)">
        <div class="card-hdr">
          <div class="card-ttl">⏳ Demandes d'accès en attente (${pending.length})</div>
        </div>
        ${pending.map(d=>`
          <div class="access-req pending">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
              <div>
                <div style="font-weight:700;font-size:.95rem">${d.med}</div>
                <div style="font-size:.8rem;color:var(--slate);margin-top:2px">🏥 ${d.hop} · ${d.spec}</div>
                <div style="font-size:.78rem;color:var(--slate);margin-top:2px">📅 Demandé le ${fdh(d.date)}</div>
              </div>
              <span class="badge b-warn">En attente</span>
            </div>
            <div style="background:rgba(214,158,46,.1);border-radius:var(--rx);padding:10px;margin-bottom:12px;font-size:.82rem">
              <strong>Motif :</strong> ${motifLabel(d.motif)} · <strong>Durée :</strong> ${dureeLabel(d.duree)}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-green" onclick="approveRequest('${d.id}','${p.id}')">✅ Approuver</button>
              <button class="btn btn-g" onclick="approveWithLimitModal('${d.id}','${p.id}')">⚙️ Approuver avec limites</button>
              <button class="btn btn-d btn-sm" onclick="denyRequest('${d.id}','${p.id}')">❌ Refuser</button>
            </div>
          </div>`).join('')}
      </div>`:''}

      <div class="dg2">
        <!-- Accès accordés -->
        <div class="card">
          <div class="card-hdr">
            <div class="card-ttl">✅ Accès actifs (${granted.length})</div>
            <button class="btn btn-g btn-sm" onclick="showAddAccessModal('${p.id}')">+ Ajouter</button>
          </div>
          ${granted.length===0?`<div class="empty"><div class="empty-ic">🔓</div><div class="empty-t">Aucun accès accordé</div></div>`:
          granted.map(a=>`
            <div class="access-req granted" style="margin-bottom:10px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                <div>
                  <div style="font-weight:700;font-size:.9rem">${a.med}</div>
                  <div style="font-size:.78rem;color:var(--slate);margin-top:2px">🏥 ${a.hop}</div>
                  <div style="font-size:.72rem;color:var(--slate)">Depuis le ${fd(a.depuis)}</div>
                </div>
                <span class="badge b-ok">${a.statut==='permanent'?'Permanent':a.expire?'Expire le '+fd(a.expire):'Actif'}</span>
              </div>
              <div style="margin-bottom:10px">
                <div style="font-size:.7rem;color:var(--slate);text-transform:uppercase;font-weight:700;margin-bottom:5px">Données accessibles</div>
                <div class="tags">
                  ${a.portee.map(pr=>`<span class="tag">${porteeLabel(pr)}</span>`).join('')}
                </div>
              </div>
              <button class="btn btn-d btn-sm" onclick="revokeAccess('${a.id}','${p.id}')">🚫 Révoquer l'accès</button>
            </div>`).join('')}
        </div>

        <!-- Journal d'audit -->
        <div class="card">
          <div class="card-hdr"><div class="card-ttl">📋 Journal d'audit</div></div>
          <div style="font-size:.78rem;color:var(--slate);margin-bottom:14px">
            Chaque consultation de votre dossier est enregistrée ici.
          </div>
          ${audit.length===0?`<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">Aucune consultation enregistrée</div></div>`:
          audit.slice(0,8).map(a=>{
            const col=a.action.includes('Accès')?'var(--green)':a.action.includes('urgence')?'var(--red)':'var(--teal)';
            return`
            <div class="audit-row">
              <div class="audit-icon" style="background:${col}22">
                <span style="color:${col}">${a.action.includes('urgence')?'🚨':a.action.includes('Accès')?'🔓':'👁️'}</span>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.85rem">${a.med}</div>
                <div style="font-size:.75rem;color:var(--slate);margin-top:1px">${a.action}</div>
                <div style="font-size:.7rem;color:var(--slate)">${fdh(a.date)} · IP: ${a.ip}</div>
              </div>
            </div>`}).join('')}
          ${audit.length>8?`<button class="btn btn-g btn-sm btn-full" style="margin-top:10px" onclick="showFullAuditModal('${p.id}')">Voir tout l'historique (${audit.length})</button>`:''}
        </div>
      </div>
    </div>
  </div>`;
}

/* ── LABELS ───────────────────────────────── */
function motifLabel(m){ return{consultation:'Consultation médicale',urgence:'Urgence médicale',bilan:'Bilan de santé',suivi:'Suivi de traitement'}[m]||m; }
function dureeLabel(d){ return{'24h':'24 heures','7j':'7 jours','30j':'30 jours',perm:'Accès permanent'}[d]||d; }
function porteeLabel(pr){ return{consultations:'Consultations',ordos:'Ordonnances',results:'Résultats',docs:'Documents'}[pr]||pr; }

/* ── ACTIONS CONSENTEMENT ─────────────────── */
function approveRequest(reqId, patId){
  const p=getPatient(patId);
  const req=p.demandes_acces.find(d=>d.id===reqId);
  if(!req) return;
  req.statut='approved';

  const expire=req.duree==='24h'?getDatePlusDays(1):req.duree==='7j'?getDatePlusDays(7):req.duree==='30j'?getDatePlusDays(30):null;
  p.acces_actifs.push({
    id:'ACC'+Date.now().toString().slice(-6),
    medId:req.medId, med:req.med, hop:req.hop,
    depuis:new Date().toISOString().split('T')[0],
    expire, statut:req.duree==='perm'?'permanent':req.duree,
    portee:['consultations','ordos','results','docs'],
  });
  p.journal_audit.unshift({
    id:'AUD'+Date.now().toString().slice(-6),
    date:new Date().toISOString(),
    medId:req.medId, med:req.med, hop:req.hop,
    action:`Accès approuvé par le patient (demande ${req.motif})`,
    ip:'—',
  });

  toast(`Accès accordé à ${req.med}`,'ok');
  render();
}

function denyRequest(reqId, patId){
  const p=getPatient(patId);
  const req=p.demandes_acces.find(d=>d.id===reqId);
  if(req){ req.statut='denied'; }
  toast('Demande refusée','wa');
  render();
}

function revokeAccess(accId, patId){
  if(!confirm('Révoquer cet accès ? Le médecin ne pourra plus consulter votre dossier.')) return;
  const p=getPatient(patId);
  const idx=p.acces_actifs.findIndex(a=>a.id===accId);
  if(idx>-1){
    const acc=p.acces_actifs[idx];
    p.acces_actifs.splice(idx,1);
    p.journal_audit.unshift({
      id:'AUD'+Date.now().toString().slice(-6),
      date:new Date().toISOString(),
      medId:acc.medId, med:acc.med, hop:acc.hop,
      action:'Accès révoqué par le patient',
      ip:'—',
    });
  }
  toast('Accès révoqué avec succès','ok');
  render();
}

function approveWithLimitModal(reqId, patId){
  const p=getPatient(patId);
  const req=p.demandes_acces.find(d=>d.id===reqId);
  if(!req) return;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">⚙️ Approuver avec limites</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <p style="font-size:.88rem;color:var(--slate);margin-bottom:16px">Approuver l'accès de <strong>${req.med}</strong> avec des restrictions.</p>
        <div class="fg" style="margin-bottom:14px">
          <label class="lbl">Durée d'accès</label>
          <select class="fc" id="limit-dur">
            <option value="24h">24 heures</option>
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
          </select>
        </div>
        <div class="fg" style="margin-bottom:14px">
          <label class="lbl">Données accessibles</label>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
            ${[['consultations','Consultations'],['ordos','Ordonnances'],['results','Résultats'],['docs','Documents']].map(([v,lb])=>`
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.85rem">
                <input type="checkbox" checked value="${v}" class="limit-cb" style="accent-color:var(--teal)"> ${lb}
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-green" onclick="doApproveWithLimit('${reqId}','${patId}')">✅ Approuver</button>
      </div>
    </div>
  </div>`);
}

function doApproveWithLimit(reqId, patId){
  const p=getPatient(patId);
  const req=p.demandes_acces.find(d=>d.id===reqId);
  if(!req){ closeModalForce(); return; }
  const dur=document.getElementById('limit-dur')?.value||'24h';
  const cbs=document.querySelectorAll('.limit-cb:checked');
  const portee=Array.from(cbs).map(cb=>cb.value);
  req.statut='approved';
  const expire=dur==='24h'?getDatePlusDays(1):dur==='7j'?getDatePlusDays(7):getDatePlusDays(30);
  p.acces_actifs.push({
    id:'ACC'+Date.now().toString().slice(-6),
    medId:req.medId, med:req.med, hop:req.hop,
    depuis:new Date().toISOString().split('T')[0],
    expire, statut:dur,
    portee: portee.length?portee:['consultations'],
  });
  p.journal_audit.unshift({
    id:'AUD'+Date.now().toString().slice(-6),
    date:new Date().toISOString(),
    medId:req.medId, med:req.med, hop:req.hop,
    action:`Accès approuvé avec restrictions (${dur}, portée: ${portee.join(', ')})`,
    ip:'—',
  });
  closeModalForce();
  toast(`Accès limité accordé à ${req.med}`,'ok');
  render();
}

/* ── MODALS CONSENTEMENT ──────────────────── */
function showGenerateCodeModal(){
  const p=getCurrentPatient();
  if(!p)return;
  const code=genCode();
  const expires=new Date(Date.now()+10*60*1000).toISOString();
  DB.session.temp_code=code;
  DB.session.temp_code_expires=expires;

  let timeLeft=600;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">🔢 Code temporaire</div><button class="md-cls" onclick="closeModalForce();clearCodeTimer()">✕</button></div>
      <div class="md-bod">
        <div class="consent-banner">
          <div style="font-size:.82rem;opacity:.8;margin-bottom:4px">Votre code d'accès temporaire</div>
          <div class="consent-code" onclick="navigator.clipboard?.writeText('${code}');toast('Code copié !','ok')" title="Cliquez pour copier">${code}</div>
          <div class="timer-row">
            <span>⏱️ Expire dans</span>
            <div class="timer-track"><div class="timer-fill" id="timer-fill" style="width:100%"></div></div>
            <span id="timer-text" style="font-weight:700;min-width:48px;text-align:right">10:00</span>
          </div>
        </div>
        <div style="background:var(--mist);border-radius:var(--rs);padding:14px;font-size:.85rem;line-height:1.6;margin-top:4px">
          <strong>Comment utiliser ce code :</strong>
          <ol style="margin-top:8px;padding-left:20px;display:flex;flex-direction:column;gap:5px">
            <li>Donnez ce code au médecin qui vous consulte</li>
            <li>Le médecin le saisit dans son interface MediFile</li>
            <li>L'accès est automatiquement accordé pour <strong>24 heures</strong></li>
            <li>Vous serez notifié et l'accès sera journalisé</li>
          </ol>
        </div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce();clearCodeTimer()">Fermer</button>
        <button class="btn btn-p" onclick="regenerateCode()">🔄 Nouveau code</button>
      </div>
    </div>
  </div>`);

  window._codeTimer=setInterval(()=>{
    timeLeft--;
    const fill=document.getElementById('timer-fill');
    const text=document.getElementById('timer-text');
    if(!fill||!text){ clearInterval(window._codeTimer); return; }
    const pct=(timeLeft/600)*100;
    fill.style.width=pct+'%';
    if(pct<20) fill.style.background='#fc8181';
    const m=Math.floor(timeLeft/60), s=timeLeft%60;
    text.textContent=`${m}:${s.toString().padStart(2,'0')}`;
    if(timeLeft<=0){ clearInterval(window._codeTimer); DB.session.temp_code=null; toast('Code expiré — générez-en un nouveau','wa'); closeModalForce(); }
  },1000);
}

function clearCodeTimer(){ if(window._codeTimer) clearInterval(window._codeTimer); }

function regenerateCode(){
  clearCodeTimer();
  closeModalForce();
  setTimeout(()=>showGenerateCodeModal(),100);
}

function showQrModal(){
  const p=getCurrentPatient();
  if(!p)return;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">📱 Mon QR Code d'accès</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:.85rem;color:var(--slate);margin-bottom:14px">
            Montrez ce QR Code au médecin pour lui permettre de demander l'accès à votre dossier. Vous devrez ensuite confirmer depuis l'application.
          </div>
          <div style="display:inline-flex;flex-direction:column;align-items:center;background:var(--white);border-radius:var(--r);padding:20px;border:2px solid var(--border)">
            <canvas id="qr-pat-canvas" width="180" height="180" style="border-radius:var(--rs)"></canvas>
            <div style="font-size:.72rem;color:var(--slate);margin-top:10px">Scanner avec l'app MediFile</div>
            <div style="font-family:monospace;font-size:.72rem;background:var(--mist);padding:4px 10px;border-radius:4px;margin-top:4px">${p.id} · ${p.prenom} ${p.nom}</div>
          </div>
        </div>
        <div style="background:var(--teal-pale);border-radius:var(--rs);padding:12px;font-size:.8rem;color:var(--teal)">
          🔒 Ce QR Code ne donne <strong>pas</strong> directement accès. Il permet au médecin de soumettre une demande. Vous approuvez ou refusez chaque accès.
        </div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-p btn-full" onclick="closeModalForce()">Fermer</button>
      </div>
    </div>
  </div>`);
  setTimeout(()=>{
    const canvas=document.getElementById('qr-pat-canvas');
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const sz=180;
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,sz,sz);
    ctx.fillStyle='#0D1F3C';
    [[0,0],[sz-44,0],[0,sz-44]].forEach(([x,y])=>{
      ctx.fillRect(x+2,y+2,40,40);
      ctx.fillStyle='#fff'; ctx.fillRect(x+7,y+7,30,30);
      ctx.fillStyle='#0D1F3C'; ctx.fillRect(x+12,y+12,20,20);
      ctx.fillStyle='#0D1F3C';
    });
    const rng=(s)=>{ let x=Math.sin(s+42)*10000; return x-Math.floor(x); };
    for(let r=0;r<sz;r+=5){ for(let c=0;c<sz;c+=5){
      if(r<55&&(c<55||c>sz-60))continue; if(r>sz-60&&c<55)continue;
      if(rng(r*100+c)>0.5){ ctx.fillStyle='#0A7E6E'; ctx.fillRect(c,r,4,4); }
    }}
    ctx.fillStyle='#0A7E6E'; ctx.fillRect(70,70,40,40);
    ctx.fillStyle='#fff'; ctx.font='24px serif'; ctx.textAlign='center'; ctx.fillText('🩺',90,95);
  },50);
}

function showAddAccessModal(patId){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">+ Ajouter un accès manuellement</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fg" style="margin-bottom:14px">
          <label class="lbl">Médecin *</label>
          <select class="fc" id="add-med">
            ${DB.medecins.map(m=>`<option value="${m.id}">${m.prenom} ${m.nom} — ${m.spec} (${getHopital(m.hop)?.nom||'—'})</option>`).join('')}
          </select>
        </div>
        <div class="fg" style="margin-bottom:14px">
          <label class="lbl">Durée</label>
          <select class="fc" id="add-dur">
            <option value="24h">24 heures</option>
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
            <option value="perm">Permanent</option>
          </select>
        </div>
        <div class="fg">
          <label class="lbl">Données accessibles</label>
          <div style="display:flex;flex-direction:column;gap:7px;margin-top:4px">
            ${[['consultations','Consultations'],['ordos','Ordonnances'],['results','Résultats'],['docs','Documents']].map(([v,lb])=>`
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:.85rem">
                <input type="checkbox" checked value="${v}" class="add-cb" style="accent-color:var(--teal)"> ${lb}
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="doAddAccess('${patId}')">Accorder l'accès</button>
      </div>
    </div>
  </div>`);
}

function doAddAccess(patId){
  const p=getPatient(patId);
  const medId=document.getElementById('add-med')?.value;
  const dur=document.getElementById('add-dur')?.value||'perm';
  const cbs=document.querySelectorAll('.add-cb:checked');
  const portee=Array.from(cbs).map(cb=>cb.value);
  const m=getMedecin(medId);
  if(!m||!p){ toast('Erreur','er'); return; }
  const hop=getHopital(m.hop);
  const expire=dur==='24h'?getDatePlusDays(1):dur==='7j'?getDatePlusDays(7):dur==='30j'?getDatePlusDays(30):null;
  p.acces_actifs.push({
    id:'ACC'+Date.now().toString().slice(-6),
    medId:m.id, med:`Dr. ${m.prenom} ${m.nom}`, hop:hop?.nom||'—',
    depuis:new Date().toISOString().split('T')[0],
    expire, statut:dur==='perm'?'permanent':dur,
    portee: portee.length?portee:['consultations'],
  });
  p.journal_audit.unshift({
    id:'AUD'+Date.now().toString().slice(-6),
    date:new Date().toISOString(),
    medId:m.id, med:`Dr. ${m.prenom} ${m.nom}`, hop:hop?.nom||'—',
    action:'Accès accordé manuellement par le patient',
    ip:'—',
  });
  closeModalForce();
  toast(`Accès accordé à Dr. ${m.prenom} ${m.nom}`,'ok');
  render();
}

function showFullAuditModal(patId){
  const p=getPatient(patId);
  if(!p)return;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:640px">
      <div class="md-hdr"><div class="md-ttl">📋 Journal d'audit complet</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <p style="font-size:.82rem;color:var(--slate);margin-bottom:14px">${p.journal_audit.length} entrée(s) — toutes les consultations de votre dossier</p>
        ${p.journal_audit.map(a=>`
          <div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:1.1rem;flex-shrink:0">${a.action.includes('urgence')?'🚨':a.action.includes('révoqué')?'🔒':a.action.includes('Accès')&&a.action.includes('approuvé')?'✅':'👁️'}</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:.85rem">${a.med} · <span style="color:var(--slate);font-weight:400">${a.hop}</span></div>
              <div style="font-size:.8rem;color:var(--slate);margin-top:1px">${a.action}</div>
              <div style="font-size:.7rem;color:var(--slate);margin-top:2px">${fdh(a.date)}${a.ip&&a.ip!=='—'?' · IP: '+a.ip:''}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="toast('Export PDF en cours…','info')">⬇️ Exporter PDF</button>
        <button class="btn btn-p" onclick="closeModalForce()">Fermer</button>
      </div>
    </div>
  </div>`);
}
