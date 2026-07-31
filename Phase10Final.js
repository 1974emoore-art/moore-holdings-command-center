/*
 * PHASE 10 — FINAL SYSTEM COMPLETION
 *
 * Builds evidence-supported letter drafts from Phase 9 candidates.
 * This first protected run does not update Airtable or create PDFs.
 */

function runPhase10FinalSystemCompletion() {
  console.log('PHASE 10 FINAL SYSTEM COMPLETION STARTED');

  const phase9Result =
    runPhase9HeldAccountPromotionReview() || {};

  const candidates =
    Array.isArray(phase9Result.promotionCandidateRecords)
      ? phase9Result.promotionCandidateRecords
      : [];

  const draftLetters = [];
  const blockedDrafts = [];

  const expandedCandidates = [];

candidates.forEach(function(candidate) {
  const bureauValue = String(
    candidate && candidate.bureau || ""
  ).trim();

  if (bureauValue.toLowerCase().indexOf("multiple") !== -1) {
    ["Experian", "TransUnion", "Equifax"].forEach(function(bureauName) {
      const splitCandidate = Object.assign({}, candidate);
      splitCandidate.bureau = bureauName;
      expandedCandidates.push(splitCandidate);
    });
  } else {
    expandedCandidates.push(candidate);
  }
});

expandedCandidates.forEach(function(candidate, index) {
    const evidence =
      candidate && candidate.evidence
        ? candidate.evidence
        : {};

    const recordId = String(
      firstValue_(
        candidate && candidate.recordId,
        candidate && candidate.airtableRecordId,
        candidate && candidate.id
      ) || ''
    ).trim();

    const accountName = String(
      firstValue_(
        candidate && candidate.accountName,
        candidate && candidate.account,
        candidate && candidate.creditorName
      ) || ''
    ).trim();

   const accountNumber = String(
  firstValue_(
    candidate && candidate.accountNumber,
    candidate && candidate.accountNumberMasked,
    candidate && candidate.partialAccountNumber,
    candidate && candidate.accountLastFour,
    evidence && evidence.accountNumber,
    evidence && evidence.partialAccountNumber
  ) || ''
    ).trim();
 
    
    const bureau = String(
      firstValue_(
        candidate && candidate.bureau,
        evidence && evidence.bureau
      ) || ''
    ).trim();

    const issueType = String(
      firstValue_(
        evidence && evidence.type,
        evidence && evidence.issueType,
        evidence && evidence.violationType
      ) || ''
    ).trim();

    const explanation = String(
      firstValue_(
        evidence && evidence.explanation,
        evidence && evidence.description,
        evidence && evidence.finding
      ) || ''
    ).trim();

    const blockers = [];

    if (!recordId) {
      blockers.push('Airtable record ID is missing.');
    }

    if (!accountName) {
      blockers.push('Account name is missing.');
    }

    if (!bureau) {
      blockers.push('Bureau is missing.');
    }

    if (!issueType) {
      blockers.push('Supported issue type is missing.');
    }

    if (!explanation) {
      blockers.push('Evidence explanation is missing.');
    }

    const draftId =
      'P10-' +
      String(index + 1).padStart(3, '0') +
      '-' +
      sanitizePhase10Id_(bureau || 'BUREAU') +
      '-' +
      sanitizePhase10Id_(accountName || 'ACCOUNT');

    if (blockers.length > 0) {
      blockedDrafts.push({
        draftId: draftId,
        recordId: recordId,
        accountName: accountName,
        bureau: bureau,
        status: 'BLOCKED',
        blockers: uniquePhase10Values_(blockers),
        airtableUpdated: false,
        pdfCreated: false
      });

      return;
    }

    const subject =
      'Request for Investigation of ' +
      accountName +
      ' Account';

    const letterBody =
  buildPhase10LetterBodyV2_({
    bureau: bureau,
    accountName: accountName,
    accountNumber: accountNumber,
    issueType: issueType,
    explanation: explanation
  });

    draftLetters.push({
      draftId: draftId,
      batchId: 'PHASE10-REVIEW',
      recordId: recordId,
      accountName: accountName,
      accountNumber: accountNumber,
      bureau: bureau,
      issueType: issueType,
      evidenceExplanation: explanation,
      subject: subject,
      letterBody: letterBody,
      status: 'AWAITING ERNIE APPROVAL',
      approvalDecision: '',
      readyToPrint: false,
      printed: false,
      physicallyMailedByErnie: false,
      trackingNumber: '',
      delivered: false,
      airtableUpdated: false,
      pdfCreated: false
    });
  });

  draftLetters.forEach(function(draft) {
    console.log(
      'PHASE 10 DRAFT READY FOR REVIEW: ' +
      JSON.stringify(draft)
    );
  });

  blockedDrafts.forEach(function(draft) {
    console.log(
      'PHASE 10 BLOCKED DRAFT: ' +
      JSON.stringify(draft)
    );
  });

  const report = {
    completed: true,
    phase: 10,
    phaseName: 'Final System Completion and Deployment',
    promotionCandidatesReceived: candidates.length,
    evidenceSupportedDrafts: draftLetters.length,
    blockedDrafts: blockedDrafts.length,
    draftLetters: draftLetters,
    blockedDraftRecords: blockedDrafts,
    airtableRecordsUpdated: 0,
    pdfsCreated: 0,
    readyToPrint: 0,
    physicallyMailedByErnie: 0,
    nextStep:
      draftLetters.length > 0
        ? 'Review each evidence-supported draft and record Ernie approval, rejection, or hold.'
        : 'Resolve the blocked evidence fields before creating drafts.'
  };

  console.log(
    'PHASE 10 FINAL SUMMARY: ' +
    JSON.stringify({
      promotionCandidatesReceived:
        report.promotionCandidatesReceived,
      evidenceSupportedDrafts:
        report.evidenceSupportedDrafts,
      blockedDrafts:
        report.blockedDrafts,
      airtableRecordsUpdated: 0,
      pdfsCreated: 0,
      readyToPrint: 0
    })
  );

  console.log('PHASE 10 FINAL SYSTEM COMPLETION COMPLETED');

  return report;
}


