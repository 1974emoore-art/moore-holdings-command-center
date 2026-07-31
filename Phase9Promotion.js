/*
 * PHASE 9 — HELD-ACCOUNT PROMOTION REVIEW
 *
 * Rechecks scanner-supported held accounts against the independent source
 * report parser. Does not change Airtable or mail letters.
 */

function runPhase9HeldAccountPromotionReview() {
  console.log('PHASE 9 HELD-ACCOUNT PROMOTION REVIEW STARTED');

  const bridgeResult = runPhase9CorrectedEvidenceBridge() || {};
  const heldReview = Array.isArray(bridgeResult.heldReview)
    ? bridgeResult.heldReview
    : [];
  const reportEvidence = buildPhase9ReportEvidenceIndex_();
  const promotionCandidates = [];
  const remainingOnHold = [];

  heldReview.forEach(function(item) {
    const evidence = item && item.evidence ? item.evidence : null;
    const recordId = String(firstValue_(
      item && item.recordId,
      item && item.airtableRecordId,
      item && item.id
    ) || '').trim();
    const accountName = String(firstValue_(
      item && item.accountName,
      item && item.account,
      item && item.creditorName
    ) || '').trim();
    const accountNumber = String(firstValue_(
      item && item.accountNumber,
      item && item.accountNumberMasked,
      item && item.partialAccountNumber,
      item && item.accountLastFour,
      evidence && evidence.accountNumber,
      evidence && evidence.partialAccountNumber
    ) || '').trim();
    const reportingBureaus = Array.isArray(item && item.reportingBureaus)
      ? item.reportingBureaus.slice()
      : (Array.isArray(evidence && evidence.reportingBureaus)
        ? evidence.reportingBureaus.slice()
        : []);
    const bureau = String(firstValue_(
      item && item.bureau,
      evidence && evidence.bureau
    ) || '').trim();
    const blockers = item && Array.isArray(item.blockers)
      ? item.blockers.slice()
      : [];

    if (!recordId) blockers.push('Airtable record ID is missing.');
    if (!accountName) blockers.push('Account name is missing.');
    if (!accountNumber) blockers.push('Verified partial account number is missing.');
    if (!evidence) blockers.push('No scanner-supported evidence was supplied.');
    if (!bureau) blockers.push('A specific bureau could not be identified.');
    if (evidence && !String(evidence.explanation || '').trim()) {
      blockers.push('Evidence explanation is missing.');
    }
    if (evidence && !String(evidence.type || '').trim()) {
      blockers.push('Supported issue type is missing.');
    }

    const sourceEntries = findPhase9ReportSourceEntries_(
      reportEvidence.entries,
      accountName,
      accountNumber
    );
    const evidenceAssessment = assessPacketEvidence({
      bureau: bureau,
      accountReference: accountNumber,
      sourceEntries: sourceEntries
    });

    reportEvidence.blockers.forEach(function(blocker) {
      blockers.push(blocker);
    });
    evidenceAssessment.blockers.forEach(function(blocker) {
      blockers.push(blocker);
    });

    if (blockers.length === 0) {
      promotionCandidates.push({
        recordId: recordId,
        accountName: accountName,
        accountNumber: accountNumber,
        reportingBureaus: reportingBureaus.slice(),
        bureau: bureau,
        previousDecision: 'ON HOLD',
        phase9Decision: 'PROMOTION CANDIDATE',
        evidenceReady: true,
        draftReady: true,
        evidence: evidence,
        sourceEntries: sourceEntries,
        evidenceAssessment: evidenceAssessment,
        protectedAirtableRecordChanged: false,
        letterMailed: false
      });
    } else {
      remainingOnHold.push({
        recordId: recordId,
        accountName: accountName,
        accountNumber: accountNumber,
        reportingBureaus: reportingBureaus.slice(),
        bureau: bureau,
        previousDecision: 'ON HOLD',
        phase9Decision: 'KEEP ON HOLD',
        evidenceReady: false,
        draftReady: false,
        sourceEntries: sourceEntries,
        evidenceAssessment: evidenceAssessment,
        blockers: uniquePhase9Blockers_(blockers),
        protectedAirtableRecordChanged: false,
        letterMailed: false
      });
    }
  });

  promotionCandidates.forEach(function(item) {
    console.log('PROMOTION CANDIDATE: ' + JSON.stringify(item));
  });
  remainingOnHold.forEach(function(item) {
    console.log('REMAINING ON HOLD: ' + JSON.stringify(item));
  });

  const report = {
    completed: true,
    phase: 9,
    heldAccountsRechecked: heldReview.length,
    reportAccountsParsed: reportEvidence.accountCount,
    sourceEntriesBuilt: reportEvidence.entries.length,
    promotionCandidates: promotionCandidates.length,
    remainingOnHold: remainingOnHold.length,
    promotionCandidateRecords: promotionCandidates,
    heldRecords: remainingOnHold,
    protectedAirtableRecordsChanged: false,
    lettersGenerated: 0,
    lettersMailed: 0,
    nextStep: promotionCandidates.length
      ? 'Review promotion candidates and prepare supported drafts.'
      : 'Keep accounts on hold until complete bureau-specific source-report evidence is available.'
  };

  console.log('PHASE 9 PROMOTION SUMMARY: ' + JSON.stringify({
    heldAccountsRechecked: report.heldAccountsRechecked,
    reportAccountsParsed: report.reportAccountsParsed,
    sourceEntriesBuilt: report.sourceEntriesBuilt,
    promotionCandidates: report.promotionCandidates,
    remainingOnHold: report.remainingOnHold,
    protectedAirtableRecordsChanged: false,
    lettersGenerated: 0,
    lettersMailed: 0
  }));
  console.log('PHASE 9 HELD-ACCOUNT PROMOTION REVIEW COMPLETED');
  return report;
}

