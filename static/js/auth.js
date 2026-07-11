/* MediFile — auth.js
   Reprend la logique UI de legacy/js/auth.js (sélecteur de rôle, force du mot de passe). */

/* ── SÉLECTEUR DE RÔLE (login) ───────────── */
function selectLoginRole(r){
  document.getElementById('role-input').value=r;
  ['rc-doc','rc-pat','rc-adm'].forEach(id=>{ const el=document.getElementById(id); if(el)el.classList.remove('sel'); });
  const map={medecin:'rc-doc',patient:'rc-pat',admin:'rc-adm'};
  document.getElementById(map[r])?.classList.add('sel');
}

/* ── FORCE DU MOT DE PASSE ────────────────── */
function checkPwdStrength(v,barId,hintId){
  const bar=document.getElementById(barId);
  const hint=document.getElementById(hintId);
  if(!bar||!hint)return;
  let s=0;
  if(v.length>=8)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
  bar.style.width=[0,25,50,75,100][s]+'%';
  bar.style.background=['var(--red)','var(--red)','var(--orange)','var(--gold)','var(--green)'][s];
  hint.textContent=['','Faible — ajoutez des chiffres','Moyen — ajoutez des majuscules','Fort','Très fort ✓'][s]||'';
}
