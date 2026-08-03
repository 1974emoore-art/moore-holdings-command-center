/* Moore Holdings Command Center — governed Trading lifecycle.
 * Research and paper-trading only. Live orders, transfers, deposits, withdrawals,
 * broker messages, and trade execution remain disabled until explicit CEO approval
 * and governed execution are implemented and verified.
 */

function buildTradingLifecycle(input) {
  var data = input || {};
  var research = data.research || [];
  var watchlist = data.watchlist || [];
  var theses = data.theses || [];
  var evidence = data.marketEvidence || [];
  var risks = data.risks || [];
  var alerts = data.alerts || [];
  var paperTrades = data.paperTrades || [];
  var approvals = data.approvals || [];
  var auditHistory = data.auditHistory || [];
  var lessons = data.lessonsLearned || [];

  var openResearch = research.filter(function (item) {
    return String(item.status || '').toUpperCase() !== 'COMPLETE';
  }).length;
  var activeWatchlist = watchlist.filter(function (item) {
    return String(item.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
  }).length;
  var unsupportedTheses = theses.filter(function (item) {
    return !item.summary || !item.timeHorizon || !item.invalidationCondition;
  }).length;
  var unverifiedEvidence = evidence.filter(function (item) {
    return String(item.verificationStatus || '').toUpperCase() !== 'VERIFIED';
  }).length;
  var unresolvedRisks = risks.filter(function (item) {
    return String(item.status || 'OPEN').toUpperCase() !== 'RESOLVED';
  }).length;
  var triggeredAlerts = alerts.filter(function (item) {
    return String(item.status || '').toUpperCase() === 'TRIGGERED';
  }).length;
  var openPaperTrades = paperTrades.filter(function (item) {
    return String(item.status || '').toUpperCase() === 'OPEN';
  }).length;
  var closedPaperTrades = paperTrades.filter(function (item) {
    return String(item.status || '').toUpperCase() === 'CLOSED';
  });
  var realizedPaperPnl = closedPaperTrades.reduce(function (sum, item) {
    return sum + Number(item.realizedPnl || 0);
  }, 0);
  var pendingApprovals = approvals.filter(function (item) {
    return String(item.status || '').toUpperCase() === 'PENDING';
  }).length;

  var blockers = [];
  if (unsupportedTheses) blockers.push(unsupportedTheses + ' thesis record(s) missing required controls');
  if (unverifiedEvidence) blockers.push(unverifiedEvidence + ' market-evidence item(s) unverified');
  if (unresolvedRisks) blockers.push(unresolvedRisks + ' unresolved risk item(s)');
  if (pendingApprovals) blockers.push(pendingApprovals + ' pending executive approval(s)');

  var nextRecommendedWork = 'Continue monitored research and preserve evidence.';
  if (unsupportedTheses) nextRecommendedWork = 'Complete thesis, horizon, and invalidation controls.';
  else if (unverifiedEvidence) nextRecommendedWork = 'Verify market evidence before changing a thesis.';
  else if (unresolvedRisks) nextRecommendedWork = 'Resolve or explicitly accept open risks.';
  else if (pendingApprovals) nextRecommendedWork = 'Review pending paper-trade approvals.';
  else if (triggeredAlerts) nextRecommendedWork = 'Review triggered alerts against the approved thesis.';

  return {
    lifecycleStage: data.lifecycleStage || 'RESEARCH',
    researchCount: research.length,
    openResearchCount: openResearch,
    activeWatchlistCount: activeWatchlist,
    thesisCount: theses.length,
    unsupportedThesisCount: unsupportedTheses,
    evidenceCount: evidence.length,
    unverifiedEvidenceCount: unverifiedEvidence,
    riskCount: risks.length,
    unresolvedRiskCount: unresolvedRisks,
    alertCount: alerts.length,
    triggeredAlertCount: triggeredAlerts,
    paperTradeCount: paperTrades.length,
    openPaperTradeCount: openPaperTrades,
    closedPaperTradeCount: closedPaperTrades.length,
    realizedPaperPnl: realizedPaperPnl,
    pendingApprovalCount: pendingApprovals,
    auditEventCount: auditHistory.length,
    retainedLessonCount: lessons.length,
    blockers: blockers,
    nextRecommendedWork: nextRecommendedWork,
    liveTradingEnabled: false,
    brokerOrderSubmissionEnabled: false,
    moneyMovementEnabled: false,
    externalBrokerMessagingEnabled: false,
    executiveReviewRequired: true,
    governedExecutionRequired: true,
    strictNoHypeNoGuarantee: true,
    disclaimer: 'Research and paper-trading intelligence only. No performance guarantee or live-trade authority.'
  };
}

function previewTradingAction(action) {
  return {
    status: 'PREVIEW_ONLY',
    action: action || {},
    requiresExecutiveApproval: true,
    liveExecutionEnabled: false,
    verificationRequired: true,
    auditRequired: true
  };
}
