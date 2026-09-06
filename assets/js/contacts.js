"use strict";
const MEMBER_LABELS={party_member:'⭐ 党員',supporter:'♥ サポーター',general:'一般',unknown:'未設定'};
const MEMBER_RANK={party_member:0,supporter:1,general:2,unknown:3,'':3};
let contactListExpanded=false;
async function loadContacts(){try{const d=await api('listContacts',{areaId:currentAreaId});contacts=d.contacts||[];renderContacts();renderContactSelect();if(map)renderMarkers();}catch(e){msg('appMsg',e.message)}}
function memberTypeLabel(v){return MEMBER_LABELS[v]||MEMBER_LABELS.unknown}
function renderContacts(){
  const q=($('contactSearch')?.value||'').toLowerCase();
  const list=contacts.filter(c=>JSON.stringify(c).toLowerCase().includes(q)).sort((a,b)=>(MEMBER_RANK[a.memberType]??3)-(MEMBER_RANK[b.memberType]??3)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
  const cards=$('contactCards'),btn=$('toggleContactListBtn'),count=$('contactCount');
  if(count)count.textContent=`${contacts.length}件`;
  const show=contactListExpanded||!!q;
  if(cards)cards.classList.toggle('hidden',!show);
  if(btn)btn.textContent=show?'名簿一覧を閉じる':'名簿一覧を表示';
  if(!cards)return;
  cards.innerHTML=list.length?list.map(c=>{
    const restricted=!!c.restricted;
    const click=restricted?'':`onclick='openContact(${JSON.stringify(c).replace(/'/g,"&#39;")})'`;
    return `<div class="card ${restricted?'restricted-contact':''}" ${click}>
      <div class="card-title">${esc(memberTypeLabel(c.memberType))} ${esc(c.name)}</div>
      <div class="card-sub">${esc(c.fullAddress||'')}</div>
      <div class="badges">${c.partyId?`<span class="badge">ID ${esc(c.partyId)}</span>`:''}${c.sourceBranch?`<span class="badge">${esc(c.sourceBranch)}</span>`:''}${c.branchParticipation?`<span class="badge">支部参加 ${esc(c.branchParticipation)}</span>`:''}</div>
      ${c.phone?`<div class="card-sub">☎ ${esc(c.phone)}</div>`:''}${c.email?`<div class="card-sub">✉ ${esc(c.email)}</div>`:''}
      ${restricted?'<div class="privacy-note">🔒 正確な住所・連絡先は管理者のみ表示</div>':''}
    </div>`;
  }).join(''):'<div class="panel notice">名簿はまだありません。</div>'
}
function openContact(c){
  editingContact={...c};
  $('contactId').value=c.contactId||'';$('contactPartyId').value=c.partyId||'';$('contactLastName').value=c.lastName||'';$('contactFirstName').value=c.firstName||'';
  $('contactName').value=c.name||[c.lastName,c.firstName].filter(Boolean).join(' ');$('contactLastNameKana').value=c.lastNameKana||'';$('contactFirstNameKana').value=c.firstNameKana||'';
  $('contactPostalCode').value=c.postalCode||'';$('contactAddress').value=c.fullAddress||'';$('contactPhone').value=c.phone||'';$('contactEmail').value=c.email||'';$('contactMemberType').value=c.memberType||'unknown';
  $('contactBirthDate').value=dateInputValue(c.birthDate);$('contactGender').value=c.gender||'';$('contactOccupation').value=c.occupation||'';$('contactApprovedAt').value=dateInputValue(c.approvedAt);
  $('contactBranchParticipation').value=c.branchParticipation||'';$('contactJoinReason').value=c.joinReason||'';$('contactSourceBranch').value=c.sourceBranch||'';
  $('contactLat').value=c.lat||'';$('contactLng').value=c.lng||'';$('contactReferrer').value=c.referrer||'';$('contactSupporter').value=(typeof supportRankValue==='function'?supportRankValue(c.supporter):(c.supporter||''));$('contactMemo').value=c.memo||'';
  $('contactModal').style.display='flex';
}
function dateInputValue(v){if(!v)return'';const d=new Date(v);if(!isNaN(d))return d.toISOString().slice(0,10);return String(v).slice(0,10)}
function closeContact(){$('contactModal').style.display='none';editingContact=null}
async function geocodeContactAddress(){const address=$('contactAddress').value.trim();if(!address){alert('住所を入力してください');return}try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(address)}`);const j=await r.json();if(!j[0]){alert('住所から位置を取得できませんでした');return}$('contactLat').value=Number(j[0].lat);$('contactLng').value=Number(j[0].lon);if(map)map.setView([Number(j[0].lat),Number(j[0].lon)],17);alert('地図位置を取得しました。保存してください。')}catch(_){alert('位置取得に失敗しました')}}
async function saveContact(){try{
  const last=$('contactLastName').value.trim(),first=$('contactFirstName').value.trim(),display=$('contactName').value.trim()||[last,first].filter(Boolean).join(' ');
  await api('saveContact',{contact:{contactId:$('contactId').value,areaId:currentAreaId,partyId:$('contactPartyId').value.trim(),lastName:last,firstName:first,lastNameKana:$('contactLastNameKana').value.trim(),firstNameKana:$('contactFirstNameKana').value.trim(),name:display,postalCode:$('contactPostalCode').value.trim(),fullAddress:$('contactAddress').value.trim(),phone:$('contactPhone').value.trim(),email:$('contactEmail').value.trim(),memberType:$('contactMemberType').value,birthDate:$('contactBirthDate').value,gender:$('contactGender').value.trim(),occupation:$('contactOccupation').value.trim(),approvedAt:$('contactApprovedAt').value,branchParticipation:$('contactBranchParticipation').value.trim(),joinReason:$('contactJoinReason').value.trim(),sourceBranch:$('contactSourceBranch').value.trim(),lat:$('contactLat').value,lng:$('contactLng').value,referrer:$('contactReferrer').value.trim(),supporter:$('contactSupporter').value,memo:$('contactMemo').value.trim(),updatedAt:editingContact?.updatedAt||''}});
  closeContact();await loadContacts();
}catch(e){alert(e.message)}}
async function deleteContact(){if(!editingContact?.contactId){closeContact();return}if(!confirm('この名簿を削除しますか？'))return;try{await api('deleteContact',{contactId:editingContact.contactId,updatedAt:editingContact.updatedAt||''});closeContact();await loadContacts()}catch(e){alert(e.message)}}
function headerValue(row,names){for(const n of names){if(Object.prototype.hasOwnProperty.call(row,n)&&row[n]!==''&&row[n]!=null)return row[n]}return''}
function inferMemberType(row,forced){
  if(forced&&forced!=='auto')return forced;
  const raw=String(headerValue(row,[
    '党員種別','党員(会員)種別','党員（会員）種別','党員・サポーター区分','党員/サポーター区分',
    '会員種別','党員区分','会員区分','区分','種別','属性'
  ])||'');
  if(/サポ|support/i.test(raw))return'supporter';if(/党員|会員|member/i.test(raw))return'party_member';
  const pm=String(headerValue(row,['党員'])||'').trim(),sp=String(headerValue(row,['サポーター','サポータ'])||'').trim();
  if(pm&&!/^(0|false|いいえ|無)$/i.test(pm))return'party_member';if(sp&&!/^(0|false|いいえ|無)$/i.test(sp))return'supporter';return'unknown';
}
function normalizeImportRow(row,forced){
  const last=String(headerValue(row,['氏名（姓）','氏名(姓)','姓'])||'').trim();
  const fullName=String(headerValue(row,['氏名','名前','お名前','氏名（漢字）','会員氏名'])||'').trim();
  const inferredLast=last||(fullName?fullName.replace(/[　\s]+/g,' ').split(' ')[0]:'');
  return{
    partyId:String(headerValue(row,['参政党ID','党員ID','会員ID'])||'').trim(),
    lastName:inferredLast,
    fullAddress:String(headerValue(row,['住所(建物名なども含む)','住所（建物名なども含む）','住所','現住所','住所1','住所（自宅）'])||'').trim(),
    memberType:inferMemberType(row,forced),
    sourceBranch:String(headerValue(row,['支部'])||'').trim()
  };
}
async function importContactsFile(){
  const file=$('contactImportFile').files[0];if(!file){alert('ExcelまたはCSVを選んでください');return}if(!currentAreaId){alert('取込先の活動エリアを選んでください');return}
  const btn=$('contactImportBtn');
  try{
    if(btn){btn.disabled=true;btn.classList.add('importing');btn.textContent='取り込み中…';}
    $('importResult').innerHTML='<div class="import-status processing">名簿を読み込み、住所を位置情報へ変換しています。しばらくお待ちください。</div>';
    pendingImportLocations=[];renderPendingImports();
    const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
    const normalized=raw.map(r=>normalizeImportRow(r,'auto')).filter(r=>r.partyId||r.lastName||r.fullAddress);if(!normalized.length)throw Error('党員ID・苗字・住所のある行が見つかりません');
    let added=0,skipped=0,duplicateSkipped=0,geocoded=0;const rejectedImports=[];
    for(let i=0;i<normalized.length;i+=200){
      const d=await api('importContacts',{areaId:currentAreaId,contacts:normalized.slice(i,i+200)});
      added+=Number(d.added||0);skipped+=Number(d.skipped||0);duplicateSkipped+=Number(d.duplicateSkipped||0);geocoded+=Number(d.geocoded||0);
      const failures=d.failed||[];pendingImportLocations.push(...failures.filter(x=>x.category==='location').map(x=>({...x,areaId:x.areaId||currentAreaId})));rejectedImports.push(...failures.filter(x=>x.category!=='location'));
    }
    $('importResult').innerHTML=`<div class="import-summary"><div class="import-summary-title">✓ 取込完了</div><div class="import-summary-main">${added}件を追加しました</div><div class="import-summary-counts"><span>入力 ${normalized.length}件</span><span>重複 ${duplicateSkipped}件</span><span>位置未確認 ${pendingImportLocations.length}件</span><span>対象外 ${rejectedImports.length}件</span></div></div>`;
    renderPendingImports();await loadRecords();await loadImportIssues();await loadImportIssueHistory();await loadImportIssueHistory();
    if(pendingImportLocations.length)alert(`⚠ ${pendingImportLocations.length}件は位置情報へ変換できなかったため登録していません。\n「位置未確認データ」から確認してください。`);
  }catch(e){
    $('importResult').innerHTML=`<div class="import-status error">エラー：${esc(e.message)}</div>`;
  }finally{
    if(btn){btn.disabled=false;btn.classList.remove('importing');btn.textContent='名簿を取り込む';}
  }
}

async function loadImportIssues(){
  const panel=$('importIssuesPanel'),list=$('importIssuesList'),count=$('importIssuesCount'),body=$('importIssuesBody'),toggle=$('importIssuesToggle');
  if(!panel||!list||!count||!body||!toggle)return;
  if(!window.appSession||!['leader','prefecture_admin','system_admin'].includes(window.appSession.role)){panel.classList.add('hidden');return;}
  try{
    const d=await api('listImportIssues',{areaId:currentAreaId});
    const issues=d.issues||[];
    panel.classList.toggle('hidden',issues.length===0);
    count.textContent=issues.length?`${issues.length}件`:'';
    list.innerHTML=issues.map(x=>`<div class="import-issue-row"><span class="import-issue-id">${esc(x.partyId||'')}</span><span class="import-issue-reason">${esc(x.reason||'確認が必要です')}</span><span class="import-issue-date">${esc(formatImportIssueDate(x.importedAt))}</span></div>`).join('');
    const open=localStorage.getItem('aisapo.importIssuesOpen')==='1';
    body.classList.toggle('hidden',!open);
    toggle.textContent=open?'閉じる':'表示';
    toggle.setAttribute('aria-expanded',open?'true':'false');
  }catch(e){
    panel.classList.remove('hidden');
    count.textContent='';
    body.classList.remove('hidden');
    toggle.textContent='閉じる';
    toggle.setAttribute('aria-expanded','true');
    list.innerHTML=`<div class="card-sub">取込確認履歴を読み込めませんでした：${esc(e.message)}</div>`;
  }
}
function toggleImportIssues(){
  const body=$('importIssuesBody'),toggle=$('importIssuesToggle');
  if(!body||!toggle)return;
  const willOpen=body.classList.contains('hidden');
  body.classList.toggle('hidden',!willOpen);
  toggle.textContent=willOpen?'閉じる':'表示';
  toggle.setAttribute('aria-expanded',willOpen?'true':'false');
  localStorage.setItem('aisapo.importIssuesOpen',willOpen?'1':'0');
}
function formatImportIssueDate(v){
  if(!v)return'';
  const d=new Date(v);
  if(isNaN(d))return String(v);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}



async function loadImportIssueHistory(){
  const panel=$('importIssueHistoryPanel'),list=$('importIssueHistoryList'),count=$('importIssueHistoryCount'),body=$('importIssueHistoryBody'),toggle=$('importIssueHistoryToggle');
  if(!panel||!list||!count||!body||!toggle)return;
  if(!window.appSession||!['leader','prefecture_admin','system_admin'].includes(window.appSession.role)){panel.classList.add('hidden');return;}
  try{
    const d=await api('listImportIssueHistory',{areaId:currentAreaId});
    const history=d.history||[];
    panel.classList.toggle('hidden',history.length===0);
    count.textContent=history.length?`${history.length}件`:'';
    list.innerHTML=history.map(x=>`<div class="import-issue-row history-row"><span class="import-issue-id">${esc(x.partyId||'')}</span><span class="import-issue-reason">${esc(x.reason||'確認が必要です')}</span><span class="import-issue-status">${x.resolved?'解消済み':'未解決'}</span><span class="import-issue-date">${esc(formatImportIssueDate(x.importedAt))}</span></div>`).join('');
    const open=localStorage.getItem('aisapo.importIssueHistoryOpen')==='1';
    body.classList.toggle('hidden',!open);
    toggle.textContent=open?'閉じる':'表示';
    toggle.setAttribute('aria-expanded',open?'true':'false');
  }catch(e){
    panel.classList.remove('hidden');
    count.textContent='';
    body.classList.remove('hidden');
    toggle.textContent='閉じる';
    toggle.setAttribute('aria-expanded','true');
    list.innerHTML=`<div class="card-sub">取込履歴を読み込めませんでした：${esc(e.message)}</div>`;
  }
}
function toggleImportIssueHistory(){
  const body=$('importIssueHistoryBody'),toggle=$('importIssueHistoryToggle');
  if(!body||!toggle)return;
  const willOpen=body.classList.contains('hidden');
  body.classList.toggle('hidden',!willOpen);
  toggle.textContent=willOpen?'閉じる':'表示';
  toggle.setAttribute('aria-expanded',willOpen?'true':'false');
  localStorage.setItem('aisapo.importIssueHistoryOpen',willOpen?'1':'0');
}

function renderPendingImports(){
  const panel=$('pendingImportPanel'),list=$('pendingImportList'),sum=$('pendingImportSummary');if(!panel||!list||!sum)return;
  const active=pendingImportLocations.map((x,i)=>({...x,_i:i})).filter(x=>!x.resolved);panel.classList.toggle('hidden',active.length===0);sum.textContent=active.length?`${active.length}件はまだ保存されていません。元住所はこの画面内だけで一時利用します。`:'';
  list.innerHTML=active.map(x=>`<div class="pending-import-item"><span>${esc(x.lastName||'苗字未設定')} ${x.partyId?`（ID: ${esc(x.partyId)}）`:''}<br><small>${esc(x.reason||'位置未確認')}</small></span><button class="btn" onclick="openPendingImportLocation(${x._i})">位置を確認</button></div>`).join('');
}
function closePendingImportLocation(){const el=$('importLocationModal');if(el)el.style.display='none';pendingImportIndex=-1;}
async function openPendingImportLocation(index){
  const item=pendingImportLocations[index];if(!item)return;pendingImportIndex=index;$('pendingImportPerson').textContent=`${item.lastName||'苗字未設定'}${item.partyId?` ／ 党員ID ${item.partyId}`:''}`;$('pendingImportAddress').textContent=item.address||'住所なし';$('importLocationModal').style.display='flex';
  setTimeout(async()=>{
    if(!importLocationMap){importLocationMap=L.map('importLocationMap').setView([33.5902,130.4017],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(importLocationMap);importLocationMap.on('click',e=>setPendingImportMarker(e.latlng.lat,e.latlng.lng));}
    importLocationMap.invalidateSize();const area=areas.find(a=>String(a.areaId)===String(item.areaId));if(area&&Number(area.mapLat)&&Number(area.mapLng))importLocationMap.setView([Number(area.mapLat),Number(area.mapLng)],13);
    const pos=await geocodeAddressQuietly(item.address||'');if(pos){setPendingImportMarker(pos.lat,pos.lng);importLocationMap.setView([pos.lat,pos.lng],17)}
  },80);
}
function setPendingImportMarker(lat,lng){if(importLocationMarker)importLocationMarker.remove();importLocationMarker=L.marker([lat,lng],{draggable:true}).addTo(importLocationMap);importLocationMarker.on('dragend',()=>{});}
async function savePendingImportLocation(){
  const item=pendingImportLocations[pendingImportIndex];if(!item||!importLocationMarker){alert('地図をタップして位置を指定してください');return}
  const p=importLocationMarker.getLatLng();try{await api('saveImportedLocation',{areaId:item.areaId,partyId:item.partyId,lastName:item.lastName,memberType:item.memberType,lat:p.lat,lng:p.lng});item.resolved=true;closePendingImportLocation();renderPendingImports();await loadRecords();await loadImportIssues();}catch(e){alert(e.message)}
}
