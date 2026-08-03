/** Release 2 read-only Executive Work Queue. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const chain = [
    'applyDashboardReviewRoutingPatch_','applyDashboardNotificationsPatch_',
    'applyDashboardHealthDrilldownPatch_','applyDashboardKpiNavigationPatch_',
    'applyDashboardHashRoutingPatch_','applyDashboardMobileNavigationPatch_',
    'applyDashboardDailyBriefingPatch_','applyDashboardActivityRecoveryPatch_',
    'applyDashboardOperationsTimelinePatch_'
  ];
  let output = source;
  chain.forEach(function(name) { if (typeof this[name] === 'function') output = this[name](output); }, this);
  return HtmlService.createHtmlOutput(applyDashboardExecutiveWorkQueuePatch_(output)).setTitle('Moore Holdings Credit Agent');
}

function applyDashboardExecutiveWorkQueuePatch_(source) {
  let patched = String(source || '');
  const buttonAnchor = '      <button id="operationsTimelineButton"';
  const button = '      <button id="executiveWorkQueueButton" class="btn-gold" onclick="toggleExecutiveWorkQueue()">Execution Board</button>\n\n' + buttonAnchor;
  if (patched.indexOf(buttonAnchor) === -1) throw new Error('Executive work queue button anchor missing.');
  patched = patched.replace(buttonAnchor, button);

  const panelAnchor = '    <section id="operationsTimeline"';
  const panel = '    <section id="executiveWorkQueue" class="panel" style="margin-bottom:20px;display:none;">\n' +
    '      <div class="panel-header"><div><h2>Executive Execution Board</h2><div class="card-note">Priorities, deadlines, approvals, tasks, and recovery work</div></div><button class="btn-neutral" onclick="toggleExecutiveWorkQueue()">Close</button></div>\n' +
    '      <div class="filters" style="padding:18px 18px 0;"><select id="workQueuePriorityFilter" onchange="refreshExecutiveWorkQueue()"><option value="ALL">All priorities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="NORMAL">Normal</option></select><select id="workQueueStatusFilter" onchange="refreshExecutiveWorkQueue()"><option value="ALL">All statuses</option><option value="ACTION REQUIRED">Action Required</option><option value="AWAITING APPROVAL">Awaiting Approval</option><option value="MONITOR">Monitor</option></select></div>\n' +
    '      <div id="executiveWorkQueueList" class="cards" style="padding:18px;margin-bottom:0;"><div class="empty">No work items loaded.</div></div>\n' +
    '    </section>\n\n' + panelAnchor;
  if (patched.indexOf(panelAnchor) === -1) throw new Error('Executive work queue panel anchor missing.');
  patched = patched.replace(panelAnchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function collectExecutiveWorkItems() {\n" +
    "      const items=[]; const number=function(id){return Number(((document.getElementById(id)||{}).textContent||'').replace(/[^0-9.-]/g,''))||0;};\n" +
    "      const governed=document.querySelectorAll('#governedActionList .card').length; const pending=number('pendingReviews'); const high=number('highPriority');\n" +
    "      const phase10=(document.getElementById('phase10Summary')||{}).textContent||''; const drafts=Number((phase10.match(/Awaiting Approval:\\s*(\\d+)/)||[])[1])||0;\n" +
    "      const recovery=document.querySelectorAll('[data-recovery-required=\"true\"]').length; const health=((document.getElementById('healthOverall')||{}).textContent||'Unknown').trim();\n" +
    "      if(recovery) items.push({priority:'CRITICAL',status:'ACTION REQUIRED',title:recovery+' recovery item(s)',detail:'Create a fresh governed recovery action.',target:'activityRecoveryCenter'});\n" +
    "      if(high) items.push({priority:'CRITICAL',status:'ACTION REQUIRED',title:high+' high-priority Personal Credit review(s)',detail:'Review evidence and recommended next action.',module:'personalCreditModule',target:'personalReviewQueue'});\n" +
    "      if(governed) items.push({priority:'HIGH',status:'AWAITING APPROVAL',title:governed+' governed action(s)',detail:'Executive approval or rejection required before expiration.',target:'governedActionPanel'});\n" +
    "      if(drafts) items.push({priority:'HIGH',status:'AWAITING APPROVAL',title:drafts+' Phase 10 draft(s)',detail:'Review supporting evidence before approval.',module:'personalCreditModule',target:'phase10ReviewPanel'});\n" +
    "      if(pending) items.push({priority:'NORMAL',status:'ACTION REQUIRED',title:pending+' pending review(s)',detail:'Process the Personal Credit review queue.',module:'personalCreditModule',target:'personalReviewQueue'});\n" +
    "      items.push({priority:health==='Healthy'?'NORMAL':'HIGH',status:'MONITOR',title:'System health: '+health,detail:'Open System Health for module-level status.',module:'healthModule',target:'healthModule'});\n" +
    "      const rank={CRITICAL:0,HIGH:1,NORMAL:2}; return items.sort(function(a,b){return rank[a.priority]-rank[b.priority];});\n" +
    "    }\n\n" +
    "    function openExecutiveWorkItem(item){ if(item.module) activateCommandCenterModule(item.module,false); const target=document.getElementById(item.target); if(target) target.scrollIntoView({behavior:'smooth',block:'start'}); }\n\n" +
    "    function refreshExecutiveWorkQueue(){ const p=(document.getElementById('workQueuePriorityFilter')||{}).value||'ALL'; const s=(document.getElementById('workQueueStatusFilter')||{}).value||'ALL'; const list=document.getElementById('executiveWorkQueueList'); if(!list)return; list.innerHTML=''; const items=collectExecutiveWorkItems().filter(function(i){return(p==='ALL'||i.priority===p)&&(s==='ALL'||i.status===s);}); if(!items.length){list.innerHTML='<div class=\"empty\">No work items match the selected filters.</div>';return;} items.forEach(function(item){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div><button class=\"btn-primary\">Open</button>';const notes=card.querySelectorAll('.card-note');card.querySelector('.card-label').textContent=item.priority+' — '+item.status;notes[0].textContent=item.title;notes[1].textContent=item.detail;card.querySelector('button').onclick=function(){openExecutiveWorkItem(item);};list.appendChild(card);}); }\n\n" +
    "    function toggleExecutiveWorkQueue(){const panel=document.getElementById('executiveWorkQueue');refreshExecutiveWorkQueue();panel.style.display=panel.style.display==='none'?'block':'none';if(panel.style.display==='block')panel.scrollIntoView({behavior:'smooth',block:'start'});}\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Executive work queue script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
