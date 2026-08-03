/**
 * Release 2 routing correction for Personal Credit review-filter controls.
 *
 * This doGet override leaves the canonical dashboard source intact while
 * applying the production-safe routing correction at render time. The file is
 * intentionally prefixed ZZ so the Apps Script project loads this final doGet
 * definition after the legacy Code.js definition.
 */
function doGet() {
  const source = HtmlService
    .createHtmlOutputFromFile('Phase9_ExecutiveDashboard')
    .getContent();

  const patched = applyDashboardReviewRoutingPatch_(source);

  return HtmlService
    .createHtmlOutput(patched)
    .setTitle('Moore Holdings Credit Agent');
}


function applyDashboardReviewRoutingPatch_(source) {
  const replacements = [
    {
      before:
        "function showPendingOnly() {\n" +
        "      document.getElementById(\n" +
        "        'decisionFilter'\n" +
        "      ).value = 'Pending';",
      after:
        "function showPendingOnly() {\n" +
        "      activateCommandCenterModule('personalCreditModule', false);\n\n" +
        "      document.getElementById(\n" +
        "        'decisionFilter'\n" +
        "      ).value = 'Pending';"
    },
    {
      before:
        "function showHighPriority() {\n" +
        "      document.getElementById(\n" +
        "        'priorityFilter'\n" +
        "      ).value = 'High';",
      after:
        "function showHighPriority() {\n" +
        "      activateCommandCenterModule('personalCreditModule', false);\n\n" +
        "      document.getElementById(\n" +
        "        'priorityFilter'\n" +
        "      ).value = 'High';"
    },
    {
      before:
        "function resetFilters() {\n" +
        "      document.getElementById(\n" +
        "        'priorityFilter'\n" +
        "      ).value = '';",
      after:
        "function resetFilters() {\n" +
        "      activateCommandCenterModule('personalCreditModule', false);\n\n" +
        "      document.getElementById(\n" +
        "        'priorityFilter'\n" +
        "      ).value = '';"
    }
  ];

  let patched = String(source || '');

  replacements.forEach(function(replacement) {
    if (patched.indexOf(replacement.before) === -1) {
      throw new Error(
        'Dashboard routing patch target was not found; deployment stopped.'
      );
    }

    patched = patched.replace(replacement.before, replacement.after);
  });

  return patched;
}
