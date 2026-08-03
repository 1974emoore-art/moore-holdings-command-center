/** Release 2 mobile-safe module navigation and active-tab visibility. */
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
  const hashed = typeof applyDashboardHashRoutingPatch_ === 'function'
    ? applyDashboardHashRoutingPatch_(kpis) : kpis;
  return HtmlService.createHtmlOutput(applyDashboardMobileNavigationPatch_(hashed))
    .setTitle('Moore Holdings Credit Agent');
}

function applyDashboardMobileNavigationPatch_(source) {
  let patched = String(source || '');
  const styleAnchor = '  </style>';
  const responsiveCss =
    '    @media (max-width: 760px) {\n' +
    '      main { padding: 14px; }\n' +
    '      .module-nav { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }\n' +
    '      .module-link { flex: 0 0 auto; min-height: 44px; display: inline-flex; align-items: center; scroll-snap-align: center; }\n' +
    '      .toolbar > button, .panel-header button { min-height: 44px; }\n' +
    '      .filters { width: 100%; }\n' +
    '      .filters select, .filters input { min-height: 44px; flex: 1 1 150px; }\n' +
    '    }\n\n' + styleAnchor;
  if (patched.indexOf(styleAnchor) === -1) throw new Error('Mobile navigation style anchor missing.');
  patched = patched.replace(styleAnchor, responsiveCss);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function keepActiveModuleTabVisible() {\n" +
    "      const active = document.querySelector('.module-link.active');\n" +
    "      if (active && typeof active.scrollIntoView === 'function') {\n" +
    "        active.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});\n" +
    "      }\n" +
    "    }\n\n" +
    "    window.addEventListener('load', keepActiveModuleTabVisible);\n" +
    "    window.addEventListener('hashchange', keepActiveModuleTabVisible);\n" +
    "    window.addEventListener('resize', keepActiveModuleTabVisible);\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Mobile navigation script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
