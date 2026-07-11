/* MediFile — data.js */

/* ═══════════════════════════════════════════
   MEDIFILE — DATA LAYER
   Données centralisées partagées entre pages
═══════════════════════════════════════════ */

const DB = {

  /* ── HÔPITAUX ─────────────────────────────── */
  hopitaux: [
    { id:'HOP001', nom:'CHU de Douala', ville:'Douala', region:'Littoral', statut:'Actif', medecins:12, logo:'🏥', admin:'Admin Douala', adresse:'Av. de la République, Douala' },
    { id:'HOP002', nom:'Hôpital Régional de Bafoussam', ville:'Bafoussam', region:'Ouest', statut:'Actif', medecins:8, logo:'🏨', admin:'Admin Bafoussam', adresse:'Rue du Marché, Bafoussam' },
    { id:'HOP003', nom:'Clinique La Grâce', ville:'Yaoundé', region:'Centre', statut:'Actif', medecins:5, logo:'🏪', admin:'Admin Yaoundé', adresse:'Rue Nachtigal, Yaoundé' },
    { id:'HOP004', nom:'Centre Médical Espoir', ville:'Garoua', region:'Nord', statut:'En attente', medecins:0, logo:'🏬', admin:'—', adresse:'Av. de la Paix, Garoua' },
  ],

  /* ── MÉDECINS ─────────────────────────────── */
  medecins: [
    { id:'MED001', nom:'Koné', prenom:'Amara', spec:'Médecine Générale', hop:'HOP001', email:'a.kone@chu-douala.cm', tel:'+237 699 000 111', statut:'Actif', av:'AK', role:'doctor' },
    { id:'MED002', nom:'Bah', prenom:'Moussa', spec:'Cardiologie', hop:'HOP001', email:'m.bah@chu-douala.cm', tel:'+237 677 000 222', statut:'Actif', av:'MB', role:'doctor' },
    { id:'MED003', nom:'Fouda', prenom:'Claire', spec:'Médecine Générale', hop:'HOP002', email:'c.fouda@hrb.cm', tel:'+237 655 000 333', statut:'Actif', av:'CF', role:'doctor' },
    { id:'MED004', nom:'Njoya', prenom:'Ibrahim', spec:'Pédiatrie', hop:'HOP002', email:'i.njoya@hrb.cm', tel:'+237 622 000 444', statut:'En attente', av:'IN', role:'doctor' },
  ],

  /* ── PATIENTS ─────────────────────────────── */
  patients: [
    {
      id:'PAT001', nom:'Diallo', prenom:'Jean', sexe:'M',
      ddn:'1985-03-15', tel:'+237 699 112 233', email:'jean.diallo@email.cm',
      adresse:'Akwa, Douala', gs:'O+', poids:75, taille:172,
      allergies:['Pénicilline'], atcd:['Diabète T2','HTA'],
      medref:'MED001', statut:'Actif', lastv:'2024-11-20',
      assur:'CNPS', nassur:'CNPS-2024-4521',
      hopital_inscrit:'HOP001', pin:'1234',
      consultations:[
        { id:'C001', date:'2024-11-20', type:'Consultation', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', motif:'Suivi diabète', diag:'Diabète T2 équilibré', trt:'Metformine 1000mg 2x/j', notes:'Glycémie à 1.2 g/L. Patient observant.', ta:'130/85', spo2:'98%' },
        { id:'C002', date:'2024-09-05', type:'Urgence', medId:'MED002', med:'Dr. Moussa Bah', hop:'CHU de Douala', motif:'Céphalées intenses', diag:'HTA décompensée', trt:'Amlodipine 5mg', notes:'Tension à 180/110 à l\'arrivée.', ta:'180/110', spo2:'97%' },
        { id:'C003', date:'2024-06-18', type:'Consultation', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', motif:'Bilan annuel', diag:'Bilan satisfaisant', trt:'Maintien traitement actuel', notes:'Poids stable. Fond d\'œil normal.', ta:'128/82', spo2:'99%' },
      ],
      ordos:[
        { id:'ORD001', date:'2024-11-20', med:'Dr. Amara Koné', statut:'Active', meds:[{ nom:'Metformine', dose:'1000mg', freq:'2 fois/jour', dur:'3 mois' },{ nom:'Amlodipine', dose:'5mg', freq:'1 fois/jour matin', dur:'3 mois' }] },
        { id:'ORD002', date:'2024-06-18', med:'Dr. Amara Koné', statut:'Expirée', meds:[{ nom:'Metformine', dose:'850mg', freq:'2 fois/jour', dur:'3 mois' }] },
      ],
      results:[
        { id:'R001', date:'2024-11-18', type:'Biologie', titre:'Glycémie à jeun', val:'1.20 g/L', ref:'0.70–1.10 g/L', statut:'Élevé', labo:'Labo Central Douala' },
        { id:'R002', date:'2024-11-18', type:'Biologie', titre:'HbA1c', val:'7.2%', ref:'< 7%', statut:'Limite', labo:'Labo Central Douala' },
        { id:'R003', date:'2024-11-18', type:'Biologie', titre:'Créatinine', val:'85 µmol/L', ref:'60–110 µmol/L', statut:'Normal', labo:'Labo Central Douala' },
      ],
      docs:[
        { id:'D001', nom:'Compte-rendu Nov 2024', date:'2024-11-20', type:'PDF', size:'120 Ko' },
      ],
      /* ── CONSENTEMENTS ──────────────────── */
      acces_actifs: [
        { id:'ACC001', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', depuis:'2024-01-10', expire:null, statut:'permanent', portee:['consultations','ordos','results','docs'] },
      ],
      demandes_acces: [],
      journal_audit: [
        { id:'AUD001', date:'2024-11-20T09:14:00', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', action:'Consultation dossier complet', ip:'192.168.1.45' },
        { id:'AUD002', date:'2024-11-20T09:18:00', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', action:'Ajout consultation C001', ip:'192.168.1.45' },
        { id:'AUD003', date:'2024-09-05T14:02:00', medId:'MED002', med:'Dr. Moussa Bah', hop:'CHU de Douala', action:'Consultation dossier (urgence)', ip:'192.168.1.88' },
      ],
    },
    {
      id:'PAT002', nom:'Mbaye', prenom:'Ibrahima', sexe:'M',
      ddn:'1975-08-30', tel:'+237 677 445 566', email:'i.mbaye@email.cm',
      adresse:'Bonanjo, Douala', gs:'A+', poids:82, taille:178,
      allergies:[], atcd:['Asthme'],
      medref:'MED001', statut:'Actif', lastv:'2024-10-15',
      assur:'Privée', nassur:'AXA-3302-X',
      hopital_inscrit:'HOP001', pin:'5678',
      consultations:[
        { id:'C010', date:'2024-10-15', type:'Consultation', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', motif:'Crise asthme légère', diag:'Asthme bronchique', trt:'Ventoline 2 bouffées', notes:'Spirométrie à programmer.', ta:'120/78', spo2:'96%' },
      ],
      ordos:[
        { id:'ORD010', date:'2024-10-15', med:'Dr. Amara Koné', statut:'Active', meds:[{ nom:'Salbutamol', dose:'100µg', freq:'2 bouffées à la demande', dur:'6 mois' }] },
      ],
      results:[
        { id:'R010', date:'2024-10-10', type:'Biologie', titre:'NFS', val:'Rapport disponible', ref:'—', statut:'Normal', labo:'BioAnalyse Douala' },
      ],
      docs:[],
      acces_actifs:[
        { id:'ACC010', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', depuis:'2024-02-01', expire:null, statut:'permanent', portee:['consultations','ordos','results'] },
      ],
      demandes_acces:[],
      journal_audit:[
        { id:'AUD010', date:'2024-10-15T10:30:00', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', action:'Consultation dossier complet', ip:'192.168.1.45' },
      ],
    },
    {
      id:'PAT003', nom:'Traoré', prenom:'Aminata', sexe:'F',
      ddn:'2001-02-14', tel:'+237 655 778 899', email:'a.traore@email.cm',
      adresse:'New Bell, Douala', gs:'B-', poids:55, taille:160,
      allergies:['Latex'], atcd:['Drépanocytose SC'],
      medref:'MED001', statut:'Surveillance', lastv:'2024-11-01',
      assur:'CNPS', nassur:'CNPS-2024-8812',
      hopital_inscrit:'HOP001', pin:'9012',
      consultations:[
        { id:'C020', date:'2024-11-01', type:'Consultation', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', motif:'Crise vaso-occlusive', diag:'Drépanocytose SC', trt:'Antalgiques + hydratation', notes:'Bilan hématologique mensuel.', ta:'110/70', spo2:'95%' },
      ],
      ordos:[
        { id:'ORD020', date:'2024-11-01', med:'Dr. Amara Koné', statut:'Active', meds:[{ nom:'Paracétamol', dose:'1g', freq:'3 fois/jour si douleur', dur:'1 mois' },{ nom:'Acide folique', dose:'5mg', freq:'1 fois/jour', dur:'6 mois' }] },
      ],
      results:[
        { id:'R020', date:'2024-11-01', type:'Biologie', titre:'Hémoglobine', val:'9.2 g/dL', ref:'12–16 g/dL', statut:'Bas', labo:'CHU Douala' },
      ],
      docs:[{ id:'D020', nom:'Fiche suivi drépanocytose', date:'2024-11-01', type:'PDF', size:'85 Ko' }],
      acces_actifs:[
        { id:'ACC020', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', depuis:'2024-03-01', expire:null, statut:'permanent', portee:['consultations','ordos','results','docs'] },
      ],
      demandes_acces:[],
      journal_audit:[],
    },
    {
      id:'PAT004', nom:'Nguema', prenom:'Emmanuel', sexe:'M',
      ddn:'1960-11-03', tel:'+237 622 334 455', email:'e.nguema@email.cm',
      adresse:'Bali, Douala', gs:'O-', poids:78, taille:172,
      allergies:['Sulfamides'], atcd:['HTA','Insuffisance cardiaque'],
      medref:'MED001', statut:'Critique', lastv:'2024-11-25',
      assur:'Aucune', nassur:'—',
      hopital_inscrit:'HOP001', pin:'3456',
      consultations:[
        { id:'C030', date:'2024-11-25', type:'Urgence', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', motif:'Dyspnée au repos', diag:'Insuffisance cardiaque décompensée', trt:'Furosémide 40mg IV + repos', notes:'Hospitalisation recommandée.', ta:'160/100', spo2:'91%' },
      ],
      ordos:[
        { id:'ORD030', date:'2024-11-25', med:'Dr. Amara Koné', statut:'Active', meds:[{ nom:'Furosémide', dose:'40mg', freq:'1 fois/jour matin', dur:'1 mois' },{ nom:'Enalapril', dose:'10mg', freq:'2 fois/jour', dur:'1 mois' }] },
      ],
      results:[], docs:[],
      acces_actifs:[
        { id:'ACC030', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', depuis:'2024-04-01', expire:null, statut:'permanent', portee:['consultations','ordos'] },
      ],
      demandes_acces:[], journal_audit:[],
    },
    {
      id:'PAT005', nom:'Coulibaly', prenom:'Mariam', sexe:'F',
      ddn:'1992-07-22', tel:'+237 698 001 122', email:'m.coulibaly@email.cm',
      adresse:'Makepe, Douala', gs:'AB+', poids:62, taille:163,
      allergies:[], atcd:[],
      medref:'MED001', statut:'Actif', lastv:'2024-08-10',
      assur:'Privée', nassur:'SAHAM-7712',
      hopital_inscrit:'HOP001', pin:'7890',
      consultations:[
        { id:'C040', date:'2024-08-10', type:'Consultation', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', motif:'Bilan préconceptionnel', diag:'Bilan normal', trt:'Acide folique prophylactique', notes:'Patiente en bonne santé.', ta:'115/72', spo2:'99%' },
      ],
      ordos:[
        { id:'ORD040', date:'2024-08-10', med:'Dr. Amara Koné', statut:'Expirée', meds:[{ nom:'Acide folique', dose:'0.4mg', freq:'1 fois/jour', dur:'3 mois' }] },
      ],
      results:[
        { id:'R040', date:'2024-08-08', type:'Biologie', titre:'Groupe sanguin & RAI', val:'AB+, RAI négatif', ref:'—', statut:'Normal', labo:'Labo Makepe' },
      ],
      docs:[],
      acces_actifs:[
        { id:'ACC040', medId:'MED001', med:'Dr. Amara Koné', hop:'CHU de Douala', depuis:'2024-05-01', expire:null, statut:'permanent', portee:['consultations','ordos','results'] },
      ],
      demandes_acces:[], journal_audit:[],
    },
  ],

  /* ── RDV ──────────────────────────────────── */
  rdvs:[
    { id:'RDV001', h:'08h30', pat:'Jean Diallo', pid:'PAT001', medId:'MED001', motif:'Suivi diabète', salle:'Salle 3', statut:'Confirmé' },
    { id:'RDV002', h:'09h15', pat:'Ibrahima Mbaye', pid:'PAT002', medId:'MED001', motif:'Consultation asthme', salle:'Salle 3', statut:'Confirmé' },
    { id:'RDV003', h:'10h00', pat:'Emmanuel Nguema', pid:'PAT004', medId:'MED001', motif:'Contrôle cardiaque', salle:'Salle 1', statut:'Confirmé' },
    { id:'RDV004', h:'11h30', pat:'Aminata Traoré', pid:'PAT003', medId:'MED001', motif:'Suivi drépanocytose', salle:'Salle 3', statut:'Confirmé' },
    { id:'RDV005', h:'14h00', pat:'Mariam Coulibaly', pid:'PAT005', medId:'MED001', motif:'Résultats analyses', salle:'Salle 2', statut:'Confirmé' },
  ],

  /* ── SESSION COURANTE ─────────────────────── */
  session: {
    role: null,        // 'doctor' | 'patient' | 'admin'
    userId: null,      // MED001, PAT001, HOP001...
    hopId: null,       // hôpital courant (pour médecin)
    /* Scénario consentement (cas Jean à Bafoussam) */
    consent_pending: null,  // demande en attente
    temp_code: null,
    temp_code_expires: null,
  },

};

/* ── HELPERS ──────────────────────────────── */
function age(d){ const n=new Date(),b=new Date(d);let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a; }
function fd(s){ if(!s)return'—';const d=new Date(s);return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); }
function fdh(s){ if(!s)return'—';const d=new Date(s);return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})+" à "+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
function sbadge(st){ const m={Actif:'b-ok',Surveillance:'b-warn',Critique:'b-err','Hors suivi':'b-info'};return`<span class="badge ${m[st]||'b-info'}">${st}</span>`; }
function rbadge(st){ const m={Normal:'b-ok',Limite:'b-warn',Élevé:'b-warn',Bas:'b-err'};return`<span class="badge ${m[st]||'b-info'}">${st}</span>`; }
function obadge(st){ return st==='Active'?`<span class="badge b-ok">✅ Active</span>`:`<span class="badge b-gray">Expirée</span>`; }
function genCode(){ return String(Math.floor(100000+Math.random()*900000)); }
function genId(prefix){ return prefix+Date.now().toString().slice(-6); }
function getMedecin(id){ return DB.medecins.find(m=>m.id===id); }
function getPatient(id){ return DB.patients.find(p=>p.id===id); }
function getHopital(id){ return DB.hopitaux.find(h=>h.id===id); }
function getCurrentPatient(){ return DB.patients.find(p=>p.id===DB.session.userId); }
function getCurrentMedecin(){ return DB.medecins.find(m=>m.id===DB.session.userId); }
