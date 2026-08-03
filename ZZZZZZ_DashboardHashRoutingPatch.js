/** Release 2 safe URL-hash restoration and browser navigation support. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function'
    ? applyDashboardReviewRoutingPatch_(source) : source;
  const notified = typeof applyDashboardNotificationsPatch_ === 'function'
    ? applyDashboardNotificationsPatch_(routed) : routed;
  const health = typeof applyDashboardHealthDrilldownPatch_ === 'function'
    ? applyDashboardHealthDrilldownPatch_(notified) : notified;
  const kpis = typeof applyDashboardKpiNavigationPatch_ === 'function'
    ? applyDashboardKpiNavigationPatch_(health) : health;
  return HtmlService.createHtmlOutput(applyDashboardHashRoutingPatch_(kpis))
    .setTitle('Moore Holdings Credit Agent');
}

function applyDashboardHashRoutingPatch_(source) {
  const anchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function restoreCommandCenterModuleFromHash() {\n" +
    "      const moduleId = String(window.location.hash || '').replace(/^#/, '');\n" +
    "      if (!moduleId || !Object.prototype.hasOwnProperty.call(COMMAND_CENTER_MODULES, moduleId)) return false;\n" +
    "      activateCommandCenterModule(moduleId, false);\n" +
    "      return true;\n" +
    "    }\n\n" +
    "    window.addEventListener('load', function() {\n" +
    "      restoreCommandCenterModuleFromHash();\n" +
    "    });\n\n" +
    "    window.addEventListener('hashchange', function() {\n" +
    "      restoreCommandCenterModuleFromHash();\n" +
    "    });\n\n" + anchor;
  const patched = String(source || '');
  if (patched.indexOf(anchor) === -1) throw new Error('Dashboard hash routing anchor missing.');
  return patched.replace(anchor, script);
}
