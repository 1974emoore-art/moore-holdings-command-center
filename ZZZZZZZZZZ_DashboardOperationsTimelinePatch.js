/** Release 2 read-only Executive Operations Timeline. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function' ? applyDashboardReviewRoutingPatch_(source) : source;
  const notified = typeof applyDashboardNotificationsPatch_ === 'function' ? applyDashboardNotificationsPatch_(routed) : routed;
  const health = typeof applyDashboardHealthDrilldownPatch_ === 'function' ? applyDashboardHealthDrilldownPatch_(notified) : notified;
  const kpis = typeof applyDashboardKpiNavigationPatch_ === 'function' ? applyDashboardKpiNavigationPatch_(health) : health;
  const hashed = typeof applyDashboardHashRoutingPatch_ === 'function' ? applyDashboardHashRoutingPatch_(kpis) : kpis;
  const mobile = typeof applyDashboardMobileNavigationPatch_ === 'function' ? applyDashboardMobileNavigationPatch_(hashed) : hashed;
  const briefing = typeof applyDashboardDailyBriefingPatch_ === 'function' ? applyDashboardDailyBriefingPatch_(mobile) : mobile;
  const recovery = typeof applyDashboardActivityRecoveryPatch_ === 'function' ? applyDashboardActivityRecoveryPatch_(briefing) : briefing;
  return HtmlService.createHtmlOutput(applyDashboardOperationsTimelinePatch_(recovery)).setTitle('Moore Holdings Credit Agent');
}

function applyDashboardOperationsTimelinePatch_(source) {
  let patched = String(source || '');
  const buttonAnchor = '      <button id="activityRecoveryButton"';
  const button = '      <button id="operationsTimelineButton" class="btn-neutral" onclick="toggleOperationsTimeline()">Operations Timeline</button>\n\n' + buttonAnchor;
  if (patched.indexOf(buttonAnchor) === -1) throw new Error('Operations timeline button anchor missing.');
  patched = patched.replace(buttonAnchor, button);

  const panelAnchor = '    <section id="activityRecoveryCenter"';
  const panel = '    <section id="operationsTimeline" class="panel" style="margin-bottom:20px;display:none;">\n' +
    '      <div class="panel-header"><div><h2>Executive Operations Timeline</h2><div class="card-note">Newest-first governed activity, approvals, verification, failures, recovery, and executive milestones</div></div><button class="btn-neutral" onclick="toggleOperationsTimeline()">Close</button></div>\n' +
    '      <div class="filters" style="padding:18px 18px 0;">\n' +
    '        <select id="timelineModuleFilter" onchange="refreshOperationsTimeline()"><option value="ALL">All modules</option><option value="Personal Credit">Personal Credit</option><option value="Business Credit">Business Credit</option><option value="Finance">Finance</option><option value="Turo">Turo</option><option value="Real Estate">Real Estate</option><option value="Trading">Trading</option><option value="Business Growth">Business Growth</option><option value="Executive HQ">Executive HQ</option></select>\n' +
    '        <select id="timelineStatusFilter" onchange="refreshOperationsTimeline()"><option value="ALL">All statuses</option><option value="QUEUED">Queued</option><option value="APPROVED">Approved</option><option value="VERIFIED">Verified</option><option value="FAILED">Failed</option><option value="EXPIRED">Expired</option><option value="RECOVERY REQUIRED">Recovery Required</option></select>\n' +
    '        <select id="timelineTypeFilter" onchange="refreshOperationsTimeline()"><option value="ALL">All event types</option><option value="Governed Action">Governed Action</option><option value="Approval">Approval</option><option value="Verification">Verification</option><option value="Recovery">Recovery</option><option value="Milestone">Milestone</option></select>\n' +
    '      </div>\n' +
    '      <div id="operationsTimelineList" class="cards" style="padding:18px;margin-bottom:0;"><div class="empty">No timeline events loaded.</div></div>\n' +
    '    </section>\n\n' + panelAnchor;
  if (patched.indexOf(panelAnchor) === -1) throw new Error('Operations timeline panel anchor missing.');
  patched = patched.replace(panelAnchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    const OPERATIONS_TIMELINE_FILTER_KEY = 'mooreHoldingsOperationsTimelineFilters';\n\n" +
    "    function inferTimelineModule(text) {\n" +
    "      const value = String(text || '').toLowerCase();\n" +
    "      if (/personal credit|phase 10|dispute/.test(value)) return 'Personal Credit';\n" +
    "      if (/business credit|tradeline|d-u-n-s|duns/.test(value)) return 'Business Credit';\n" +
    "      if (/finance|cash flow|budget/.test(value)) return 'Finance';\n" +
    "      if (/turo|vehicle|fleet/.test(value)) return 'Turo';\n" +
    "      if (/real estate|property|underwriting/.test(value)) return 'Real Estate';\n" +
    "      if (/trading|investment|watchlist/.test(value)) return 'Trading';\n" +
    "      if (/growth|happy juice|product/.test(value)) return 'Business Growth';\n" +
    "      return 'Executive HQ';\n" +
    "    }\n\n" +
    "    function inferTimelineType(status, text) {\n" +
    "      if (/RECOVERY/.test(status) || /recovery/i.test(text)) return 'Recovery';\n" +
    "      if (/VERIFIED/.test(status)) return 'Verification';\n" +
    "      if (/APPROVED|REJECTED|EXPIRED/.test(status)) return 'Approval';\n" +
    "      return 'Governed Action';\n" +
    "    }\n\n" +
    "    function collectOperationsTimelineEvents() {\n" +
    "      const events = Array.prototype.slice.call(document.querySelectorAll('#governedActionList .card')).map(function(card, index) {\n" +
    "        const text=(card.textContent || '').replace(/\\s+/g,' ').trim();\n" +
    "        const statusMatch=text.match(/\\b(QUEUED|APPROVED|EXECUTING|VERIFIED|FAILED|EXPIRED|REJECTED|RECOVERY_QUEUED)\\b/i);\n" +
    "        let status=statusMatch ? statusMatch[1].toUpperCase() : 'QUEUED';\n" +
    "        const recovery=card.getAttribute('data-recovery-required') === 'true' || /recovery required/i.test(text);\n" +
    "        if (recovery) status='RECOVERY REQUIRED';\n" +
    "        const rawTime=card.getAttribute('data-timestamp') || card.getAttribute('data-updated-at') || '';\n" +
    "        const parsed=rawTime ? Date.parse(rawTime) : NaN;\n" +
    "        const timestamp=Number.isFinite(parsed) ? parsed : (Date.now() - index);\n" +
    "        return {timestamp:timestamp, module:inferTimelineModule(text), type:inferTimelineType(status,text), status:status, description:text.slice(0,260), target:'governedActionPanel'};\n" +
    "      });\n" +
    "      events.push({timestamp:Date.now()-1000000000,module:'Executive HQ',type:'Milestone',status:'VERIFIED',description:'Release 2 Executive Dashboard operational controls active.',target:'healthModule'});\n" +
    "      return events.sort(function(a,b){ return b.timestamp-a.timestamp; });\n" +
    "    }\n\n" +
    "    function saveOperationsTimelineFilters() {\n" +
    "      try { localStorage.setItem(OPERATIONS_TIMELINE_FILTER_KEY, JSON.stringify({module:(document.getElementById('timelineModuleFilter')||{}).value || 'ALL',status:(document.getElementById('timelineStatusFilter')||{}).value || 'ALL',type:(document.getElementById('timelineTypeFilter')||{}).value || 'ALL'})); } catch (error) {}\n" +
    "    }\n\n" +
    "    function restoreOperationsTimelineFilters() {\n" +
    "      try { const saved=JSON.parse(localStorage.getItem(OPERATIONS_TIMELINE_FILTER_KEY) || '{}'); [['timelineModuleFilter','module'],['timelineStatusFilter','status'],['timelineTypeFilter','type']].forEach(function(pair){ const node=document.getElementById(pair[0]); if(node && saved[pair[1]]) node.value=saved[pair[1]]; }); } catch (error) {}\n" +
    "    }\n\n" +
    "    function openOperationsTimelineEvent(event) {\n" +
    "      if (event.target && Object.prototype.hasOwnProperty.call(COMMAND_CENTER_MODULES,event.target)) activateCommandCenterModule(event.target,false);\n" +
    "      else { const target=document.getElementById(event.target); if(target) target.scrollIntoView({behavior:'smooth',block:'start'}); }\n" +
    "    }\n\n" +
    "    function refreshOperationsTimeline() {\n" +
    "      saveOperationsTimelineFilters();\n" +
    "      const moduleFilter=(document.getElementById('timelineModuleFilter')||{}).value || 'ALL'; const statusFilter=(document.getElementById('timelineStatusFilter')||{}).value || 'ALL'; const typeFilter=(document.getElementById('timelineTypeFilter')||{}).value || 'ALL';\n" +
    "      const list=document.getElementById('operationsTimelineList'); if(!list) return; list.innerHTML='';\n" +
    "      const events=collectOperationsTimelineEvents().filter(function(event){ return (moduleFilter==='ALL'||event.module===moduleFilter)&&(statusFilter==='ALL'||event.status===statusFilter)&&(typeFilter==='ALL'||event.type===typeFilter); });\n" +
    "      if(!events.length){ list.innerHTML='<div class=\"empty\">No timeline events match the selected filters.</div>'; return; }\n" +
    "      events.forEach(function(event){ const card=document.createElement('article'); card.className='card'; card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div><button class=\"btn-primary\">Open</button>'; const notes=card.querySelectorAll('.card-note'); card.querySelector('.card-label').textContent=event.module+' — '+event.status; notes[0].textContent=new Date(event.timestamp).toLocaleString()+' • '+event.type; notes[1].textContent=event.description; card.querySelector('button').onclick=function(){ openOperationsTimelineEvent(event); }; list.appendChild(card); });\n" +
    "    }\n\n" +
    "    function toggleOperationsTimeline() {\n" +
    "      const panel=document.getElementById('operationsTimeline'); restoreOperationsTimelineFilters(); refreshOperationsTimeline(); panel.style.display=panel.style.display==='none'?'block':'none'; if(panel.style.display==='block') panel.scrollIntoView({behavior:'smooth',block:'start'});\n" +
    "    }\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Operations timeline script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