function buildPhase10LetterBodyV2_(draft) {
  const bureau =
    String(draft.bureau || '').trim();

  const accountName =
    String(draft.accountName || '').trim();

  const accountNumber =
    String(draft.accountNumber || '').trim();

  const issueType =
    formatPhase10IssueType_(
      draft.issueType
    );

  const explanation =
    String(draft.explanation || '').trim();

  const bureauAddress =
    getPhase10BureauAddress_(
      bureau
    );

  const accountReference =
    accountNumber
      ? accountName +
        ' — Account ending ' +
        getPhase10LastFour_(accountNumber)
      : accountName;

  return [
    'Date: ____________________',
    '',
    'Ernest Moore Jr.',
    '1116 Western Yarrow Ave',
    'Justin, Texas 76247',
    '',
    bureauAddress,
    '',
    'Re: Request for Investigation',
    'Account: ' + accountReference,
    '',
    'To Whom It May Concern:',
    '',
    'I am writing to dispute information associated with the account identified above on my ' +
      bureau +
      ' credit report.',
    '',
    'Disputed information: ' +
      issueType,
    '',
    'Reason for dispute:',
    explanation,
    '',
    'Please conduct a reasonable investigation of this disputed information. Please verify the account information against the furnisher’s underlying records and correct or delete any information that is inaccurate, incomplete, or cannot be verified.',
    '',
    'Please provide written results of the investigation and an updated copy of my credit report.',
    '',
    'Sincerely,',
    '',
    '',
    '______________________________',
    'Ernest Moore Jr.',
    '',
    'Enclosures:',
    '- Copy of the relevant credit-report information',
    '- Supporting documentation, if applicable'
  ].join('\n');
}


