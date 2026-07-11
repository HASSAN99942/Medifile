/* MediFile — patient.js */

/* ═══════════════════════════════════════════
   MEDIFILE — PAGES PATIENT
═══════════════════════════════════════════ */

/* ── DASHBOARD PATIENT ────────────────────── */
function pHome(){
  const p=getCurrentPatient();
  if(!p) return'';
  const actOrdos=p.ordos.filter(o=>o.statut==='Active');
  const lc=p.consultations[0];
  const pending=p.demandes_acces.filter(d=>d.statut==='pending');

  return`
  <div class="main ani">
    ${ptopbar('Mon tableau de bord')}
    <div class="content">

      ${pending.length>0?`
      <div style="background:var(--orange);color:#fff;border-radius:var(--rs);padding:13px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <strong>⏳ ${pending.length} demande(s) d'accès en attente</strong>
          <div style="font-size:.82rem;opacity:.9;margin-top:2px">${pending[0].med} souhaite accéder à votre dossier</div>
        </div>
        <button class="btn" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="go('p-acces')">Répondre →</button>
      </div>`:''}

      <div class="p-hero">
        <div style="font-size:.75rem;opacity:.7;margin-bottom:3px;text-transform:uppercase;letter-spacing:.08em">Bonjour</div>
        <div style="font-family:var(--fh);font-size:1.75rem;font-weight:800;margin-bottom:5px">${p.prenom} ${p.nom}</div>
        <div style="opacity:.72;font-size:.88rem">Médecin référent : <strong>${getMedecin(p.medref)?.prenom+' '+getMedecin(p.medref)?.nom||'—'}</strong> · ${getHopital(p.hopital_inscrit)?.nom||'—'}</div>
        <div style="margin-top:16px;display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="showGenerateCodeModal()">🔢 Code temporaire</button>
          <button class="btn" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="showQrModal()">📱 Mon QR Code</button>
          <button class="btn" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="go('p-acces')">🔐 Gérer les accès</button>
        </div>
      </div>

      <div class="sgrid">
        <div class="scard sc-teal" onclick="go('p-ordos')"><div class="s-lbl">Ordonnances actives</div><div class="s-val">${actOrdos.length}</div><div class="s-sub">Médicaments en cours</div><div class="s-ico">💊</div></div>
        <div class="scard sc-gold" onclick="go('p-results')"><div class="s-lbl">Résultats</div><div class="s-val">${p.results.length}</div><div class="s-sub">À consulter</div><div class="s-ico">🧪</div></div>
        <div class="scard sc-blue" onclick="go('p-histo')"><div class="s-lbl">Consultations</div><div class="s-val">${p.consultations.length}</div><div class="s-sub">Dans l'historique</div><div class="s-ico">📋</div></div>
        <div class="scard sc-${pending.length>0?'red':'purple'}" onclick="go('p-acces')"><div class="s-lbl">Accès accordés</div><div class="s-val">${p.acces_actifs.length}</div><div class="s-sub">${pending.length>0?`⏳ ${pending.length} en attente`:'Consentements actifs'}</div><div class="s-ico">🔐</div></div>
      </div>

      <div class="dg2">
        <div style="display:flex;flex-direction:column;gap:18px">

          <div class="card" style="border-left:4px solid var(--teal)">
            <div class="card-hdr"><div class="card-ttl">📅 Prochain rendez-vous</div><button class="btn btn-g btn-sm" onclick="go('p-rdv')">Voir tout</button></div>
            <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
              <div style="background:var(--teal);color:#fff;border-radius:var(--rs);padding:14px 18px;text-align:center;min-width:70px">
                <div style="font-size:.65rem;opacity:.8;text-transform:uppercase">Déc.</div>
                <div style="font-family:var(--fh);font-size:2rem;font-weight:800;line-height:1">10</div>
              </div>
              <div style="flex:1">
                <div style="font-family:var(--fh);font-weight:700">Suivi diabète</div>
                <div style="color:var(--slate);font-size:.83rem;margin-top:3px">🕘 09h15 · 🏥 ${getHopital(p.hopital_inscrit)?.nom||'—'} · Salle 3</div>
                <div style="color:var(--slate);font-size:.8rem;margin-top:1px">👨‍⚕️ Dr. ${getMedecin(p.medref)?.prenom+' '+getMedecin(p.medref)?.nom||'—'}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:7px">
                <button class="btn btn-s btn-sm" onclick="toast('Rappel activé pour le 9 décembre','ok')">🔔 Rappel</button>
                <button class="btn btn-g btn-sm" onclick="toast('Demande d\'annulation envoyée','info')">Annuler</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-hdr"><div class="card-ttl">💊 Mes médicaments actuels</div><button class="btn btn-g btn-sm" onclick="go('p-ordos')">Tout voir</button></div>
            ${actOrdos.length===0?`<div class="empty"><div class="empty-ic">💊</div><div class="empty-t">Aucune ordonnance active</div></div>`:
            actOrdos[0].meds.map(med=>`
              <div class="med-pill">
                <div class="med-ico">💊</div>
                <div style="flex:1"><div style="font-weight:600">${med.nom} <span style="color:var(--teal);font-size:.8rem">${med.dose}</span></div><div style="font-size:.78rem;color:var(--slate)">${med.freq} · ${med.dur}</div></div>
                <span class="badge b-ok">En cours</span>
              </div>`).join('')}
          </div>

          ${lc?`
          <div class="card">
            <div class="card-hdr"><div class="card-ttl">🩺 Dernière consultation</div><button class="btn btn-g btn-sm" onclick="go('p-histo')">Historique</button></div>
            <div style="display:flex;gap:8px;margin-bottom:11px"><span class="badge b-teal">${lc.type}</span><span style="font-size:.8rem;color:var(--slate)">${fd(lc.date)} · ${lc.med}</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
              <div style="background:var(--mist);border-radius:var(--rs);padding:11px"><div style="font-size:.68rem;color:var(--slate);text-transform:uppercase;font-weight:700">Motif</div><div style="font-weight:500;font-size:.85rem;margin-top:2px">${lc.motif}</div></div>
              <div style="background:var(--mist);border-radius:var(--rs);padding:11px"><div style="font-size:.68rem;color:var(--slate);text-transform:uppercase;font-weight:700">Diagnostic</div><div style="font-weight:500;font-size:.85rem;margin-top:2px">${lc.diag}</div></div>
            </div>
            <div style="display:flex;gap:6px"><span style="background:var(--teal-pale);color:var(--teal);padding:3px 9px;border-radius:4px;font-size:.75rem;font-weight:600">TA: ${lc.ta}</span><span style="background:var(--teal-pale);color:var(--teal);padding:3px 9px;border-radius:4px;font-size:.75rem;font-weight:600">SpO2: ${lc.spo2}</span></div>
          </div>`:''}
        </div>

        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="card">
            <div class="card-ttl" style="margin-bottom:14px">❤️ Ma santé en bref</div>
            ${[['🩸','Groupe sanguin',p.gs],['⚖️','Poids',`${p.poids} kg`],['📏','Taille',`${p.taille} cm`],['📊','IMC',p.poids&&p.taille?(p.poids/(p.taille/100)**2).toFixed(1):'—']].map(([ic,lb,vl])=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 11px;background:var(--mist);border-radius:var(--rs);margin-bottom:7px">
                <span style="font-size:.83rem;color:var(--slate)">${ic} ${lb}</span>
                <span style="font-weight:700;color:var(--navy)">${vl||'—'}</span>
              </div>`).join('')}
            ${p.allergies.length>0?`
            <div style="margin-top:12px;padding:10px;background:#FFF5F5;border-radius:var(--rs);border:1px solid #FEB2B2">
              <div style="font-size:.7rem;font-weight:700;color:var(--red);text-transform:uppercase;margin-bottom:5px">⚠️ Mes allergies</div>
              <div class="tags">${p.allergies.map(a=>`<span class="badge b-err">${a}</span>`).join('')}</div>
            </div>`:''}
          </div>
          <div class="card">
            <div class="card-ttl" style="margin-bottom:12px">⚡ Accès rapide</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              <button class="btn btn-s" style="justify-content:flex-start" onclick="showGenerateCodeModal()">🔢 Générer un code d'accès</button>
              <button class="btn btn-s" style="justify-content:flex-start" onclick="go('p-results')">🧪 Voir mes résultats</button>
              <button class="btn btn-s" style="justify-content:flex-start" onclick="go('p-ordos')">💊 Mes ordonnances</button>
              <button class="btn btn-g" style="justify-content:flex-start" onclick="showModalRdvReq()">📅 Demander un RDV</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── HISTORIQUE PATIENT ────────────────────── */
