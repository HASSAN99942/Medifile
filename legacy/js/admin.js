/* MediFile — admin.js */

/* ═══════════════════════════════════════════
   MEDIFILE — PAGES ADMINISTRATEUR HÔPITAL
═══════════════════════════════════════════ */

/* ── DASHBOARD ADMIN ──────────────────────── */
function aHome(){
  const hop=getHopital(DB.session.hopId)||DB.hopitaux[0];
  const myMeds=DB.medecins.filter(m=>m.hop===hop.id);
  const myPats=DB.patients.filter(p=>p.hopital_inscrit===hop.id);
  const attente=myMeds.filter(m=>m.statut==='En attente');

  return`
  <div class="main ani">
    ${topbar('Vue d\'ensemble',false)}
    <div class="content">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap">
        <div style="font-size:2.5rem">${hop.logo}</div>
        <div>
          <div style="font-family:var(--fh);font-size:1.3rem;font-weight:800">${hop.nom}</div>
          <div style="color:var(--slate);font-size:.85rem">📍 ${hop.ville}, ${hop.region} · Administrateur de l'établissement</div>
        </div>
        <span class="badge b-ok" style="margin-left:auto">✅ ${hop.statut}</span>
      </div>

      <div class="sgrid">
        <div class="scard sc-teal" onclick="go('a-medecins')"><div class="s-lbl">Médecins actifs</div><div class="s-val">${myMeds.filter(m=>m.statut==='Actif').length}</div><div class="s-sub">${attente.length>0?`⏳ ${attente.length} en attente`:''}</div><div class="s-ico">👨‍⚕️</div></div>
        <div class="scard sc-gold" onclick="go('a-patients')"><div class="s-lbl">Patients inscrits</div><div class="s-val">${myPats.length}</div><div class="s-sub">Dans l'établissement</div><div class="s-ico">👥</div></div>
        <div class="scard sc-purple"><div class="s-lbl">Accès inter-hôpitaux</div><div class="s-val">${DB.patients.flatMap(p=>p.journal_audit).filter(a=>a.action.includes('inter')||a.hop!==hop.nom).length}</div><div class="s-sub">Ce mois</div><div class="s-ico">🔐</div></div>
        <div class="scard sc-blue"><div class="s-lbl">Consultations (mois)</div><div class="s-val">${myPats.flatMap(p=>p.consultations).length}</div><div class="s-sub">Journalisées</div><div class="s-ico">📋</div></div>
      </div>

      ${attente.length>0?`
      <div class="card" style="margin-bottom:20px;border-left:4px solid var(--orange)">
        <div class="card-hdr">
          <div class="card-ttl">⏳ Comptes médecins en attente de validation (${attente.length})</div>
          <button class="btn btn-s btn-sm" onclick="go('a-medecins')">Gérer</button>
        </div>
        ${attente.map(m=>`
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">
            <div class="av">${m.av}</div>
            <div style="flex:1">
              <div style="font-weight:600">Dr. ${m.prenom} ${m.nom}</div>
              <div style="font-size:.78rem;color:var(--slate)">${m.spec} · ${m.email}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-green btn-sm" onclick="validateMedecin('${m.id}')">✅ Valider</button>
              <button class="btn btn-d btn-sm" onclick="rejectMedecin('${m.id}')">❌ Refuser</button>
            </div>
          </div>`).join('')}
      </div>`:''}

      <div class="dg2">
        <div class="card">
          <div class="card-hdr"><div class="card-ttl">👨‍⚕️ Médecins de l'établissement</div><button class="btn btn-s btn-sm" onclick="go('a-medecins')">Voir tout</button></div>
          ${myMeds.slice(0,4).map(m=>`
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(209,232,229,.5)">
              <div class="av">${m.av}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:.9rem">Dr. ${m.prenom} ${m.nom}</div>
                <div style="font-size:.75rem;color:var(--slate)">${m.spec}</div>
              </div>
              <span class="badge ${m.statut==='Actif'?'b-ok':'b-warn'}">${m.statut}</span>
            </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-ttl" style="margin-bottom:14px">📊 Activité récente</div>
          <div class="tl">
            ${DB.patients.flatMap(p=>p.journal_audit.map(a=>({...a,patient:`${p.prenom} ${p.nom}`}))).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map((a,i)=>`
              <div class="tl-item">
                <div class="tl-dot ${i===0?'':'b'}"></div>
                <div class="tl-d">${fdh(a.date)}</div>
                <div class="tl-t">${a.med}</div>
                <div class="tl-s">${a.action} — ${a.patient}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── GESTION MÉDECINS ─────────────────────── */
function aMedecins(){
  const hop=getHopital(DB.session.hopId)||DB.hopitaux[0];
  const myMeds=DB.medecins.filter(m=>m.hop===hop.id);
  return`
  <div class="main ani">
    ${topbar('Médecins',false)}
    <div class="content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <p style="color:var(--slate);font-size:.88rem">${myMeds.length} médecin(s) dans l'établissement</p>
        <button class="btn btn-p" onclick="showInviteMedModal()">+ Inviter un médecin</button>
      </div>
      <div class="card">
        <div class="tw">
          <table>
            <thead><tr><th>Médecin</th><th>Spécialité</th><th>Contact</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              ${myMeds.map(m=>`
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="av" style="flex-shrink:0">${m.av}</div>
                      <div>
                        <div style="font-weight:600">Dr. ${m.prenom} ${m.nom}</div>
                        <div style="font-size:.72rem;color:var(--slate);font-family:monospace">${m.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>${m.spec}</td>
                  <td style="font-size:.82rem">
                    <div>${m.email}</div>
                    <div style="color:var(--slate)">${m.tel}</div>
                  </td>
                  <td><span class="badge ${m.statut==='Actif'?'b-ok':'b-warn'}">${m.statut}</span></td>
                  <td>
                    <div class="tact">
                      ${m.statut==='En attente'?`
                        <button class="btn btn-green btn-sm" onclick="validateMedecin('${m.id}')">✅ Valider</button>
                        <button class="btn btn-d btn-sm" onclick="rejectMedecin('${m.id}')">❌ Refuser</button>
                      `:`
                        <button class="btn btn-g btn-sm" onclick="showEditMedModal('${m.id}')">✏️ Modifier</button>
                        <button class="btn btn-d btn-sm" onclick="suspendMedecin('${m.id}')">🚫 Suspendre</button>
                      `}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── PATIENTS ADMIN ───────────────────────── */
function aPatients(){
  const hop=getHopital(DB.session.hopId)||DB.hopitaux[0];
  const myPats=DB.patients.filter(p=>p.hopital_inscrit===hop.id);
  return`
  <div class="main ani">
    ${topbar('Patients inscrits',false)}
    <div class="content">
      <div style="margin-bottom:20px;color:var(--slate);font-size:.88rem">${myPats.length} patient(s) inscrit(s) à ${hop.nom}</div>
      <div class="card">
        <div class="tw">
          <table>
            <thead><tr><th>Patient</th><th>Âge/Sexe</th><th>Contact</th><th>Statut</th><th>Médecin référent</th><th>Accès accordés</th></tr></thead>
            <tbody>
              ${myPats.map(p=>`
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="av" style="flex-shrink:0">${p.prenom[0]}${p.nom[0]}</div>
                      <div><div style="font-weight:600">${p.prenom} ${p.nom}</div><div style="font-size:.72rem;color:var(--slate);font-family:monospace">${p.id}</div></div>
                    </div>
                  </td>
                  <td>${age(p.ddn)} ans / ${p.sexe==='F'?'F':'M'}</td>
                  <td style="font-size:.82rem">${p.tel}</td>
                  <td>${sbadge(p.statut)}</td>
                  <td style="font-size:.83rem">${getMedecin(p.medref)?`Dr. ${getMedecin(p.medref).prenom} ${getMedecin(p.medref).nom}`:'—'}</td>
                  <td><span class="badge b-teal">${p.acces_actifs.length} médecin(s)</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── MON ÉTABLISSEMENT ────────────────────── */
function aHopital(){
  const hop=getHopital(DB.session.hopId)||DB.hopitaux[0];
  return`
  <div class="main ani">
    ${topbar('Mon établissement',false)}
    <div class="content">
      <div style="max-width:680px">
        <div class="card" style="margin-bottom:18px">
          <div class="card-hdr">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="font-size:2.5rem">${hop.logo}</div>
              <div class="card-ttl">${hop.nom}</div>
            </div>
            <span class="badge b-ok">${hop.statut}</span>
          </div>
          <div class="fgrid" style="margin-bottom:13px">
            <div class="fg"><label class="lbl">Nom de l'établissement</label><input class="fc" value="${hop.nom}"></div>
            <div class="fg"><label class="lbl">Type</label><select class="fc"><option>Hôpital public</option><option>Clinique privée</option><option>Centre médical</option></select></div>
            <div class="fg"><label class="lbl">Ville</label><input class="fc" value="${hop.ville}"></div>
            <div class="fg"><label class="lbl">Région</label><input class="fc" value="${hop.region}"></div>
          </div>
          <div class="fg" style="margin-bottom:13px"><label class="lbl">Adresse complète</label><input class="fc" value="${hop.adresse}"></div>
          <div class="fgrid">
            <div class="fg"><label class="lbl">Email de contact</label><input class="fc" type="email" placeholder="contact@hopital.cm"></div>
            <div class="fg"><label class="lbl">Téléphone</label><input class="fc" placeholder="+237 2XX XXX XXX"></div>
          </div>
          <div style="margin-top:14px;display:flex;justify-content:flex-end">
            <button class="btn btn-p" onclick="toast('Informations mises à jour','ok')">Enregistrer</button>
          </div>
        </div>
        <div class="card" style="margin-bottom:18px">
          <div class="card-ttl" style="margin-bottom:16px">🔐 Intégration MediFile</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            ${[['ID Établissement',hop.id],['Clé API',`mf-${hop.id.toLowerCase()}-••••••••`],['Région serveur','AWS af-south-1 (Cape Town)'],['Version API','v2.1.0']].map(([lb,vl])=>`
              <div style="background:var(--mist);padding:12px;border-radius:var(--rs)">
                <div style="font-size:.68rem;color:var(--slate);text-transform:uppercase;font-weight:700;margin-bottom:3px">${lb}</div>
                <div style="font-family:monospace;font-size:.83rem;font-weight:600">${vl}</div>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-s btn-sm" onclick="toast('Nouvelle clé API générée','ok')">🔄 Régénérer clé API</button>
            <button class="btn btn-g btn-sm" onclick="toast('Documentation API ouverte','info')">📖 Documentation</button>
            <button class="btn btn-g btn-sm" onclick="toast('Test de connexion réussi ✅','ok')">🔗 Tester la connexion</button>
          </div>
        </div>
        <div class="card">
          <div class="card-ttl" style="margin-bottom:16px">🔒 Sécurité & Conformité</div>
          ${[['Chiffrement des données (AES-256)',true],['Journalisation de tous les accès',true],['Authentification 2FA obligatoire',false],['Conformité RGPD',true],['Certification HDS (en cours)',false]].map(([lb,on])=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)">
              <div><div style="font-weight:500;font-size:.88rem">${lb}</div></div>
              <div style="cursor:pointer;width:44px;height:24px;border-radius:12px;background:${on?'var(--teal)':'var(--border)'};flex-shrink:0;position:relative" onclick="toast('Paramètre modifié','info')">
                <div style="position:absolute;top:3px;${on?'left:22px':'left:3px'};width:18px;height:18px;border-radius:50%;background:#fff"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

/* ── STATISTIQUES ADMIN ───────────────────── */
function aStats(){
  const hop=getHopital(DB.session.hopId)||DB.hopitaux[0];
  const myPats=DB.patients.filter(p=>p.hopital_inscrit===hop.id);
  const allConsults=myPats.flatMap(p=>p.consultations);
  const allAudit=myPats.flatMap(p=>p.journal_audit);
  const urgences=allConsults.filter(c=>c.type==='Urgence').length;
  const interHop=allAudit.filter(a=>a.hop!==hop.nom).length;

  return`
  <div class="main ani">
    ${topbar('Statistiques',false)}
    <div class="content">
      <div style="margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <p style="color:var(--slate);font-size:.88rem">Vue d'ensemble — ${hop.nom}</p>
        <button class="btn btn-g btn-sm" onclick="toast('Export PDF des statistiques en cours…','info')">⬇️ Exporter PDF</button>
      </div>

      <div class="sgrid" style="margin-bottom:24px">
        <div class="scard sc-teal"><div class="s-lbl">Total consultations</div><div class="s-val">${allConsults.length}</div><div class="s-sub">Toutes périodes</div><div class="s-ico">🩺</div></div>
        <div class="scard sc-red"><div class="s-lbl">Urgences</div><div class="s-val">${urgences}</div><div class="s-sub">${allConsults.length>0?Math.round(urgences/allConsults.length*100):0}% des consultations</div><div class="s-ico">🚨</div></div>
        <div class="scard sc-purple"><div class="s-lbl">Accès inter-hôpitaux</div><div class="s-val">${interHop}</div><div class="s-sub">Avec consentement</div><div class="s-ico">🔐</div></div>
        <div class="scard sc-gold"><div class="s-lbl">Journaux d'audit</div><div class="s-val">${allAudit.length}</div><div class="s-sub">Entrées totales</div><div class="s-ico">📋</div></div>
      </div>

      <div class="dg2">
        <div class="card">
          <div class="card-ttl" style="margin-bottom:16px">📊 Répartition par statut patient</div>
          ${['Actif','Surveillance','Critique'].map(st=>{
            const n=myPats.filter(p=>p.statut===st).length;
            const pct=myPats.length>0?Math.round(n/myPats.length*100):0;
            const col=st==='Actif'?'var(--green)':st==='Surveillance'?'var(--orange)':'var(--red)';
            return`
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:.83rem;margin-bottom:5px">
                <span style="font-weight:600">${st}</span>
                <span style="color:var(--slate)">${n} patients (${pct}%)</span>
              </div>
              <div class="pbar"><div class="pfill" style="width:${pct}%;background:${col}"></div></div>
            </div>`;}).join('')}

          <div style="margin-top:20px">
            <div class="card-ttl" style="margin-bottom:14px">🔐 Consentements accordés</div>
            ${myPats.map(p=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(209,232,229,.5);font-size:.83rem">
                <span>${p.prenom} ${p.nom}</span>
                <span class="badge b-teal">${p.acces_actifs.length} accès</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-ttl" style="margin-bottom:16px">📋 Journal d'audit global</div>
          <div style="font-size:.78rem;color:var(--slate);margin-bottom:12px">${allAudit.length} entrée(s) au total</div>
          ${allAudit.slice(0,10).map(a=>`
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(209,232,229,.4)">
              <span style="font-size:1rem;flex-shrink:0">${a.action.includes('urgence')?'🚨':a.action.includes('révoqué')?'🔒':a.action.includes('approuvé')?'✅':'👁️'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.med}</div>
                <div style="font-size:.75rem;color:var(--slate)">${a.action}</div>
                <div style="font-size:.7rem;color:var(--slate)">${fdh(a.date)}</div>
              </div>
            </div>`).join('')}
          ${allAudit.length>10?`<div style="text-align:center;margin-top:10px"><button class="btn btn-g btn-sm" onclick="toast('Export complet en cours…','info')">⬇️ Exporter tout</button></div>`:''}
        </div>
      </div>
    </div>
  </div>`;
}

/* ── ACTIONS ADMIN ────────────────────────── */
function validateMedecin(medId){
  const m=DB.medecins.find(x=>x.id===medId);
  if(!m)return;
  m.statut='Actif';
  toast(`✅ Compte de Dr. ${m.prenom} ${m.nom} validé — SMS envoyé`,'ok');
  render();
}

function rejectMedecin(medId){
  if(!confirm('Rejeter cette demande d\'inscription ?'))return;
  const m=DB.medecins.find(x=>x.id===medId);
  if(!m)return;
  const idx=DB.medecins.indexOf(m);
  DB.medecins.splice(idx,1);
  toast('Demande rejetée','wa');
  render();
}

function suspendMedecin(medId){
  if(!confirm('Suspendre l\'accès de ce médecin ?'))return;
  const m=DB.medecins.find(x=>x.id===medId);
  if(!m)return;
  m.statut='Suspendu';
  toast(`Compte de Dr. ${m.prenom} ${m.nom} suspendu`,'wa');
  render();
}

function showInviteMedModal(){
  const hop=getHopital(DB.session.hopId)||DB.hopitaux[0];
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">+ Inviter un médecin</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div style="background:var(--teal-pale);border-radius:var(--rs);padding:11px 13px;font-size:.82rem;color:var(--teal);margin-bottom:16px">
          Un email d'invitation sera envoyé. Le médecin devra compléter son inscription.
        </div>
        <div class="fgrid" style="margin-bottom:13px">
          <div class="fg"><label class="lbl">Prénom *</label><input class="fc" id="inv-prenom" placeholder="Amara"></div>
          <div class="fg"><label class="lbl">Nom *</label><input class="fc" id="inv-nom" placeholder="Koné"></div>
        </div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Email professionnel *</label><input type="email" class="fc" id="inv-email" placeholder="dr.kone@hopital.cm"></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Spécialité</label><select class="fc" id="inv-spec"><option>Médecine Générale</option><option>Cardiologie</option><option>Pédiatrie</option><option>Gynécologie</option><option>Chirurgie</option><option>Neurologie</option><option>Autre</option></select></div>
        <div class="fg"><label class="lbl">Message personnalisé (optionnel)</label><textarea class="fc" placeholder="Bienvenue dans notre équipe…"></textarea></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="doInviteMedecin()">Envoyer l'invitation</button>
      </div>
    </div>
  </div>`);
}

function doInviteMedecin(){
  const prenom=document.getElementById('inv-prenom')?.value.trim();
  const nom=document.getElementById('inv-nom')?.value.trim();
  const email=document.getElementById('inv-email')?.value.trim();
  const spec=document.getElementById('inv-spec')?.value||'Médecine Générale';
  if(!prenom||!nom||!email){ toast('Prénom, nom et email requis','er'); return; }
  const av=(prenom[0]+nom[0]).toUpperCase();
  const hop=DB.session.hopId||'HOP001';
  DB.medecins.push({
    id:'MED'+Date.now().toString().slice(-3),
    nom,prenom,spec,hop,email,
    tel:'—',statut:'En attente',av,role:'doctor'
  });
  closeModalForce();
  toast(`Invitation envoyée à Dr. ${prenom} ${nom} (${email})`,'ok');
  render();
}

function showEditMedModal(medId){
  const m=DB.medecins.find(x=>x.id===medId);
  if(!m)return;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">✏️ Modifier — Dr. ${m.prenom} ${m.nom}</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fgrid" style="margin-bottom:13px">
          <div class="fg"><label class="lbl">Prénom</label><input class="fc" id="em-prenom" value="${m.prenom}"></div>
          <div class="fg"><label class="lbl">Nom</label><input class="fc" id="em-nom" value="${m.nom}"></div>
        </div>
        <div class="fg" style="margin-bottom:13px">
          <label class="lbl">Spécialité</label>
          <select class="fc" id="em-spec">
            ${['Médecine Générale','Cardiologie','Pédiatrie','Gynécologie','Chirurgie','Neurologie'].map(s=>`<option ${m.spec===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Email</label><input type="email" class="fc" id="em-email" value="${m.email}"></div>
        <div class="fg"><label class="lbl">Téléphone</label><input class="fc" id="em-tel" value="${m.tel}"></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="doEditMedecin('${medId}')">Enregistrer</button>
      </div>
    </div>
  </div>`);
}

function doEditMedecin(medId){
  const m=DB.medecins.find(x=>x.id===medId);
  if(!m){ toast('Médecin introuvable','er'); return; }
  m.prenom=document.getElementById('em-prenom')?.value||m.prenom;
  m.nom=document.getElementById('em-nom')?.value||m.nom;
  m.spec=document.getElementById('em-spec')?.value||m.spec;
  m.email=document.getElementById('em-email')?.value||m.email;
  m.tel=document.getElementById('em-tel')?.value||m.tel;
  m.av=(m.prenom[0]+m.nom[0]).toUpperCase();
  closeModalForce();
  toast(`Profil de Dr. ${m.prenom} ${m.nom} mis à jour`,'ok');
  render();
}