function getPhase10BureauAddress_(bureau) {
  const normalized =
    String(bureau || '')
      .trim()
      .toLowerCase();

  if (normalized === 'experian') {
    return [
      'Experian',
      'Dispute by Mail',
      'P.O. Box 4500',
      'Allen, TX 75013'
    ].join('\n');
  }

  if (
    normalized === 'transunion' ||
    normalized === 'trans union'
  ) {
    return [
      'TransUnion Consumer Solutions',
      'P.O. Box 2000',
      'Chester, PA 19016-2000'
    ].join('\n');
  }

  if (normalized === 'equifax') {
    return [
      'Equifax Information Services LLC',
      'P.O. Box 740256',
      'Atlanta, GA 30374-0256'
    ].join('\n');
  }

  throw new Error(
    'Unsupported credit bureau: ' +
    bureau
  );
}


function formatPhase10IssueType_(value) {
  const text =
    String(value || '')
      .trim()
      .replace(/_/g, ' ')
      .toLowerCase();

  if (!text) {
    return 'Credit-reporting information requiring investigation';
  }

  return text.replace(
    /\b\w/g,
    function(character) {
      return character.toUpperCase();
    }
  );
}


function getPhase10LastFour_(value) {
  const cleaned =
    String(value || '')
      .replace(/[^A-Za-z0-9]/g, '');

  if (cleaned.length <= 4) {
    return cleaned;
  }

  return cleaned.slice(-4);
}


function sanitizePhase10Id_(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 24);
}


function uniquePhase10Values_(values) {
  const seen = {};

  return values.filter(function(value) {
    const key =
      String(value || '')
        .trim()
        .toLowerCase();

    if (!key || seen[key]) {
      return false;
    }

    seen[key] = true;
    return true;
  });
}/*
 * PHASE 10 — APPROVE / REJECT / HOLD REVIEW GATE
 *
 * Preserves the six drafts between executions.
 * No Airtable updates occur in this block.
 */

const PHASE10_REVIEW_INDEX_KEY =
  'PHASE10_REVIEW_INDEX';

const PHASE10_QUEUE_RESET_CONFIRMATION_CODE =
  'ERNEST_APPROVES_PHASE10_QUEUE_RESET';

const PHASE10_DECISION_CONFIRMATION_CODE =
  'ERNEST_APPROVES_PHASE10_REVIEW_DECISION';

const PHASE10_TERMINAL_DECISION_OVERRIDE_CODE =
  'ERNEST_APPROVES_PHASE10_TERMINAL_DECISION_CHANGE';


function initializePhase10ReviewGate(
  resetConfirmationCode
) {
  console.log(
    'PHASE 10 REVIEW GATE INITIALIZATION STARTED'
  );

  const phase10Result =
    runPhase10FinalSystemCompletion() || {};

  const drafts =
    Array.isArray(phase10Result.draftLetters)
      ? phase10Result.draftLetters
      : [];

  const properties =
    PropertiesService.getScriptProperties();

  const existingIndex =
    readPhase10ReviewIndex_(properties);

  if (
    existingIndex.length > 0 &&
    resetConfirmationCode !==
      PHASE10_QUEUE_RESET_CONFIRMATION_CODE
  ) {
    throw new Error(
      'Phase 10 review queue already exists. Separate queue-reset approval is required.'
    );
  }

  if (existingIndex.length > 0) {
    clearExistingPhase10ReviewQueue_(
      properties
    );
  }

  const reviewIndex = [];

  drafts.forEach(function(draft) {
    const savedDraft =
      Object.assign({}, draft, {
        approvalDecision: '',
        approvalStatus:
          'AWAITING ERNIE APPROVAL',
        decisionDate: '',
        decisionNote: '',
        readyForPdf: false,
        readyToPrint: false
      });

    const storageKey =
      createPhase10StorageKey_(
        savedDraft.draftId
      );

    properties.setProperty(
      storageKey,
      JSON.stringify(savedDraft)
    );

    reviewIndex.push({
      draftId: savedDraft.draftId,
      storageKey: storageKey
    });
  });

  properties.setProperty(
    PHASE10_REVIEW_INDEX_KEY,
    JSON.stringify(reviewIndex)
  );

  const report = {
    completed: true,
    phase: 10,
    reviewGateInitialized: true,
    draftsSavedForReview:
      reviewIndex.length,
    awaitingErnieApproval:
      reviewIndex.length,
    approved: 0,
    rejected: 0,
    held: 0,
    airtableRecordsUpdated: 0,
    pdfsCreated: 0
  };

  console.log(
    'PHASE 10 REVIEW GATE SUMMARY: ' +
    JSON.stringify(report)
  );

  console.log(
    'PHASE 10 REVIEW GATE INITIALIZATION COMPLETED'
  );

  return report;
}


