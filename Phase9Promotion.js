/*
 * PHASE 9 — HELD-ACCOUNT PROMOTION REVIEW
 *
 * Rechecks scanner-supported held accounts.
 * Does not change Airtable or mail letters.
 */

function runPhase9HeldAccountPromotionReview() {
  console.log(
    'PHASE 9 HELD-ACCOUNT PROMOTION REVIEW STARTED'
  );

  const bridgeResult =
    runPhase9CorrectedEvidenceBridge() || {};

  const heldReview =
    Array.isArray(bridgeResult.heldReview)
      ? bridgeResult.heldReview
      : [];

  const promotionCandidates = [];
  const remainingOnHold = [];

  heldReview.forEach(function(item) {
    const evidence =
      item && item.evidence
        ? item.evidence
        : null;

    const recordId =
      String(
        firstValue_(
          item && item.recordId,
          item && item.airtableRecordId,
          item && item.id
        ) || ''
      ).trim();

    const accountName =
      String(
        firstValue_(
          item && item.accountName,
          item && item.account,
          item && item.creditorName
        ) || ''
      ).trim();

    const accountNumber =
      String(
        firstValue_(
          item && item.accountNumber,
          item && item.accountNumberMasked,
          item && item.partialAccountNumber,
          item && item.accountLastFour,
          evidence && evidence.accountNumber,
          evidence && evidence.partialAccountNumber
        ) || ''
      ).trim();

    const bureau =
      String(
        firstValue_(
          item && item.bureau,
          evidence && evidence.bureau
        ) || ''
      ).trim();

    const blockers =
      item && Array.isArray(item.blockers)
        ? item.blockers.slice()
        : [];

    if (!recordId) {
      blockers.push(
        'Airtable record ID is missing.'
      );
    }

    if (!accountName) {
      blockers.push(
        'Account name is missing.'
      );
    }

    if (!accountNumber) {
      blockers.push(
        'Verified partial account number is missing.'
      );
    }

    if (!evidence) {
      blockers.push(
        'No scanner-supported evidence was supplied.'
      );
    }

    if (!bureau) {
      blockers.push(
        'A specific bureau could not be identified.'
      );
    }

    if (
      evidence &&
      !String(evidence.explanation || '').trim()
    ) {
      blockers.push(
        'Evidence explanation is missing.'
      );
    }

    if (
      evidence &&
      !String(evidence.type || '').trim()
    ) {
      blockers.push(
        'Supported issue type is missing.'
      );
    }

    if (blockers.length === 0) {
      promotionCandidates.push({
        recordId: recordId,
        accountName: accountName,
        accountNumber: accountNumber,
        bureau: bureau,
        previousDecision: 'ON HOLD',
        phase9Decision: 'PROMOTION CANDIDATE',
        evidenceReady: true,
        draftReady: true,
        evidence: evidence,
        protectedAirtableRecordChanged: false,
        letterMailed: false
      });
    } else {
      remainingOnHold.push({
        recordId: recordId,
        accountName: accountName,
        accountNumber: accountNumber,
        bureau: bureau,
        previousDecision: 'ON HOLD',
        phase9Decision: 'KEEP ON HOLD',
        evidenceReady: false,
        draftReady: false,
        blockers:
          uniquePhase9Blockers_(blockers),
        protectedAirtableRecordChanged: false,
        letterMailed: false
      });
    }
  });

  promotionCandidates.forEach(function(item) {
    console.log(
      'PROMOTION CANDIDATE: ' +
      JSON.stringify(item)
    );
  });

  remainingOnHold.forEach(function(item) {
    console.log(
      'REMAINING ON HOLD: ' +
      JSON.stringify(item)
    );
  });

  const report = {
    completed: true,
    phase: 9,
    heldAccountsRechecked: heldReview.length,
    promotionCandidates:
      promotionCandidates.length,
    remainingOnHold:
      remainingOnHold.length,
    promotionCandidateRecords:
      promotionCandidates,
    heldRecords: remainingOnHold,
    protectedAirtableRecordsChanged: false,
    lettersGenerated: 0,
    lettersMailed: 0,
    nextStep:
      promotionCandidates.length
        ? 'Review promotion candidates and prepare supported drafts.'
        : 'Keep accounts on hold until complete bureau-specific evidence is available.'
  };

  console.log(
    'PHASE 9 PROMOTION SUMMARY: ' +
    JSON.stringify({
      heldAccountsRechecked:
        report.heldAccountsRechecked,
      promotionCandidates:
        report.promotionCandidates,
      remainingOnHold:
        report.remainingOnHold,
      protectedAirtableRecordsChanged: false,
      lettersGenerated: 0,
      lettersMailed: 0
    })
  );

  console.log(
    'PHASE 9 HELD-ACCOUNT PROMOTION REVIEW COMPLETED'
  );

  return report;
}


function uniquePhase9Blockers_(blockers) {
  const seen = {};

  return blockers.filter(function(blocker) {
    const key =
      String(blocker || '')
        .trim()
        .toLowerCase();

    if (!key || seen[key]) {
      return false;
    }

    seen[key] = true;
    return true;
  });
}
