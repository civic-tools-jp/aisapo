"use strict";
async function loadAdmin(){try{const d=await api('adminData');branches=d.branches||branches;areas=d.areas||areas;users=d.users||[];window.loginHistory=d.loginHistory||[];$('newBranch').innerHTML=branches.map(b=>`<option value="${esc(b.branchId)}">${esc(b.name)}</option>`).join('');$('areaBranch').innerHTML=$('newBranch').innerHTML;
  if(window.appSession?.role==='leader'){
    $('newRole').innerHTML='<option value="member">一般利用者</option>';
    $('newRole').value='member';
  }else if(!$('newRole').querySelector('option[value="leader"]')){
    $('newRole').innerHTML='<option value="member">一般利用者</option><option value="leader">支部管理者</option>';
  }
  syncNewUserArea();renderUsers();renderAdminAreas();renderLoginHistory();if($('loginHistoryPanel'))$('loginHistoryPanel').classList.toggle('hidden',window.appSession?.role!=='system_admin')}catch(e){msg('appMsg',e.message)}}
function syncNewUserArea(){const role=$('newRole').value,branchId=$('newBranch').value;$('newAreaWrap').classList.toggle('hidden',role!=='member');$('newArea').innerHTML=areas.filter(a=>String(a.branchId)===String(branchId)).map(a=>`<option value="${esc(a.areaId)}">${esc((a.city?a.city+' ':'')+a.name)}</option>`).join('')}
function roleLabel(role){return ({system_admin:'システム管理者',leader:'支部管理者',member:'一般利用者'})[role]||role}
function canEditManagedUser(u){
  const me=window.appSession||{};
  if(me.role==='leader')return u.role==='member'&&String(u.branchId)===String(me.branchId);
  if(['prefecture_admin','system_admin'].includes(me.role))return u.role!=='system_admin';
  return false;
}
function canResetManagedUser(u){
  const me=window.appSession||{};
  if(String(u.userId)===String(me.userId))return false;
  if(me.role==='leader')return u.role==='member'&&String(u.branchId)===String(me.branchId);
  if(me.role==='prefecture_admin')return u.role!=='system_admin';
  if(me.role==='system_admin')return true;
  return false;
}
function canToggleManagedUser(u){
  const me=window.appSession||{};
  if(String(u.userId)===String(me.userId))return false;
  if(me.role==='leader')return u.role==='member'&&String(u.branchId)===String(me.branchId);
  if(['prefecture_admin','system_admin'].includes(me.role))return u.role!=='system_admin';
  return false;
}
function canDeleteManagedUser(u){
  const me=window.appSession||{};
  return me.role==='system_admin'&&u.role!=='system_admin'&&String(u.userId)!==String(me.userId);
}
function managedUserActionsHtml(u){
  const actions=[];
  if(canEditManagedUser(u))actions.push(`<button class="mini-btn" onclick="openUserEdit('${esc(u.userId)}')">編集</button>`);
  if(canResetManagedUser(u))actions.push(`<button class="mini-btn" onclick="resetUserPassword('${esc(u.userId)}','${esc(u.loginId)}')">PWリセット</button>`);
  if(canToggleManagedUser(u))actions.push(`<button class="mini-btn" onclick="toggleUserActive('${esc(u.userId)}',${u.active?'false':'true'})">${u.active?'無効化':'有効化'}</button>`);
  if(canDeleteManagedUser(u))actions.push(`<button class="mini-btn danger" onclick="deleteUser('${esc(u.userId)}','${esc(u.loginId)}')">削除</button>`);
  return actions.length?actions.join(''):'<span class="admin-no-actions">—</span>';
}
function renderUsers(){
  const q=String($('adminUserSearch')?.value||'').trim().toLowerCase(),role=$('adminUserRole')?.value||'',active=$('adminUserActive')?.value||'';
  const rows=users.filter(u=>{
    if(q&&!String(u.loginId||'').toLowerCase().includes(q)&&!String(u.name||'').toLowerCase().includes(q))return false;
    if(role&&u.role!==role)return false;
    if(active==='active'&&!u.active)return false;
    if(active==='inactive'&&u.active)return false;
    return true;
  });
  $('usersTable').innerHTML=`<table class="admin-table admin-users-table"><thead><tr><th>ID</th><th>氏名</th><th>支部</th><th>権限/エリア</th><th>状態</th><th>最終ログイン</th><th>操作</th></tr></thead><tbody>${rows.map(u=>`<tr class="${u.active?'':'admin-user-inactive'}">
<td data-label="ID">${esc(u.loginId)}</td>
<td data-label="氏名"><b>${esc(u.name)}</b></td>
<td data-label="支部">${esc(u.branchName)}</td>
<td data-label="権限/エリア"><div class="admin-user-role">${esc(roleLabel(u.role))}</div>${u.role==='member'?`<span class="admin-area-note">${esc((areas.find(a=>String(a.areaId)===String(u.areaId))?.city||'')+' '+(areas.find(a=>String(a.areaId)===String(u.areaId))?.name||''))}</span>`:'<span class="admin-area-note">エリア選択可</span>'}</td>
<td data-label="状態"><span class="badge">${u.active?'有効':'無効'}</span></td>
<td data-label="最終ログイン">${u.lastLoginAt?esc(formatLoginDate(u.lastLoginAt)):'—'}</td>
<td data-label="操作"><div class="admin-user-actions">${managedUserActionsHtml(u)}</div></td>
</tr>`).join('')}</tbody></table>`;
}
function openUserEdit(userId){
  const u=users.find(x=>String(x.userId)===String(userId));if(!u)return;
  $('editUserId').value=u.userId||'';$('editUserLoginId').value=u.loginId||'';$('editUserName').value=u.name||'';
  $('editUserRole').value=['member','leader'].includes(u.role)?u.role:'member';
  $('editUserBranch').innerHTML=branches.map(b=>`<option value="${esc(b.branchId)}">${esc(b.name)}</option>`).join('');
  $('editUserBranch').value=u.branchId||'';
  $('editUserRole').disabled=window.appSession?.role!=='system_admin';
  $('editUserBranch').disabled=window.appSession?.role!=='system_admin';
  syncUserEditArea(u.areaId||'');
  $('userEditModal').style.display='flex';
}
function closeUserEditModal(){$('userEditModal').style.display='none'}
function syncUserEditArea(preferred){
  const role=$('editUserRole').value,branchId=$('editUserBranch').value;
  const wrap=$('editUserAreaWrap'),sel=$('editUserArea');
  wrap.classList.toggle('hidden',role!=='member');
  if(role!=='member'){sel.innerHTML='';return}
  const opts=areas.filter(a=>String(a.branchId)===String(branchId));
  sel.innerHTML=opts.map(a=>`<option value="${esc(a.areaId)}">${esc((a.city?a.city+' ':'')+a.name)}</option>`).join('');
  const candidate=preferred!==undefined?preferred:sel.value;
  if(opts.some(a=>String(a.areaId)===String(candidate)))sel.value=candidate;
}
async function saveUserEditFromModal(){
  const userId=$('editUserId').value,name=$('editUserName').value.trim(),role=$('editUserRole').value,branchId=$('editUserBranch').value;
  if(!name){alert('表示名を入力してください');return}
  if(!['member','leader'].includes(role)){alert('権限を選択してください');return}
  const areaId=role==='member'?$('editUserArea').value:'';
  if(role==='member'&&!areaId){alert('活動エリアを選択してください');return}
  try{await api('updateUser',{userId,user:{name,role,branchId,areaId}});closeUserEditModal();await loadAdmin();}
  catch(e){alert(e.message)}
}
function toggleAdminAreas(){const box=$('areasTable'),btn=$('areasToggleBtn');const opening=box.classList.contains('hidden');box.classList.toggle('hidden',!opening);btn.textContent=opening?'一覧を閉じる ▲':'一覧を表示 ▼'}
function renderAdminAreas(){$('areasTable').innerHTML=`<table class="admin-table"><tr><th>支部</th><th>市</th><th>エリア</th><th>操作</th></tr>${areas.map(a=>`<tr><td>${esc(branches.find(b=>b.branchId===a.branchId)?.name||a.branchId)}</td><td>${esc(a.city||'')}</td><td>${esc(a.name)}</td><td>${window.appSession?.role==='system_admin'?`<button class="mini-btn danger" onclick="deleteArea('${esc(a.areaId)}','${esc(a.name)}')">削除</button>`:''}</td></tr>`).join('')}</table>`}
async function createUser(){try{await api('createUser',{user:{loginId:$('newLoginId').value.trim(),name:$('newName').value.trim(),password:$('newPassword').value,role:$('newRole').value,branchId:$('newBranch').value,areaId:$('newRole').value==='member'?$('newArea').value:''}});$('newLoginId').value=$('newName').value=$('newPassword').value='';await loadAdmin();alert('ユーザーを発行しました。一般利用者は設定した活動エリアだけ閲覧できます。')}catch(e){alert(e.message)}}
async function resetUserPassword(userId,loginId){const temp=prompt(`${loginId} の新しい仮パスワードを入力してください。\n10文字以上・英字と数字を含めてください。`);if(temp===null)return;try{await api('resetPassword',{userId,temporaryPassword:temp});await loadAdmin();alert('仮パスワードへリセットしました。次回ログイン時に本人のパスワード変更が必須になります。')}catch(e){alert(e.message)}}