function getPhase10ReviewQueue() {
  const properties =
    PropertiesService.getScriptProperties();

  const reviewIndex =
    readPhase10ReviewIndex_(properties);

  const drafts = reviewIndex
    .map(function(indexItem) {
      const savedValue =
        properties.getProperty(
          indexItem.storageKey
        );

      if (!savedValue) {
        return null;
      }

      try {
        return JSON.parse(savedValue);
      } catch (error) {
        console.log(
          'PHASE 10 SAVED DRAFT READ ERROR: ' +
          indexItem.draftId
        );

        return null;
      }
    })
    .filter(function(draft) {
      return Boolean(draft);
    });

  const summary = {
    total: drafts.length,
    awaitingApproval: drafts.filter(
      function(draft) {
        return (
          draft.approvalStatus ===
          'AWAITING ERNIE APPROVAL'
        );
      }
    ).length,
    approved: drafts.filter(
      function(draft) {
        return (
          draft.approvalDecision ===
          'APPROVE'
        );
      }
    ).length,
    rejected: drafts.filter(
      function(draft) {
        return (
          draft.approvalDecision ===
          'REJECT'
        );
      }
    ).length,
    held: drafts.filter(
      function(draft) {
        return (
          draft.approvalDecision ===
          'HOLD'
        );
      }
    ).length
  };

  console.log(
    'PHASE 10 REVIEW QUEUE: ' +
    JSON.stringify(summary)
  );

  return {
    completed: true,
    phase: 10,
    summary: summary,
    drafts: drafts
  };
}


function savePhase10ReviewDecision(
  draftId,
  decision,
  decisionNote,
  confirmationCode,
  terminalOverrideCode
) {
  if (
    confirmationCode !==
    PHASE10_DECISION_CONFIRMATION_CODE
  ) {
    throw new Error(
      'Ernest approval confirmation is required before saving a Phase 10 decision.'
    );
  }

  const normalizedDraftId =
    String(draftId || '').trim();

  const normalizedDecision =
    String(decision || '')
      .trim()
      .toUpperCase();

  const allowedDecisions = [
    'APPROVE',
    'REJECT',
    'HOLD'
  ];

  if (!normalizedDraftId) {
    throw new Error(
      'A Phase 10 draft ID is required.'
    );
  }

  if (
    allowedDecisions.indexOf(
      normalizedDecision
    ) === -1
  ) {
    throw new Error(
      'Decision must be APPROVE, REJECT, or HOLD.'
    );
  }

  const properties =
    PropertiesService.getScriptProperties();

  const storageKey =
    createPhase10StorageKey_(
      normalizedDraftId
    );

  const savedValue =
    properties.getProperty(storageKey);

  if (!savedValue) {
    throw new Error(
      'Phase 10 draft was not found: ' +
      normalizedDraftId
    );
  }

  const draft =
    JSON.parse(savedValue);

  const existingDecision =
    String(
      draft.approvalDecision || ''
    ).trim().toUpperCase();

  const existingIsTerminal =
    allowedDecisions.indexOf(
      existingDecision
    ) !== -1;

  if (
    existingIsTerminal &&
    existingDecision !== normalizedDecision &&
    terminalOverrideCode !==
      PHASE10_TERMINAL_DECISION_OVERRIDE_CODE
  ) {
    throw new Error(
      'Existing Phase 10 decision is protected. Separate terminal-decision override approval is required.'
    );
  }

  if (existingDecision === normalizedDecision) {
    return {
      completed: true,
      noChange: true,
      draft: draft
    };
  }

  draft.approvalDecision =
    normalizedDecision;

  draft.decisionNote =
    String(decisionNote || '').trim();

  draft.decisionDate =
    new Date().toISOString();

  if (normalizedDecision === 'APPROVE') {
    draft.approvalStatus =
      'APPROVED — READY FOR PDF';

    draft.readyForPdf = true;
  }

  if (normalizedDecision === 'REJECT') {
    draft.approvalStatus = 'REJECTED';
    draft.readyForPdf = false;
  }

  if (normalizedDecision === 'HOLD') {
    draft.approvalStatus = 'ON HOLD';
    draft.readyForPdf = false;
  }

  draft.readyToPrint = false;

  properties.setProperty(
    storageKey,
    JSON.stringify(draft)
  );

  console.log(
    'PHASE 10 DECISION SAVED: ' +
    JSON.stringify({
      draftId: draft.draftId,
      accountName: draft.accountName,
      bureau: draft.bureau,
      decision:
        draft.approvalDecision,
      status:
        draft.approvalStatus
    })
  );

  return {
    completed: true,
    draft: draft
  };
}


