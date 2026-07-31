/**
 * MOORE HOLDINGS CREDIT AGENT
 * FINAL LETTER PRODUCTION + CASE MANAGEMENT LAYER
 *
 * Safety defaults:
 * - Read-only planning unless Ernest gives the exact confirmation code.
 * - No dispute is created without supported factual issues.
 * - No protected Airtable record is changed by this file.
 * - Generated letters are drafts for Ernest's review and approval.
 */

const LETTER_SYSTEM_VERSION = '1.0.0';
const LETTER_APPROVAL_CODE = 'ERNEST_APPROVES_LETTER_DRAFT_CREATION';
const LETTER_PROFILE_CODE = 'ERNEST_APPROVES_VERIFIED_IDENTITY_PROFILE';
const LETTER_EVIDENCE_CODE = 'ERNEST_APPROVES_ACCOUNT_EVIDENCE';

const LETTER_PROPERTY_KEYS = {
  identity: 'MH_VERIFIED_IDENTITY_PROFILE',
  evidence: 'MH_ACCOUNT_EVIDENCE',
  cases: 'MH_LETTER_CASES',
  history: 'MH_LETTER_HISTORY',
  outputFolder: 'MH_LETTER_OUTPUT_FOLDER_ID'
};

const LETTER_LEGAL_AUTHORITIES = {
  FCRA_607B: {
    citation: 'FCRA §607(b), 15 U.S.C. §1681e(b)',
    appliesTo: ['Credit Bureau'],
    explanation: 'A consumer reporting agency must follow reasonable procedures to assure maximum possible accuracy.'
  },
  FCRA_611: {
    citation: 'FCRA §611, 15 U.S.C. §1681i',
    appliesTo: ['Credit Bureau'],
    explanation: 'A consumer reporting agency must reasonably reinvestigate disputed information and correct or delete information that is inaccurate, incomplete, or cannot be verified.'
  },
  FCRA_623B: {
    citation: 'FCRA §623(b), 15 U.S.C. §1681s-2(b)',
    appliesTo: ['Furnisher', 'Original Creditor', 'Debt Collector'],
    explanation: 'After receiving notice of a bureau dispute, a furnisher must investigate, review relevant information, and report accurate results.'
  },
  REG_V_1022_43: {
    citation: 'Regulation V, 12 C.F.R. §1022.43',
    appliesTo: ['Furnisher', 'Original Creditor'],
    explanation: 'A furnisher that receives a qualifying direct dispute must conduct a reasonable investigation and report the results.'
  },
  FDCPA_807_8: {
    citation: 'FDCPA §807(8), 15 U.S.C. §1692e(8)',
    appliesTo: ['Debt Collector'],
    explanation: 'A debt collector may not communicate credit information known or which should be known to be false, including failing to communicate that a debt is disputed.'
  },
  FDCPA_809: {
    citation: 'FDCPA §809, 15 U.S.C. §1692g',
    appliesTo: ['Debt Collector'],
    explanation: 'When applicable, a debt collector must provide validation information and comply with the dispute and verification requirements.'
  }
};

const LETTER_ISSUE_TYPES = {
  WRONG_ACCOUNT_NUMBER: 'Incorrect account number or identifier',
  WRONG_BALANCE: 'Incorrect balance',
  WRONG_STATUS: 'Incorrect account status',
  WRONG_DATES: 'Incorrect opening, closing, delinquency, or payment dates',
  WRONG_PAYMENT_HISTORY: 'Incorrect payment history',
  DUPLICATE_REPORTING: 'Duplicate reporting',
  MIXED_FILE: 'Information associated with another consumer or mixed file',
  WRONG_OWNERSHIP: 'Account ownership is inaccurate or unverified',
  OBSOLETE_INFORMATION: 'Potentially obsolete reporting',
  REINSERTION: 'Previously deleted information appears to have been reinserted',
  WRONG_NAME: 'Incorrect or incomplete legal name',
  WRONG_ADDRESS: 'Incorrect, incomplete, or unauthorized address',
  BUREAU_CONFLICT: 'Material conflict among bureau reports',
  UNVERIFIABLE: 'Information cannot presently be verified'
};

function testLetterProductionSystem() {
  console.log('LETTER PRODUCTION SYSTEM TEST STARTED');

  const data = getLetterCommandCenterData();

  console.log('System version: ' + data.systemVersion);
  console.log('Review records received: ' + data.counts.total);
  console.log('Approved: ' + data.counts.approved);
  console.log('On hold: ' + data.counts.hold);
  console.log('Rejected: ' + data.counts.rejected);
  console.log('Pending: ' + data.counts.pending);
  console.log('Identity profile ready: ' + data.identityReady);
  console.log('Evidence-ready accounts: ' + data.counts.evidenceReady);
  console.log('Draft-ready accounts: ' + data.counts.draftReady);
  console.log('Protected Airtable records changed: false');
  console.log('LETTER PRODUCTION SYSTEM TEST COMPLETED');

  return data;
}

function getLetterCommandCenterData() {
  const reviews = getLetterReviews_();
  const identity = getVerifiedIdentityProfile_();
  const evidenceMap = getJsonProperty_(
    LETTER_PROPERTY_KEYS.evidence,
    {}
  );

  const cases = reviews.map(function(review) {
    return buildLetterCase_(
      review,
      evidenceMap[review.recordId] || null,
      identity
    );
  });

  return {
    systemVersion: LETTER_SYSTEM_VERSION,
    generatedAt: new Date().toISOString(),
    safetyMode: 'EVIDENCE_FIRST_AND_APPROVAL_REQUIRED',
    identityReady: validateIdentityProfile_(identity).valid,
    identityErrors: validateIdentityProfile_(identity).errors,
    counts: summarizeLetterCases_(cases),
    cases: cases,
    permanentRules: getLetterPermanentRules_(),
    airtableRecordsChanged: false
  };
}

function saveVerifiedIdentityProfile(profile, confirmationCode) {
  requireConfirmation_(
    confirmationCode,
    LETTER_PROFILE_CODE,
    'verified identity profile'
  );

  const normalized = normalizeIdentityProfile_(profile);
  const validation = validateIdentityProfile_(normalized);

  if (!validation.valid) {
    throw new Error(
      'Identity profile validation failed: ' +
      validation.errors.join(' | ')
    );
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      LETTER_PROPERTY_KEYS.identity,
      JSON.stringify(normalized)
    );

  appendLetterHistory_(
    'IDENTITY_PROFILE_SAVED',
    {
      legalName: normalized.legalName,
      currentAddressVerified: true
    }
  );

  return {
    saved: true,
    profile: normalized
  };
}