async function toggleUserActive(userId,active){if(!confirm(active?'このユーザーを有効化しますか？':'このユーザーを無効化しますか？'))return;try{await api('setUserActive',{userId,active});await loadAdmin()}catch(e){alert(e.message)}}
async function deleteUser(userId,loginId){if(!confirm(`${loginId} を削除しますか？\n過去の訪問データは削除されません。`))return;try{await api('deleteUser',{userId});await loadAdmin()}catch(e){alert(e.message)}}
async function deleteArea(areaId,name){if(!confirm(`${name} を削除しますか？\n使用中のエリアは削除できません。`))return;try{await api('deleteArea',{areaId});await loadBootstrap();await loadAdmin()}catch(e){alert(e.message)}}
async function lookupAreaCenter(city,name){
  const q=[city,name,'福岡県','日本'].filter(Boolean).join(' ');
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);
    const data=await res.json();
    if(!data?.[0])return null;
    const lat=Number(data[0].lat),lng=Number(data[0].lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    return {lat,lng};
  }catch(_){return null}
}
async function createArea(){
  const branchId=$('areaBranch').value;
  const city=$('areaCity').value.trim();
  const name=$('areaName').value.trim();
  if(!city||!name){alert('市区町村とエリア名を入力してください');return}
  const btn=document.querySelector('.area-add-btn');
  const oldText=btn?.textContent;
  try{
    if(btn){btn.disabled=true;btn.textContent='中心位置を取得中…'}
    const center=await lookupAreaCenter(city,name);
    if(!center){alert('中心位置を自動取得できませんでした。市区町村とエリア名を確認してください。');return}
    $('areaLat').value=center.lat;$('areaLng').value=center.lng;
    await api('createArea',{area:{branchId,city,name,mapLat:center.lat,mapLng:center.lng}});
    $('areaName').value='';$('areaLat').value='';$('areaLng').value='';
    await loadBootstrap();await loadAdmin();
    alert('活動エリアを追加しました');
  }catch(e){
    alert(e.message)
  }finally{
    if(btn){btn.disabled=false;btn.textContent=oldText||'エリアを追加'}
  }
}

