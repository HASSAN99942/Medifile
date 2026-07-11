/* MediFile — doctor.js */

/* ═══════════════════════════════════════════
   MEDIFILE — PAGES MÉDECIN
═══════════════════════════════════════════ */

/* ── DASHBOARD MÉDECIN ────────────────────── */
function dHome(){
  const m=getCurrentMedecin()||DB.medecins[0];
  const hop=getHopital(m.hop);
  const myPats=DB.patients.filter(p=>p.medref===m.id||p.acces_actifs.some(a=>a.medId===m.id));
  const myRdv=DB.rdvs.filter(r=>r.medId===m.id);
  const crit=DB.patients.filter(p=>p.statut==='Critique').length;
  const surv=DB.patients.filter(p=>p.statut==='Surveillance').length;
  return`
  <div class="main ani">
    ${topbar('Tableau de bord')}
    <div class="content">
      <p style="color:var(--slate);font-size:.88rem;margin-bottom:22px">
        Bonjour, <strong>Dr. ${m.prenom} ${m.nom}</strong> — ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        <span class="badge b-teal" style="margin-left:10px">🏥 ${hop?.nom||'—'}</span>
      </p>
      <div class="sgrid">
        <div class="scard sc-teal" onclick="go('d-patients')"><div class="s-lbl">Mes patients</div><div class="s-val">${DB.patients.length}</div><div class="s-sub">Suivis actifs</div><div class="s-ico">👥</div></div>
        <div class="scard sc-gold" onclick="go('d-rdv')"><div class="s-lbl">RDV aujourd'hui</div><div class="s-val">${myRdv.length}</div><div class="s-sub">Premier à ${myRdv[0]?.h||'—'}</div><div class="s-ico">📅</div></div>
        <div class="scard sc-${crit>0?'red':'green'}"><div class="s-lbl">Cas critiques</div><div class="s-val" style="${crit>0?'color:var(--red)':''}">${crit}</div><div class="s-sub">${crit>0?'⚠️ Attention requise':'Aucun urgent'}</div><div class="s-ico">🚨</div></div>
        <div class="scard sc-blue"><div class="s-lbl">Surveillance</div><div class="s-val">${surv}</div><div class="s-sub">Suivi rapproché</div><div class="s-ico">👁️</div></div>
      </div>
      <div class="dg2">
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="card">
            <div class="card-hdr"><div class="card-ttl">📅 RDV du jour</div><button class="btn btn-s btn-sm" onclick="go('d-rdv')">Voir tout</button></div>
            <div class="tw">
              <table>
                <thead><tr><th>Heure</th><th>Patient</th><th>Motif</th><th>Salle</th><th></th></tr></thead>
                <tbody>
                  ${myRdv.map(r=>`
                    <tr>
                      <td><strong>${r.h}</strong></td>
                      <td>${r.pat}</td>
                      <td style="color:var(--slate);font-size:.82rem">${r.motif}</td>
                      <td><span class="badge b-teal">${r.salle}</span></td>
                      <td>
                        <button class="btn btn-s btn-sm" onclick="openPatientDossier('${r.pid}')">Dossier</button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-hdr"><div class="card-ttl">👥 Patients récents</div><button class="btn btn-s btn-sm" onclick="go('d-patients')">Tous</button></div>
            ${DB.patients.slice(0,4).map(p=>`
              <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(209,232,229,.5);cursor:pointer;border-radius:var(--rs);padding-left:4px;transition:background .15s" onclick="openPatientDossier('${p.id}')" onmouseover="this.style.background='var(--teal-pale)'" onmouseout="this.style.background=''">
                <div class="av">${p.prenom[0]}${p.nom[0]}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:.9rem">${p.prenom} ${p.nom}</div>
                  <div style="font-size:.75rem;color:var(--slate)">${age(p.ddn)} ans · ${p.gs} · ${fd(p.lastv)}</div>
                </div>
                ${sbadge(p.statut)}
                ${p.acces_actifs.some(a=>a.medId===m.id)?`<span class="badge b-ok" style="font-size:.65rem">✓ Accès</span>`:`<span class="badge b-warn" style="font-size:.65rem">🔒 Verrouillé</span>`}
              </div>`).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="card">
            <div class="card-ttl" style="margin-bottom:14px">🚨 Alertes cliniques</div>
            ${DB.patients.filter(p=>p.statut==='Critique'||p.statut==='Surveillance').map(p=>`
              <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                <span>${p.statut==='Critique'?'🔴':'🟡'}</span>
                <div>
                  <div style="font-weight:600;font-size:.85rem">${p.prenom} ${p.nom}</div>
                  <div style="font-size:.75rem;color:var(--slate)">${p.atcd.join(', ')||'—'}</div>
                  <button class="btn btn-g btn-sm" style="margin-top:5px" onclick="openPatientDossier('${p.id}')">Voir dossier</button>
                </div>
              </div>`).join('')||`<p style="color:var(--slate);font-size:.83rem;text-align:center;padding:16px 0">✅ Aucune alerte</p>`}
          </div>
          <div class="card">
            <div class="card-ttl" style="margin-bottom:12px">⚡ Accès rapide</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              <button class="btn btn-s" style="justify-content:flex-start" onclick="showModalNewPat()">➕ Nouveau patient</button>
              <button class="btn btn-s" style="justify-content:flex-start" onclick="go('d-ordos')">💊 Ordonnances</button>
              <button class="btn btn-s" style="justify-content:flex-start" onclick="go('d-results')">🧪 Résultats</button>
              <button class="btn btn-g" style="justify-content:flex-start" onclick="go('d-patients')">🔍 Rechercher patient</button>
            </div>
          </div>
          <div class="card" style="border:1px solid var(--purple);background:#faf5ff">
            <div class="card-ttl" style="margin-bottom:10px;color:var(--purple)">🔐 Système de consentement</div>
            <p style="font-size:.8rem;color:var(--slate);margin-bottom:12px">Pour accéder au dossier d'un patient hors de votre établissement, vous avez besoin de son autorisation.</p>
            <button class="btn btn-purple btn-sm btn-full" onclick="showConsentInfoModal()">Comment ça fonctionne ?</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── LISTE PATIENTS MÉDECIN ───────────────── */
function dPatients(){
  const m=getCurrentMedecin()||DB.medecins[0];
  const q=S.q.toLowerCase();
  const list=DB.patients.filter(p=>
    `${p.prenom} ${p.nom}`.toLowerCase().includes(q)||
    p.id.toLowerCase().includes(q)||p.tel.includes(q)
  );
  return`
  <div class="main ani">
    ${topbar('Patients')}
    <div class="content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div class="srch" style="display:flex">
            <span>🔍</span>
            <input type="text" placeholder="Nom, ID, téléphone…" value="${S.q}" oninput="S.q=this.value;go('d-patients')" style="width:190px">
          </div>
          <select class="fc" style="width:auto" onchange="">
            <option>Tous les statuts</option>
            <option>Actif</option><option>Surveillance</option><option>Critique</option>
          </select>
        </div>
        <button class="btn btn-p" onclick="showModalNewPat()">➕ Nouveau patient</button>
      </div>
      <div class="card">
        <div style="margin-bottom:14px;color:var(--slate);font-size:.83rem">${list.length} patient(s) — cliquez pour ouvrir le dossier</div>
        <div class="tw">
          <table>
            <thead><tr><th>Patient</th><th>Âge/Sexe</th><th>Contact</th><th>Antécédents</th><th>Dernière visite</th><th>Statut</th><th>Accès</th><th></th></tr></thead>
            <tbody>
              ${list.length===0?`<tr><td colspan="8"><div class="empty"><div class="empty-ic">🔍</div><div class="empty-t">Aucun patient trouvé</div></div></td></tr>`:
              list.map(p=>{
                const hasAccess=p.acces_actifs.some(a=>a.medId===m.id);
                return`
                <tr style="cursor:pointer" onclick="openPatientDossier('${p.id}')">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="av" style="flex-shrink:0">${p.prenom[0]}${p.nom[0]}</div>
                      <div>
                        <div style="font-weight:600">${p.prenom} ${p.nom}</div>
                        <div style="font-size:.72rem;color:var(--slate);font-family:monospace">${p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>${age(p.ddn)} ans / ${p.sexe==='F'?'F':'M'}</td>
                  <td style="font-size:.8rem">${p.tel}</td>
                  <td><div class="tags">${p.atcd.slice(0,2).map(a=>`<span class="tag">${a}</span>`).join('')}${p.atcd.length>2?`<span class="tag">+${p.atcd.length-2}</span>`:''}</div></td>
                  <td style="font-size:.82rem">${fd(p.lastv)}</td>
                  <td>${sbadge(p.statut)}</td>
                  <td>${hasAccess?`<span class="badge b-ok">✓ Autorisé</span>`:`<span class="badge b-warn">🔒 Verrouillé</span>`}</td>
                  <td onclick="event.stopPropagation()">
                    <div class="tact">
                      <button class="btn ${hasAccess?'btn-s':'btn-purple'} btn-sm" onclick="openPatientDossier('${p.id}')">
                        ${hasAccess?'Dossier':'Demander accès'}
                      </button>
                    </div>
                  </td>
                </tr>`}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── OUVERTURE DOSSIER (avec check accès) ─── */
function openPatientDossier(pid){
  const m=getCurrentMedecin()||DB.medecins[0];
  const p=getPatient(pid);
  if(!p){ toast('Patient introuvable','er'); return; }
  // Vérifier si le médecin a accès
  const hasAccess=p.acces_actifs.some(a=>a.medId===m.id);
  // Si même hôpital ET médecin référent → accès direct
  const isSameHop=p.hopital_inscrit===m.hop;
  const isRef=p.medref===m.id;
  if(hasAccess||isRef){
    go('d-patient',pid);
  } else {
    go('d-locked',pid);
  }
}

/* ── DOSSIER PATIENT (MÉDECIN) ────────────── */
function dPatient(){
  const p=getPatient(S.pid);
  const m=getCurrentMedecin()||DB.medecins[0];
  if(!p) return`<div class="main"><div class="content"><button class="btn btn-g" onclick="go('d-patients')">← Retour</button><p style="margin-top:20px">Patient introuvable.</p></div></div>`;
  const lc=p.consultations[0];
  const accPatient=p.acces_actifs.find(a=>a.medId===m.id);

  return`
  <div class="main ani">
    ${topbar('Dossier patient')}
    <div class="content">
      <button class="btn btn-g btn-sm" style="margin-bottom:16px" onclick="go('d-patients')">← Retour</button>

      ${accPatient?`
      <div style="background:var(--green);color:#fff;border-radius:var(--rs);padding:10px 16px;margin-bottom:14px;font-size:.83rem;display:flex;align-items:center;gap:8px">
        ✅ <strong>Accès autorisé</strong> — ${accPatient.statut==='permanent'?'Accès permanent':accPatient.expire?'Expire le '+fd(accPatient.expire):accPatient.statut}
        · Portée : ${accPatient.portee.map(pr=>porteeLabel(pr)).join(', ')}
        <button class="btn btn-sm" style="margin-left:auto;background:rgba(255,255,255,.2);color:#fff;font-size:.75rem" onclick="toast('Accès journalisé','info')">📋 Journaliser</button>
      </div>`:''}

      <div class="ph">
        <div class="av av-lg">${p.prenom[0]}${p.nom[0]}</div>
        <div class="ph-info">
          <div class="ph-name">${p.prenom} ${p.nom}</div>
          <div class="ph-id">ID: ${p.id} · ${p.gs} · ${age(p.ddn)} ans · ${p.sexe==='F'?'Féminin':'Masculin'}</div>
          <div class="tags" style="margin-top:8px">
            ${sbadge(p.statut)}
            ${p.allergies.map(a=>`<span class="badge b-err">⚠️ ${a}</span>`).join('')}
            ${p.atcd.map(a=>`<span class="badge b-teal">${a}</span>`).join('')}
          </div>
        </div>
        <div class="ph-act">
          <button class="btn btn-p" onclick="showModalConsult('${p.id}')">+ Consultation</button>
          <button class="btn btn-s" onclick="showModalOrdo('${p.id}')">💊 Ordonnance</button>
          <button class="btn btn-s" onclick="showModalResult('${p.id}')">🧪 Résultat</button>
          <button class="btn btn-g" onclick="showModalMsg('${p.id}')">✉️ Message</button>
          <button class="btn btn-g" onclick="window.print()">🖨️ PDF</button>
        </div>
      </div>

      ${lc?`
      <div class="vrow">
        <div class="vcard"><div class="v-val">${lc.ta}</div><div class="v-lbl">Tension (mmHg)</div></div>
        <div class="vcard"><div class="v-val">${lc.spo2}</div><div class="v-lbl">SpO2</div></div>
        <div class="vcard"><div class="v-val">${p.poids} kg</div><div class="v-lbl">Poids</div></div>
        <div class="vcard"><div class="v-val">${(p.poids/(p.taille/100)**2).toFixed(1)}</div><div class="v-lbl">IMC</div></div>
        <div class="vcard"><div class="v-val" style="font-size:1rem">${fd(p.lastv)}</div><div class="v-lbl">Dernière visite</div></div>
      </div>`:''}

      <div class="dgrid">
        <div>
          <div class="tabs">
            <button class="tab on" onclick="switchTab(this,'tc-c')">🩺 Consultations (${p.consultations.length})</button>
            <button class="tab" onclick="switchTab(this,'tc-o')">💊 Ordonnances (${p.ordos.length})</button>
            <button class="tab" onclick="switchTab(this,'tc-r')">🧪 Résultats (${p.results.length})</button>
            <button class="tab" onclick="switchTab(this,'tc-d')">📄 Documents (${p.docs.length})</button>
            <button class="tab" onclick="switchTab(this,'tc-a')">📋 Audit (${p.journal_audit.length})</button>
          </div>

          <div class="tc on" id="tc-c">
            ${p.consultations.length===0?`<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">Aucune consultation</div></div>`:
            p.consultations.map(c=>`
              <div class="card" style="margin-bottom:14px">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
                  <div>
                    <div style="font-family:var(--fh);font-weight:700;font-size:.98rem">${c.motif}</div>
                    <div style="font-size:.78rem;color:var(--slate)">${fd(c.date)} · ${c.med} · 🏥 ${c.hop}</div>
                  </div>
                  <span class="badge ${c.type==='Urgence'?'b-err':'b-teal'}">${c.type}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                  <div style="background:var(--mist);padding:10px;border-radius:var(--rs)"><div style="font-size:.68rem;color:var(--slate);text-transform:uppercase;font-weight:700">Diagnostic</div><div style="font-size:.85rem;font-weight:500;margin-top:2px">${c.diag}</div></div>
                  <div style="background:var(--mist);padding:10px;border-radius:var(--rs)"><div style="font-size:.68rem;color:var(--slate);text-transform:uppercase;font-weight:700">Traitement</div><div style="font-size:.85rem;font-weight:500;margin-top:2px">${c.trt}</div></div>
                </div>
                ${c.notes?`<div style="font-size:.8rem;color:var(--slate);border-left:3px solid var(--teal);padding-left:9px">${c.notes}</div>`:''}
                <div style="display:flex;gap:6px;margin-top:9px">
                  <span style="background:var(--teal-pale);color:var(--teal);padding:3px 8px;border-radius:4px;font-size:.75rem;font-weight:600">TA: ${c.ta}</span>
                  <span style="background:var(--teal-pale);color:var(--teal);padding:3px 8px;border-radius:4px;font-size:.75rem;font-weight:600">SpO2: ${c.spo2}</span>
                </div>
              </div>`).join('')}
          </div>

          <div class="tc" id="tc-o">
            ${p.ordos.length===0?`<div class="empty"><div class="empty-ic">💊</div><div class="empty-t">Aucune ordonnance</div></div>`:
            p.ordos.map(o=>`
              <div class="card" style="margin-bottom:14px">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:13px">
                  <div><div style="font-weight:700">Ordonnance ${o.id}</div><div style="font-size:.78rem;color:var(--slate)">${fd(o.date)} · ${o.med}</div></div>
                  <div style="display:flex;gap:7px;align-items:center">${obadge(o.statut)}<button class="btn btn-g btn-sm" onclick="toast('Impression…','info')">🖨️</button></div>
                </div>
                <table style="width:100%">
                  <thead><tr><th>Médicament</th><th>Dosage</th><th>Fréquence</th><th>Durée</th></tr></thead>
                  <tbody>${o.meds.map(med=>`<tr><td style="font-weight:500">${med.nom}</td><td>${med.dose}</td><td style="font-size:.8rem">${med.freq}</td><td style="font-size:.8rem">${med.dur}</td></tr>`).join('')}</tbody>
                </table>
              </div>`).join('')}
          </div>

          <div class="tc" id="tc-r">
            ${p.results.length===0?`<div class="empty"><div class="empty-ic">🧪</div><div class="empty-t">Aucun résultat</div></div>`:
            `<div class="tw"><table>
              <thead><tr><th>Date</th><th>Examen</th><th>Valeur</th><th>Référence</th><th>Statut</th><th>Labo</th></tr></thead>
              <tbody>${p.results.map(r=>`<tr><td style="font-size:.8rem">${fd(r.date)}</td><td><div style="font-weight:600">${r.titre}</div><div style="font-size:.7rem;color:var(--slate)">${r.type}</div></td><td style="font-weight:600">${r.val}</td><td style="font-size:.8rem;color:var(--slate)">${r.ref}</td><td>${rbadge(r.statut)}</td><td style="font-size:.78rem">${r.labo}</td></tr>`).join('')}</tbody>
            </table></div>`}
          </div>

          <div class="tc" id="tc-d">
            <div style="margin-bottom:12px"><button class="btn btn-s btn-sm" onclick="showModalDoc('${p.id}')">📁 Importer document</button></div>
            ${p.docs.length===0?`<div class="empty"><div class="empty-ic">📄</div><div class="empty-t">Aucun document</div></div>`:
            p.docs.map(d=>`
              <div style="display:flex;align-items:center;gap:13px;padding:13px;border:1px solid var(--border);border-radius:var(--rs);margin-bottom:9px">
                <span style="font-size:1.7rem">📄</span>
                <div style="flex:1"><div style="font-weight:600">${d.nom}</div><div style="font-size:.75rem;color:var(--slate)">${fd(d.date)} · ${d.type} · ${d.size}</div></div>
                <button class="btn btn-g btn-sm" onclick="toast('Téléchargement…','info')">⬇️</button>
              </div>`).join('')}
          </div>

          <div class="tc" id="tc-a">
            <div style="font-size:.8rem;color:var(--slate);margin-bottom:14px">Journal de tous les accès à ce dossier — visible par le patient.</div>
            ${p.journal_audit.length===0?`<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">Aucun accès journalisé</div></div>`:
            p.journal_audit.map(a=>`
              <div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
                <span style="font-size:1.1rem;flex-shrink:0">${a.action.includes('urgence')?'🚨':a.action.includes('révoqué')?'🔒':'👁️'}</span>
                <div><div style="font-weight:600;font-size:.85rem">${a.med}</div><div style="font-size:.78rem;color:var(--slate)">${a.action}</div><div style="font-size:.7rem;color:var(--slate)">${fdh(a.date)}${a.ip&&a.ip!=='—'?' · IP: '+a.ip:''}</div></div>
              </div>`).join('')}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="card">
            <div class="card-ttl" style="margin-bottom:14px">Informations patient</div>
            ${[['📞','Téléphone',p.tel],['✉️','Email',p.email],['📍','Adresse',p.adresse],['🎂','Naissance',`${fd(p.ddn)} (${age(p.ddn)} ans)`],['🩸','Groupe sanguin',p.gs],['⚖️','Poids / Taille',`${p.poids} kg / ${p.taille} cm`],['🛡️','Assurance',`${p.assur} (${p.nassur})`],['🏥','Hôpital inscrit',getHopital(p.hopital_inscrit)?.nom||'—']].map(([ic,lb,vl])=>`
              <div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:10px">
                <span style="font-size:.9rem;width:18px">${ic}</span>
                <div><div style="font-size:.68rem;color:var(--slate);font-weight:700;text-transform:uppercase">${lb}</div><div style="font-size:.85rem;font-weight:500">${vl}</div></div>
              </div>`).join('')}
          </div>
          ${p.allergies.length>0?`
          <div class="card" style="border-left:4px solid var(--red)">
            <div style="color:var(--red);font-weight:700;margin-bottom:9px">⚠️ Allergies</div>
            <div class="tags">${p.allergies.map(a=>`<span class="badge b-err">${a}</span>`).join('')}</div>
          </div>`:''}
          <div class="card">
            <div class="card-ttl" style="margin-bottom:13px">Chronologie</div>
            <div class="tl">
              ${p.consultations.map((c,i)=>`
                <div class="tl-item">
                  <div class="tl-dot ${c.type==='Urgence'?'r':i===0?'':'b'}"></div>
                  <div class="tl-d">${fd(c.date)}</div>
                  <div class="tl-t">${c.motif}</div>
                  <div class="tl-s">${c.diag}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── RDV MÉDECIN ──────────────────────────── */
function dRdv(){
  const m=getCurrentMedecin()||DB.medecins[0];
  const myRdv=DB.rdvs.filter(r=>r.medId===m.id);
  return`
  <div class="main ani">
    ${topbar('Rendez-vous')}
    <div class="content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div class="badge b-teal" style="font-size:.85rem;padding:8px 14px">📅 ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
        <button class="btn btn-p" onclick="showModalNewRdv()">+ Nouveau rendez-vous</button>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">Planning du jour (${myRdv.length} RDV)</div></div>
        <div class="tw">
          <table>
            <thead><tr><th>Heure</th><th>Patient</th><th>Motif</th><th>Salle</th><th>Actions</th></tr></thead>
            <tbody>
              ${myRdv.map(r=>`
                <tr>
                  <td><strong style="font-family:var(--fh)">${r.h}</strong></td>
                  <td><strong>${r.pat}</strong></td>
                  <td style="color:var(--slate)">${r.motif}</td>
                  <td><span class="badge b-teal">${r.salle}</span></td>
                  <td>
                    <div class="tact">
                      <button class="btn btn-p btn-sm" onclick="toast('Consultation démarrée','ok')">▶ Démarrer</button>
                      <button class="btn btn-s btn-sm" onclick="openPatientDossier('${r.pid}')">Dossier</button>
                      <button class="btn btn-g btn-sm" onclick="toast('RDV annulé','wa')">✕</button>
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

/* ── ORDONNANCES MÉDECIN ──────────────────── */
function dOrdos(){
  const all=DB.patients.flatMap(p=>p.ordos.map(o=>({...o,pnom:`${p.prenom} ${p.nom}`,pid:p.id}))).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return`
  <div class="main ani">
    ${topbar('Ordonnances')}
    <div class="content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <p style="color:var(--slate);font-size:.88rem">${all.length} ordonnance(s)</p>
        <button class="btn btn-p" onclick="showModalOrdo(null)">💊 Nouvelle ordonnance</button>
      </div>
      <div class="card">
        <div class="tw">
          <table>
            <thead><tr><th>Réf.</th><th>Patient</th><th>Date</th><th>Médicaments</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              ${all.map(o=>`
                <tr>
                  <td style="font-family:monospace;font-size:.8rem">${o.id}</td>
                  <td><strong>${o.pnom}</strong></td>
                  <td style="font-size:.83rem">${fd(o.date)}</td>
                  <td style="font-size:.8rem;color:var(--slate)">${o.meds.map(med=>med.nom).join(', ')}</td>
                  <td>${obadge(o.statut)}</td>
                  <td><div class="tact"><button class="btn btn-g btn-sm" onclick="openPatientDossier('${o.pid}')">Dossier</button><button class="btn btn-s btn-sm" onclick="toast('Impression…','info')">🖨️</button></div></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── RÉSULTATS MÉDECIN ────────────────────── */
function dResults(){
  const all=DB.patients.flatMap(p=>p.results.map(r=>({...r,pnom:`${p.prenom} ${p.nom}`,pid:p.id}))).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return`
  <div class="main ani">
    ${topbar("Résultats d'examens")}
    <div class="content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <p style="color:var(--slate);font-size:.88rem">${all.length} résultat(s)</p>
        <button class="btn btn-p" onclick="showModalResult(null)">🧪 Saisir un résultat</button>
      </div>
      <div class="card">
        <div class="tw">
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Examen</th><th>Valeur</th><th>Statut</th><th>Labo</th><th></th></tr></thead>
            <tbody>
              ${all.map(r=>`
                <tr>
                  <td style="font-size:.8rem">${fd(r.date)}</td>
                  <td><strong>${r.pnom}</strong></td>
                  <td>${r.titre}<br><span style="font-size:.7rem;color:var(--slate)">${r.type}</span></td>
                  <td style="font-weight:600">${r.val}</td>
                  <td>${rbadge(r.statut)}</td>
                  <td style="font-size:.78rem">${r.labo}</td>
                  <td><button class="btn btn-g btn-sm" onclick="openPatientDossier('${r.pid}')">Dossier</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── PARAMÈTRES MÉDECIN ───────────────────── */
function dSettings(){
  const m=getCurrentMedecin()||DB.medecins[0];
  const hop=getHopital(m.hop);
  return`
  <div class="main ani">
    ${topbar('Paramètres')}
    <div class="content">
      <div style="max-width:680px">
        <div class="card" style="margin-bottom:18px">
          <div class="card-hdr"><div class="card-ttl">👤 Mon profil médecin</div></div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap">
            <div class="av av-lg">${m.av}</div>
            <div>
              <div style="font-family:var(--fh);font-size:1.2rem;font-weight:800">Dr. ${m.prenom} ${m.nom}</div>
              <div style="color:var(--slate)">${m.spec} · ${hop?.nom||'—'}</div>
              <div style="font-size:.78rem;color:var(--slate)">ID: ${m.id}</div>
            </div>
            <button class="btn btn-g btn-sm" style="margin-left:auto" onclick="toast('Fonctionnalité phase 2','info')">Changer photo</button>
          </div>
          <div class="fgrid">
            <div class="fg"><label class="lbl">Prénom</label><input class="fc" value="${m.prenom}"></div>
            <div class="fg"><label class="lbl">Nom</label><input class="fc" value="${m.nom}"></div>
            <div class="fg"><label class="lbl">Spécialité</label><input class="fc" value="${m.spec}"></div>
            <div class="fg"><label class="lbl">Email</label><input class="fc" type="email" value="${m.email}"></div>
            <div class="fg"><label class="lbl">Téléphone</label><input class="fc" value="${m.tel}"></div>
            <div class="fg"><label class="lbl">Hôpital</label><input class="fc" value="${hop?.nom||'—'}" readonly style="background:var(--mist)"></div>
          </div>
          <div style="margin-top:14px;display:flex;justify-content:flex-end">
            <button class="btn btn-p" onclick="toast('Profil mis à jour','ok')">Enregistrer</button>
          </div>
        </div>
        <div class="card" style="margin-bottom:18px">
          <div class="card-ttl" style="margin-bottom:16px">🔑 Sécurité</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            <button class="btn btn-s" onclick="showChangePwdModal()">🔑 Changer mot de passe</button>
            <button class="btn btn-g" onclick="toast('Code QR de connexion envoyé','ok')">📱 Activer la 2FA</button>
            <button class="btn btn-g" onclick="toast('Journal téléchargé','info')">📋 Journal des accès</button>
          </div>
        </div>
        <div class="card">
          <div class="card-ttl" style="margin-bottom:16px">🔒 Confidentialité & Chiffrement</div>
          ${[['Chiffrement des données au repos',true],['Chiffrement en transit (TLS 1.3)',true],['Journalisation de tous les accès',true],['Déconnexion automatique après 30 min',true]].map(([lb,on])=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)">
              <div><div style="font-weight:500;font-size:.88rem">${lb}</div><div style="font-size:.72rem;color:var(--slate)">Conformité RGPD · HDS</div></div>
              <div style="cursor:pointer;width:44px;height:24px;border-radius:12px;background:${on?'var(--teal)':'var(--border)'};flex-shrink:0;position:relative" onclick="toast('Paramètre modifié','info')">
                <div style="position:absolute;top:3px;${on?'left:22px':'left:3px'};width:18px;height:18px;border-radius:50%;background:#fff"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

/* ── MODALS MÉDECIN ───────────────────────── */
function showModalNewPat(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:600px">
      <div class="md-hdr"><div class="md-ttl">➕ Nouveau patient</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fgrid" style="margin-bottom:13px">
          <div class="fg"><label class="lbl">Prénom *</label><input class="fc" id="np-prenom" placeholder="Jean"></div>
          <div class="fg"><label class="lbl">Nom *</label><input class="fc" id="np-nom" placeholder="Diallo"></div>
          <div class="fg"><label class="lbl">Date de naissance *</label><input type="date" class="fc" id="np-ddn"></div>
          <div class="fg"><label class="lbl">Sexe</label><select class="fc" id="np-sexe"><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
          <div class="fg"><label class="lbl">Téléphone</label><input class="fc" id="np-tel" placeholder="+237 6XX XXX XXX"></div>
          <div class="fg"><label class="lbl">Groupe sanguin</label><select class="fc" id="np-gs">${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=>`<option>${g}</option>`).join('')}</select></div>
        </div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Email</label><input type="email" class="fc" id="np-email"></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Adresse</label><input class="fc" placeholder="Quartier, Ville"></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Allergies (virgule)</label><input class="fc" id="np-allergies" placeholder="Pénicilline, Latex…"></div>
        <div class="fg"><label class="lbl">Antécédents (virgule)</label><textarea class="fc" id="np-atcd" placeholder="Diabète, HTA…"></textarea></div>
        <div style="background:var(--teal-pale);border-radius:var(--rs);padding:10px 13px;font-size:.78rem;color:var(--teal);margin-top:12px">🔒 Données chiffrées — conformité RGPD & HDS</div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="saveNewPat()">Créer le dossier</button>
      </div>
    </div>
  </div>`);
}

function saveNewPat(){
  const prenom=document.getElementById('np-prenom')?.value.trim();
  const nom=document.getElementById('np-nom')?.value.trim();
  if(!prenom||!nom){ toast('Prénom et nom requis','er'); return; }
  const m=getCurrentMedecin()||DB.medecins[0];
  const id='PAT'+String(DB.patients.length+1).padStart(3,'0');
  DB.patients.unshift({
    id,prenom,nom,
    sexe:document.getElementById('np-sexe')?.value||'M',
    ddn:document.getElementById('np-ddn')?.value||'2000-01-01',
    tel:document.getElementById('np-tel')?.value||'—',
    email:document.getElementById('np-email')?.value||'—',
    adresse:'—',gs:document.getElementById('np-gs')?.value||'O+',
    poids:0,taille:0,
    allergies:(document.getElementById('np-allergies')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
    atcd:(document.getElementById('np-atcd')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
    medref:m.id,statut:'Actif',
    lastv:new Date().toISOString().split('T')[0],
    assur:'—',nassur:'—',hopital_inscrit:m.hop,pin:'0000',
    consultations:[],ordos:[],results:[],docs:[],
    acces_actifs:[{id:'ACC'+Date.now(),medId:m.id,med:`Dr. ${m.prenom} ${m.nom}`,hop:getHopital(m.hop)?.nom||'—',depuis:new Date().toISOString().split('T')[0],expire:null,statut:'permanent',portee:['consultations','ordos','results','docs']}],
    demandes_acces:[],journal_audit:[],
  });
  closeModalForce();
  toast(`Dossier de ${prenom} ${nom} créé`,'ok');
  go('d-patients');
}

function showModalConsult(pid){
  const p=getPatient(pid);
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:600px">
      <div class="md-hdr"><div class="md-ttl">🩺 Nouvelle consultation — ${p?p.prenom+' '+p.nom:'Patient'}</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fgrid" style="margin-bottom:13px">
          <div class="fg"><label class="lbl">Date *</label><input type="date" class="fc" id="c-date" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="fg"><label class="lbl">Type</label><select class="fc" id="c-type"><option>Consultation</option><option>Urgence</option><option>Contrôle</option><option>Téléconsultation</option></select></div>
          <div class="fg"><label class="lbl">Tension (mmHg)</label><input class="fc" id="c-ta" placeholder="120/80"></div>
          <div class="fg"><label class="lbl">SpO2 (%)</label><input class="fc" type="number" id="c-spo2" placeholder="98" min="0" max="100"></div>
          <div class="fg"><label class="lbl">Température (°C)</label><input class="fc" type="number" placeholder="37.0" step="0.1"></div>
          <div class="fg"><label class="lbl">FC (bpm)</label><input class="fc" type="number" placeholder="75"></div>
        </div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Motif *</label><input class="fc" id="c-motif" placeholder="Douleur, fièvre…"></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Diagnostic</label><input class="fc" id="c-diag" placeholder="Diagnostic principal"></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Traitement prescrit</label><input class="fc" id="c-trt" placeholder="Médicaments, posologie…"></div>
        <div class="fg"><label class="lbl">Notes cliniques</label><textarea class="fc" id="c-notes" placeholder="Observations…"></textarea></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-s" onclick="toast('Brouillon sauvegardé','info');closeModalForce()">Brouillon</button>
        <button class="btn btn-p" onclick="saveConsult('${pid}')">Enregistrer</button>
      </div>
    </div>
  </div>`);
}

function saveConsult(pid){
  const p=getPatient(pid);
  const m=getCurrentMedecin()||DB.medecins[0];
  const hop=getHopital(m.hop);
  const motif=document.getElementById('c-motif')?.value||'Consultation';
  const diag=document.getElementById('c-diag')?.value||'—';
  const trt=document.getElementById('c-trt')?.value||'—';
  const notes=document.getElementById('c-notes')?.value||'';
  const ta=document.getElementById('c-ta')?.value||'—';
  const spo2v=document.getElementById('c-spo2')?.value;
  const spo2=spo2v?spo2v+'%':'—';
  const type=document.getElementById('c-type')?.value||'Consultation';
  const date=document.getElementById('c-date')?.value||new Date().toISOString().split('T')[0];
  if(p){
    p.lastv=date;
    p.consultations.unshift({id:'C'+Date.now().toString().slice(-6),date,type,medId:m.id,med:`Dr. ${m.prenom} ${m.nom}`,hop:hop?.nom||'—',motif,diag,trt,notes,ta,spo2});
    p.journal_audit.unshift({id:'AUD'+Date.now().toString().slice(-6),date:new Date().toISOString(),medId:m.id,med:`Dr. ${m.prenom} ${m.nom}`,hop:hop?.nom||'—',action:`Ajout consultation : ${motif}`,ip:'192.168.1.45'});
  }
  closeModalForce();
  toast('Consultation enregistrée','ok');
  if(S.page==='d-patient') go('d-patient',pid); else render();
}

function showModalOrdo(pid){
  const p=pid?getPatient(pid):null;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:600px">
      <div class="md-hdr"><div class="md-ttl">💊 Nouvelle ordonnance</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        ${!p?`<div class="fg" style="margin-bottom:14px"><label class="lbl">Patient *</label><select class="fc" id="o-pid"><option value="">Sélectionner…</option>${DB.patients.map(pt=>`<option value="${pt.id}">${pt.prenom} ${pt.nom}</option>`).join('')}</select></div>`:`<div style="font-weight:600;margin-bottom:13px">Patient : ${p.prenom} ${p.nom}</div>`}
        <div id="ordo-lines">
          <div class="ordo-line" style="display:grid;grid-template-columns:2fr 1fr 2fr 1fr auto;gap:7px;margin-bottom:9px;align-items:start">
            <input class="fc" placeholder="Médicament *"><input class="fc" placeholder="Dosage"><input class="fc" placeholder="Fréquence"><input class="fc" placeholder="Durée"><button class="btn btn-g btn-sm" onclick="this.closest('.ordo-line').remove()">✕</button>
          </div>
        </div>
        <button class="btn btn-s btn-sm" onclick="addOrdoLine()">+ Ajouter médicament</button>
        <div class="fg" style="margin-top:13px"><label class="lbl">Instructions complémentaires</label><textarea class="fc" placeholder="Régime, repos…"></textarea></div>
        <div style="background:var(--teal-pale);border-radius:var(--rs);padding:9px 13px;font-size:.78rem;color:var(--teal);margin-top:11px">🔏 Ordonnance horodatée et signée numériquement.</div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="toast('Ordonnance émise et signée','ok');closeModalForce()">Émettre</button>
      </div>
    </div>
  </div>`);
}

function addOrdoLine(){
  const c=document.getElementById('ordo-lines');
  if(!c)return;
  const d=document.createElement('div');
  d.className='ordo-line';
  d.style='display:grid;grid-template-columns:2fr 1fr 2fr 1fr auto;gap:7px;margin-bottom:9px;align-items:start';
  d.innerHTML='<input class="fc" placeholder="Médicament *"><input class="fc" placeholder="Dosage"><input class="fc" placeholder="Fréquence"><input class="fc" placeholder="Durée"><button class="btn btn-g btn-sm" onclick="this.closest(\'.ordo-line\').remove()">✕</button>';
  c.appendChild(d);
}

function showModalResult(pid){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:540px">
      <div class="md-hdr"><div class="md-ttl">🧪 Saisir un résultat</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        ${!pid?`<div class="fg" style="margin-bottom:12px"><label class="lbl">Patient *</label><select class="fc" id="r-pid"><option value="">Sélectionner…</option>${DB.patients.map(pt=>`<option value="${pt.id}">${pt.prenom} ${pt.nom}</option>`).join('')}</select></div>`:''}
        <div class="fgrid" style="margin-bottom:12px">
          <div class="fg"><label class="lbl">Date *</label><input type="date" class="fc" id="r-date" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="fg"><label class="lbl">Type</label><select class="fc" id="r-type"><option>Biologie</option><option>Imagerie</option><option>Microbiologie</option></select></div>
        </div>
        <div class="fg" style="margin-bottom:12px"><label class="lbl">Intitulé *</label><input class="fc" id="r-titre" placeholder="Glycémie, NFS, Radio…"></div>
        <div class="fgrid" style="margin-bottom:12px">
          <div class="fg"><label class="lbl">Valeur</label><input class="fc" id="r-val" placeholder="1.20 g/L"></div>
          <div class="fg"><label class="lbl">Référence</label><input class="fc" id="r-ref" placeholder="0.70–1.10 g/L"></div>
        </div>
        <div class="fgrid">
          <div class="fg"><label class="lbl">Statut</label><select class="fc" id="r-statut"><option>Normal</option><option>Limite</option><option>Élevé</option><option>Bas</option></select></div>
          <div class="fg"><label class="lbl">Laboratoire</label><input class="fc" id="r-labo" placeholder="Nom du labo"></div>
        </div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="saveResult('${pid||''}')">Enregistrer</button>
      </div>
    </div>
  </div>`);
}

function saveResult(pid){
  const realPid=pid||document.getElementById('r-pid')?.value;
  const p=getPatient(realPid);
  const titre=document.getElementById('r-titre')?.value.trim();
  if(!titre){ toast('Intitulé requis','er'); return; }
  if(p) p.results.unshift({id:'R'+Date.now().toString().slice(-6),date:document.getElementById('r-date')?.value||new Date().toISOString().split('T')[0],type:document.getElementById('r-type')?.value||'Biologie',titre,val:document.getElementById('r-val')?.value||'—',ref:document.getElementById('r-ref')?.value||'—',statut:document.getElementById('r-statut')?.value||'Normal',labo:document.getElementById('r-labo')?.value||'—'});
  closeModalForce();
  toast('Résultat enregistré','ok');
  if(S.page==='d-patient') go('d-patient',realPid); else render();
}

function showModalDoc(pid){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:440px">
      <div class="md-hdr"><div class="md-ttl">📄 Importer un document</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fg" style="margin-bottom:12px"><label class="lbl">Nom du document *</label><input class="fc" id="doc-nom" placeholder="Compte-rendu, résultats…"></div>
        <div class="fgrid" style="margin-bottom:12px">
          <div class="fg"><label class="lbl">Date</label><input type="date" class="fc" id="doc-date" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="fg"><label class="lbl">Type</label><select class="fc" id="doc-type"><option>PDF</option><option>Compte-rendu</option><option>Imagerie</option><option>Certificat</option></select></div>
        </div>
        <div style="border:2px dashed var(--border);border-radius:var(--rs);padding:26px;text-align:center;cursor:pointer" onclick="toast('Sélection fichier disponible en phase 2','info')">
          <div style="font-size:1.8rem;margin-bottom:6px">📁</div>
          <div style="font-weight:600;font-size:.86rem">Cliquez pour sélectionner</div>
          <div style="font-size:.74rem;color:var(--slate);margin-top:2px">PDF, JPG, PNG — Max 10 Mo</div>
        </div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="saveDoc('${pid||''}')">Importer</button>
      </div>
    </div>
  </div>`);
}

function saveDoc(pid){
  const nom=document.getElementById('doc-nom')?.value.trim();
  if(!nom){ toast('Nom requis','er'); return; }
  const p=getPatient(pid);
  if(p) p.docs.unshift({id:'D'+Date.now().toString().slice(-6),nom,date:document.getElementById('doc-date')?.value||new Date().toISOString().split('T')[0],type:document.getElementById('doc-type')?.value||'PDF',size:'—'});
  closeModalForce();
  toast('Document importé','ok');
  if(S.page==='d-patient') go('d-patient',pid); else render();
}

function showModalMsg(pid){
  const p=getPatient(pid);
  if(!p)return;
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:440px">
      <div class="md-hdr"><div class="md-ttl">✉️ Message à ${p.prenom} ${p.nom}</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fg" style="margin-bottom:12px"><label class="lbl">Canal</label><div style="display:flex;gap:10px;margin-top:4px"><label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:.85rem"><input type="radio" name="canal" checked style="accent-color:var(--teal)"> SMS</label><label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:.85rem"><input type="radio" name="canal" style="accent-color:var(--teal)"> Email</label></div></div>
        <div class="fg" style="margin-bottom:12px"><label class="lbl">Sujet</label><input class="fc" placeholder="Rappel RDV, résultats disponibles…"></div>
        <div class="fg"><label class="lbl">Message *</label><textarea class="fc" rows="4">Bonjour ${p.prenom},\n\nRappel de votre prochaine consultation.\n\nCordialement,\nDr. ${(getCurrentMedecin()||DB.medecins[0]).prenom} ${(getCurrentMedecin()||DB.medecins[0]).nom}</textarea></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="toast('Message envoyé à ${p.prenom}','ok');closeModalForce()">Envoyer</button>
      </div>
    </div>
  </div>`);
}

function showModalNewRdv(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">📅 Nouveau rendez-vous</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Patient *</label><select class="fc"><option value="">Sélectionner…</option>${DB.patients.map(p=>`<option value="${p.id}">${p.prenom} ${p.nom}</option>`).join('')}</select></div>
        <div class="fgrid" style="margin-bottom:13px">
          <div class="fg"><label class="lbl">Date *</label><input type="date" class="fc" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="fg"><label class="lbl">Heure *</label><input type="time" class="fc" value="09:00"></div>
        </div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Motif</label><input class="fc" placeholder="Suivi, bilan, renouvellement…"></div>
        <div class="fg"><label class="lbl">Salle</label><select class="fc"><option>Salle 1</option><option>Salle 2</option><option>Salle 3</option><option>Téléconsultation</option></select></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="toast('RDV créé — Patient notifié par SMS','ok');closeModalForce()">Créer</button>
      </div>
    </div>
  </div>`);
}

function showChangePwdModal(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:390px">
      <div class="md-hdr"><div class="md-ttl">🔑 Changer le mot de passe</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div class="fg" style="margin-bottom:12px"><label class="lbl">Mot de passe actuel</label><input type="password" class="fc" placeholder="••••••••"></div>
        <div class="fg" style="margin-bottom:8px"><label class="lbl">Nouveau</label><input type="password" class="fc" id="npwd" placeholder="••••••••" oninput="checkPwdStrength(this.value)"></div>
        <div class="pbar" style="margin-bottom:3px"><div class="pfill" id="pwd-bar" style="width:0;background:var(--red)"></div></div>
        <div style="font-size:.7rem;color:var(--slate);margin-bottom:11px" id="pwd-hint-d">Entrez un mot de passe</div>
        <div class="fg"><label class="lbl">Confirmer</label><input type="password" class="fc" placeholder="••••••••"></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="toast('Mot de passe modifié','ok');closeModalForce()">Enregistrer</button>
      </div>
    </div>
  </div>`);
}

function checkPwdStrength(v){
  const bar=document.getElementById('pwd-bar'),hint=document.getElementById('pwd-hint-d');
  if(!bar||!hint)return;
  let s=0;if(v.length>=8)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
  bar.style.width=[0,25,50,75,100][s]+'%';
  bar.style.background=['var(--red)','var(--red)','var(--orange)','var(--gold)','var(--green)'][s];
  hint.textContent=['','Faible','Moyen','Fort','Très fort'][s]||'';
}

function showConsentInfoModal(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md" style="max-width:580px">
      <div class="md-hdr"><div class="md-ttl">🔐 Système de consentement patient</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div style="background:linear-gradient(135deg,var(--purple) 0%,#4a2080 100%);border-radius:var(--rs);padding:18px;color:#fff;margin-bottom:18px">
          <div style="font-family:var(--fh);font-weight:700;margin-bottom:6px">Cas pratique — Jean consulte à Bafoussam</div>
          <div style="font-size:.83rem;opacity:.85;line-height:1.6">Jean Diallo est suivi à Douala. Il consulte dans un hôpital à Bafoussam. Le médecin voit qu'un dossier existe, mais ne peut pas y accéder sans autorisation.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${[
            ['1','🏥','L\'hôpital de Bafoussam rejoint la plateforme','L\'administrateur crée son profil établissement.'],
            ['2','👨‍⚕️','Le médecin crée son compte professionnel','Il est validé par l\'administrateur de l\'hôpital.'],
            ['3','🔒','Le médecin accède à la fiche de base du patient','Il voit que Jean a un dossier, mais aucun détail.'],
            ['4','📨','Le médecin envoie une demande d\'accès','Ou demande au patient un code / QR code.'],
            ['5','✅','Le patient autorise depuis son application','Via code temporaire, QR Code ou validation manuelle.'],
            ['6','📋','L\'accès est journalisé','Jean voit qui a consulté son dossier et quand.'],
          ].map(([n,ic,t,s])=>`
            <div style="display:flex;gap:13px;align-items:flex-start">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:800;flex-shrink:0">${n}</div>
              <div>
                <div style="font-weight:600;font-size:.88rem">${ic} ${t}</div>
                <div style="font-size:.78rem;color:var(--slate);margin-top:2px">${s}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="md-ftr"><button class="btn btn-p" onclick="closeModalForce()">Compris</button></div>
    </div>
  </div>`);
}