function saveAccountEvidence(
  recordId,
  evidence,
  confirmationCode
) {
  requireConfirmation_(
    confirmationCode,
    LETTER_EVIDENCE_CODE,
    'account evidence'
  );

  if (!recordId) {
    throw new Error('Missing Phase 7 review record ID.');
  }

  const normalized = normalizeEvidence_(evidence);
  const validation = validateEvidence_(normalized);

  if (!validation.valid) {
    throw new Error(
      'Evidence validation failed: ' +
      validation.errors.join(' | ')
    );
  }

  const evidenceMap = getJsonProperty_(
    LETTER_PROPERTY_KEYS.evidence,
    {}
  );

  evidenceMap[String(recordId)] = normalized;

  setJsonProperty_(
    LETTER_PROPERTY_KEYS.evidence,
    evidenceMap
  );

  appendLetterHistory_(
    'ACCOUNT_EVIDENCE_SAVED',
    {
      recordId: String(recordId),
      supportedIssueCount: normalized.issues.length
    }
  );

  return {
    saved: true,
    recordId: String(recordId),
    evidence: normalized
  };
}

function previewLetterProductionPlan() {
  const data = getLetterCommandCenterData();

  const ready = data.cases.filter(function(item) {
    return item.draftReady;
  });

  const blocked = data.cases.filter(function(item) {
    return !item.draftReady;
  });

  console.log('LETTER PRODUCTION PLAN');
  console.log('Draft-ready accounts: ' + ready.length);
  console.log('Blocked accounts: ' + blocked.length);

  blocked.forEach(function(item) {
    console.log(
      JSON.stringify({
        account: item.accountName,
        number: item.accountNumber,
        decision: item.decision,
        blockers: item.blockers
      })
    );
  });

  console.log('Google Docs created: 0');
  console.log('PDFs created: 0');

  return {
    ready: ready,
    blocked: blocked,
    filesCreated: 0
  };
}

function generateApprovedLetterDrafts(confirmationCode) {
  requireConfirmation_(
    confirmationCode,
    LETTER_APPROVAL_CODE,
    'letter draft creation'
  );

  const data = getLetterCommandCenterData();

  if (!data.identityReady) {
    throw new Error(
      'Verified identity profile is incomplete: ' +
      data.identityErrors.join(' | ')
    );
  }

  const ready = data.cases.filter(function(item) {
    return item.draftReady;
  });

  if (!ready.length) {
    throw new Error(
      'No accounts are draft-ready. Supported factual issues and recipient details are required before a letter can be generated.'
    );
  }

  const folder = getOrCreateLetterOutputFolder_();

  const results = ready.map(function(letterCase) {
    return createLetterDraft_(
      letterCase,
      data,
      folder
    );
  });

  appendLetterHistory_(
    'LETTER_DRAFT_BATCH_CREATED',
    {
      draftCount: results.length,
      folderId: folder.getId()
    }
  );

  return {
    created: results.length,
    drafts: results,
    folderId: folder.getId(),
    finalApprovalRequired: true,
    mailedAutomatically: false
  };
}

function getLetterCaseHistory() {
  return getJsonProperty_(
    LETTER_PROPERTY_KEYS.history,
    []
  );
}

function buildLetterCase_(
  review,
  evidence,
  identity
) {
  const decision = normalizeDecision_(
    review.currentDecision ||
    review.decision
  );

  const evidenceValidation = validateEvidence_(
    evidence
  );

  const identityValidation = validateIdentityProfile_(
    identity
  );

  const blockers = [];

  if (decision !== 'Approved') {
    blockers.push(
      'Review decision is not Approved.'
    );
  }

  if (!identityValidation.valid) {
    blockers.push(
      'Verified identity profile is incomplete.'
    );
  }

  if (!evidenceValidation.valid) {
    blockers.push.apply(
      blockers,
      evidenceValidation.errors
    );
  }

  if (evidence && !evidence.recipientType) {
    blockers.push(
      'Recipient type is missing.'
    );
  }

  if (evidence && !evidence.recipientName) {
    blockers.push(
      'Recipient name is missing.'
    );
  }

  if (evidence && !evidence.recipientAddress) {
    blockers.push(
      'Recipient mailing address is missing.'
    );
  }

  const issues =
    evidence &&
    Array.isArray(evidence.issues)
      ? evidence.issues
      : [];

  const authorities = selectAuthorities_(
    issues,
    evidence
      ? evidence.recipientType
      : ''
  );

  return {
    recordId: String(
      review.recordId || ''
    ),
    reviewNumber:
      review.reviewNumber || '',
    accountName:
      review.accountName || '',
    accountNumber:
      review.accountNumber || 'N/A',
    priority:
      review.priority || '',
    actionStage:
      review.actionStage || '',
    decision: decision,
    letterReadiness:
      review.letterReadiness || '',
    recipientType:
      evidence
        ? evidence.recipientType
        : '',
    recipientName:
      evidence
        ? evidence.recipientName
        : '',
    recipientAddress:
      evidence
        ? evidence.recipientAddress
        : '',
    bureau:
      evidence
        ? evidence.bureau
        : '',
    reportDate:
      evidence
        ? evidence.reportDate
        : '',
    issues: issues,
    authorities: authorities,
    evidenceReady:
      evidenceValidation.valid,
    draftReady:
      blockers.length === 0,
    blockers:
      uniqueStrings_(blockers),
    missingEvidenceChecklist:
      buildMissingEvidenceChecklist_(
        review,
        evidence
      )
  };
}

function createLetterDraft_(
  letterCase,
  data,
  folder
) {
  const identity =
    getVerifiedIdentityProfile_();

  const title = sanitizeFileName_(
    'DRAFT - ' +
    letterCase.recipientName +
    ' - ' +
    letterCase.accountName +
    ' ' +
    letterCase.accountNumber
  );

  const doc = DocumentApp.create(title);
  const body = doc.getBody();

  body.appendParagraph(
    identity.legalName
  );

  body.appendParagraph(
    formatAddress_(
      identity.currentAddress
    )
  );

  body.appendParagraph('');

  body.appendParagraph(
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'MMMM d, yyyy'
    )
  );

  body.appendParagraph('');

  body.appendParagraph(
    letterCase.recipientName
  );

  body.appendParagraph(
    letterCase.recipientAddress
  );

  body.appendParagraph('');

  body.appendParagraph(
    'Re: Dispute of inaccurate or incomplete credit reporting'
  );

  body.appendParagraph(
    'Account: ' +
    letterCase.accountName +
    ' — ' +
    maskAccountNumber_(
      letterCase.accountNumber
    )
  );

  body.appendParagraph('');

  body.appendParagraph(
    'To Whom It May Concern:'
  );

  body.appendParagraph(
    'I am writing to dispute specific information appearing in my consumer credit file. ' +
    'This letter does not acknowledge ownership or liability for the reported account. ' +
    'Please investigate each item below and review all enclosed supporting information.'
  );

  letterCase.issues.forEach(
    function(issue, index) {
      body.appendParagraph(
        'Issue ' +
        (index + 1) +
        ': ' +
        LETTER_ISSUE_TYPES[
          issue.type
        ]
      ).setHeading(
        DocumentApp
          .ParagraphHeading
          .HEADING3
      );

      body.appendParagraph(
        'Reported information: ' +
        issue.reportedValue
      );

      body.appendParagraph(
        'Verified information or basis for dispute: ' +
        issue.verifiedValue
      );

      body.appendParagraph(
        'Explanation: ' +
        issue.explanation
      );

      body.appendParagraph(
        'Requested action: ' +
        issue.requestedRemedy
      );
    }
  );

  body.appendParagraph(
    'Applicable consumer-reporting duties'
  ).setHeading(
    DocumentApp
      .ParagraphHeading
      .HEADING3
  );

  letterCase.authorities.forEach(
    function(authority) {
      body.appendListItem(
        authority.citation +
        ' — ' +
        authority.explanation
      );
    }
  );

  body.appendParagraph(
    'Please provide the written results of your investigation and an updated copy of the relevant consumer report or account information. ' +
    'If any disputed information is inaccurate, incomplete, or cannot be verified, please correct or delete it as applicable.'
  );

  body.appendParagraph('');
  body.appendParagraph('Sincerely,');
  body.appendParagraph(
    identity.legalName
  );
  body.appendParagraph('');
  body.appendParagraph('Enclosures:');

  getRequiredEnclosures_(
    letterCase
  ).forEach(function(item) {
    body.appendListItem(item);
  });

  body.appendParagraph(
    'DRAFT — REVIEW AND APPROVAL REQUIRED BEFORE MAILING'
  );

  doc.saveAndClose();

  const docFile =
    DriveApp.getFileById(
      doc.getId()
    );

  folder.addFile(docFile);

  DriveApp
    .getRootFolder()
    .removeFile(docFile);

  const pdf = folder
    .createFile(
      docFile.getAs(
        MimeType.PDF
      )
    )
    .setName(
      title + '.pdf'
    );

  return {
    recordId:
      letterCase.recordId,
    documentId:
      doc.getId(),
    documentUrl:
      doc.getUrl(),
    pdfId:
      pdf.getId(),
    pdfUrl:
      pdf.getUrl(),
    status:
      'DRAFT_REVIEW_REQUIRED'
  };
}

