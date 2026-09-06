"use strict";

function filterToggleMarkup(open){
  return `<svg class="filter-funnel-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16l-6.3 7.1v4.5l-3.4 1.8v-6.3L4 6Z"/></svg><span>${open?'絞り込みを閉じる':'絞り込み'}</span>`;
}
function formatShortDate(v){const d=new Date(v);return isNaN(d)?String(v||""):`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`}
function renderAll(){renderMarkers();renderLists();renderAnalysis()}

function cleanDisplayName(v){
  let s=String(v||'').trim();
  s=s.replace(/^(?:party_member|party|supporter|general|unknown)\s*[|｜:：\-–—]?\s*/i,'').trim();
  return s;
}
function recordDisplayName(r){
  if(!r)return '';
  // 名簿取込は氏名の正本(lastName/firstName)を優先。旧personNameに内部値が残っていても表示しない。
  if(String(r.source||'')==='import'){
    const canonical=[r.lastName,r.firstName].map(v=>cleanDisplayName(v)).filter(Boolean).join(' ');
    if(canonical)return canonical;
  }
  return cleanDisplayName(r.personName);
}


function supportRankValue(v){
  const raw=String(v||'').trim();
  if(['A','B','C'].includes(raw))return raw;
  if(raw==='◎有力')return 'A';
  if(raw==='○可能性あり')return 'B';
  if(raw==='△様子見')return 'C';
  return '';
}
function supportRankLabel(v){
  const rank=supportRankValue(v);
  return rank?`支持 ${rank}`:'';
}

function recordFollowBadges(r){
  const out=[];
  if(boolValue(r.followParty))out.push('<span class="badge">⭐ 党員希望</span>');
  if(boolValue(r.followSupporter))out.push('<span class="badge">🟠 サポーター希望</span>');
  if(boolValue(r.followDetails))out.push('<span class="badge">💬 詳細希望</span>');
  if(out.length)out.push(`<span class="badge">${boolValue(r.followDone)?'✓ 対応済':'未対応'}</span>`);
  if(boolValue(r.posterRequest))out.push(`<span class="badge warning-soft">🍊 ポスター依頼${boolValue(r.posterReported)?'・報告済':'・未報告'}</span>`);
  return out.join('');
}

function listPrivacyAddress(address){
  const s=String(address||'').replace(/\s+/g,'').trim();
  if(!s)return '住所未設定';

  // 一覧では町丁目まで。番地・号・建物名は表示しない。
  const chome=s.match(/^(.+?丁目)/);
  if(chome)return chome[1];

  // 「丁目」がない住所は、区以降の町名までをできる範囲で残し、
  // 最初の番地らしい数字以降を非表示にする。
  const m=s.match(/^(.+?(?:市|区|町|村).+?)(?=[0-9０-９]+(?:番地?|号|-|－|ー))/);
  if(m&&m[1])return m[1].replace(/[0-9０-９\-－ー]+$/,'');

  return s.replace(/[0-9０-９]+(?:[-－ー][0-9０-９]+)+.*$/,'').replace(/[0-9０-９]+番地?.*$/,'') || '住所設定済み';
}