function readPhase10ReviewIndex_(
  properties
) {
  const savedIndex =
    properties.getProperty(
      PHASE10_REVIEW_INDEX_KEY
    );

  if (!savedIndex) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(savedIndex);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    return [];
  }
}


function clearExistingPhase10ReviewQueue_(
  properties
) {
  const existingIndex =
    readPhase10ReviewIndex_(
      properties
    );

  existingIndex.forEach(
    function(indexItem) {
      if (indexItem.storageKey) {
        properties.deleteProperty(
          indexItem.storageKey
        );
      }
    }
  );

  properties.deleteProperty(
    PHASE10_REVIEW_INDEX_KEY
  );
}


function createPhase10StorageKey_(
  draftId
) {
  return (
    'PHASE10_DRAFT_' +
    sanitizePhase10Id_(draftId)
  );
}
function resetAndRegeneratePhase10(
  confirmationCode
) {
  if (
    confirmationCode !==
    PHASE10_QUEUE_RESET_CONFIRMATION_CODE
  ) {
    throw new Error(
      'Ernest approval is required before resetting the Phase 10 queue.'
    );
  }

  const properties =
    PropertiesService.getScriptProperties();

  clearExistingPhase10ReviewQueue_(properties);
  return runPhase10FinalSystemCompletion();
}

/*
 * PHASE 10 — APPROVED PDF PRODUCTION BRIDGE
 *
 * Reads the existing saved review queue.
 * Creates PDFs only for approved drafts.
 * Preserves all existing approval decisions.
 * Prevents duplicate PDF creation.
 * Does not update Airtable or mail anything.
 */

const PHASE10_PDF_CONFIRMATION_CODE =
  'ERNEST_APPROVES_PHASE10_PDF_BUILD';

const PHASE10_PDF_AUTHORIZATION_TTL_MS =
  10 * 60 * 1000;


function clearPhase10PdfAuthorization_() {
  const properties =
    PropertiesService.getScriptProperties();

  properties.deleteProperty(
    'PHASE10_PDF_AUTHORIZATION'
  );
  properties.deleteProperty(
    'PHASE10_PDF_AUTHORIZED_AT'
  );
}


function getPhase10PdfAuthorizationState_() {
  const properties =
    PropertiesService.getScriptProperties();

  const token =
    properties.getProperty(
      'PHASE10_PDF_AUTHORIZATION'
    );

  const authorizedAt =
    Number(
      properties.getProperty(
        'PHASE10_PDF_AUTHORIZED_AT'
      ) || 0
    );

  const ageMs =
    authorizedAt
      ? Date.now() - authorizedAt
      : Number.POSITIVE_INFINITY;

  const armed =
    token === PHASE10_PDF_CONFIRMATION_CODE &&
    authorizedAt > 0 &&
    ageMs >= 0 &&
    ageMs <= PHASE10_PDF_AUTHORIZATION_TTL_MS;

  if (token && !armed) {
    clearPhase10PdfAuthorization_();
  }

  return {
    armed: armed,
    authorizedAt:
      authorizedAt
        ? new Date(authorizedAt).toISOString()
        : '',
    expiresAt:
      armed
        ? new Date(
            authorizedAt +
            PHASE10_PDF_AUTHORIZATION_TTL_MS
          ).toISOString()
        : ''
  };
}


