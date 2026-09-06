"use strict";

const AISAPO_IDLE_LIMIT_MS=3*60*60*1000;
let aisapoIdleTimer=null;
function touchSessionActivity(){
  if(!window.appSession)return;
  const now=Date.now();
  localStorage.setItem('aisapo_last_activity',String(now));
  clearTimeout(aisapoIdleTimer);
  aisapoIdleTimer=setTimeout(()=>logout('idle'),AISAPO_IDLE_LIMIT_MS);
}
function startIdleLogoutWatch(){
  const last=Number(localStorage.getItem('aisapo_last_activity')||0);
  if(last&&Date.now()-last>=AISAPO_IDLE_LIMIT_MS){logout('idle');return false;}
  ['click','touchstart','keydown','scroll'].forEach(ev=>document.addEventListener(ev,touchSessionActivity,{passive:true}));
  touchSessionActivity();
  return true;
}
function eyeSvg(hidden){return hidden?`<svg class="password-eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3 3.7M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6c1.8 0 3.3-.5 4.6-1.2"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"/></svg>`:`<svg class="password-eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>`}
function syncLoginPasswordState(forceHidden=false){const input=$('loginPassword'),btn=$('loginPasswordToggle');if(!input)return;if(forceHidden)input.type='password';const hidden=input.type!=='text';if(btn){btn.setAttribute('aria-label',hidden?'パスワードを表示':'パスワードを隠す');btn.title=hidden?'パスワードを表示':'パスワードを隠す';btn.innerHTML=eyeSvg(hidden);}}
function toggleLoginPassword(){const input=$('loginPassword');if(!input)return;input.type=input.type==='text'?'password':'text';syncLoginPasswordState(false)}
window.addEventListener('pageshow',()=>syncLoginPasswordState(true));
window.addEventListener('DOMContentLoaded',()=>syncLoginPasswordState(true));
async function login(){try{msg("loginMsg","");const data=await api("login",{loginId:$('loginId').value.trim(),password:$('loginPassword').value});window.appSession=data.session;localStorage.setItem("aisapo_session",JSON.stringify(window.appSession));localStorage.setItem('aisapo_last_activity',String(Date.now()));startApp();}catch(e){msg("loginMsg",e.message)}}
function logout(reason=''){clearTimeout(aisapoIdleTimer);localStorage.removeItem("aisapo_session");localStorage.removeItem("gdbv2_session");localStorage.removeItem('aisapo_last_activity');window.appSession=null;if(reason==='idle')sessionStorage.setItem('aisapo_logout_notice','3時間操作がなかったため自動ログアウトしました。');location.reload()}
async function startApp(){
  if(!window.appSession)return;
  if(!startIdleLogoutWatch())return;
  $('loginView').classList.add('hidden');$('app').classList.remove('hidden');
  $('userName').textContent=window.appSession.name;
  if($('mobileUserName'))$('mobileUserName').textContent=window.appSession.name;
  const roleLabel=({member:'一般ユーザー',leader:'支部管理者',prefecture_admin:'管理者',system_admin:'管理者'}[window.appSession.role]||window.appSession.role);
  $('userRole').textContent=({member:'一般',leader:'支部管理者',prefecture_admin:'管理者',system_admin:'管理者'}[window.appSession.role]||window.appSession.role);
  if($('mobileUserRole'))$('mobileUserRole').textContent=roleLabel;
  const roleIcon=({system_admin:'assets/img/role-admin.png',prefecture_admin:'assets/img/role-admin.png',leader:'assets/img/role-leader.png',member:'assets/img/role-member.png'}[window.appSession.role]||'assets/img/role-member.png'); const roleAlt=roleLabel; if($('userAvatar'))$('userAvatar').innerHTML=`<img src="${roleIcon}" alt="${esc(roleAlt)}" class="role-avatar-img">`; if($('mobileUserAvatar'))$('mobileUserAvatar').innerHTML=`<img src="${roleIcon}" alt="${esc(roleAlt)}" class="role-avatar-img">`;
  $('branchLabel').textContent=window.appSession.branchName||'全支部';
  const manager=['leader','prefecture_admin','system_admin'].includes(window.appSession.role);
  if(manager){$('adminTab')?.classList.remove('hidden');$('contactsTab')?.classList.remove('hidden')}
  if(manager){
    $('contactImportPanel')?.classList.remove('hidden');
  }
  if(window.appSession.role==='system_admin'){
    $('areaAddPanel')?.classList.remove('hidden');
  }
  await loadBootstrap();initMap();await changeArea(false);await loadBranchMessages();
  if(manager)await loadAdmin();
  if(window.appSession.mustChangePassword)openPasswordModal(true);
}
async function loadBootstrap(){const d=await api('bootstrap');branches=d.branches||[];areas=d.areas||[];const sel=$('areaSelect');sel.innerHTML=areas.map(a=>`<option value="${esc(a.areaId)}">${esc((a.city?a.city+' ':'')+a.name)}</option>`).join('');if(d.areaLocked){currentAreaId=d.defaultAreaId||window.appSession.areaId||areas[0]?.areaId||'';window.appSession.areaId=currentAreaId;localStorage.setItem('aisapo_session',JSON.stringify(window.appSession));$('areaControl').classList.add('locked');sel.disabled=true;}else{sel.disabled=false;$('areaControl').classList.remove('locked');const saved=localStorage.getItem('aisapo_area')||'';currentAreaId=areas.some(a=>String(a.areaId)===String(saved))?saved:(areas[0]?.areaId||'');}sel.value=currentAreaId;if(!currentAreaId)msg('appMsg','活動エリアが設定されていません。管理者に確認してください。');}
async function changeArea(save=true){const sel=$('areaSelect');if(window.appSession?.role==='member')currentAreaId=window.appSession.areaId||currentAreaId;else currentAreaId=sel?.value||currentAreaId;if(save&&window.appSession?.role!=='member')localStorage.setItem('aisapo_area',currentAreaId||'');if(sel)sel.value=currentAreaId;const a=areas.find(x=>String(x.areaId)===String(currentAreaId));$('areaLabel').textContent=a?((a.city?a.city+' ':'')+a.name):'未設定';if(map&&a&&Number(a.mapLat)&&Number(a.mapLng))map.setView([Number(a.mapLat),Number(a.mapLng)],13);await Promise.all([loadRecords(),loadContacts()]);}
let passwordChangeForced=false;
function openPasswordModal(forced=false){passwordChangeForced=!!forced;$('passwordModal').style.display='flex';$('passwordModalTitle').textContent=forced?'初回パスワード変更':'パスワード変更';$('passwordModalNote').textContent=forced?'仮パスワードのままでは利用できません。新しいパスワードへ変更してください。':'現在のパスワードを確認して変更します。';$('passwordClose').classList.toggle('hidden',forced);$('currentPassword').value=$('newPassword1').value=$('newPassword2').value='';msg('passwordMsg','');}
function closePasswordModal(){if(passwordChangeForced)return;$('passwordModal').style.display='none';}
async function changeOwnPassword(){try{const current=$('currentPassword').value,next=$('newPassword1').value,confirm=$('newPassword2').value;if(next!==confirm)throw Error('新しいパスワードが一致しません');await api('changePassword',{currentPassword:current,newPassword:next});window.appSession.mustChangePassword=false;localStorage.setItem('aisapo_session',JSON.stringify(window.appSession));passwordChangeForced=false;$('passwordModal').style.display='none';alert('パスワードを変更しました');}catch(e){msg('passwordMsg',e.message)}}



// Ver.2.8.53 — password visibility icon matches current state (hidden=slashed eye, visible=open eye)
window.togglePasswordCharacter=function(ev,btn){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  if(!btn)return false;
  const input=document.getElementById(btn.getAttribute('data-password-toggle'));
  if(!input)return false;
  const show=input.type==='password';
  input.type=show?'text':'password';
  btn.innerHTML=eyeSvg(!show);
  btn.setAttribute('aria-label',show?'パスワードを隠す':'パスワードを表示');
  btn.setAttribute('aria-pressed',show?'true':'false');
  return false;
};

window.addEventListener('DOMContentLoaded',()=>{const n=sessionStorage.getItem('aisapo_logout_notice');if(n){sessionStorage.removeItem('aisapo_logout_notice');setTimeout(()=>msg('loginMsg',n),0);}});
