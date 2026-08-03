/** Release 2 read-only governed activity and recovery center. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function' ? applyDashboardReviewRoutingPatch_(source) : source;
  const notified = typeof applyDashboardNotificationsPatch_ === 'function' ? applyDashboardNotificationsPatch_(routed) : routed;
  const health = typeof applyDashboardHealthDrilldownPatch_ === 'function' ? applyDashboardHealthDrilldownPatch_(notified) : notified;
  const kpis = typeof applyDashboardKpiNavigationPatch_ === 'function' ? applyDashboardKpiNavigationPatch_(health) : health;
  const hashed = typeof applyDashboardHashRoutingPatch_ === 'function' ? applyDashboardHashRoutingPatch_(kpis) : kpis;
  const mobile = typeof applyDashboardMobileNavigationPatch_ === 'function' ? applyDashboardMobileNavigationPatch_(hashed) : hashed;
  const briefing = typeof applyDashboardDailyBriefingPatch_ === 'function' ? applyDashboardDailyBriefingPatch_(mobile) : mobile;
  return HtmlService.createHtmlOutput(applyDashboardActivityRecoveryPatch_(briefing)).setTitle('Moore Holdings Credit Agent');
}

function applyDashboardActivityRecoveryPatch_(source) {
  let patched = String(source || '');
  const buttonAnchor = '      <button id="dailyBriefingButton"';
  const button = '      <button id="activityRecoveryButton" class="btn-neutral" onclick="toggleActivityRecoveryCenter()">Activity & Recovery</button>\n\n' + buttonAnchor;
  if (patched.indexOf(buttonAnchor) === -1) throw new Error('Activity and recovery button anchor missing.');
  patched = patched.replace(buttonAnchor, button);

  const panelAnchor = '    <section id="dailyExecutiveBriefing"';
  const panel = '    <section id="activityRecoveryCenter" class="panel" style="margin-bottom:20px;display:none;">\n' +
    '      <div class="panel-header"><div><h2>Activity & Recovery Center</h2><div class="card-note">Governed action status, failure visibility, expiration, verification, and recovery flags</div></div><button class="btn-neutral" onclick="toggleActivityRecoveryCenter()">Close</button></div>\n' +
    '      <div id="activityRecoverySummary" class="cards" style="padding:18px 18px 0;margin-bottom:0;"></div>\n' +
    '      <div id="activityRecoveryList" class="cards" style="padding:18px;margin-bottom:0;"><div class="empty">No governed activity loaded.</div></div>\n' +
    '    </section>\n\n' + panelAnchor;
  if (patched.indexOf(panelAnchor) === -1) throw new Error('Activity and recovery panel anchor missing.');
  patched = patched.replace(panelAnchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function collectGovernedActivitySnapshot() {\n" +
    "      return Array.prototype.slice.call(document.querySelectorAll('#governedActionList .card')).map(function(card, index) {\n" +
    "        const text = (card.textContent || '').replace(/\\s+/g, ' ').trim();\n" +
    "        const statusMatch = text.match(/\\b(QUEUED|APPROVED|EXECUTING|VERIFIED|FAILED|EXPIRED|REJECTED|RECOVERY_QUEUED)\\b/i);\n" +
    "        const status = statusMatch ? statusMatch[1].toUpperCase() : 'AWAITING REVIEW';\n" +
    "        return { id: card.getAttribute('data-action-id') || ('Action ' + (index + 1)), status: status, recoveryRequired: card.getAttribute('data-recovery-required') === 'true' || /recovery required/i.test(text), summary: text.slice(0, 240) };\n" +
    "      });\n" +
    "    }\n\n" +
    "    function refreshActivityRecoveryCenter() {\n" +
    "      const items = collectGovernedActivitySnapshot();\n" +
    "      const summary = document.getElementById('activityRecoverySummary'); const list = document.getElementById('activityRecoveryList'); if (!summary || !list) return;\n" +
    "      const counts = {VERIFIED:0,FAILED:0,EXPIRED:0,RECOVERY:0,OPEN:0};\n" +
    "      items.forEach(function(item) { if (item.status === 'VERIFIED') counts.VERIFIED++; else if (item.status === 'FAILED') counts.FAILED++; else if (item.status === 'EXPIRED') counts.EXPIRED++; else counts.OPEN++; if (item.recoveryRequired) counts.RECOVERY++; });\n" +
    "      summary.innerHTML = '';\n" +
    "      [['Verified',counts.VERIFIED],['Open',counts.OPEN],['Failed',counts.FAILED],['Expired',counts.EXPIRED],['Recovery Required',counts.RECOVERY]].forEach(function(entry) { const card=document.createElement('article'); card.className='card'; card.innerHTML='<div class=\"card-label\"></div><div class=\"card-value\"></div>'; card.querySelector('.card-label').textContent=entry[0]; card.querySelector('.card-value').textContent=entry[1]; summary.appendChild(card); });\n" +
    "      list.innerHTML = ''; if (!items.length) { list.innerHTML='<div class=\"empty\">No governed activity is currently loaded.</div>'; return; }\n" +
    "      items.forEach(function(item) { const card=document.createElement('article'); card.className='card'; card.setAttribute('data-recovery-required', item.recoveryRequired ? 'true' : 'false'); card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div>'; const notes=card.querySelectorAll('.card-note'); card.querySelector('.card-label').textContent=item.id + ' — ' + item.status; notes[0].textContent=item.summary; notes[1].textContent=item.recoveryRequired ? 'Recovery required — create a fresh governed recovery action.' : 'No recovery flag.'; list.appendChild(card); });\n" +
    "    }\n\n" +
    "    function toggleActivityRecoveryCenter() {\n" +
    "      const panel=document.getElementById('activityRecoveryCenter'); refreshActivityRecoveryCenter(); panel.style.display=panel.style.display==='none'?'block':'none'; if(panel.style.display==='block') panel.scrollIntoView({behavior:'smooth',block:'start'});\n" +
    "    }\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Activity and recovery script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