function recordCard(r){
  const mt=recordMemberType(r),key=statusKey(r.status),st=STATUS[key]||STATUS.unvisited;
  const located=!!(Number(r.lat)&&Number(r.lng));
  const sourceLabel={import:'名簿取込',manual:'手入力',map:'地図登録'};
  return `<article class="card" style="border-left-color:${st.color}" onclick='openEdit(${JSON.stringify(r).replace(/'/g,"&#39;")},false)'>
    <div class="card-title-row"><div class="card-title">${esc(recordDisplayName(r)||'名前未登録')} <span class="badge status-badge"><span class="status-icon">${esc(st.icon||'')}</span>${esc(st.label)}</span></div>${located?`<button type="button" class="list-map-btn has-tip" data-tip="地図で見る" onclick="event.stopPropagation();showRecordOnMap('${esc(r.id)}')">📍 <span>地図で見る</span></button>`:''}</div>
    <div class="muted">${esc(listPrivacyAddress(r.fullAddress))}${r.date?' ｜ '+esc(formatShortDate(r.date)):''}</div>
    <div class="badges">
      <span class="badge member-badge ${mt==='party_member'?'member-party':mt==='supporter'?'member-supporter':''}">${esc(memberTypeLabel(mt))}</span>
      <span class="badge">${esc(sourceLabel[r.source]||'手入力')}</span>
      <span class="badge">${(window.appSession?.role==='member'&&['party_member','supporter'].includes(mt))?(r.locationConfirmed?'🔒 位置確認済':'⚠ 位置未確認'):(located?'📍 位置取得済':'⚠ 位置未取得')}</span>
      ${supportRankLabel(r.supporter)?`<span class="badge support-rank-badge rank-${supportRankValue(r.supporter).toLowerCase()}">${esc(supportRankLabel(r.supporter))}</span>`:''}
      ${boolValue(r.urgent)?'<span class="badge urgent-badge">⚡ 急ぎ</span>':''}${r.nextVisitDate?`<span class="badge">次回 ${esc(formatShortDate(r.nextVisitDate))}</span>`:''}${Number(r.visitCount||0)>0?`<span class="badge">訪問 ${Number(r.visitCount||0)}回</span>`:''}
      ${boolValue(r.warning)?'<span class="badge warning-soft">⚠ 訪問注意</span>':''}
      ${recordFollowBadges(r)}
    </div>
    ${r.referrer?`<div class="card-sub">紹介：${esc(r.referrer)}</div>`:''}
    ${r.memo?`<div class="card-sub">${esc(r.memo)}</div>`:''}
  </article>`;
}
function toggleListFilters(force){
  const panel=$('listFilterPanel');
  const btn=$('listFilterToggle');
  if(!panel)return;
  const open=typeof force==='boolean'?force:panel.classList.contains('filters-collapsed');
  panel.classList.toggle('filters-collapsed',!open);
  if(btn){
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.innerHTML=filterToggleMarkup(open);
  }
}
function clearListFilters(){
  const values={listSearch:'',listSource:'',listMemberType:'',listSupportRank:'',listLocation:'',listSort:'default',listDateFrom:'',listDateTo:''};
  Object.entries(values).forEach(([id,val])=>{const el=$(id);if(el)el.value=val;});
  ['listUnvisited','listVisited','listAbsent','listRevisit','listRefused','listWarning','listFollow','listFollowPending','listPosterRequest','listPosterPending','listUrgent','listOverdue'].forEach(id=>{const el=$(id);if(el)el.checked=false;});
  renderLists();
}
function renderLists(){
  const q=($('listSearch')?.value||'').trim().toLowerCase();
  const source=$('listSource')?.value||'',memberType=$('listMemberType')?.value||'',supportRank=$('listSupportRank')?.value||'',location=$('listLocation')?.value||'',sort=$('listSort')?.value||'default',dateFrom=$('listDateFrom')?.value||'',dateTo=$('listDateTo')?.value||'';
  const unvisited=!!$('listUnvisited')?.checked,visitedFilter=!!$('listVisited')?.checked,absentFilter=!!$('listAbsent')?.checked,revisit=!!$('listRevisit')?.checked,refused=!!$('listRefused')?.checked,warning=!!$('listWarning')?.checked;
  const follow=!!$('listFollow')?.checked,followPending=!!$('listFollowPending')?.checked,poster=!!$('listPosterRequest')?.checked,posterPending=!!$('listPosterPending')?.checked,urgent=!!$('listUrgent')?.checked,overdue=!!$('listOverdue')?.checked;
  const statusFilters=[];if(unvisited)statusFilters.push('unvisited');if(visitedFilter){statusFilters.push('visited');statusFilters.push('good');}if(absentFilter)statusFilters.push('absent');if(revisit)statusFilters.push('revisit');if(refused)statusFilters.push('refused');
  const td=today();
  const filtered=records.filter(r=>{
    if(currentAreaId&&String(r.areaId||'')!==String(currentAreaId))return false;
    if(q&&![r.personName,r.fullAddress,r.phone,r.email,r.partyId,r.sourceBranch,r.referrer,r.memo,r.followMemo,r.posterRequestMemo].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(source&&String(r.source||'manual')!==source)return false;
    if(memberType&&String(r.memberType||'general')!==memberType)return false;
    const rank=supportRankValue(r.supporter);
    if(supportRank==='unranked'&&rank)return false;
    if(supportRank&&supportRank!=='unranked'&&rank!==supportRank)return false;
    const located=!!(Number(r.lat)&&Number(r.lng));
    if(location==='located'&&!located)return false;
    if(location==='unlocated'&&located)return false;
    const d=String(r.date||'').slice(0,10);if(dateFrom&&(!d||d<dateFrom))return false;if(dateTo&&(!d||d>dateTo))return false;
    if(statusFilters.length&&!statusFilters.includes(statusKey(r.status)))return false;
    if(warning&&!boolValue(r.warning))return false;
    if(follow&&!hasFollow(r))return false;
    if(followPending&&(!hasFollow(r)||boolValue(r.followDone)))return false;
    if(poster&&!boolValue(r.posterRequest))return false;
    if(posterPending&&(!boolValue(r.posterRequest)||boolValue(r.posterReported)))return false;
    if(urgent&&!boolValue(r.urgent))return false;
    const next=String(r.nextVisitDate||'').slice(0,10);if(overdue&&(!next||next>=td))return false;
    return true;
  });
  if(sort==='next_visit')filtered.sort((a,b)=>(String(a.nextVisitDate||'9999-12-31')).localeCompare(String(b.nextVisitDate||'9999-12-31')));
  if(sort==='date_desc')filtered.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  if(sort==='date_asc')filtered.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  $('listCards').innerHTML=filtered.map(recordCard).join('')||'<div class="panel notice">該当データはありません。</div>';
}

function geoGridCell(r,sizeM=500){
  const lat=Number(r.lat),lng=Number(r.lng);if(!(lat&&lng))return null;
  const latM=lat*111320,lngM=lng*(111320*Math.cos(lat*Math.PI/180));
  const y=Math.floor(latM/sizeM),x=Math.floor(lngM/sizeM);
  return {key:`${x}:${y}`,x,y,lat,lng};
}
function geoProgressRows(){
  const groups={};
  records.forEach(r=>{const c=geoGridCell(r);if(!c)return;const g=groups[c.key]||(groups[c.key]={total:0,visited:0,unvisited:0,revisit:0,latSum:0,lngSum:0});g.total++;g.latSum+=Number(r.lat);g.lngSum+=Number(r.lng);const st=statusKey(r.status);if(st==='unvisited')g.unvisited++;else g.visited++;if(st==='revisit')g.revisit++;});
  return Object.values(groups).map((g,i)=>({...g,lat:g.latSum/g.total,lng:g.lngSum/g.total})).sort((a,b)=>b.unvisited-a.unvisited||b.total-a.total);
}
function showAnalysisGridOnMap(lat,lng){showView('map');setTimeout(()=>{if(map){map.setView([Number(lat),Number(lng)],16);}},120);}
function clearListChecks(){
  ['listUnvisited','listVisited','listAbsent','listRevisit','listRefused','listWarning','listFollow','listFollowPending','listPosterRequest','listPosterPending','listUrgent','listOverdue'].forEach(id=>{if($(id))$(id).checked=false});
}
function analysisGo(kind){
  if($('listSource'))$('listSource').value='';if($('listMemberType'))$('listMemberType').value='';if($('listSupportRank'))$('listSupportRank').value='';if($('listLocation'))$('listLocation').value='';if($('listSort'))$('listSort').value='default';clearListChecks();
  if(kind==='unlocated')$('listLocation').value='unlocated';
  if(kind==='revisit')$('listRevisit').checked=true;
  if(kind==='unvisited')$('listUnvisited').checked=true;
  if(kind==='warning')$('listWarning').checked=true;
  if(kind==='party')$('listMemberType').value='party_member';
  if(kind==='supporter')$('listMemberType').value='supporter';
  if(kind==='rankA')$('listSupportRank').value='A';
  if(kind==='rankB')$('listSupportRank').value='B';
  if(kind==='rankC')$('listSupportRank').value='C';
  if(kind==='rankUnranked')$('listSupportRank').value='unranked';
  if(kind==='follow')$('listFollow').checked=true;
  if(kind==='followPending')$('listFollowPending').checked=true;
  if(kind==='posterRequest')$('listPosterRequest').checked=true;
  if(kind==='posterPending')$('listPosterPending').checked=true;
  if(kind==='urgent')$('listUrgent').checked=true;
  if(kind==='overdue')$('listOverdue').checked=true;
  showView('list',{fromAnalysis:true});renderLists();
}
async function loadBranchMessages(){
  try{
    const d=await api('listBranchMessages',{limit:5});
    branchMessages=d.messages||[];
    if(!$('view-analysis')?.classList.contains('hidden'))renderAnalysis();
  }catch(e){
    console.warn('支部連絡の取得:',e.message);
    branchMessages=[];
  }
}
function branchName(id){
  if(String(id)==='all')return '全支部';
  return branches.find(b=>String(b.branchId)===String(id))?.name||'支部';
}
function formatMessageDate(v){
  if(!v)return'';
  const d=new Date(v);if(isNaN(d))return String(v);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function canManageBranchMessage(m){
  return !!window.appSession&&(window.appSession.role==='system_admin'||String(m.createdBy||'')===String(window.appSession.userId||''));
}
function renderBranchMessages(){
  if(!branchMessages.length)return '<div class="branch-message-empty">連絡はまだありません。</div>';
  return branchMessages.slice(0,5).map(m=>`<article class="branch-message-item">
    <div class="branch-message-top"><b>${esc(m.title||'連絡')}</b><time>${esc(formatMessageDate(m.createdAt))}</time></div>
    <div class="branch-message-route">${esc(branchName(m.fromBranchId))}</div>
    <div class="branch-message-body">${esc(m.body)}</div>
    <div class="branch-message-footer">
      <div class="branch-message-author">${esc(m.createdByName||'')}</div>
      ${canManageBranchMessage(m)?`<div class="branch-message-actions"><button type="button" onclick="openBranchMessageModal('${esc(m.messageId)}')">✏️ 編集</button><button type="button" class="danger" onclick="deleteBranchMessage('${esc(m.messageId)}')">🗑️ 削除</button></div>`:''}
    </div>
  </article>`).join('');
}
function openBranchMessageModal(messageId=''){
  const modal=$('branchMessageModal');if(!modal)return;
  const m=messageId?branchMessages.find(x=>String(x.messageId)===String(messageId)):null;
  $('branchMessageId').value=m?.messageId||'';
  $('branchMessageModalTitle').textContent=m?'📣 支部連絡を編集':'📣 支部連絡を追加';
  $('branchMessageTitle').value=m?.title||'';
  $('branchMessageBody').value=m?.body||'';
  $('branchMessageSaveBtn').textContent=m?'変更を保存':'連絡を追加';
  modal.style.display='flex';
}
function closeBranchMessageModal(){$('branchMessageModal').style.display='none'}
async function saveBranchMessage(){
  const btn=$('branchMessageSaveBtn'),messageId=$('branchMessageId')?.value||'';
  try{
    if(btn){btn.disabled=true;btn.textContent=messageId?'保存中…':'送信中…'}
    await api('saveBranchMessage',{message:{messageId,title:$('branchMessageTitle').value.trim(),body:$('branchMessageBody').value.trim()}});
    closeBranchMessageModal();await loadBranchMessages();renderAnalysis();
  }catch(e){alert(e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent=messageId?'変更を保存':'連絡を追加'}}
}
async function deleteBranchMessage(messageId){
  if(!confirm('この支部連絡を削除しますか？'))return;
  try{
    await api('deleteBranchMessage',{messageId});
    await loadBranchMessages();renderAnalysis();
  }catch(e){alert(e.message)}
}

function activityPeriodCard(title,p){
  p=p||{visits:0,contacts:0,absent:0,posted:0,contactRate:0};
  return `<div class="activity-period-card"><div class="activity-period-title">${esc(title)}</div><div class="activity-period-main"><b>${Number(p.visits||0)}</b><span>訪問</span></div><div class="activity-period-stats"><span>接触 ${Number(p.contacts||0)}</span><span>不在 ${Number(p.absent||0)}</span><span>配布 ${Number(p.posted||0)}</span><span>接触率 ${Number(p.contactRate||0)}%</span></div></div>`;
}
function renderAnalysis(){
  const total=records.length,countStatus=k=>records.filter(r=>statusKey(r.status)===k).length;
  const unvisited=countStatus('unvisited'),visitedStatus=countStatus('visited')+countStatus('good'),absent=countStatus('absent'),refused=countStatus('refused'),revisit=countStatus('revisit');
  const warning=records.filter(r=>boolValue(r.warning)).length,urgent=records.filter(r=>boolValue(r.urgent)).length;
  const visited=Math.max(0,total-unvisited),unlocated=records.filter(r=>!(Number(r.lat)&&Number(r.lng))).length;
  const follow=records.filter(hasFollow),followPending=follow.filter(r=>!boolValue(r.followDone)).length;
  const poster=records.filter(r=>boolValue(r.posterRequest)),posterPending=poster.filter(r=>!boolValue(r.posterReported)).length;
  const party=records.filter(r=>r.memberType==='party_member').length,supporter=records.filter(r=>r.memberType==='supporter').length;
  const rankA=records.filter(r=>supportRankValue(r.supporter)==='A').length,rankB=records.filter(r=>supportRankValue(r.supporter)==='B').length,rankC=records.filter(r=>supportRankValue(r.supporter)==='C').length,rankUnranked=records.filter(r=>!supportRankValue(r.supporter)).length;
  const rankTotal=rankA+rankB+rankC+rankUnranked;
  const pct=n=>rankTotal?Math.round(n/rankTotal*100):0;
  const visitRate=total?Math.round(visited/total*100):0,td=today();
  const overdue=records.filter(r=>{const d=String(r.nextVisitDate||'').slice(0,10);return d&&d<td;}).length;
  const dueToday=records.filter(r=>String(r.nextVisitDate||'').slice(0,10)===td).length;
  const grids=geoProgressRows(),densest=grids.find(g=>g.unvisited>0);
  const gridRows=grids.slice(0,10).map((g,idx)=>{const rate=g.total?Math.round(g.visited/g.total*100):0;return `<button class="analysis-town-row analysis-grid-row" onclick="showAnalysisGridOnMap(${g.lat},${g.lng})"><div class="analysis-town-main"><b>地域 ${String(idx+1).padStart(2,'0')}</b><span>${g.total}件</span></div><div class="analysis-town-stats"><span>未訪問 ${g.unvisited}</span><span>再訪 ${g.revisit}</span><span>進捗 ${rate}%</span></div><div class="analysis-bar"><div class="analysis-bar-fill" style="width:${rate}%"></div></div><span class="analysis-link-hint">地図で見る →</span></button>`}).join('');
  const actionItems=[
    {kind:'overdue',label:'再訪期限超過',value:overdue,detail:'予定日を過ぎています'},
    {kind:'urgent',label:'急ぎ対応',value:urgent,detail:'優先して確認'},
    {kind:'followPending',label:'フォロー未対応',value:followPending,detail:'希望者への連絡・対応'},
    {kind:'posterPending',label:'ポスター未報告',value:posterPending,detail:'党への報告が必要'},
    {kind:'warning',label:'訪問注意',value:warning,detail:'訪問前に注意事項を確認'}
  ];
  const activeActions=actionItems.filter(x=>x.value>0);
  const orderedActions=activeActions;
  const action=(item,priority)=>`<button class="analysis-action analysis-clickable ${item.value<=0?'is-empty':''}" onclick="analysisGo('${item.kind}')">${item.value>0?`<span class="analysis-priority-badge">優先 ${priority}</span>`:''}<span class="analysis-action-value">${item.value}</span><span class="analysis-action-label">${esc(item.label)}</span><span class="analysis-action-sub">${esc(item.detail)}</span><span class="analysis-link-hint">一覧を見る →</span></button>`;
  const metric=(label,value)=>`<div class="analysis-metric"><div class="analysis-value">${value}</div><div class="analysis-label">${esc(label)}</div></div>`;
  const rankCard=(kind,label,value)=>`<button class="analysis-metric analysis-clickable support-rank-card" onclick="analysisGo('${kind}')"><div class="support-rank-value-row"><div class="analysis-value">${value}</div><div class="support-rank-pct">${pct(value)}%</div></div><div class="analysis-label">${esc(label)}</div><span class="analysis-link-hint">一覧を見る →</span></button>`;
  const periods=activitySummary?.periods||{};
  const el=$('analysisContent');if(!el)return;
  el.innerHTML=`
  <div class="panel activity-section today-action-section ${activeActions.length===0?'is-compact-empty':''}"><div class="section-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/needs-action.webp" alt=""></div><div><h2>今日やること</h2><p>対応が必要な項目を優先順に表示</p></div></div>${activeActions.length?`<div class="analysis-actions">${orderedActions.map((x,i)=>action(x,i+1)).join('')}</div>`:'<div class="today-clear-note">✓ 現在、優先対応はありません。</div>'}${dueToday?`<div class="today-due-note">📅 今日が次回予定の訪問先：<b>${dueToday}件</b></div>`:''}${densest?`<button class="analysis-focus-area" onclick="showAnalysisGridOnMap(${densest.lat},${densest.lng})">📍 未訪問が最も集中している地域：<b>${densest.unvisited}件</b>　地図で見る →</button>`:''}</div>

  <div class="panel activity-section"><div class="section-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/visit-status.webp" alt=""></div><div><h2>活動実績</h2><p>今日・直近7日・今月の活動量と接触率</p></div></div><div class="activity-period-grid">${activityPeriodCard('今日',periods.today)}${activityPeriodCard('直近7日',periods.week)}${activityPeriodCard('今月',periods.month)}</div></div>

  <div class="panel activity-section region-progress-section ${grids.length===0?'is-compact-empty':''}"><div class="section-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/town-progress.webp" alt=""></div><div><h2>地域ごとの訪問状況</h2><p>${grids.length?'位置情報をもとに、未訪問が多い地域を表示':'位置情報が入ると、未訪問が多い地域をここに表示します'}</p></div></div>${grids.length?`<div class="analysis-town-list">${gridRows}</div>`:''}</div>

  <div class="panel activity-section"><div class="section-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/visit-status.webp" alt=""></div><div><h2>訪問進捗</h2><p>全体の残量を確認</p></div></div><div class="analysis-progress-head"><b>${visited} / ${total}件 訪問済み</b><span>${visitRate}%</span></div><div class="analysis-bar"><div class="analysis-bar-fill" style="width:${visitRate}%"></div></div><div class="visit-progress-compact"><button class="visit-progress-item analysis-clickable" onclick="analysisGo('unvisited')"><b>${unvisited}</b><span>未訪問</span></button><div class="visit-progress-item"><b>${visitedStatus}</b><span>訪問済</span></div><button class="visit-progress-item analysis-clickable" onclick="analysisGo('revisit')"><b>${revisit}</b><span>再訪予定</span></button></div><div class="visit-progress-secondary"><span>不在 ${absent}</span><span>断られた ${refused}</span><span>位置未取得 ${unlocated}</span></div></div>

  <div class="panel activity-section support-rank-section"><div class="section-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/support-rank.webp" alt=""></div><div><h2>現在の支持ランク構成</h2><p>得票予測ではなく、登録済み接触情報の構成比</p></div></div><div class="analysis-grid support-rank-grid">${rankCard('rankA','A 強い支持',rankA)}${rankCard('rankB','B 支持・好感',rankB)}${rankCard('rankC','C 接触済・未確定',rankC)}${rankCard('rankUnranked','未判定',rankUnranked)}</div></div>

  <div class="panel activity-section"><div class="section-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/connection.webp" alt=""></div><div><h2>つながり・対応状況</h2><p>関係性と、対応が必要な項目を分けて確認</p></div></div><div class="connection-groups"><div class="connection-group"><div class="analysis-action-group-label">つながり</div><div class="analysis-grid connection-grid"><button class="analysis-metric analysis-clickable" onclick="analysisGo('party')"><div class="analysis-value">${party}</div><div class="analysis-label">党員</div><span class="analysis-link-hint">一覧を見る →</span></button><button class="analysis-metric analysis-clickable" onclick="analysisGo('supporter')"><div class="analysis-value">${supporter}</div><div class="analysis-label">サポーター</div><span class="analysis-link-hint">一覧を見る →</span></button></div></div><div class="connection-group"><div class="analysis-action-group-label">対応中</div><div class="analysis-grid connection-grid"><button class="analysis-metric analysis-clickable ${follow.length===0?'is-empty':''}" onclick="analysisGo('follow')"><div class="analysis-value">${follow.length}</div><div class="analysis-label">フォロー対象</div><span class="analysis-link-hint">一覧を見る →</span></button><div class="analysis-metric ${poster.length===0?'is-empty':''}"><div class="analysis-value">${poster.length}</div><div class="analysis-label">ポスター依頼</div></div></div></div></div></div>

  <div class="panel activity-section branch-messages-section"><div class="section-heading branch-message-heading"><div class="heading-icon activity-icon activity-icon-image"><img src="assets/img/activity/branch.webp" alt=""></div><div><h2>支部連絡</h2><p>支部間の連絡・共有事項（最新5件）</p></div><button type="button" class="btn branch-message-add" onclick="openBranchMessageModal()">＋ 連絡を追加</button></div><div class="branch-message-list">${renderBranchMessages()}</div></div>`;
}
function updateScrollTopFloating(){
  const mobile=window.matchMedia('(max-width:700px)').matches;
  const show=mobile&&window.scrollY>420;
  const listVisible=!$('view-list')?.classList.contains('hidden');
  const analysisVisible=!$('view-analysis')?.classList.contains('hidden');
  $('listScrollTopFloating')?.classList.toggle('hidden',!(show&&listVisible));
  $('analysisScrollTopFloating')?.classList.toggle('hidden',!(show&&analysisVisible));
}
window.addEventListener('scroll',updateScrollTopFloating,{passive:true});
window.addEventListener('resize',updateScrollTopFloating);

function showView(v,opts={}){
  ['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x)?.classList.toggle('hidden',x!==v));
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  const backButtons=[$('listBackToAnalysis'),$('listBackToAnalysisFloating')].filter(Boolean);
  const fromAnalysis=v==='list'&&!!opts.fromAnalysis;
  backButtons.forEach(back=>back.classList.toggle('hidden',!fromAnalysis));
  if(v==='analysis')renderAnalysis();
  if(v==='contacts'&&typeof loadImportIssues==='function')loadImportIssues();
  if(v==='list')setTimeout(()=>toggleListFilters(false),0);
  if(v==='map')setTimeout(()=>{if(map&&typeof map.invalidateSize==='function')map.invalidateSize();},100);
  setTimeout(updateScrollTopFloating,0);
}