function normalizeIdentityProfile_(
  profile
) {
  profile = profile || {};

  return {
    legalName:
      String(
        profile.legalName || ''
      ).trim(),

    birthYear:
      String(
        profile.birthYear || ''
      ).trim(),

    ssnLast4:
      String(
        profile.ssnLast4 || ''
      )
        .replace(/\D/g, '')
        .slice(-4),

    currentAddress:
      normalizeAddress_(
        profile.currentAddress
      ),

    currentAddressVerified:
      profile.currentAddressVerified === true,

    identityDocuments:
      Array.isArray(
        profile.identityDocuments
      )
        ? profile.identityDocuments.map(
            String
          )
        : [],

    incorrectNames:
      Array.isArray(
        profile.incorrectNames
      )
        ? profile.incorrectNames.map(
            String
          )
        : [],

    disputedAddresses:
      Array.isArray(
        profile.disputedAddresses
      )
        ? profile.disputedAddresses.map(
            String
          )
        : [],

    verifiedAt:
      new Date().toISOString()
  };
}

function validateIdentityProfile_(
  profile
) {
  const errors = [];

  if (!profile) {
    return {
      valid: false,
      errors: [
        'Verified identity profile has not been saved.'
      ]
    };
  }

  if (
    profile.legalName !==
    'Ernest Moore Jr.'
  ) {
    errors.push(
      'Legal name must be exactly Ernest Moore Jr.'
    );
  }

  if (
    !profile.currentAddressVerified
  ) {
    errors.push(
      'Current physical address has not been verified.'
    );
  }

  if (
    !profile.currentAddress ||
    !profile.currentAddress.street
  ) {
    errors.push(
      'Verified current street address is missing.'
    );
  }

  if (
    !profile.currentAddress ||
    !profile.currentAddress.city
  ) {
    errors.push(
      'Verified current city is missing.'
    );
  }

  if (
    !profile.currentAddress ||
    !profile.currentAddress.state
  ) {
    errors.push(
      'Verified current state is missing.'
    );
  }

  if (
    !profile.currentAddress ||
    !profile.currentAddress.zip
  ) {
    errors.push(
      'Verified current ZIP code is missing.'
    );
  }

  return {
    valid:
      errors.length === 0,
    errors: errors
  };
}

function normalizeEvidence_(
  evidence
) {
  evidence = evidence || {};

  return {
    recipientType:
      String(
        evidence.recipientType || ''
      ).trim(),

    recipientName:
      String(
        evidence.recipientName || ''
      ).trim(),

    recipientAddress:
      String(
        evidence.recipientAddress || ''
      ).trim(),

    bureau:
      String(
        evidence.bureau || ''
      ).trim(),

    reportDate:
      String(
        evidence.reportDate || ''
      ).trim(),

    documents:
      Array.isArray(
        evidence.documents
      )
        ? evidence.documents.map(
            String
          )
        : [],

    issues:
      Array.isArray(
        evidence.issues
      )
        ? evidence.issues.map(
            normalizeIssue_
          )
        : [],

    notes:
      String(
        evidence.notes || ''
      ).trim(),

    savedAt:
      new Date().toISOString()
  };
}

function normalizeIssue_(
  issue
) {
  issue = issue || {};

  return {
    type:
      String(
        issue.type || ''
      ).trim(),

    reportedValue:
      String(
        issue.reportedValue || ''
      ).trim(),

    verifiedValue:
      String(
        issue.verifiedValue || ''
      ).trim(),

    explanation:
      String(
        issue.explanation || ''
      ).trim(),

    requestedRemedy:
      String(
        issue.requestedRemedy || ''
      ).trim(),

    authorityKeys:
      Array.isArray(
        issue.authorityKeys
      )
        ? issue.authorityKeys.map(
            String
          )
        : [],

    supported:
      issue.supported === true
  };
}

function validateEvidence_(
  evidence
) {
  const errors = [];

  if (!evidence) {
    return {
      valid: false,
      errors: [
        'No account evidence has been saved.'
      ]
    };
  }

  if (
    !evidence.recipientType
  ) {
    errors.push(
      'Recipient type is missing.'
    );
  }

  if (
    !evidence.recipientName
  ) {
    errors.push(
      'Recipient name is missing.'
    );
  }

  if (
    !evidence.recipientAddress
  ) {
    errors.push(
      'Recipient address is missing.'
    );
  }

  if (
    !Array.isArray(
      evidence.issues
    ) ||
    !evidence.issues.length
  ) {
    errors.push(
      'No supported factual issues have been recorded.'
    );
  } else {
    evidence.issues.forEach(
      function(issue, index) {
        if (
          !LETTER_ISSUE_TYPES[
            issue.type
          ]
        ) {
          errors.push(
            'Issue ' +
            (index + 1) +
            ' has an unknown issue type.'
          );
        }

        if (
          !issue.reportedValue
        ) {
          errors.push(
            'Issue ' +
            (index + 1) +
            ' is missing the reported value.'
          );
        }

        if (
          !issue.verifiedValue
        ) {
          errors.push(
            'Issue ' +
            (index + 1) +
            ' is missing the verified value or dispute basis.'
          );
        }

        if (
          !issue.explanation
        ) {
          errors.push(
            'Issue ' +
            (index + 1) +
            ' is missing an explanation.'
          );
        }

        if (
          !issue.requestedRemedy
        ) {
          errors.push(
            'Issue ' +
            (index + 1) +
            ' is missing the requested remedy.'
          );
        }

        if (
          !issue.supported
        ) {
          errors.push(
            'Issue ' +
            (index + 1) +
            ' is not marked as evidence-supported.'
          );
        }
      }
    );
  }

  return {
    valid:
      errors.length === 0,
    errors:
      uniqueStrings_(errors)
  };
}