/**
 * Read-only preview of approved drafts eligible for PDF creation.
 */
function previewPhase10ApprovedPdfProduction() {
  const queue =
    getPhase10ReviewQueue();

  const approved =
    queue.drafts.filter(
      function(draft) {
        return (
          draft.approvalDecision === 'APPROVE' &&
          !draft.pdfCreated
        );
      }
    );

  return {
    mode: 'read-only-preview',
    totalDrafts: queue.summary.total,
    approvedWithoutPdf: approved.length,
    eligibleDraftIds: approved.map(
      function(draft) {
        return draft.draftId;
      }
    ),
    filesCreated: 0,
    airtableRecordsUpdated: 0
  };
}


function armPhase10PdfAuthorization() {
  const properties =
    PropertiesService.getScriptProperties();

  const authorizedAt = Date.now();

  properties.setProperty(
    'PHASE10_PDF_AUTHORIZATION',
    PHASE10_PDF_CONFIRMATION_CODE
  );

  properties.setProperty(
    'PHASE10_PDF_AUTHORIZED_AT',
    String(authorizedAt)
  );

  return getPhase10PdfAuthorizationState_();
}


function disarmPhase10PdfAuthorization() {
  clearPhase10PdfAuthorization_();
  return { armed: false };
}


function runPhase10ApprovedPdfProduction() {
  const authorization =
    getPhase10PdfAuthorizationState_();

  if (!authorization.armed) {
    throw new Error(
      'Phase 10 PDF production refused: authorization is not armed or has expired.'
    );
  }

  try {
    return createPhase10ApprovedPdfs_(
      PHASE10_PDF_CONFIRMATION_CODE
    );
  } finally {
    clearPhase10PdfAuthorization_();
  }
}


