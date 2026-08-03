/** Release 2 accessible KPI-card navigation. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function'
    ? applyDashboardReviewRoutingPatch_(source) : source;
  const notified = typeof applyDashboardNotificationsPatch_ === 'function'
    ? applyDashboardNotificationsPatch_(routed) : routed;
  const health = typeof applyDashboardHealthDrilldownPatch_ === 'function'
    ? applyDashboardHealthDrilldownPatch_(notified) : notified;
  return HtmlService.createHtmlOutput(applyDashboardKpiNavigationPatch_(health))
    .setTitle('Moore Holdings Credit Agent');
}

function applyDashboardKpiNavigationPatch_(source) {
  const anchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function initializeActionableKpiCards() {\n" +
    "      const mappings = {\n" +
    "        totalReviews: function() { activateCommandCenterModule('personalCreditModule', false); document.getElementById('personalReviewQueue').scrollIntoView({behavior:'smooth'}); },\n" +
    "        highPriority: showHighPriority,\n" +
    "        pendingReviews: showPendingOnly,\n" +
    "        businessCreditRecords: function() { activateCommandCenterModule('businessCreditModule', true); },\n" +
    "        financeTracked: function() { activateCommandCenterModule('financeModule', true); },\n" +
    "        turoTracked: function() { activateCommandCenterModule('turoModule', true); },\n" +
    "        realEstateTracked: function() { activateCommandCenterModule('realEstateModule', true); },\n" +
    "        tradingTracked: function() { activateCommandCenterModule('tradingModule', true); },\n" +
    "        growthTracked: function() { activateCommandCenterModule('growthModule', true); },\n" +
    "        healthOverall: function() { activateCommandCenterModule('healthModule', true); }\n" +
    "      };\n" +
    "      Object.keys(mappings).forEach(function(id) {\n" +
    "        const value = document.getElementById(id);\n" +
    "        const card = value && value.closest('.card');\n" +
    "        if (!card) return;\n" +
    "        card.setAttribute('role', 'button');\n" +
    "        card.setAttribute('tabindex', '0');\n" +
    "        card.setAttribute('aria-label', 'Open ' + (card.querySelector('.card-label') || {}).textContent);\n" +
    "        card.style.cursor = 'pointer';\n" +
    "        card.addEventListener('click', mappings[id]);\n" +
    "        card.addEventListener('keydown', function(event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); mappings[id](); } });\n" +
    "      });\n" +
    "    }\n\n" +
    "    window.addEventListener('load', initializeActionableKpiCards);\n\n" + anchor;
  const patched = String(source || '');
  if (patched.indexOf(anchor) === -1) throw new Error('KPI navigation anchor missing.');
  return patched.replace(anchor, script);
}