function pHisto(){
  const p=getCurrentPatient();
  if(!p)return'';
  return`
  <div class="main ani">
    ${ptopbar('Mon historique médical')}
    <div class="content">
      <div style="background:var(--teal-pale);border-radius:var(--rs);padding:12px 16px;margin-bottom:22px;font-size:.85rem;color:var(--teal)">
        🔒 Seuls vous et vos médecins autorisés peuvent consulter cet historique. Chaque consultation est journalisée.
      </div>
      <div class="dgrid">
        <div>
          <div style="font-family:var(--fh);font-size:1.05rem;font-weight:700;margin-bottom:18px">📋 Mes consultations (${p.consultations.length})</div>
          ${p.consultations.length===0?`<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">Aucune consultation enregistrée</div></div>`:
          p.consultations.map((c,i)=>`
            <div class="card" style="margin-bottom:14px;${i===0?'border-left:4px solid var(--teal)':''}">
              ${i===0?`<div style="font-size:.68rem;font-weight:700;color:var(--teal);text-transform:uppercase;margin-bottom:4px">Dernière visite</div>`:''}
              <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
                <div>
                  <div style="font-family:var(--fh);font-weight:700;font-size:.98rem">${c.motif}</div>
                  <div style="font-size:.78rem;color:var(--slate)">📅 ${fd(c.date)} · 👨‍⚕️ ${c.med} · 🏥 ${c.hop}</div>
                </div>
                <span class="badge ${c.type==='Urgence'?'b-err':'b-teal'}">${c.type}</span>
              </div>
              <div style="background:var(--mist);border-radius:var(--rs);padding:13px;margin-bottom:10px">
                <div style="font-size:.68rem;font-weight:700;color:var(--slate);text-transform:uppercase;margin-bottom:6px">Ce que le médecin a constaté</div>
                <div style="font-size:.88rem;font-weight:500;margin-bottom:3px">✅ ${c.diag}</div>
                <div style="font-size:.8rem;color:var(--slate)">${c.notes||'—'}</div>
              </div>
              <div style="background:var(--teal-pale);border-radius:var(--rs);padding:11px;margin-bottom:9px">
                <div style="font-size:.68rem;font-weight:700;color:var(--teal);text-transform:uppercase;margin-bottom:3px">💊 Traitement prescrit</div>
                <div style="font-size:.85rem;color:var(--navy)">${c.trt}</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <span style="background:var(--teal-pale);color:var(--teal);padding:3px 9px;border-radius:4px;font-size:.75rem;font-weight:600">TA: ${c.ta}</span>
                <span style="background:var(--teal-pale);color:var(--teal);padding:3px 9px;border-radius:4px;font-size:.75rem;font-weight:600">SpO2: ${c.spo2}</span>
                <button class="btn btn-g btn-sm" style="margin-left:auto" onclick="toast('Téléchargement compte-rendu…','info')">📄 Compte-rendu</button>
              </div>
            </div>`).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="card">
            <div class="card-ttl" style="margin-bottom:14px">📅 Chronologie</div>
            <div class="tl">
              ${p.consultations.map((c,i)=>`
                <div class="tl-item">
                  <div class="tl-dot ${c.type==='Urgence'?'r':i===0?'':'b'}"></div>
                  <div class="tl-d">${fd(c.date)}</div>
                  <div class="tl-t">${c.motif}</div>
                  <div class="tl-s">${c.hop}</div>
                </div>`).join('')}
            </div>
          </div>
          <div class="card" style="text-align:center;border:2px solid var(--teal-pale)">
            <div style="font-size:2rem;margin-bottom:8px">👨‍⚕️</div>
            <div style="font-weight:700">Mon médecin référent</div>
            <div style="color:var(--teal);font-weight:600;margin:4px 0">Dr. ${getMedecin(p.medref)?.prenom+' '+getMedecin(p.medref)?.nom||'—'}</div>
            <div style="font-size:.82rem;color:var(--slate)">${getHopital(p.hopital_inscrit)?.nom||'—'}</div>
            <button class="btn btn-p btn-sm" style="margin-top:13px" onclick="showModalRdvReq()">📅 Prendre rendez-vous</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── ORDONNANCES PATIENT ──────────────────── */
function pOrdos(){
  const p=getCurrentPatient();
  if(!p)return'';
  return`
  <div class="main ani">
    ${ptopbar('Mes ordonnances')}
    <div class="content">
      <div style="background:#FFFBEB;border:1px solid #F6E05E;border-radius:var(--rs);padding:11px 15px;margin-bottom:22px;font-size:.83rem;color:#744210">
        ⚠️ Ne modifiez jamais votre traitement sans l'avis de votre médecin.
      </div>
      ${p.ordos.length===0?`<div class="empty"><div class="empty-ic">💊</div><div class="empty-t">Aucune ordonnance</div></div>`:
      p.ordos.map(o=>`
        <div class="card" style="margin-bottom:20px;${o.statut==='Active'?'border-left:4px solid var(--green)':'border-left:4px solid var(--border)'}">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px;margin-bottom:15px">
            <div>
              <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
                <div style="font-family:var(--fh);font-weight:700;font-size:1rem">Ordonnance ${o.id}</div>
                ${obadge(o.statut)}
              </div>
              <div style="font-size:.78rem;color:var(--slate);margin-top:3px">📅 ${fd(o.date)} · <strong>${o.med}</strong></div>
            </div>
            <div style="display:flex;gap:7px">
              <button class="btn btn-s btn-sm" onclick="toast('Téléchargement PDF…','info')">⬇️ PDF</button>
              <button class="btn btn-g btn-sm" onclick="toast('Partagé avec la pharmacie','ok')">🤝 Partager</button>
            </div>
          </div>
          ${o.meds.map(med=>`
            <div style="display:flex;align-items:center;gap:14px;padding:13px;background:${o.statut==='Active'?'var(--teal-pale)':'var(--mist)'};border-radius:var(--rs);margin-bottom:7px">
              <div class="med-ico" style="background:${o.statut==='Active'?'var(--teal)':'#CBD5E0'}">💊</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:.92rem">${med.nom} <span style="color:var(--teal);font-size:.8rem">${med.dose}</span></div>
                <div style="font-size:.78rem;color:var(--slate)">${med.freq} · ${med.dur}</div>
              </div>
              ${o.statut==='Active'?`<div onclick="toast('Rappel activé pour ${med.nom}','ok')" style="cursor:pointer;font-size:1.4rem" title="Activer rappel">🔔</div>`:''}
            </div>`).join('')}
          ${o.statut==='Active'?`<div style="margin-top:11px;padding:10px 13px;background:rgba(56,161,105,.08);border-radius:var(--rs);font-size:.79rem;color:var(--green)">💡 Prenez vos médicaments aux mêmes heures chaque jour.</div>`:''}
        </div>`).join('')}
    </div>
  </div>`;
}

/* ── RÉSULTATS PATIENT ─────────────────────── */
function pResults(){
  const p=getCurrentPatient();
  if(!p)return'';
  const cMap={Normal:{bg:'#F0FFF4',border:'#9AE6B4',color:'#276749',ic:'✅'},Élevé:{bg:'#FFFBEB',border:'#F6E05E',color:'#744210',ic:'⚠️'},Limite:{bg:'#FFFBEB',border:'#F6E05E',color:'#744210',ic:'⚠️'},Bas:{bg:'#FFF5F5',border:'#FEB2B2',color:'#822727',ic:'🔴'}};
  return`
  <div class="main ani">
    ${ptopbar("Mes résultats d'examens")}
    <div class="content">
      <div style="background:var(--teal-pale);border-radius:var(--rs);padding:11px 15px;margin-bottom:22px;font-size:.83rem;color:var(--teal)">
        ℹ️ Ces résultats ont été interprétés par votre médecin. En cas de doute, parlez-en lors de votre prochain RDV.
      </div>
      ${p.results.length===0?`<div class="empty"><div class="empty-ic">🧪</div><div class="empty-t">Aucun résultat disponible</div></div>`:
      `<div style="display:grid;gap:14px">
        ${p.results.map(r=>{
          const c=cMap[r.statut]||cMap.Normal;
          return`
          <div class="card" style="border:2px solid ${c.border}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:9px;margin-bottom:13px">
              <div>
                <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px">
                  <div style="font-family:var(--fh);font-weight:700;font-size:1rem">${r.titre}</div>
                  <span class="badge" style="background:${c.bg};color:${c.color}">${c.ic} ${r.statut}</span>
                </div>
                <div style="font-size:.78rem;color:var(--slate)">📅 ${fd(r.date)} · 🏥 ${r.labo} · ${r.type}</div>
              </div>
              <button class="btn btn-g btn-sm" onclick="toast('Téléchargement…','info')">⬇️</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:4px">
              <div style="background:${c.bg};border-radius:var(--rs);padding:13px;text-align:center">
                <div style="font-size:.68rem;color:${c.color};font-weight:700;text-transform:uppercase;margin-bottom:3px">Votre valeur</div>
                <div style="font-family:var(--fh);font-size:1.5rem;font-weight:800;color:${c.color}">${r.val}</div>
              </div>
              <div style="background:var(--mist);border-radius:var(--rs);padding:13px;text-align:center">
                <div style="font-size:.68rem;color:var(--slate);font-weight:700;text-transform:uppercase;margin-bottom:3px">Valeur normale</div>
                <div style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:var(--slate)">${r.ref}</div>
              </div>
            </div>
            <div style="margin-top:11px;padding:9px 13px;background:${c.bg};border-radius:var(--rs);font-size:.8rem;color:${c.color}">
              ${r.statut==='Normal'?'✅ Ce résultat est dans la normale. Continuez comme ça !':'💬 Votre médecin a pris connaissance de ce résultat. Parlez-en lors de votre prochain RDV.'}
            </div>
          </div>`}).join('')}
      </div>`}
    </div>
  </div>`;
}

/* ── RDV PATIENT ──────────────────────────── */
function pRdv(){
  const rdvs=[
    {id:'RDV001',date:'2024-12-10',h:'09h15',med:'Dr. Amara Koné',motif:'Suivi diabète',st:'Confirmé',salle:'Salle 3',hop:'CHU de Douala'},
    {id:'RDV002',date:'2024-11-20',h:'10h00',med:'Dr. Amara Koné',motif:'Suivi diabète',st:'Passé',salle:'Salle 3',hop:'CHU de Douala'},
    {id:'RDV003',date:'2024-09-05',h:'08h30',med:'Dr. Moussa Bah',motif:'Urgence — Céphalées',st:'Passé',salle:'Urgences',hop:'CHU de Douala'},
  ];
  return`
  <div class="main ani">
    ${ptopbar('Mes rendez-vous')}
    <div class="content">
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
        <button class="btn btn-p" onclick="showModalRdvReq()">📅 Demander un rendez-vous</button>
      </div>
      ${rdvs.map(r=>{
        const past=r.st==='Passé';
        const d=new Date(r.date);
        return`
        <div class="card" style="margin-bottom:14px;opacity:${past?.75:1};${!past?'border-left:4px solid var(--teal)':''}">
          <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
            <div style="background:${past?'var(--mist)':'var(--teal)'};color:${past?'var(--slate)':'#fff'};border-radius:var(--rs);padding:11px 15px;text-align:center;min-width:64px;flex-shrink:0">
              <div style="font-size:.62rem;text-transform:uppercase;opacity:.8">${d.toLocaleString('fr-FR',{month:'short'})}</div>
              <div style="font-family:var(--fh);font-size:1.75rem;font-weight:800;line-height:1">${d.getDate()}</div>
            </div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:.93rem">${r.motif}</div>
              <div style="font-size:.8rem;color:var(--slate);margin-top:2px">🕘 ${r.h} · 👨‍⚕️ ${r.med} · 🏥 ${r.hop} · ${r.salle}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px">
              <span class="badge ${past?'b-gray':'b-ok'}">${past?'Passé':'✅ Confirmé'}</span>
              ${!past?`<button class="btn btn-g btn-sm" onclick="toast('Rappel activé','ok')">🔔 Rappel</button><button class="btn btn-g btn-sm" onclick="toast('Demande envoyée','info')">✕ Annuler</button>`:''}
            </div>
          </div>
        </div>`}).join('')}
    </div>
  </div>`;
}

/* ── DOCUMENTS PATIENT ─────────────────────── */
function pDocs(){
  const p=getCurrentPatient();
  if(!p)return'';
  return`
  <div class="main ani">
    ${ptopbar('Mes documents médicaux')}
    <div class="content">
      ${p.docs.length===0?`
      <div class="empty" style="margin-top:60px">
        <div class="empty-ic">📄</div>
        <div class="empty-t">Aucun document disponible</div>
        <div class="empty-s">Vos comptes-rendus et résultats numérisés apparaîtront ici après chaque consultation.</div>
      </div>`:
      `<div style="display:grid;gap:11px">
        ${p.docs.map(d=>`
          <div class="card" style="display:flex;align-items:center;gap:14px">
            <div style="width:50px;height:50px;background:var(--teal-pale);border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">📄</div>
            <div style="flex:1"><div style="font-weight:600">${d.nom}</div><div style="font-size:.78rem;color:var(--slate);margin-top:2px">📅 ${fd(d.date)} · ${d.type} · ${d.size}</div></div>
            <div style="display:flex;gap:7px">
              <button class="btn btn-s btn-sm" onclick="toast('Téléchargement de ${d.nom}…','info')">⬇️</button>
              <button class="btn btn-g btn-sm" onclick="toast('Document partagé','ok')">🔗</button>
            </div>
          </div>`).join('')}
      </div>`}
    </div>
  </div>`;
}

/* ── PROFIL PATIENT ─────────────────────────── */
function pProfil(){
  const p=getCurrentPatient();
  if(!p)return'';
  return`
  <div class="main ani">
    ${ptopbar('Mon profil')}
    <div class="content">
      <div style="max-width:680px">
        <div class="card" style="margin-bottom:18px;text-align:center;padding:32px">
          <div class="av av-lg" style="background:var(--gold);margin:0 auto 14px;width:72px;height:72px;font-size:1.6rem;border-radius:18px">${p.prenom[0]}${p.nom[0]}</div>
          <div style="font-family:var(--fh);font-size:1.4rem;font-weight:800">${p.prenom} ${p.nom}</div>
          <div style="color:var(--slate);font-size:.85rem;margin-top:3px">Patient · N° ${p.id}</div>
          <div style="margin-top:11px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
            ${sbadge(p.statut)}<span class="badge b-teal">🩸 ${p.gs}</span><span class="badge b-info">${age(p.ddn)} ans</span>
          </div>
        </div>
        <div class="card" style="margin-bottom:18px">
          <div class="card-hdr"><div class="card-ttl">👤 Informations personnelles</div><button class="btn btn-g btn-sm" onclick="toast('Mode édition activé','info')">✏️ Modifier</button></div>
          <div class="fgrid">
            <div class="fg"><label class="lbl">Prénom</label><input class="fc" value="${p.prenom}"></div>
            <div class="fg"><label class="lbl">Nom</label><input class="fc" value="${p.nom}"></div>
            <div class="fg"><label class="lbl">Date de naissance</label><input class="fc" value="${fd(p.ddn)}" readonly style="background:var(--mist)"></div>
            <div class="fg"><label class="lbl">Sexe</label><input class="fc" value="${p.sexe==='F'?'Féminin':'Masculin'}" readonly style="background:var(--mist)"></div>
            <div class="fg"><label class="lbl">Téléphone</label><input class="fc" value="${p.tel}"></div>
            <div class="fg"><label class="lbl">Email</label><input class="fc" value="${p.email}"></div>
          </div>
          <div class="fg" style="margin-top:13px"><label class="lbl">Adresse</label><input class="fc" value="${p.adresse}"></div>
          <div style="margin-top:13px;display:flex;justify-content:flex-end"><button class="btn btn-p" onclick="toast('Profil mis à jour','ok')">Enregistrer</button></div>
        </div>
        <div class="card" style="margin-bottom:18px">
          <div class="card-ttl" style="margin-bottom:14px">🏥 Informations médicales</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${[['🩸','Groupe sanguin',p.gs],['⚖️','Poids',`${p.poids} kg`],['📏','Taille',`${p.taille} cm`],['👨‍⚕️','Médecin référent',getMedecin(p.medref)?.prenom+' '+getMedecin(p.medref)?.nom||'—'],['🛡️','Assurance',p.assur],['🪪','N° Assurance',p.nassur],['🏥','Hôpital inscrit',getHopital(p.hopital_inscrit)?.nom||'—'],['🏷️','ID Patient',p.id]].map(([ic,lb,vl])=>`
              <div style="background:var(--mist);padding:11px;border-radius:var(--rs)">
                <div style="font-size:.68rem;color:var(--slate);text-transform:uppercase;font-weight:700;margin-bottom:3px">${ic} ${lb}</div>
                <div style="font-weight:600;font-size:.85rem">${vl||'—'}</div>
              </div>`).join('')}
          </div>
          ${p.allergies.length>0?`
          <div style="margin-top:12px;padding:11px;background:#FFF5F5;border-radius:var(--rs)">
            <div style="font-size:.7rem;font-weight:700;color:var(--red);text-transform:uppercase;margin-bottom:5px">⚠️ Mes allergies</div>
            <div class="tags">${p.allergies.map(a=>`<span class="badge b-err">${a}</span>`).join('')}</div>
          </div>`:''}
        </div>
        <div class="card">
          <div class="card-ttl" style="margin-bottom:14px">🔒 Confidentialité & Consentements</div>
          ${[['Partage de données avec mes médecins',true],['Notifications SMS pour mes RDV',true],['Accès à mes résultats en ligne',true],['Partage anonyme pour la recherche',false]].map(([lb,on])=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)">
              <div><div style="font-weight:500;font-size:.88rem">${lb}</div><div style="font-size:.72rem;color:var(--slate)">Modifiable à tout moment</div></div>
              <div style="cursor:pointer;width:44px;height:24px;border-radius:12px;background:${on?'var(--teal)':'var(--border)'};flex-shrink:0;position:relative" onclick="toast('Consentement mis à jour','ok')">
                <div style="position:absolute;top:3px;${on?'left:22px':'left:3px'};width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s"></div>
              </div>
            </div>`).join('')}
          <p style="font-size:.73rem;color:var(--slate);margin-top:12px">🔐 Données protégées RGPD · HDS · dpo@medifile.cm</p>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── MODAL RDV PATIENT ─────────────────────── */