function createPhase10ApprovedPdfs_(
  confirmationCode
) {
  if (
    confirmationCode !==
    PHASE10_PDF_CONFIRMATION_CODE
  ) {
    throw new Error(
      'Ernest approval is required before PDF creation.'
    );
  }

  console.log(
    'PHASE 10 APPROVED PDF PRODUCTION STARTED'
  );

  const properties =
    PropertiesService.getScriptProperties();

  const reviewIndex =
    readPhase10ReviewIndex_(
      properties
    );

  const outputFolder =
    getOrCreateLetterOutputFolder_();

  const created = [];
  const skipped = [];
  const failed = [];

  reviewIndex.forEach(
    function(indexItem) {
      const storageKey =
        indexItem.storageKey;

      const savedValue =
        properties.getProperty(
          storageKey
        );

      if (!savedValue) {
        failed.push({
          draftId:
            indexItem.draftId,
          reason:
            'Saved Phase 10 draft was not found.'
        });

        return;
      }

      let draft;

      try {
        draft =
          JSON.parse(savedValue);
      } catch (error) {
        failed.push({
          draftId:
            indexItem.draftId,
          reason:
            'Saved Phase 10 draft could not be read.'
        });

        return;
      }

      if (
        draft.approvalDecision !==
        'APPROVE'
      ) {
        skipped.push({
          draftId:
            draft.draftId,
          accountName:
            draft.accountName,
          bureau:
            draft.bureau,
          reason:
            'Draft is not approved.'
        });

        return;
      }

      if (
        phase10PdfAlreadyExists_(
          draft
        )
      ) {
        draft.readyForPdf = false;
        draft.readyToPrint = true;
        draft.pdfCreated = true;
        draft.approvalStatus =
          'APPROVED — PDF CREATED';

        properties.setProperty(
          storageKey,
          JSON.stringify(draft)
        );

        skipped.push({
          draftId:
            draft.draftId,
          accountName:
            draft.accountName,
          bureau:
            draft.bureau,
          reason:
            'PDF already exists.',
          pdfFileId:
            draft.pdfFileId,
          pdfUrl:
            draft.pdfUrl
        });

        return;
      }

      try {
        const result =
          createPhase10PdfFiles_(
            draft,
            outputFolder
          );

        draft.googleDocId =
          result.googleDocId;

        draft.googleDocUrl =
          result.googleDocUrl;

        draft.pdfFileId =
          result.pdfFileId;

        draft.pdfUrl =
          result.pdfUrl;

        draft.pdfCreated = true;
        draft.pdfCreatedDate =
          new Date().toISOString();

        draft.readyForPdf = false;
        draft.readyToPrint = true;

        draft.approvalStatus =
          'APPROVED — PDF CREATED';

        properties.setProperty(
          storageKey,
          JSON.stringify(draft)
        );

        created.push({
          draftId:
            draft.draftId,
          accountName:
            draft.accountName,
          bureau:
            draft.bureau,
          googleDocId:
            result.googleDocId,
          googleDocUrl:
            result.googleDocUrl,
          pdfFileId:
            result.pdfFileId,
          pdfUrl:
            result.pdfUrl
        });

        console.log(
          'PHASE 10 PDF CREATED: ' +
          JSON.stringify(
            created[
              created.length - 1
            ]
          )
        );
      } catch (error) {
        failed.push({
          draftId:
            draft.draftId,
          accountName:
            draft.accountName,
          bureau:
            draft.bureau,
          reason:
            String(
              error &&
              error.message
                ? error.message
                : error
            )
        });

        console.log(
          'PHASE 10 PDF ERROR: ' +
          JSON.stringify(
            failed[
              failed.length - 1
            ]
          )
        );
      }
    }
  );

  const report = {
    completed:
      failed.length === 0,

    phase: 10,

    approvedDraftsFound:
      created.length +
      skipped.filter(
        function(item) {
          return (
            item.reason ===
            'PDF already exists.'
          );
        }
      ).length,

    pdfsCreated:
      created.length,

    skipped:
      skipped.length,

    failed:
      failed.length,

    createdFiles:
      created,

    skippedDrafts:
      skipped,

    failedDrafts:
      failed,

    airtableRecordsUpdated: 0,

    lettersMailed: 0,

    readyToPrint:
      created.length +
      skipped.filter(
        function(item) {
          return (
            item.reason ===
            'PDF already exists.'
          );
        }
      ).length
  };

  console.log(
    'PHASE 10 APPROVED PDF SUMMARY: ' +
    JSON.stringify(report)
  );

  console.log(
    'PHASE 10 APPROVED PDF PRODUCTION COMPLETED'
  );

  return report;
}


function createPhase10PdfFiles_(
  draft,
  outputFolder
) {
  const fileName =
    sanitizeFileName_(
      String(
        draft.bureau ||
        'Credit Bureau'
      ) +
      ' - ' +
      String(
        draft.accountName ||
        'Account'
      ) +
      ' - ' +
      String(
        draft.draftId ||
        'Phase 10'
      )
    );

  const document =
    DocumentApp.create(
      fileName
    );

  const documentId =
    document.getId();

  const body =
    document.getBody();

  body.clear();

  const letterText =
    String(
      draft.letterBody || ''
    );

  letterText
    .split('\n')
    .forEach(function(line) {
      body.appendParagraph(line);
    });

  document.saveAndClose();

  const documentFile =
    DriveApp.getFileById(
      documentId
    );

  documentFile.moveTo(
    outputFolder
  );

  const pdfBlob =
    documentFile
      .getAs(MimeType.PDF)
      .setName(
        fileName + '.pdf'
      );

  const pdfFile =
    outputFolder.createFile(
      pdfBlob
    );

  return {
    googleDocId:
      documentId,

    googleDocUrl:
      documentFile.getUrl(),

    pdfFileId:
      pdfFile.getId(),

    pdfUrl:
      pdfFile.getUrl()
  };
}


function phase10PdfAlreadyExists_(
  draft
) {
  if (!draft.pdfFileId) {
    return false;
  }

  try {
    DriveApp.getFileById(
      draft.pdfFileId
    );

    return true;
  } catch (error) {
    return false;
  }
}