function buildPhase9ReportEvidenceIndex_() {
  try {
    const reportText = extractLiveCreditReportText_();
    const accountIndex = buildCreditReportAccountIndex_(reportText);
    const accounts = buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex && Array.isArray(accountIndex.accounts)
        ? accountIndex.accounts.length
        : 0
    );
    const entries = [];

    accounts.forEach(function(account) {
      const accountNumbers = account.accountNumbers || {};
      const bureauFlags = account.bureauFlags || {};
      [
        { bureau: 'Equifax', key: 'equifax' },
        { bureau: 'Experian', key: 'experian' },
        { bureau: 'TransUnion', key: 'transUnion' }
      ].forEach(function(definition) {
        const reference = String(accountNumbers[definition.key] || '').trim();
        if (!reference) return;
        entries.push({
          accountName: String(account.accountName || '').trim(),
          bureau: definition.bureau,
          accountReference: reference,
          reported: bureauFlags[definition.key] === true,
          sourcePage: account.indexedPageNumber || null,
          parserConfidence: account.confidence || 'LOW',
          sectionFound: account.sectionFound === true,
          source: 'LIVE_CREDIT_REPORT_PARSER'
        });
      });
    });

    return {
      accountCount: accounts.length,
      entries: entries,
      blockers: []
    };
  } catch (error) {
    return {
      accountCount: 0,
      entries: [],
      blockers: [
        'Source-report parser failed; promotion remains on hold: ' +
        String(error && error.message ? error.message : error)
      ]
    };
  }
}

function findPhase9ReportSourceEntries_(entries, accountName, accountNumber) {
  const normalizedName = normalizePhase9EvidenceName_(accountName);
  const reference = normalizePacketReference_(accountNumber);
  return (Array.isArray(entries) ? entries : []).filter(function(entry) {
    const sameName = normalizedName &&
      normalizePhase9EvidenceName_(entry.accountName) === normalizedName;
    const sameReference = reference && packetReferencesMatch_(
      reference,
      normalizePacketReference_(entry.accountReference)
    );
    return sameName || sameReference;
  });
}

function normalizePhase9EvidenceName_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function uniquePhase9Blockers_(blockers) {
  const seen = {};
  return blockers.filter(function(blocker) {
    const key = String(blocker || '').trim().toLowerCase();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