function formatLoginDate(v){if(!v)return '';const d=new Date(v);if(isNaN(d))return String(v);return d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
function toggleLoginHistory(){const box=$('loginHistoryTable'),btn=$('loginHistoryToggleBtn');if(!box||!btn)return;const opening=box.classList.contains('hidden');box.classList.toggle('hidden',!opening);btn.textContent=opening?'履歴を閉じる ▲':'履歴を表示 ▼';}
function renderLoginHistory(){const panel=$('loginHistoryPanel'),box=$('loginHistoryTable');if(!panel||!box)return;if(window.appSession?.role!=='system_admin'){panel.classList.add('hidden');return;}const logs=(window.loginHistory||[]).slice(0,100);box.innerHTML=`<div class="login-history-note">直近${logs.length}件（成功・失敗）</div><table class="admin-table login-history-table"><thead><tr><th>日時</th><th>ユーザーID</th><th>表示名</th><th>結果</th></tr></thead><tbody>${logs.map(x=>`<tr><td data-label="日時">${esc(formatLoginDate(x.loggedAt))}</td><td data-label="ユーザーID">${esc(x.loginId||'')}</td><td data-label="表示名">${esc(x.name||'')}</td><td data-label="結果"><span class="badge ${x.success?'':'login-failed'}">${x.success?'成功':'失敗'}</span></td></tr>`).join('')}</tbody></table>`;}