function showModalRdvReq(){
  setModal(`
  <div class="mo" onclick="closeModal(event)">
    <div class="md">
      <div class="md-hdr"><div class="md-ttl">📅 Demander un rendez-vous</div><button class="md-cls" onclick="closeModalForce()">✕</button></div>
      <div class="md-bod">
        <div style="background:var(--teal-pale);border-radius:var(--rs);padding:11px 14px;font-size:.82rem;color:var(--teal);margin-bottom:16px">
          Votre demande sera transmise au cabinet. Confirmation par SMS.
        </div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Motif *</label><select class="fc"><option>Suivi régulier</option><option>Résultats d'analyse</option><option>Renouvellement d'ordonnance</option><option>Nouveau problème de santé</option><option>Autre</option></select></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Date souhaitée *</label><input type="date" class="fc" min="${new Date().toISOString().split('T')[0]}"></div>
        <div class="fg" style="margin-bottom:13px"><label class="lbl">Heure préférée</label><select class="fc"><option>Matin (8h–12h)</option><option>Après-midi (14h–18h)</option><option>Peu importe</option></select></div>
        <div class="fg"><label class="lbl">Précisions</label><textarea class="fc" placeholder="Décrivez brièvement votre situation…"></textarea></div>
      </div>
      <div class="md-ftr">
        <button class="btn btn-g" onclick="closeModalForce()">Annuler</button>
        <button class="btn btn-p" onclick="toast('Demande envoyée ! Confirmation SMS à venir.','ok');closeModalForce()">Envoyer</button>
      </div>
    </div>
  </div>`);
}
