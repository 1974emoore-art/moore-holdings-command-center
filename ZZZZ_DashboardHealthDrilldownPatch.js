/** Release 2 read-only System Health drill-down navigation. */
function doGet() {
  const source = HtmlService
    .createHtmlOutputFromFile('Phase9_ExecutiveDashboard')
    .getContent();
  const routed = typeof applyDashboardReviewRoutingPatch_ === 'function'
    ? applyDashboardReviewRoutingPatch_(source)
    : source;
  const notified = typeof applyDashboardNotificationsPatch_ === 'function'
    ? applyDashboardNotificationsPatch_(routed)
    : routed;
  return HtmlService
    .createHtmlOutput(applyDashboardHealthDrilldownPatch_(notified))
    .setTitle('Moore Holdings Credit Agent');
}

function applyDashboardHealthDrilldownPatch_(source) {
  let patched = String(source || '');
  const anchor =
    '      <div id="healthSummary" class="footer-note" style="padding:0 18px 8px;">';
  const markup =
    '      <div id="healthModuleDrilldown" class="cards" style="padding:0 18px 8px;">\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'personalCreditModule\', true)">Personal Credit</button>\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'businessCreditModule\', true)">Business Credit</button>\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'financeModule\', true)">Finance</button>\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'turoModule\', true)">Turo</button>\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'realEstateModule\', true)">Real Estate</button>\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'tradingModule\', true)">Trading</button>\n' +
    '        <button class="btn-primary" onclick="activateCommandCenterModule(\'growthModule\', true)">Business Growth</button>\n' +
    '      </div>\n' + anchor;

  if (patched.indexOf(anchor) === -1) {
    throw new Error('System Health drill-down anchor missing.');
  }
  return patched.replace(anchor, markup);
}