function selectAuthorities_(
  issues,
  recipientType
) {
  const selected = {};

  (issues || []).forEach(
    function(issue) {
      (
        issue.authorityKeys || []
      ).forEach(function(key) {
        const authority =
          LETTER_LEGAL_AUTHORITIES[
            key
          ];

        if (
          authority &&
          authority.appliesTo.indexOf(
            recipientType
          ) !== -1
        ) {
          selected[key] =
            authority;
        }
      });
    }
  );

  if (
    recipientType ===
    'Credit Bureau'
  ) {
    selected.FCRA_607B =
      LETTER_LEGAL_AUTHORITIES
        .FCRA_607B;

    selected.FCRA_611 =
      LETTER_LEGAL_AUTHORITIES
        .FCRA_611;
  }

  return Object
    .keys(selected)
    .map(function(key) {
      return selected[key];
    });
}

function buildMissingEvidenceChecklist_(
  review,
  evidence
) {
  const checklist = [];

  if (
    !review.accountNumber ||
    review.accountNumber === 'N/A'
  ) {
    checklist.push(
      'Obtain a verifiable account identifier.'
    );
  }

  if (!evidence) {
    checklist.push(
      'Identify the correct recipient and mailing address.'
    );

    checklist.push(
      'Record each factual discrepancy separately.'
    );

    checklist.push(
      'Attach primary supporting evidence.'
    );

    checklist.push(
      'Confirm the requested correction or deletion remedy.'
    );
  }

  return checklist;
}

function summarizeLetterCases_(
  cases
) {
  const counts = {
    total: cases.length,
    approved: 0,
    hold: 0,
    rejected: 0,
    pending: 0,
    evidenceReady: 0,
    draftReady: 0
  };

  cases.forEach(
    function(item) {
      if (
        item.decision ===
        'Approved'
      ) {
        counts.approved++;
      } else if (
        item.decision ===
        'Hold'
      ) {
        counts.hold++;
      } else if (
        item.decision ===
        'Rejected'
      ) {
        counts.rejected++;
      } else {
        counts.pending++;
      }

      if (
        item.evidenceReady
      ) {
        counts.evidenceReady++;
      }

      if (
        item.draftReady
      ) {
        counts.draftReady++;
      }
    }
  );

  return counts;
}

function getLetterReviews_() {
  if (
    typeof getPhase8AIReviewLayerData !==
    'function'
  ) {
    throw new Error(
      'Phase 8 AI Review Layer is not available.'
    );
  }

  const data =
    getPhase8AIReviewLayerData();

  if (
    Array.isArray(data)
  ) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.reviews)
  ) {
    return data.reviews;
  }

  if (
    data &&
    Array.isArray(data.records)
  ) {
    return data.records;
  }

  if (
    data &&
    Array.isArray(
      data.reviewRecords
    )
  ) {
    return data.reviewRecords;
  }

  throw new Error(
    'Phase 8 review data did not contain a recognized review array.'
  );
}

function getVerifiedIdentityProfile_() {
  return getJsonProperty_(
    LETTER_PROPERTY_KEYS.identity,
    null
  );
}

function getOrCreateLetterOutputFolder_() {
  const properties =
    PropertiesService
      .getScriptProperties();

  const existingId =
    properties.getProperty(
      LETTER_PROPERTY_KEYS.outputFolder
    );

  if (existingId) {
    try {
      return DriveApp.getFolderById(
        existingId
      );
    } catch (error) {
      console.log(
        'Stored letter folder could not be opened. A new folder will be created.'
      );
    }
  }

  const folder =
    DriveApp.createFolder(
      'Moore Holdings Credit Agent - Letter Drafts'
    );

  properties.setProperty(
    LETTER_PROPERTY_KEYS.outputFolder,
    folder.getId()
  );

  return folder;
}

function getRequiredEnclosures_(
  letterCase
) {
  const items = [
    'Copy of the relevant credit-report page with the disputed item identified'
  ];

  const evidenceMap =
    getJsonProperty_(
      LETTER_PROPERTY_KEYS.evidence,
      {}
    );

  const evidence =
    evidenceMap[
      letterCase.recordId
    ];

  (
    evidence &&
    evidence.documents
      ? evidence.documents
      : []
  ).forEach(function(item) {
    items.push(item);
  });

  return uniqueStrings_(items);
}

function getLetterPermanentRules_() {
  return [
    'Use the verified legal name Ernest Moore Jr.',
    'Verify the current physical address before generating letters.',
    'Include every distinct evidence-supported issue for each account.',
    'Use only laws applicable to the facts and recipient.',
    'Do not manufacture violations or unsupported accusations.',
    'Do not acknowledge ownership or liability while it remains disputed.',
    'Do not repeat substantially identical disputes without new evidence.',
    'Track certified-mail delivery, deadlines, responses, and reinsertion.',
    'Protect identity documents and avoid unnecessary sensitive data.',
    'Require Ernest Moore Jr. to approve every final letter before mailing.'
  ];
}

function appendLetterHistory_(
  eventType,
  details
) {
  const history =
    getJsonProperty_(
      LETTER_PROPERTY_KEYS.history,
      []
    );

  history.push({
    eventType: eventType,
    details: details || {},
    timestamp:
      new Date().toISOString()
  });

  setJsonProperty_(
    LETTER_PROPERTY_KEYS.history,
    history.slice(-500)
  );
}

function requireConfirmation_(
  actual,
  expected,
  actionName
) {
  if (
    actual !== expected
  ) {
    throw new Error(
      'Explicit confirmation is required before ' +
      actionName +
      '.'
    );
  }
}

function normalizeDecision_(
  value
) {
  const text =
    String(
      value || 'Pending'
    ).toLowerCase();

  if (
    text === 'approved' ||
    text === 'approve'
  ) {
    return 'Approved';
  }

  if (
    text === 'hold' ||
    text === 'on hold'
  ) {
    return 'Hold';
  }

  if (
    text === 'rejected' ||
    text === 'reject'
  ) {
    return 'Rejected';
  }

  return 'Pending';
}

function normalizeAddress_(
  address
) {
  address = address || {};

  return {
    street:
      String(
        address.street || ''
      ).trim(),

    unit:
      String(
        address.unit || ''
      ).trim(),

    city:
      String(
        address.city || ''
      ).trim(),

    state:
      String(
        address.state || ''
      )
        .trim()
        .toUpperCase(),

    zip:
      String(
        address.zip || ''
      ).trim()
  };
}

function formatAddress_(
  address
) {
  const first = [
    address.street,
    address.unit
  ]
    .filter(Boolean)
    .join(' ');

  const second = [
    address.city,
    address.state,
    address.zip
  ]
    .filter(Boolean)
    .join(', ')
    .replace(', ,', ',');

  return (
    first +
    '\n' +
    second
  );
}

