/*
 * COMMAND CENTER — READ-ONLY EXECUTIVE PREVIEW BRIDGE
 *
 * Runs the deployed Phase 9 review and protected Phase 10 draft preview.
 * Returns aggregate counts only so account data never enters GitHub logs.
 * This function does not arm writes, approve drafts, create files, or mail.
 */
function runCommandCenterReadOnlyPreview() {
  console.log('COMMAND CENTER READ-ONLY PREVIEW STARTED');

  const phase9 = runPhase9HeldAccountPromotionReview() || {};
  const phase10 = runPhase10FinalSystemCompletion() || {};

  const phase9Candidates = Array.isArray(phase9.promotionCandidateRecords)
    ? phase9.promotionCandidateRecords
    : [];
  const phase9Held = Array.isArray(phase9.heldRecords)
    ? phase9.heldRecords
    : [];
  const phase10Drafts = Array.isArray(phase10.draftLetters)
    ? phase10.draftLetters
    : [];
  const phase10Blocked = Array.isArray(phase10.blockedDraftRecords)
    ? phase10.blockedDraftRecords
    : [];

  const report = {
    completed: phase9.completed === true && phase10.completed === true,
    productionVersionExpected: 59,
    phase9: {
      heldAccountsRechecked: Number(phase9.heldAccountsRechecked || 0),
      reportAccountsParsed: Number(phase9.reportAccountsParsed || 0),
      sourceEntriesBuilt: Number(phase9.sourceEntriesBuilt || 0),
      promotionCandidates: phase9Candidates.length,
      remainingOnHold: phase9Held.length
    },
    phase10: {
      evidenceSupportedDrafts: phase10Drafts.length,
      blockedDrafts: phase10Blocked.length
    },
    safety: {
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      phase8DecisionsChanged: 0,
      filesCreated: 0,
      pdfsCreated: 0,
      lettersMailed: 0,
      messagesSent: 0,
      paymentsAuthorized: 0
    },
    nextStep: phase10Blocked.length > 0
      ? 'Keep blocked packets on hold and review source-evidence gaps.'
      : (phase10Drafts.length > 0
        ? 'Review supported packet counts before any separate PDF authorization.'
        : 'Keep all packets on hold until supported evidence exists.')
  };

  console.log('COMMAND CENTER READ-ONLY PREVIEW SUMMARY: ' + JSON.stringify(report));
  console.log('COMMAND CENTER READ-ONLY PREVIEW COMPLETED');
  return report;
}
