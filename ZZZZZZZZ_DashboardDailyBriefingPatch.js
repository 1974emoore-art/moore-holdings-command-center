/** Release 2 read-only Daily Executive Briefing. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function' ? applyDashboardReviewRoutingPatch_(source) : source;
  const notified = typeof applyDashboardNotificationsPatch_ === 'function' ? applyDashboardNotificationsPatch_(routed) : routed;
  const health = typeof applyDashboardHealthDrilldownPatch_ === 'function' ? applyDashboardHealthDrilldownPatch_(notified) : notified;
  const kpis = typeof applyDashboardKpiNavigationPatch_ === 'function' ? applyDashboardKpiNavigationPatch_(health) : health;
  const hashed = typeof applyDashboardHashRoutingPatch_ === 'function' ? applyDashboardHashRoutingPatch_(kpis) : kpis;
  const mobile = typeof applyDashboardMobileNavigationPatch_ === 'function' ? applyDashboardMobileNavigationPatch_(hashed) : hashed;
  return HtmlService.createHtmlOutput(applyDashboardDailyBriefingPatch_(mobile)).setTitle('Moore Holdings Credit Agent');
}

function applyDashboardDailyBriefingPatch_(source) {
  let patched = String(source || '');
  const buttonAnchor = '      <button\n        id="notificationButton"';
  const button = '      <button id="dailyBriefingButton" class="btn-gold" onclick="toggleDailyExecutiveBriefing()">Daily Briefing</button>\n\n' + buttonAnchor;
  if (patched.indexOf(buttonAnchor) === -1) throw new Error('Daily briefing button anchor missing.');
  patched = patched.replace(buttonAnchor, button);

  const panelAnchor = '    <section id="notificationCenter"';
  const panel = '    <section id="dailyExecutiveBriefing" class="panel" style="margin-bottom:20px;display:none;">\n' +
    '      <div class="panel-header"><div><h2>Daily Executive Briefing</h2><div class="card-note">Current priorities, approvals, deadlines, completion, activity, and recovery</div></div><button class="btn-neutral" onclick="toggleDailyExecutiveBriefing()">Close</button></div>\n' +
    '      <div id="dailyBriefingSummary" class="cards" style="padding:18px;margin-bottom:0;"></div>\n' +
    '    </section>\n\n' + panelAnchor;
  if (patched.indexOf(panelAnchor) === -1) throw new Error('Daily briefing panel anchor missing.');
  patched = patched.replace(panelAnchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function buildDailyExecutiveBriefing() {\n" +
    "      const number = function(id) { return Number(((document.getElementById(id) || {}).textContent || '').replace(/[^0-9.-]/g, '')) || 0; };\n" +
    "      const approvals = document.querySelectorAll('#governedActionList .card').length;\n" +
    "      const pending = number('pendingReviews');\n" +
    "      const high = number('highPriority');\n" +
    "      const health = ((document.getElementById('healthOverall') || {}).textContent || 'Unknown').trim();\n" +
    "      const completionValues = ['businessCreditRecords','financeTracked','turoTracked','realEstateTracked','tradingTracked','growthTracked'].map(number);\n" +
    "      const activeModules = completionValues.filter(function(value) { return value > 0; }).length;\n" +
    "      return [\n" +
    "        {label:'Top Priority', value: high ? high + ' high-priority reviews' : (pending ? pending + ' pending reviews' : 'No urgent review queue')},\n" +
    "        {label:'Approval Inbox', value: approvals + ' governed actions'},\n" +
    "        {label:'Pending Work', value: pending + ' Personal Credit reviews'},\n" +
    "        {label:'Module Completion', value: activeModules + ' of 6 operating modules tracking records'},\n" +
    "        {label:'System Health', value: health},\n" +
    "        {label:'Recovery Status', value: document.querySelectorAll('[data-recovery-required=\"true\"]').length ? 'Recovery required' : 'No recovery flag detected'}\n" +
    "      ];\n" +
    "    }\n\n" +
    "    function refreshDailyExecutiveBriefing() {\n" +
    "      const target = document.getElementById('dailyBriefingSummary'); if (!target) return; target.innerHTML = '';\n" +
    "      buildDailyExecutiveBriefing().forEach(function(item) { const card=document.createElement('article'); card.className='card'; card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div>'; card.querySelector('.card-label').textContent=item.label; card.querySelector('.card-note').textContent=item.value; target.appendChild(card); });\n" +
    "    }\n\n" +
    "    function toggleDailyExecutiveBriefing() {\n" +
    "      const panel=document.getElementById('dailyExecutiveBriefing'); refreshDailyExecutiveBriefing(); panel.style.display=panel.style.display==='none'?'block':'none'; if(panel.style.display==='block') panel.scrollIntoView({behavior:'smooth',block:'start'});\n" +
    "    }\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Daily briefing script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