function maskAccountNumber_(
  value
) {
  const text =
    String(
      value || 'N/A'
    );

  if (
    text === 'N/A'
  ) {
    return text;
  }

  return (
    'ending in ' +
    text.slice(-4)
  );
}

function sanitizeFileName_(
  value
) {
  return String(
    value || 'Letter Draft'
  )
    .replace(
      /[\\/:*?\"<>|]/g,
      '-'
    )
    .slice(0, 180);
}

function uniqueStrings_(
  items
) {
  const seen = {};

  return (
    items || []
  ).filter(function(item) {
    const key =
      String(item);

    if (seen[key]) {
      return false;
    }

    seen[key] = true;
    return true;
  });
}

function getJsonProperty_(
  key,
  fallback
) {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function setJsonProperty_(
  key,
  value
) {
  PropertiesService
    .getScriptProperties()
    .setProperty(
      key,
      JSON.stringify(value)
    );
}
function setupErnestVerifiedIdentityProfile() {
  return saveVerifiedIdentityProfile(
    {
      legalName: 'Ernest Moore Jr.',
      birthYear: '1974',
      ssnLast4: '5706',

      currentAddress: {
        street: '1116 Western Yarrow Ave',
        unit: '',
        city: 'Justin',
        state: 'TX',
        zip: '76247'
      },

      currentAddressVerified: true,

      identityDocuments: [
        'Texas state identification card',
        'Original Social Security card',
        'Birth certificate'
      ],

      incorrectNames: [
        'Ernest V Moore',
        'Ernest Moore'
      ],

    disputedAddresses: [
  '1301 Narwhal Apt 11210, Fort Worth, TX 76131'
]
    },

    'ERNEST_APPROVES_VERIFIED_IDENTITY_PROFILE'
  );
}
 /**
 * ALL-IN-ONE EVIDENCE + LETTER AUTOMATION
 * Paste beneath the final } in LetterProduction.gs
 */

const ALL_IN_ONE_APPROVAL_CODE =
  'ERNEST_APPROVES_ALL_IN_ONE_LETTER_BUILD';

const OFFICIAL_BUREAU_ADDRESSES = {
  Experian: {
    recipientType: 'Credit Bureau',
    recipientName: 'Experian',
    recipientAddress:
      'P.O. Box 4500, Allen, TX 75013'
  },

  TransUnion: {
    recipientType: 'Credit Bureau',
    recipientName:
      'TransUnion Consumer Solutions',
    recipientAddress:
      'P.O. Box 2000, Chester, PA 19016-2000'
  },

  Equifax: {
    recipientType: 'Credit Bureau',
    recipientName:
      'Equifax Information Services LLC',
    recipientAddress:
      'P.O. Box 740256, Atlanta, GA 30374-0256'
  }
};


function runAllInOneLetterAutomation(
  confirmationCode
) {
  requireConfirmation_(
    confirmationCode,
    ALL_IN_ONE_APPROVAL_CODE,
    'the all-in-one evidence and letter build'
  );

  console.log(
    'ALL-IN-ONE LETTER AUTOMATION STARTED'
  );

  const identity =
    getVerifiedIdentityProfile_();

  const identityCheck =
    validateIdentityProfile_(identity);

  if (!identityCheck.valid) {
    throw new Error(
      'Identity profile is not ready: ' +
      identityCheck.errors.join(' | ')
    );
  }

  const reviews =
    getLetterReviews_();

  const approved =
    reviews.filter(function(review) {
      return normalizeDecision_(
        review.currentDecision ||
        review.decision
      ) === 'Approved';
    });

  console.log(
    'Approved reviews found: ' +
    approved.length
  );

  const existingEvidence =
    getJsonProperty_(
      LETTER_PROPERTY_KEYS.evidence,
      {}
    );

  const prepared = [];
  const blocked = [];

  approved.forEach(function(review) {
    const result =
      buildAutomaticEvidenceFromReview_(
        review
      );

    if (!result.ready) {
      blocked.push({
        recordId:
          String(
            review.recordId || ''
          ),

        accountName:
          review.accountName || '',

        accountNumber:
          review.accountNumber || 'N/A',

        blockers:
          result.blockers
      });

      return;
    }

    existingEvidence[
      String(review.recordId)
    ] = result.evidence;

    prepared.push({
      recordId:
        String(
          review.recordId || ''
        ),

      accountName:
        review.accountName || '',

      bureau:
        result.evidence.bureau,

      issueCount:
        result.evidence.issues.length
    });
  });

  setJsonProperty_(
    LETTER_PROPERTY_KEYS.evidence,
    existingEvidence
  );

  appendLetterHistory_(
    'ALL_IN_ONE_EVIDENCE_BUILD',
    {
      approvedCount:
        approved.length,

      evidencePrepared:
        prepared.length,

      blockedCount:
        blocked.length
    }
  );

  const commandCenter =
    getLetterCommandCenterData();

  const readyCases =
    commandCenter.cases.filter(
      function(item) {
        return item.draftReady;
      }
    );

  console.log(
    'Evidence-ready accounts: ' +
    commandCenter.counts.evidenceReady
  );

  console.log(
    'Draft-ready accounts: ' +
    readyCases.length
  );

  console.log(
    'Blocked approved accounts: ' +
    blocked.length
  );

  blocked.forEach(function(item) {
    console.log(
      JSON.stringify(item)
    );
  });

  console.log(
    'Protected Airtable records changed: false'
  );

  console.log(
    'Letters created automatically: 0'
  );

  console.log(
    'ALL-IN-ONE LETTER AUTOMATION COMPLETED'
  );

  return {
    completed: true,
    approvedAccounts:
      approved.length,
    evidencePrepared:
      prepared.length,
    draftReady:
      readyCases.length,
    blockedAccounts:
      blocked,
    preparedAccounts:
      prepared,
    protectedAirtableRecordsChanged:
      false,
    lettersCreated:
      0,
    nextStep:
      readyCases.length
        ? 'Run generateAllReadyLetterDrafts after Ernest reviews this report.'
        : 'Complete the listed missing evidence before generating letters.'
  };
}


function buildAutomaticEvidenceFromReview_(
  review
) {
  review = review || {};

  const blockers = [];
  const bureau =
    determineReviewBureau_(review);

  const bureauData =
    bureau
      ? OFFICIAL_BUREAU_ADDRESSES[
          bureau
        ]
      : null;

  const issues =
    extractSupportedIssuesFromReview_(
      review
    );

  if (!review.recordId) {
    blockers.push(
      'Missing review record ID.'
    );
  }

  if (!bureauData) {
    blockers.push(
      'A specific bureau could not be identified.'
    );
  }

  if (!issues.length) {
    blockers.push(
      'No complete evidence-supported factual discrepancy was found.'
    );
  }

  if (blockers.length) {
    return {
      ready: false,
      blockers: blockers
    };
  }

  const reportDate =
    firstValue_(
      review.reportDate,
      review.creditReportDate,
      review.lastReported,
      review.reviewDate
    );

  return {
    ready: true,

    evidence: {
      recipientType:
        bureauData.recipientType,

      recipientName:
        bureauData.recipientName,

      recipientAddress:
        bureauData.recipientAddress,

      bureau: bureau,

      reportDate:
        String(
          reportDate || ''
        ).trim(),

      documents:
        collectEvidenceDocuments_(
          review,
          bureau
        ),

      issues: issues,

      notes:
        'Prepared automatically from the approved Phase 8 review record. Final review and approval are required before mailing.',

      savedAt:
        new Date().toISOString()
    }
  };
}


function extractSupportedIssuesFromReview_(
  review
) {
  const issues = [];

  const sourceIssues = []
  .concat(
    Array.isArray(review.supportedIssues)
      ? review.supportedIssues
      : []
  )
  .concat(
    Array.isArray(review.evidenceIssues)
      ? review.evidenceIssues
      : []
  )
  .concat(
    Array.isArray(review.issues)
      ? review.issues
      : []
  )
  .concat(
    Array.isArray(review.discrepancies)
      ? review.discrepancies
      : []
  )
  .concat(
    Array.isArray(review.bureauInconsistencies)
      ? review.bureauInconsistencies
      : []
  );

  sourceIssues.forEach(function(item) {
    if (
      typeof item === 'string'
    ) {
      return;
    }

    const type =
      normalizeAutomaticIssueType_(
        firstValue_(
          item.type,
          item.issueType,
          item.violationTag,
          item.category
        )
      );

    const reportedValue =
      firstValue_(
        item.reportedValue,
        item.reported,
        item.creditReportValue,
        item.currentValue
      );

    const verifiedValue =
      firstValue_(
        item.verifiedValue,
        item.correctValue,
        item.expectedValue,
        item.disputeBasis
      );

    const explanation =
      firstValue_(
        item.explanation,
        item.details,
        item.reason,
        item.notes
      );

    const requestedRemedy =
      firstValue_(
        item.requestedRemedy,
        item.requestedAction,
        item.remedy,
        item.actionNeeded
      );

    const supported =
      item.supported === true ||
      item.evidenceSupported === true ||
      item.verified === true;

    if (
      type &&
      reportedValue &&
      verifiedValue &&
      explanation &&
      requestedRemedy &&
      supported
    ) {
      issues.push({
        type:
          type,

        reportedValue:
          String(reportedValue),

        verifiedValue:
          String(verifiedValue),

        explanation:
          String(explanation),

        requestedRemedy:
          String(requestedRemedy),

        authorityKeys:
          chooseAutomaticAuthorities_(
            type
          ),

        supported: true
      });
    }
  });

  return issues;
}


function determineReviewBureau_(
  review
) {
  const value =
    String(
      firstValue_(
        review.bureau,
        review.creditBureau,
        review.reportingBureau,
        review.recipientName
      ) || ''
    ).toLowerCase();

  if (
    value.indexOf('experian') !== -1
  ) {
    return 'Experian';
  }

  if (
    value.indexOf('transunion') !== -1 ||
    value.indexOf('trans union') !== -1
  ) {
    return 'TransUnion';
  }

  if (
    value.indexOf('equifax') !== -1
  ) {
    return 'Equifax';
  }

  return '';
}


function normalizeAutomaticIssueType_(
  value
) {
  const text =
    String(
      value || ''
    ).toLowerCase();

  if (
    text.indexOf('account number') !== -1
  ) {
    return 'WRONG_ACCOUNT_NUMBER';
  }

  if (
    text.indexOf('balance') !== -1
  ) {
    return 'WRONG_BALANCE';
  }

  if (
    text.indexOf('payment history') !== -1
  ) {
    return 'WRONG_PAYMENT_HISTORY';
  }

  if (
    text.indexOf('status') !== -1
  ) {
    return 'WRONG_STATUS';
  }

  if (
    text.indexOf('date') !== -1 ||
    text.indexOf('dofd') !== -1
  ) {
    return 'WRONG_DATES';
  }

  if (
    text.indexOf('duplicate') !== -1
  ) {
    return 'DUPLICATE_REPORTING';
  }

  if (
    text.indexOf('ownership') !== -1 ||
    text.indexOf('not mine') !== -1
  ) {
    return 'WRONG_OWNERSHIP';
  }

  if (
    text.indexOf('mixed') !== -1
  ) {
    return 'MIXED_FILE';
  }

  if (
    text.indexOf('obsolete') !== -1
  ) {
    return 'OBSOLETE_INFORMATION';
  }

  if (
    text.indexOf('reinsert') !== -1
  ) {
    return 'REINSERTION';
  }

  if (
    text.indexOf('name') !== -1
  ) {
    return 'WRONG_NAME';
  }

  if (
    text.indexOf('address') !== -1
  ) {
    return 'WRONG_ADDRESS';
  }

  if (
    text.indexOf('bureau') !== -1 ||
    text.indexOf('conflict') !== -1 ||
    text.indexOf('inconsisten') !== -1
  ) {
    return 'BUREAU_CONFLICT';
  }

  if (
    text.indexOf('unverif') !== -1
  ) {
    return 'UNVERIFIABLE';
  }

  return '';
}


function chooseAutomaticAuthorities_(
  issueType
) {
  const keys = [
    'FCRA_607B',
    'FCRA_611'
  ];

  if (
    issueType ===
    'REINSERTION'
  ) {
    keys.push(
      'FCRA_611'
    );
  }

  return uniqueStrings_(keys);
}


function collectEvidenceDocuments_(
  review,
  bureau
) {
  const documents = [
    bureau +
    ' credit-report page showing the disputed information'
  ];

  firstArray_(
    review.evidenceDocuments,
    review.documents,
    review.attachments,
    review.proofAttachments
  ).forEach(function(item) {
    if (
      typeof item === 'string'
    ) {
      documents.push(item);
    } else if (
      item &&
      item.name
    ) {
      documents.push(
        String(item.name)
      );
    }
  });

  return uniqueStrings_(documents);
}


function generateAllReadyLetterDrafts(
  confirmationCode
) {
  requireConfirmation_(
    confirmationCode,
    LETTER_APPROVAL_CODE,
    'letter draft creation'
  );

  return generateApprovedLetterDrafts(
    LETTER_APPROVAL_CODE
  );
}


function firstValue_() {
  for (
    let index = 0;
    index < arguments.length;
    index++
  ) {
    const value =
      arguments[index];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return '';
}


function firstArray_() {
  for (
    let index = 0;
    index < arguments.length;
    index++
  ) {
    if (
      Array.isArray(
        arguments[index]
      )
    ) {
      return arguments[index];
    }
  }

  return [];
}
function runApprovedAllInOneLetterAutomation() {
  return runAllInOneLetterAutomation(
    ALL_IN_ONE_APPROVAL_CODE
  );
}
/*
 * PHASE 9 — CONSOLIDATED EVIDENCE BRIDGE
 *
 * PURPOSE:
 * 1. Run the existing Personal Credit scanner.
 * 2. Run the completed Phase 8 decision/letter review.
 * 3. Match approved cases to scanner evidence by Airtable record ID.
 * 4. Convert supported bureau conflicts into letter-ready evidence.
 * 5. Produce one consolidated report.
 *
 * SAFETY:
 * - Does not mail letters.
 * - Does not change protected Airtable records.
 * - Does not invent missing evidence.
 */

function runPhase9CombinedEvidenceBridge() {
  console.log(
    'PHASE 9 CONSOLIDATED EVIDENCE BRIDGE STARTED'
  );

  const scannerResult =
    scanPersonalCredit() || {};

  const letterResult =
    runApprovedAllInOneLetterAutomation() || {};

 const approvedCases = []
  .concat(
    Array.isArray(letterResult.preparedAccounts)
      ? letterResult.preparedAccounts
      : []
  )
  .concat(
    Array.isArray(letterResult.blockedAccounts)
      ? letterResult.blockedAccounts
      : []
  );

  const bureauIssues =
    collectPhase9BureauIssues_(
      scannerResult
    );

  const matchedCases = [];
  const blockedCases = [];

  approvedCases.forEach(function(caseItem) {
    const recordId =
      String(
        firstValue_(
          caseItem.recordId,
          caseItem.airtableRecordId,
          caseItem.id,
          caseItem.review &&
            caseItem.review.recordId
        ) || ''
      ).trim();

    const accountName =
      String(
        firstValue_(
          caseItem.accountName,
          caseItem.account,
          caseItem.creditorName,
          caseItem.review &&
            caseItem.review.accountName
        ) || ''
      ).trim();

    const matches =
      bureauIssues.filter(
        function(issueItem) {
          const sameRecord =
            recordId &&
            issueItem.recordId === recordId;

          const sameAccount =
            accountName &&
            normalizePhase9Text_(
              issueItem.accountName
            ) ===
            normalizePhase9Text_(
              accountName
            );

          return sameRecord || sameAccount;
        }
      );

    const evidenceIssues = [];

    matches.forEach(function(match) {
      const converted =
        convertPhase9ScannerIssue_(
          match
        );

      if (converted.ready) {
        evidenceIssues.push(
          converted.issue
        );
      }
    });

    if (evidenceIssues.length) {
      matchedCases.push({
        recordId: recordId,
        accountName: accountName,
        originalCase: caseItem,
        evidenceIssues:
          evidenceIssues,
        evidenceReady: true,
        draftReady: true
      });
    } else {
      blockedCases.push({
        recordId: recordId,
        accountName: accountName,
        evidenceReady: false,
        draftReady: false,
        blockers: [
          'No complete scanner-supported bureau conflict could be matched to this approved case.'
        ]
      });
    }
  });

  const heldReview =
    buildPhase9HeldAccountReview_(
      scannerResult,
      approvedCases
    );

  console.log(
    'Scanner records reviewed: ' +
    getPhase9Count_(
      scannerResult,
      'scannedRecords',
      'recordsScanned',
      'totalRecords',
      'scanned'
    )
  );

  console.log(
    'Approved cases examined: ' +
    approvedCases.length
  );

  console.log(
    'Scanner bureau issues found: ' +
    bureauIssues.length
  );

  console.log(
    'Evidence-ready approved cases: ' +
    matchedCases.length
  );

  console.log(
    'Blocked approved cases: ' +
    blockedCases.length
  );

  console.log(
    'Held-account scanner candidates: ' +
    heldReview.length
  );

  matchedCases.forEach(function(item) {
    console.log(
      'EVIDENCE READY: ' +
      JSON.stringify(item)
    );
  });

  blockedCases.forEach(function(item) {
    console.log(
      'BLOCKED: ' +
      JSON.stringify(item)
    );
  });

  heldReview.forEach(function(item) {
    console.log(
      'HELD ACCOUNT EVIDENCE CANDIDATE: ' +
      JSON.stringify(item)
    );
  });

  console.log(
    'Protected Airtable records changed: false'
  );

  console.log(
    'Letters mailed automatically: 0'
  );

  console.log(
    'PHASE 9 CONSOLIDATED EVIDENCE BRIDGE COMPLETED'
  );

  return {
    completed: true,
    phase: 9,
    scannerRecordsReviewed:
      getPhase9Count_(
        scannerResult,
        'scannedRecords',
        'recordsScanned',
        'totalRecords',
        'scanned'
      ),
    approvedCasesExamined:
      approvedCases.length,
    scannerBureauIssues:
      bureauIssues.length,
    evidenceReady:
      matchedCases.length,
    blocked:
      blockedCases.length,
    heldAccountCandidates:
      heldReview.length,
    readyCases:
      matchedCases,
    blockedCases:
      blockedCases,
    heldReview:
      heldReview,
    protectedAirtableRecordsChanged:
      false,
    lettersMailed:
      0,
    nextStep:
      matchedCases.length
        ? 'Review the Phase 9 report, then generate drafts only for the evidence-ready cases.'
        : 'Review the consolidated blockers and complete only the missing verified evidence.'
  };
}


function collectPhase9BureauIssues_(
  scannerResult
) {
  const source =
    firstArray_(
      scannerResult.bureauIssues,
      scannerResult.bureauInconsistencies,
      scannerResult.bureauRecordIssues,
      scannerResult.consistencyIssues,
      scannerResult.flags
    );

  const results = [];

  source.forEach(function(item) {
    if (!item) {
      return;
    }

    const issue =
      item.issue || item;

    const issueText =
      typeof issue === 'string'
        ? issue
        : String(
            firstValue_(
              issue.explanation,
              issue.details,
              issue.message,
              issue.description,
              issue.type
            ) || ''
          );

    const bureau =
      determinePhase9Bureau_(
        firstValue_(
          issue.bureau,
          item.bureau,
          issueText
        )
      );

    results.push({
      recordId:
        String(
          firstValue_(
            item.recordId,
            item.airtableRecordId,
            item.id
          ) || ''
        ).trim(),

      accountName:
        String(
          firstValue_(
            item.accountName,
            item.account,
            item.creditorName
          ) || ''
        ).trim(),

      accountNumber:
        String(
          firstValue_(
            item.accountNumber,
            item.accountNumberMasked,
            item.partialAccountNumber,
            item.accountLastFour,
            issue.accountNumber,
            issue.accountNumberMasked,
            issue.partialAccountNumber,
            issue.accountLastFour
          ) || ''
        ).trim(),

      reportingBureaus:
        Array.isArray(item.reportingBureaus)
          ? item.reportingBureaus.slice()
          : [],

      letterEligible:
        issueText.toLowerCase().indexOf(
          'not marked as reporting'
        ) === -1,

      bureau: bureau,

      type:
        normalizeAutomaticIssueType_(
          firstValue_(
            issue.type,
            issue.issueType,
            issue.category,
            issueText
          )
        ),

      reportedValue:
        firstValue_(
          issue.reportedValue,
          issue.reported,
          issue.currentValue
        ),

      verifiedValue:
        firstValue_(
          issue.verifiedValue,
          issue.correctValue,
          issue.expectedValue
        ),

      explanation:
        issueText,

      requestedRemedy:
        firstValue_(
          issue.requestedRemedy,
          issue.requestedAction,
          issue.remedy,
          'Investigate and correct or delete any information that cannot be verified accurately.'
        ),

      originalIssue: issue
    });
  });

  return results;
}


function convertPhase9ScannerIssue_(
  item
) {
  const blockers = [];

  if (!item.bureau) {
    blockers.push(
      'Specific bureau missing.'
    );
  }

  if (!item.type) {
    blockers.push(
      'Supported issue type missing.'
    );
  }

  if (!item.explanation) {
    blockers.push(
      'Issue explanation missing.'
    );
  }

  /*
   * Reported and verified values must both exist.
   * The bridge will not guess either value.
   */
  if (
    item.reportedValue === '' ||
    item.reportedValue === null ||
    item.reportedValue === undefined
  ) {
    blockers.push(
      'Exact reported value missing.'
    );
  }

  if (
    item.verifiedValue === '' ||
    item.verifiedValue === null ||
    item.verifiedValue === undefined
  ) {
    blockers.push(
      'Verified or correct value missing.'
    );
  }

  if (blockers.length) {
    return {
      ready: false,
      blockers: blockers
    };
  }

  return {
    ready: true,
    issue: {
      bureau: item.bureau,
      accountNumber: String(item.accountNumber || '').trim(),
      reportingBureaus:
        Array.isArray(item.reportingBureaus)
          ? item.reportingBureaus.slice()
          : [],
      type: item.type,
      reportedValue:
        String(item.reportedValue),
      verifiedValue:
        String(item.verifiedValue),
      explanation:
        String(item.explanation),
      requestedRemedy:
        String(item.requestedRemedy),
      authorityKeys:
        chooseAutomaticAuthorities_(
          item.type
        ),
      supported: true
    }
  };
}


function buildPhase9HeldAccountReview_(
  scannerResult,
  approvedCases
) {
  const approvedIds = {};

  approvedCases.forEach(function(item) {
    const id =
      String(
        firstValue_(
          item.recordId,
          item.airtableRecordId,
          item.id,
          item.review &&
            item.review.recordId
        ) || ''
      ).trim();

    if (id) {
      approvedIds[id] = true;
    }
  });

  return collectPhase9BureauIssues_(
    scannerResult
  ).filter(function(item) {
    return (
      item.recordId &&
      !approvedIds[item.recordId]
    );
  }).map(function(item) {
    const converted =
      convertPhase9ScannerIssue_(
        item
      );

    return {
      recordId: item.recordId,
      accountName: item.accountName,
      accountNumber: item.accountNumber,
      reportingBureaus:
        Array.isArray(item.reportingBureaus)
          ? item.reportingBureaus.slice()
          : [],
      bureau: item.bureau,
      evidenceCandidate:
        converted.ready,
      evidence:
        converted.ready
          ? converted.issue
          : null,
      blockers:
        converted.ready
          ? []
          : converted.blockers,
      decision:
        converted.ready
          ? 'REVIEW FOR POSSIBLE PROMOTION'
          : 'KEEP ON HOLD'
    };
  });
}


function determinePhase9Bureau_(
  value
) {
  const text =
    String(value || '')
      .toLowerCase();

  if (
    text.indexOf('experian') !== -1
  ) {
    return 'Experian';
  }

  if (
    text.indexOf('transunion') !== -1 ||
    text.indexOf('trans union') !== -1
  ) {
    return 'TransUnion';
  }

  if (
    text.indexOf('equifax') !== -1
  ) {
    return 'Equifax';
  }

  return '';
}


function normalizePhase9Text_(
  value
) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}


function getPhase9Count_(
  source
) {
  for (
    let index = 1;
    index < arguments.length;
    index++
  ) {
    const key =
      arguments[index];

    if (
      source &&
      typeof source[key] === 'number'
    ) {
      return source[key];
    }

    if (
      source &&
      Array.isArray(source[key])
    ) {
      return source[key].length;
    }
  }

  return 0;
}
/*
 * PHASE 9 — EVIDENCE CORRECTION
 *
 * Accepts verified bureau-to-bureau inconsistencies as evidence
 * without inventing a supposedly “correct” value.
 *
 * The dispute requests investigation and verification when the
 * available reports conflict.
 */

function convertPhase9ScannerIssue_(item) {
  const blockers = [];

  if (item.letterEligible === false) {
    blockers.push(
      'Internal bureau-mapping conflict requires source correction before a dispute letter.'
    );
  }

  const explanation =
    String(
      firstValue_(
        item.explanation,
        item.details,
        item.message,
        item.description
      ) || ''
    ).trim();

  const bureau =
    String(
      firstValue_(
        item.bureau,
        determinePhase9Bureau_(explanation),
        'Multiple bureaus'
      ) || ''
    ).trim();

  const issueType =
    normalizeAutomaticIssueType_(
      firstValue_(
        item.type,
        item.issueType,
        item.category,
        explanation
      )
    );

  if (!explanation) {
    blockers.push(
      'Scanner did not provide a bureau inconsistency description.'
    );
  }

  if (!issueType) {
    blockers.push(
      'Scanner did not provide a supported issue type.'
    );
  }

  if (blockers.length) {
    return {
      ready: false,
      blockers: blockers
    };
  }

  const reportedValue =
    hasPhase9EvidenceValue_(item.reportedValue)
      ? String(item.reportedValue)
      : explanation;

  const verifiedValue =
    hasPhase9EvidenceValue_(item.verifiedValue)
      ? String(item.verifiedValue)
      : (
          'No unsupported correct value asserted. ' +
          'Verify the conflicting information against the furnisher’s records.'
        );

  return {
    ready: true,

    issue: {
      bureau: bureau,

      accountNumber:
        String(item.accountNumber || '').trim(),

      reportingBureaus:
        Array.isArray(item.reportingBureaus)
          ? item.reportingBureaus.slice()
          : [],

      type: issueType,

      reportedValue: reportedValue,

      verifiedValue: verifiedValue,

      explanation: explanation,

      requestedRemedy:
        String(
          firstValue_(
            item.requestedRemedy,
            item.requestedAction,
            item.remedy,
            (
              'Investigate the conflicting information and correct ' +
              'or delete any information that cannot be verified accurately.'
            )
          )
        ),

      authorityKeys:
        chooseAutomaticAuthorities_(
          issueType
        ),

      supported: true,

      evidenceBasis:
        'Existing Airtable credit-report fields and scanner-detected bureau conflict.',

      correctValueClaimed:
        hasPhase9EvidenceValue_(
          item.verifiedValue
        )
    }
  };
}


function hasPhase9EvidenceValue_(value) {
  return !(
    value === '' ||
    value === null ||
    value === undefined
  );
}


/*
 * Run this function from the dropdown.
 */
function runPhase9CorrectedEvidenceBridge() {
  console.log(
    'PHASE 9 CORRECTED EVIDENCE BRIDGE STARTED'
  );

  const result =
    runPhase9CombinedEvidenceBridge();

  console.log(
    'PHASE 9 CORRECTED SUMMARY: ' +
    JSON.stringify({
      evidenceReady:
        result.evidenceReady || 0,

      blocked:
        result.blocked || 0,

      heldAccountCandidates:
        result.heldAccountCandidates || 0,

      protectedAirtableRecordsChanged:
        false,

      lettersMailed:
        0
    })
  );

  console.log(
    'PHASE 9 CORRECTED EVIDENCE BRIDGE COMPLETED'
  );

  return result;
}




