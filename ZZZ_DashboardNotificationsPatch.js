/** Release 2 read-only Executive Dashboard notifications. */
function doGet() {
  const source = HtmlService
    .createHtmlOutputFromFile('Phase9_ExecutiveDashboard')
    .getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function'
    ? applyDashboardReviewRoutingPatch_(source)
    : source;
  return HtmlService
    .createHtmlOutput(applyDashboardNotificationsPatch_(routed))
    .setTitle('Moore Holdings Credit Agent');
}

function applyDashboardNotificationsPatch_(source) {
  let patched = String(source || '');
  const buttonAnchor = '      <button\n        id="healthButton"';
  const buttonMarkup =
    '      <button\n' +
    '        id="notificationButton"\n' +
    '        class="btn-neutral"\n' +
    '        onclick="toggleNotificationCenter()">\n' +
    '        Notifications (<span id="notificationCount">0</span>)\n' +
    '      </button>\n\n' + buttonAnchor;
  if (patched.indexOf(buttonAnchor) === -1) throw new Error('Notification button anchor missing.');
  patched = patched.replace(buttonAnchor, buttonMarkup);

  const panelAnchor = '    <section id="governedActionPanel"';
  const panelMarkup =
    '    <section id="notificationCenter" class="panel" style="margin-bottom:20px;display:none;">\n' +
    '      <div class="panel-header"><div><h2>Executive Notifications</h2><div class="card-note">Approval and review items requiring attention</div></div><button class="btn-neutral" onclick="toggleNotificationCenter()">Close</button></div>\n' +
    '      <div id="notificationList" class="cards" style="padding:18px;margin-bottom:0;"><div class="empty">No notifications.</div></div>\n' +
    '    </section>\n\n' + panelAnchor;
  if (patched.indexOf(panelAnchor) === -1) throw new Error('Notification panel anchor missing.');
  patched = patched.replace(panelAnchor, panelMarkup);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function getDashboardNotificationItems() {\n" +
    "      const items = [];\n" +
    "      const governed = document.querySelectorAll('#governedActionList .card').length;\n" +
    "      const pending = Number((document.getElementById('pendingReviews') || {}).textContent) || 0;\n" +
    "      const phase10 = document.getElementById('phase10Summary');\n" +
    "      const match = phase10 ? phase10.textContent.match(/Awaiting Approval:\\s*(\\d+)/) : null;\n" +
    "      const drafts = match ? Number(match[1]) : 0;\n" +
    "      if (governed) items.push({title: governed + ' governed action' + (governed === 1 ? '' : 's') + ' awaiting review', target: 'governedActionPanel'});\n" +
    "      if (pending) items.push({title: pending + ' Personal Credit review' + (pending === 1 ? '' : 's') + ' pending', target: 'personalReviewQueue', module: 'personalCreditModule'});\n" +
    "      if (drafts) items.push({title: drafts + ' Phase 10 draft' + (drafts === 1 ? '' : 's') + ' awaiting approval', target: 'phase10ReviewPanel', module: 'personalCreditModule'});\n" +
    "      return items;\n" +
    "    }\n\n" +
    "    function refreshNotificationCenter() {\n" +
    "      const items = getDashboardNotificationItems();\n" +
    "      setText('notificationCount', items.length);\n" +
    "      const list = document.getElementById('notificationList');\n" +
    "      if (!list) return;\n" +
    "      list.innerHTML = '';\n" +
    "      if (!items.length) { list.innerHTML = '<div class=\"empty\">No notifications require attention.</div>'; return; }\n" +
    "      items.forEach(function(item) {\n" +
    "        const card = document.createElement('article'); card.className = 'card';\n" +
    "        const title = document.createElement('h3'); title.textContent = item.title; title.style.color = 'var(--navy)';\n" +
    "        const open = document.createElement('button'); open.className = 'btn-primary'; open.textContent = 'Open';\n" +
    "        open.onclick = function() {\n" +
    "          if (item.module) activateCommandCenterModule(item.module, false);\n" +
    "          const target = document.getElementById(item.target);\n" +
    "          if (target) target.scrollIntoView({behavior:'smooth', block:'start'});\n" +
    "        };\n" +
    "        card.appendChild(title); card.appendChild(open); list.appendChild(card);\n" +
    "      });\n" +
    "    }\n\n" +
    "    function toggleNotificationCenter() {\n" +
    "      const panel = document.getElementById('notificationCenter');\n" +
    "      refreshNotificationCenter();\n" +
    "      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';\n" +
    "      if (panel.style.display === 'block') panel.scrollIntoView({behavior:'smooth', block:'start'});\n" +
    "    }\n\n" +
    "    window.addEventListener('load', function() {\n" +
    "      refreshNotificationCenter();\n" +
    "      const observer = new MutationObserver(refreshNotificationCenter);\n" +
    "      ['governedActionList','pendingReviews','phase10Summary'].forEach(function(id) { const node = document.getElementById(id); if (node) observer.observe(node, {childList:true, subtree:true, characterData:true}); });\n" +
    "    });\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Notification script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
