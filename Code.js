function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Phase9_ExecutiveDashboard')
    .setTitle('Moore Holdings Credit Agent');
}

function getDashboardData() {
  const config = getConfig_();

  return {
    personalCount: getAirtableRecordCount_(
      config.baseId,
      config.personalTableId,
      config.token
    ),
    businessCount: getAirtableRecordCount_(
      config.baseId,
      config.businessTableId,
      config.token
    ),
    connectionStatus: 'Online',
    readOnly: true
  };
}

function scanPersonalCredit() {
  const config = getConfig_();

  const records = getAirtableRecords_(
    config.baseId,
    config.personalTableId,
    config.token
  );

  return analyzePersonalCredit_(records);
}

function testPersonalCreditScanner() {
  const results = scanPersonalCredit();

  console.log('PERSONAL CREDIT SCAN SUCCESSFUL');
  console.log('Records scanned: ' + results.recordCount);
  console.log('Missing-data flags: ' + results.summary.missingData);
  console.log(
    'Possible duplicate pairs: ' +
    results.summary.possibleDuplicates
  );
  console.log(
    'Bureau inconsistency flags: ' +
    results.summary.bureauIssues
  );
  console.log(
    'Creditor-role flags: ' +
    results.summary.creditorRoleIssues
  );
  console.log('Total flags: ' + results.summary.totalFlags);
}

function analyzePersonalCredit_(records) {
  const missingData = [];
  const bureauIssues = [];
  const creditorRoleIssues = [];
  const possibleDuplicates = [];

  records.forEach(function(record) {
    const fields = record.fields || {};
    const accountName =
      fields['Account Name'] || 'Unnamed account';
const nonAccountCheck = classifyNonAccount_(fields);

if (nonAccountCheck.isCandidate) {
  return;
}
    const missingFields = [];

    if (isBlank_(fields['Account Name'])) {
      missingFields.push('Account Name');
    }

    if (isBlank_(fields['Acct #'])) {
      missingFields.push('Acct #');
    }

    if (isBlank_(fields['Original Creditor'])) {
      missingFields.push('Original Creditor');
    }

    if (isBlank_(fields['Account Type'])) {
      missingFields.push('Account Type');
    }

    if (isBlank_(fields['Status'])) {
      missingFields.push('Status');
    }

    const reportsExperian = fields['Experian'] === true;
    const reportsTransUnion = fields['TransUnion'] === true;
    const reportsEquifax = fields['Equifax'] === true;

    if (
      !reportsExperian &&
      !reportsTransUnion &&
      !reportsEquifax
    ) {
      missingFields.push('No bureau selected');
    }

    if (
      reportsExperian &&
      isBlank_(fields['EXP  Balance'])
    ) {
      missingFields.push('EXP Balance');
    }

    if (
      reportsTransUnion &&
      isBlank_(fields['TU Balance'])
    ) {
      missingFields.push('TU Balance');
    }

    if (
      reportsEquifax &&
      isBlank_(fields['EQ Balance'])
    ) {
      missingFields.push('EQ Balance');
    }

    if (
      reportsExperian &&
      isBlank_(fields['EXP DOFD'])
    ) {
      missingFields.push('EXP DOFD');
    }

    if (
      reportsTransUnion &&
      isBlank_(fields['TU DOFD'])
    ) {
      missingFields.push('TU DOFD');
    }

    if (
      reportsEquifax &&
      isBlank_(fields['EQ  DOFD'])
    ) {
      missingFields.push('EQ DOFD');
    }

    if (missingFields.length > 0) {
      missingData.push({
        recordId: record.id,
        accountName: accountName,
        missingFields: missingFields
      });
    }

    const bureauRecordIssues =
      findBureauIssues_(fields);

    bureauRecordIssues.forEach(function(issue) {
      bureauIssues.push({
        recordId: record.id,
        accountName: accountName,
        issue: issue
      });
    });

    const roleIssues =
      findCreditorRoleIssues_(fields);

    roleIssues.forEach(function(issue) {
      creditorRoleIssues.push({
        recordId: record.id,
        accountName: accountName,
        issue: issue
      });
    });
  });

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const duplicateResult =
        comparePossibleDuplicates_(
          records[i],
          records[j]
        );

      if (duplicateResult) {
        possibleDuplicates.push(duplicateResult);
      }
    }
  }

  possibleDuplicates.sort(function(a, b) {
    return b.score - a.score;
  });

  const totalFlags =
    missingData.length +
    possibleDuplicates.length +
    bureauIssues.length +
    creditorRoleIssues.length;

    const priorityActions = buildPriorityActions_(
  missingData,
  possibleDuplicates,
  bureauIssues,
  creditorRoleIssues
);

  return {
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    summary: {
      missingData: missingData.length,
      possibleDuplicates: possibleDuplicates.length,
      bureauIssues: bureauIssues.length,
      creditorRoleIssues: creditorRoleIssues.length,
      totalFlags: totalFlags
    },
    missingData: missingData,
    possibleDuplicates: possibleDuplicates,
    bureauIssues: bureauIssues,
    creditorRoleIssues: creditorRoleIssues,
    priorityActions: priorityActions,
    readOnly: true
  };
}
function scanNonAccountCandidates() {
  const config = getConfig_();

  const records = getAirtableRecords_(
    config.baseId,
    config.personalTableId,
    config.token
  );

  const candidates = [];

  records.forEach(function(record) {
    const fields = record.fields || {};
    const result = classifyNonAccount_(fields);

    if (result.isCandidate) {
      candidates.push({
        recordId: record.id,
        accountName:
          fields['Account Name'] || 'Unnamed account',
        reason: result.reason
      });
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    recordsScanned: records.length,
    candidateCount: candidates.length,
    candidates: candidates,
    readOnly: true
  };
}

function classifyNonAccount_(fields) {
  const accountName = String(
    fields['Account Name'] || ''
  ).trim();

  const normalizedName = accountName.toLowerCase();

  const hasAccountEvidence = [
    fields['Acct #'],
    fields['Original Creditor'],
    fields['Debt Buyer'],
    fields['Account Type'],
    fields['Status'],
    fields['EXP Balance'],
    fields['TU Balance'],
    fields['EQ Balance'],
    fields['EXP DOFD'],
    fields['TU DOFD'],
    fields['EQ DOFD']
  ].some(function(value) {
    return value !== undefined &&
      value !== null &&
      String(value).trim() !== '';
  });

  const hasBureauSelection =
    fields['Experian'] === true ||
    fields['TransUnion'] === true ||
    fields['Equifax'] === true;

  if (!accountName && !hasAccountEvidence && !hasBureauSelection) {
    return {
      isCandidate: true,
      reason: 'Blank record with no credit-account information'
    };
  }
const disputeDocumentPatterns = [
  'dispute april',
  'bureau dispute',
  'experian dispute',
  'transunion dispute',
  'trans union dispute',
  'equifax dispute',
  'dispute results',
  'dispute reminder'
];

const matchedDisputeDocument =
  disputeDocumentPatterns.some(function(pattern) {
    return normalizedName.indexOf(pattern) !== -1;
  });

if (matchedDisputeDocument) {
  return {
    isCandidate: true,
    reason: 'Appears to be a dispute document rather than a credit account'
  };
}

if (hasAccountEvidence || hasBureauSelection) {
    return {
      isCandidate: false,
      reason: ''
    };
  }

  const notificationPatterns = [
    'score went up',
    'score changed',
    'potentially negative alert',
    'monthly account statement',
    'dispute results are ready',
    'reminder'
  ];

  const matchedNotification =
    notificationPatterns.some(function(pattern) {
      return normalizedName.indexOf(pattern) !== -1;
    });

  if (matchedNotification) {
    return {
      isCandidate: true,
      reason: 'Appears to be an email alert, reminder, or notification'
    };
  }

  const bureauLabels = [
    'experian',
    'equifax',
    'transunion',
    'trans union'
  ];

  if (bureauLabels.indexOf(normalizedName) !== -1) {
    return {
      isCandidate: true,
      reason: 'Bureau label without credit-account information'
    };
  }

  if (
    normalizedName.indexOf('dispute') !== -1 &&
    !hasAccountEvidence
  ) {
    return {
      isCandidate: true,
      reason: 'Dispute note without credit-account information'
    };
  }

  return {
    isCandidate: false,
    reason: ''
  };
}

function testNonAccountCandidates() {
  const results = scanNonAccountCandidates();

  console.log('DATA QUALITY GATE TEST SUCCESSFUL');
  console.log(
    'Records scanned: ' + results.recordsScanned
  );
  console.log(
    'Non-account candidates: ' + results.candidateCount
  );

  results.candidates.forEach(function(candidate) {
    console.log(
      candidate.accountName +
      ' | ' +
      candidate.reason +
      ' | ' +
      candidate.recordId
    );
  });
}
function findBureauIssues_(fields) {
  const issues = [];

  const bureauData = [
    {
      name: 'Experian',
      reporting: fields['Experian'] === true,
      balance: fields['EXP  Balance'],
      dofd: fields['EXP DOFD']
    },
    {
      name: 'TransUnion',
      reporting: fields['TransUnion'] === true,
      balance: fields['TU Balance'],
      dofd: fields['TU DOFD']
    },
    {
      name: 'Equifax',
      reporting: fields['Equifax'] === true,
      balance: fields['EQ Balance'],
      dofd: fields['EQ  DOFD']
    }
  ];

  bureauData.forEach(function(bureau) {
    if (
      !bureau.reporting &&
      !isBlank_(bureau.balance)
    ) {
      issues.push(
        bureau.name +
        ' has a balance but is not marked as reporting.'
      );
    }

    if (
      !bureau.reporting &&
      !isBlank_(bureau.dofd)
    ) {
      issues.push(
        bureau.name +
        ' has a DOFD but is not marked as reporting.'
      );
    }
  });

  const reportedBalances = bureauData
    .filter(function(bureau) {
      return (
        bureau.reporting &&
        !isBlank_(bureau.balance)
      );
    })
    .map(function(bureau) {
      return Number(bureau.balance);
    });

  const uniqueBalances =
    uniqueValues_(reportedBalances);

  if (uniqueBalances.length > 1) {
    issues.push(
      'Reported bureau balances do not match.'
    );
  }

  const reportedDofds = bureauData
    .filter(function(bureau) {
      return (
        bureau.reporting &&
        !isBlank_(bureau.dofd)
      );
    })
    .map(function(bureau) {
      return new Date(bureau.dofd).getTime();
    })
    .filter(function(value) {
      return !isNaN(value);
    });

  if (reportedDofds.length > 1) {
    const earliest = Math.min.apply(
      null,
      reportedDofds
    );

    const latest = Math.max.apply(
      null,
      reportedDofds
    );

    const differenceInDays =
      Math.round(
        Math.abs(latest - earliest) /
        (1000 * 60 * 60 * 24)
      );

    if (differenceInDays > 31) {
      issues.push(
        'Bureau DOFD dates differ by ' +
        differenceInDays +
        ' days.'
      );
    }
  }

  return issues;
}

function findCreditorRoleIssues_(fields) {
  const issues = [];

  const originalCreditor =
    normalizeText_(fields['Original Creditor']);

  const debtBuyer =
    normalizeText_(fields['Debt Buyer']);

  if (
    originalCreditor &&
    debtBuyer &&
    originalCreditor === debtBuyer
  ) {
    issues.push(
      'Original Creditor and Debt Buyer are identical.'
    );
  }

  if (
    debtBuyer &&
    !originalCreditor
  ) {
    issues.push(
      'Debt Buyer is present but Original Creditor is missing.'
    );
  }

  return issues;
}
function comparePossibleDuplicates_(
  firstRecord,
  secondRecord
) {
  const first = firstRecord.fields || {};
  const second = secondRecord.fields || {};

  let score = 0;
  const reasons = [];

  const firstName =
    normalizeText_(first['Account Name']);

  const secondName =
    normalizeText_(second['Account Name']);

  const firstLast4 =
    getLastFour_(first['Acct #']);

  const secondLast4 =
    getLastFour_(second['Acct #']);

  const firstOriginal =
    normalizeText_(first['Original Creditor']);

  const secondOriginal =
    normalizeText_(second['Original Creditor']);

  const firstBuyer =
    normalizeText_(first['Debt Buyer']);

  const secondBuyer =
    normalizeText_(second['Debt Buyer']);

  if (
    firstLast4 &&
    secondLast4 &&
    firstLast4 === secondLast4
  ) {
    score += 4;
    reasons.push('Same account-number ending');
  }

  if (
    firstName &&
    secondName &&
    firstName === secondName
  ) {
    score += 2;
    reasons.push('Same account name');
  }

  if (
    firstOriginal &&
    secondOriginal &&
    firstOriginal === secondOriginal
  ) {
    score += 2;
    reasons.push('Same original creditor');
  }

  if (
    firstBuyer &&
    secondBuyer &&
    firstBuyer === secondBuyer
  ) {
    score += 2;
    reasons.push('Same debt buyer');
  }

  if (
    first['Date Opened'] &&
    second['Date Opened'] &&
    first['Date Opened'] ===
      second['Date Opened']
  ) {
    score += 1;
    reasons.push('Same opened date');
  }

  if (
    haveMatchingBalance_(
      first,
      second
    )
  ) {
    score += 1;
    reasons.push('Matching bureau balance');
  }

  if (score < 4) {
    return null;
  }

  return {
    recordAId: firstRecord.id,
    recordBId: secondRecord.id,
    accountA:
      first['Account Name'] ||
      'Unnamed account',
    accountB:
      second['Account Name'] ||
      'Unnamed account',
    score: score,
    confidence:
      score >= 6
        ? 'High-confidence possible duplicate'
        : 'Needs manual review',
    reasons: reasons
  };
}

function haveMatchingBalance_(
  first,
  second
) {
  const firstBalances = [
    first['EXP  Balance'],
    first['TU Balance'],
    first['EQ Balance']
  ]
    .filter(function(value) {
      return !isBlank_(value);
    })
    .map(Number);

  const secondBalances = [
    second['EXP  Balance'],
    second['TU Balance'],
    second['EQ Balance']
  ]
    .filter(function(value) {
      return !isBlank_(value);
    })
    .map(Number);

  return firstBalances.some(function(firstValue) {
    return secondBalances.indexOf(firstValue) !== -1;
  });
}

 function getConfig_() {
  return getSharedConfig_();
}

function getAirtableRecordCount_(
  baseId,
  tableId,
  token
) {
  return getSharedAirtableRecordCount_(
    baseId,
    tableId,
    token
  );
}

function getAirtableRecords_(
  baseId,
  tableId,
  token
) {
  return getSharedAirtableRecords_(
    baseId,
    tableId,
    token
  );
}

function normalizeText_(value) {
  return normalizeSharedText_(value);
}

function getLastFour_(value) {
  return getSharedLastFour_(value);
}

function isBlank_(value) {
  return isBlank(value);
}

function uniqueValues_(values) {
  return uniqueSharedValues_(values);
}


/**
 * Converts Personal Credit Scanner findings into a prioritized action list.
 * This function is read-only and does not modify Airtable.
 */
function buildPriorityActions_(
  missingData,
  possibleDuplicates,
  bureauIssues,
  creditorRoleIssues
) {
  return buildSharedPriorityActions_(
    missingData,
    possibleDuplicates,
    bureauIssues,
    creditorRoleIssues
  );
}


/**
 * PHASE 2 — CREDIT REPORT IMPORT ENGINE
 *
 * Prepares extracted credit-report text for account parsing.
 * This function is read-only and does not modify Airtable.
 */
function normalizeCreditReportText_(reportText) {
  if (reportText === null || reportText === undefined) {
    return '';
  }

  return String(reportText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


/**
 * Converts normalized credit-report text into usable lines.
 * Blank lines are removed.
 */
function getCreditReportLines_(reportText) {
  const normalizedText = normalizeCreditReportText_(reportText);

  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split('\n')
    .map(function(line) {
      return line.trim();
    })
    .filter(function(line) {
      return line !== '';
    });
}


/**
 * Tests the Phase 2 parser foundation.
 * This does not read the real PDF yet and does not modify Airtable.
 */
function testCreditReportParserFoundation() {
  const sampleText =
    'PORTFOLIO RECOVERY A\r\n' +
    'Account Number: XXXX4361\r\n' +
    'Current Balance: $242\r\n\r\n' +
    'Account Status: COLLECTION';

  const normalizedText = normalizeCreditReportText_(sampleText);
  const lines = getCreditReportLines_(sampleText);

  console.log('PHASE 2 PARSER FOUNDATION SUCCESSFUL');
  console.log('Normalized text: ' + normalizedText);
  console.log('Line count: ' + lines.length);
  console.log(JSON.stringify(lines));
}

/**
 * ============================================================
 * PHASE 2 — LIVE CREDIT REPORT PDF CONNECTION
 * ============================================================
 *
 * Reads the real three-bureau PDF from Google Drive,
 * temporarily converts it to a Google Doc,
 * extracts the report text,
 * and then removes the temporary conversion.
 *
 * READ-ONLY SAFETY:
 * - Does not change Airtable.
 * - Does not change the original PDF.
 * - Does not create permanent report records.
 * - Temporary Google Doc is moved to Trash after extraction.
 */

const PHASE2_CREDIT_REPORT_FILE_ID_ =
  '1JzPA41p9mUaNwJSGM3-QpdxF9FmLMtOP';


/**
 * Returns the real credit-report PDF from Google Drive.
 */
function getPhase2CreditReportFile_() {
  const file = DriveApp.getFileById(
    PHASE2_CREDIT_REPORT_FILE_ID_
  );

  if (!file) {
    throw new Error(
      'The Phase 2 credit-report PDF could not be found.'
    );
  }

  return file;
}


/**
 * Converts the PDF into a temporary Google Doc.
 *
 * The Drive advanced service must be enabled with
 * the identifier Drive.
 */
function convertCreditReportPdfToTemporaryDoc_() {
  const pdfFile = getPhase2CreditReportFile_();

  const properties = PropertiesService.getScriptProperties();
  const sourceSignature =
    pdfFile.getId() + '|' + pdfFile.getLastUpdated().getTime();

  const cachedSignature =
    properties.getProperty('CREDIT_REPORT_OCR_SOURCE_SIGNATURE');

  const cachedDocumentId =
    properties.getProperty('CREDIT_REPORT_OCR_DOCUMENT_ID');

  if (
    cachedDocumentId &&
    cachedSignature === sourceSignature
  ) {
    try {
      DriveApp.getFileById(cachedDocumentId);

      console.log(
        'Reusing cached OCR Google Doc: ' +
        cachedDocumentId
      );

      return cachedDocumentId;
    } catch (error) {
      properties.deleteProperty(
        'CREDIT_REPORT_OCR_DOCUMENT_ID'
      );

      properties.deleteProperty(
        'CREDIT_REPORT_OCR_SOURCE_SIGNATURE'
      );
    }
  }

  const pdfBlob = pdfFile
    .getBlob()
    .setName(pdfFile.getName());

  const temporaryDocName =
    'TEMP_PHASE2_CREDIT_REPORT_' +
    new Date().getTime() +
    '.pdf';

  const resource = {
    title: temporaryDocName
  };

  const convertedFile = Drive.Files.insert(
    resource,
    pdfBlob,
    {
      convert: true,
      ocr: true,
      ocrLanguage: 'en'
    }
  );

  if (!convertedFile || !convertedFile.id) {
    throw new Error(
      'Google Drive did not return a temporary Google Doc ID.'
    );
  }

  console.log(
    'Temporary Google Doc created: ' +
    convertedFile.id
  );
 properties.setProperty(
    'CREDIT_REPORT_OCR_DOCUMENT_ID',
    convertedFile.id
  );

  properties.setProperty(
    'CREDIT_REPORT_OCR_SOURCE_SIGNATURE',
    sourceSignature
  );
  return convertedFile.id;
}


/**
 * Waits for the converted Google Doc to become available.
 */
function openTemporaryCreditReportDoc_(documentId) {
  const maximumAttempts = 10;
  const waitMilliseconds = 2000;
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt++
  ) {
    try {
      return DocumentApp.openById(documentId);
    } catch (error) {
      lastError = error;
      Utilities.sleep(waitMilliseconds);
    }
  }

  throw new Error(
    'The temporary credit-report document could not be opened. ' +
    'Last error: ' +
    (lastError ? lastError.message : 'Unknown error')
  );
}


/**
 * Moves the temporary Google Doc to Trash.
 */
function removeTemporaryCreditReportDoc_(documentId) {
  const cachedDocumentId =
    PropertiesService.getScriptProperties()
      .getProperty('CREDIT_REPORT_OCR_DOCUMENT_ID');

  if (
    cachedDocumentId &&
    documentId === cachedDocumentId
  ) {
    console.log(
      'Keeping cached OCR Google Doc: ' +
      documentId
    );

    return;
  }
  if (!documentId) {
    return;
  }

  try {
    DriveApp.getFileById(documentId).setTrashed(true);
  } catch (error) {
    console.log(
      'Temporary-document cleanup warning: ' +
      error.message
    );
  }
}


/**
 * Reads and normalizes the complete credit-report text.
 *
 * This function does not modify the original report.
 */
function extractLiveCreditReportText_() {
  let temporaryDocumentId = '';

  try {
    temporaryDocumentId =
      convertCreditReportPdfToTemporaryDoc_();

    const document =
      openTemporaryCreditReportDoc_(
        temporaryDocumentId
      );

    const rawText =
      document.getBody().getText();

    const normalizedText =
      normalizeCreditReportText_(rawText);

    if (!normalizedText) {
      throw new Error(
        'The PDF conversion completed, but no readable text was extracted.'
      );
    }

    return normalizedText;
  } finally {
    removeTemporaryCreditReportDoc_(
      temporaryDocumentId
    );
  }
}


/**
 * Creates a read-only summary of the extracted report.
 */
function buildLiveCreditReportSummary_(reportText) {
  const normalizedText =
    normalizeCreditReportText_(reportText);

  const lines =
    getCreditReportLines_(normalizedText);

  const normalizedLower =
    normalizedText.toLowerCase();

  const expectedAccountNames = [
    'portfolio recovery',
    'jefferson capital',
    'lvnv funding',
    'austin capital bank',
    'mdg usa',
    'mission lane',
    'first premier',
    'chime',
    'affirm',
    'kovo',
    'lead bank',
    'wise credit'
  ];

  const detectedAccounts = [];

  expectedAccountNames.forEach(function(accountName) {
    if (
      normalizedLower.indexOf(accountName) !== -1
    ) {
      detectedAccounts.push(accountName);
    }
  });

  return {
    fileId: PHASE2_CREDIT_REPORT_FILE_ID_,
    characterCount: normalizedText.length,
    lineCount: lines.length,
    detectedAccountCount:
      detectedAccounts.length,
    detectedAccounts:
      detectedAccounts,
    preview:
      normalizedText.substring(0, 2500)
  };
}


/**
 * LIVE PHASE 2 TEST
 *
 * Reads the actual ernest_moore_jr.pdf report.
 *
 * This test is read-only and does not modify Airtable.
 */
function testReadLiveCreditReport() {
  console.log(
    'PHASE 2 LIVE CREDIT REPORT TEST STARTED'
  );

  const pdfFile =
    getPhase2CreditReportFile_();

  console.log(
    'PDF file name: ' +
    pdfFile.getName()
  );

  console.log(
    'PDF file ID: ' +
    pdfFile.getId()
  );

  console.log(
    'PDF MIME type: ' +
    pdfFile.getMimeType()
  );

  console.log(
    'PDF file size: ' +
    pdfFile.getSize() +
    ' bytes'
  );

  const reportText =
    extractLiveCreditReportText_();

  const summary =
    buildLiveCreditReportSummary_(
      reportText
    );

  console.log(
    'PHASE 2 LIVE CREDIT REPORT READ SUCCESSFUL'
  );

  console.log(
    'Character count: ' +
    summary.characterCount
  );

  console.log(
    'Line count: ' +
    summary.lineCount
  );

  console.log(
    'Detected account names: ' +
    summary.detectedAccountCount
  );

  console.log(
    JSON.stringify(
      summary.detectedAccounts
    )
  );

  console.log(
    'REPORT TEXT PREVIEW:\n' +
    summary.preview
  );

  console.log(
    'PHASE 2 LIVE CREDIT REPORT TEST COMPLETED'
  );

  return summary;
}

/**
 * ============================================================
 * PHASE 2 — CREDIT REPORT ACCOUNT INDEX
 * ============================================================
 *
 * Builds a read-only structured account list from the
 * table of contents inside the live three-bureau report.
 *
 * This does not modify Airtable.
 */


/**
 * Cleans OCR-generated account names.
 */
function cleanCreditReportAccountName_(accountName) {
  return String(accountName || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\.$/, '')
    .trim();
}


/**
 * Converts a table-of-contents account line into a record.
 *
 * Expected examples:
 * 2.2 Mission Lane Tab Ban (CLOSED) 5
 * 4.3 Austin Capital Bank (CLOSED) 39
 * 4.11 Lvnv Funding Llc (CLOSED) 55
 */
function parseCreditReportTocAccountLine_(line) {
  const normalizedLine = String(line || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedLine) {
    return null;
  }

  const match = normalizedLine.match(
    /^(\d+)\.(\d+)\s+(.+?)\s+(\d{1,3})$/
  );

  if (!match) {
    return null;
  }

  const sectionNumber = Number(match[1]);
  const accountNumber = Number(match[2]);
  const rawAccountName = cleanCreditReportAccountName_(
    match[3]
  );
  const pageNumber = Number(match[4]);

  if (
    !rawAccountName ||
    !Number.isFinite(sectionNumber) ||
    !Number.isFinite(accountNumber) ||
    !Number.isFinite(pageNumber)
  ) {
    return null;
  }

  const isClosed =
    /CLOSED/i.test(rawAccountName);

  const accountName = cleanCreditReportAccountName_(
    rawAccountName.replace(/CLOSED/gi, '')
  );

  if (!accountName) {
    return null;
  }

  return {
    section: sectionNumber + '.' + accountNumber,
    sectionNumber: sectionNumber,
    accountNumber: accountNumber,
    accountName: accountName,
    reportStatus: isClosed ? 'CLOSED' : 'OPEN_OR_UNSPECIFIED',
    pageNumber: pageNumber,
    source: 'Credit report table of contents'
  };
}


/**
 * Splits OCR text into possible table-of-contents entries.
 *
 * OCR may place several entries on the same line, so this
 * function inserts line breaks before section numbers such as
 * 2.1, 2.2, 4.3, and 4.11.
 */
function getCreditReportTocCandidateLines_(reportText) {
  const normalizedText =
    normalizeCreditReportText_(reportText);

  if (!normalizedText) {
    return [];
  }

  const tocStartIndex =
    normalizedText.indexOf('1. Report Summary');

  const tocEndMarkers = [
    'Personal Information',
    'Report Summary',
    'Credit Score',
    'Consumer Statement'
  ];

  let tocText =
    tocStartIndex >= 0
      ? normalizedText.substring(tocStartIndex)
      : normalizedText;

  let tocEndIndex = -1;

  tocEndMarkers.forEach(function(marker) {
    const markerIndex =
      tocText.indexOf(marker, 50);

    if (
      markerIndex > 0 &&
      (
        tocEndIndex === -1 ||
        markerIndex < tocEndIndex
      )
    ) {
      tocEndIndex = markerIndex;
    }
  });

  if (tocEndIndex > 0) {
    tocText = tocText.substring(0, tocEndIndex);
  } else {
    tocText = tocText.substring(
      0,
      Math.min(tocText.length, 12000)
    );
  }

  tocText = tocText.replace(
    /(\s)(\d+\.\d+\s+)/g,
    '\n$2'
  );

  return tocText
    .split('\n')
    .map(function(line) {
      return line.trim();
    })
    .filter(function(line) {
      return /^\d+\.\d+\s+/.test(line);
    });
}


/**
 * Removes duplicate table-of-contents entries.
 */
function deduplicateCreditReportAccountIndex_(accounts) {
  const seen = {};
  const uniqueAccounts = [];

  accounts.forEach(function(account) {
    const key = [
      account.section,
      account.accountName.toLowerCase(),
      account.pageNumber
    ].join('|');

    if (!seen[key]) {
      seen[key] = true;
      uniqueAccounts.push(account);
    }
  });

  return uniqueAccounts;
}


/**
 * Builds the structured report account index.
 */
function buildCreditReportAccountIndex_(reportText) {
  const candidateLines =
    getCreditReportTocCandidateLines_(reportText);

  const parsedAccounts = [];

  candidateLines.forEach(function(line) {
    const parsedAccount =
      parseCreditReportTocAccountLine_(line);

    if (parsedAccount) {
      parsedAccounts.push(parsedAccount);
    }
  });

  const uniqueAccounts =
    deduplicateCreditReportAccountIndex_(
      parsedAccounts
    );

  uniqueAccounts.sort(function(a, b) {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }

    if (a.sectionNumber !== b.sectionNumber) {
      return a.sectionNumber - b.sectionNumber;
    }

    return a.accountNumber - b.accountNumber;
  });

  return {
    candidateLineCount: candidateLines.length,
    accountCount: uniqueAccounts.length,
    accounts: uniqueAccounts
  };
}


function testBuildCreditReportAccountIndex() {

  const reportText = extractLiveCreditReportText_();

  const index = buildCreditReportAccountIndex_(reportText);

  console.log(
    'Candidate lines: ' +
    index.candidateLineCount
  );

  console.log(
    'Unique accounts: ' +
    index.accountCount
  );

  console.log(
    JSON.stringify(
      index.accounts,
      null,
      2
    )
  );

  return index;
}

/**
 * ============================================================
 * PHASE 3A — LIVE ACCOUNT SECTION LOCATOR
 * ============================================================
 *
 * Finds the actual account-detail section for accounts listed
 * in the report index.
 *
 * READ-ONLY:
 * This does not modify Airtable or the original PDF.
 */


/**
 * Cleans an indexed account name before searching the report.
 */
function cleanAccountNameForSectionSearch_(accountName) {
  return String(accountName || '')
    .replace(/\s*\(CLOSED\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Creates a shorter fallback search value for OCR variations.
 */
function buildAccountNameFallback_(accountName) {
  const cleanedName =
    cleanAccountNameForSectionSearch_(accountName);

  const words = cleanedName
    .split(' ')
    .filter(function(word) {
      return word.length >= 3;
    });

  return words
    .slice(0, 4)
    .join(' ')
    .trim();
}


/**
 * Locates an account after the report's table-of-contents area.
 */
function locateCreditReportAccountSection_(
  reportText,
  accountName
) {
  const sourceText = String(reportText || '');

  const cleanedName =
    cleanAccountNameForSectionSearch_(accountName);

  const fallbackName =
    buildAccountNameFallback_(accountName);

  if (!sourceText || !cleanedName) {
    return {
      found: false,
      accountName: cleanedName,
      searchMethod: 'INVALID_INPUT',
      startIndex: -1,
      preview: ''
    };
  }

  const lowerText = sourceText.toLowerCase();

  const primarySearch =
    cleanedName.toLowerCase();

  const fallbackSearch =
    fallbackName.toLowerCase();

  /*
   * Skip the front of the report where the table of contents
   * appears. The actual account pages occur later.
   */
  const detailSearchStart = Math.min(
    12000,
    Math.floor(sourceText.length * 0.15)
  );

  let matchIndex =
    lowerText.indexOf(
      primarySearch,
      detailSearchStart
    );

  let searchMethod = 'FULL_ACCOUNT_NAME';

  if (
    matchIndex === -1 &&
    fallbackSearch &&
    fallbackSearch !== primarySearch
  ) {
    matchIndex =
      lowerText.indexOf(
        fallbackSearch,
        detailSearchStart
      );

    searchMethod = 'FALLBACK_ACCOUNT_NAME';
  }

  if (matchIndex === -1) {
    return {
      found: false,
      accountName: cleanedName,
      searchMethod: 'NOT_FOUND',
      startIndex: -1,
      preview: ''
    };
  }

  const previewStart =
    Math.max(0, matchIndex - 150);

  const previewEnd =
    Math.min(
      sourceText.length,
      matchIndex + 1400
    );

  const preview = sourceText
    .substring(previewStart, previewEnd)
    .replace(/\s+/g, ' ')
    .trim();

  return {
    found: true,
    accountName: cleanedName,
    searchMethod: searchMethod,
    startIndex: matchIndex,
    preview: preview
  };
}


/**
 * Builds read-only section-location results.
 */
function buildLiveAccountSectionLocations_(
  reportText,
  accountIndex,
  maximumAccounts
) {
  const accounts =
    accountIndex &&
    Array.isArray(accountIndex.accounts)
      ? accountIndex.accounts
      : [];

  const limit = Math.min(
    Number(maximumAccounts) || accounts.length,
    accounts.length
  );

  const results = [];

  for (let index = 0; index < limit; index++) {
    const account = accounts[index];

    const location =
      locateCreditReportAccountSection_(
        reportText,
        account.accountName
      );

    results.push({
      index: index + 1,
      section: account.section,
      indexedAccountName: account.accountName,
      pageNumber: account.pageNumber,
      found: location.found,
      searchMethod: location.searchMethod,
      startIndex: location.startIndex,
      preview: location.preview
    });
  }

  return results;
}


/**
 * READ-ONLY TEST
 *
 * Tests the first eight indexed accounts so the execution log
 * remains small enough to inspect.
 */
function testLocateLiveCreditReportAccountSections() {
  console.log(
    'PHASE 3A ACCOUNT SECTION LOCATOR STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const results =
    buildLiveAccountSectionLocations_(
      reportText,
      accountIndex,
      8
    );

  const locatedCount =
    results.filter(function(result) {
      return result.found;
    }).length;

  console.log(
    'Accounts tested: ' +
    results.length
  );

  console.log(
    'Account sections located: ' +
    locatedCount
  );

  results.forEach(function(result) {
    console.log(
      JSON.stringify(result)
    );
  });

  console.log(
    'PHASE 3A ACCOUNT SECTION LOCATOR COMPLETED'
  );

  return {
    accountsTested: results.length,
    sectionsLocated: locatedCount,
    results: results
  };
}

/**
 * ============================================================
 * PHASE 3B — CORE ACCOUNT DETAIL EXTRACTION
 * ============================================================
 *
 * Extracts core fields from located account-detail sections.
 *
 * READ-ONLY:
 * This does not modify Airtable or the original PDF.
 */


/**
 * Converts OCR money text into a number.
 *
 * Examples:
 * "$3,280" -> 3280
 * "N/A"    -> null
 */
function parseCreditReportMoney_(value) {
  const text = String(value || '').trim();

  if (
    !text ||
    /^N\/A$/i.test(text) ||
    /^NA$/i.test(text)
  ) {
    return null;
  }

  const cleaned = text.replace(/[^0-9.-]/g, '');

  if (!cleaned) {
    return null;
  }

  const numberValue = Number(cleaned);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}


/**
 * Finds the first matching value from a list of patterns.
 */
function findFirstCreditReportValue_(
  sourceText,
  patterns
) {
  const text = String(sourceText || '');

  for (let index = 0; index < patterns.length; index++) {
    const match = text.match(patterns[index]);

    if (match && match[1]) {
      return String(match[1]).trim();
    }
  }

  return '';
}


/**
 * Extracts a masked account number from an account preview.
 */
function extractCreditReportAccountNumber_(preview) {
  return findFirstCreditReportValue_(
    preview,
    [
      /Account Number\s+([xX*0-9\-]{3,30})/i,
      /Acct(?:ount)?\s*#\s*([xX*0-9\-]{3,30})/i
    ]
  );
}


/**
 * Extracts the account status text.
 */
function extractCreditReportAccountStatus_(preview) {
  return findFirstCreditReportValue_(
    preview,
    [
      /Account Status\s+(.+?)(?=\s+Credit Limit|\s+Reported Balance|\s+High Balance|\s+Payment History|$)/i,
      /Payment Status\s+(.+?)(?=\s+Credit Limit|\s+Reported Balance|\s+High Balance|\s+Payment History|$)/i
    ]
  );
}


/**
 * Extracts the credit limit.
 */
function extractCreditReportCreditLimit_(preview) {
  const rawValue = findFirstCreditReportValue_(
    preview,
    [
      /Credit Limit\s+\$?([0-9,]+|N\/A)/i,
      /Limit\s+\$?([0-9,]+|N\/A)/i
    ]
  );

  return parseCreditReportMoney_(rawValue);
}


/**
 * Extracts the reported balance.
 */
function extractCreditReportReportedBalance_(preview) {
  const rawValue = findFirstCreditReportValue_(
    preview,
    [
      /Reported Balance\s+\$?([0-9,]+|N\/A)/i,
      /Current Balance\s+\$?([0-9,]+|N\/A)/i
    ]
  );

  return parseCreditReportMoney_(rawValue);
}


/**
 * Extracts the high-balance amount when present.
 */
function extractCreditReportHighBalance_(preview) {
  const rawValue = findFirstCreditReportValue_(
    preview,
    [
      /High Balance\s+\$?([0-9,]+|N\/A)/i,
      /High Credit\s+\$?([0-9,]+|N\/A)/i
    ]
  );

  return parseCreditReportMoney_(rawValue);
}


/**
 * Extracts the first core structured record from a located
 * account section.
 */
function extractCoreCreditReportAccountDetails_(
  indexedAccount,
  location
) {
  const preview =
    location && location.preview
      ? location.preview
      : '';

  const accountNumber =
    extractCreditReportAccountNumber_(preview);

  const accountStatus =
    extractCreditReportAccountStatus_(preview);

  const creditLimit =
    extractCreditReportCreditLimit_(preview);

  const reportedBalance =
    extractCreditReportReportedBalance_(preview);

  const highBalance =
    extractCreditReportHighBalance_(preview);

  let confidence = 'LOW';

  const populatedFieldCount = [
    accountNumber,
    accountStatus,
    creditLimit,
    reportedBalance,
    highBalance
  ].filter(function(value) {
    return value !== '' &&
      value !== null &&
      value !== undefined;
  }).length;

  if (populatedFieldCount >= 4) {
    confidence = 'HIGH';
  } else if (populatedFieldCount >= 2) {
    confidence = 'MEDIUM';
  }

  return {
    section: indexedAccount.section,
    accountName: indexedAccount.accountName,
    pageNumber: indexedAccount.pageNumber,
    sectionFound: Boolean(location.found),
    searchMethod: location.searchMethod,
    accountNumber: accountNumber || null,
    accountStatus: accountStatus || null,
    creditLimit: creditLimit,
    reportedBalance: reportedBalance,
    highBalance: highBalance,
    populatedFieldCount: populatedFieldCount,
    confidence: confidence,
    preview: preview
  };
}


/**
 * Builds core details for a limited number of indexed accounts.
 */
function buildCoreCreditReportAccountDetails_(
  reportText,
  accountIndex,
  maximumAccounts
) {
  const accounts =
    accountIndex &&
    Array.isArray(accountIndex.accounts)
      ? accountIndex.accounts
      : [];

  const limit = Math.min(
    Number(maximumAccounts) || accounts.length,
    accounts.length
  );

  const results = [];

  for (let index = 0; index < limit; index++) {
    const indexedAccount = accounts[index];

    const location =
      locateCreditReportAccountSection_(
        reportText,
        indexedAccount.accountName
      );

    results.push(
      extractCoreCreditReportAccountDetails_(
        indexedAccount,
        location
      )
    );
  }

  return results;
}


/**
 * READ-ONLY TEST
 *
 * Tests the first three accounts.
 */
function testExtractCoreCreditReportAccountDetails() {
  console.log(
    'PHASE 3B CORE ACCOUNT EXTRACTION STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const results =
    buildCoreCreditReportAccountDetails_(
      reportText,
      accountIndex,
      3
    );

  const highConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'HIGH';
    }).length;

  console.log(
    'Accounts tested: ' +
    results.length
  );

  console.log(
    'High-confidence records: ' +
    highConfidenceCount
  );

  results.forEach(function(result) {
    console.log(
      JSON.stringify(result)
    );
  });

  console.log(
    'PHASE 3B CORE ACCOUNT EXTRACTION COMPLETED'
  );

  return {
    accountsTested: results.length,
    highConfidenceRecords: highConfidenceCount,
    results: results
  };
}

/**
 * ============================================================
 * PHASE 3C — FLEXIBLE ACCOUNT SECTION MATCHING
 * ============================================================
 *
 * Improves matching for OCR abbreviations, truncated names,
 * slash characters, bank-name variations, and CLOSED labels.
 *
 * READ-ONLY:
 * No Airtable records are modified.
 */


/**
 * Normalizes creditor names for flexible comparison.
 */
function normalizeCreditReportCreditorName_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(closed\)/gi, ' ')
    .replace(/[\/\\|(),.&'-]/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\bbank\b/g, ' ')
    .replace(/\bbancorp\b/g, ' ')
    .replace(/\bcompany\b/g, ' ')
    .replace(/\binc\b/g, ' ')
    .replace(/\bllc\b/g, ' ')
    .replace(/\bltd\b/g, ' ')
    .replace(/\bna\b/g, ' ')
    .replace(/\bn a\b/g, ' ')
    .replace(/\btab\b/g, ' ')
    .replace(/\bban\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Returns useful account-name tokens.
 */
function getCreditReportCreditorTokens_(accountName) {
  return normalizeCreditReportCreditorName_(accountName)
    .split(' ')
    .map(function(token) {
      return token.trim();
    })
    .filter(function(token) {
      return token.length >= 4;
    });
}


/**
 * Searches the real account-detail portion of the report using
 * multiple matching strategies.
 */
function locateCreditReportAccountSectionFlexible_(
  reportText,
  accountName
) {
  const sourceText = String(reportText || '');

  const cleanedName =
    cleanAccountNameForSectionSearch_(accountName);

  if (!sourceText || !cleanedName) {
    return {
      found: false,
      accountName: cleanedName,
      searchMethod: 'INVALID_INPUT',
      startIndex: -1,
      preview: ''
    };
  }

  const lowerText = sourceText.toLowerCase();

  const detailSearchStart = Math.min(
    12000,
    Math.floor(sourceText.length * 0.15)
  );

  const searchValues = [];

  searchValues.push({
    value: cleanedName.toLowerCase(),
    method: 'FULL_ACCOUNT_NAME'
  });

  const normalizedName =
    normalizeCreditReportCreditorName_(cleanedName);

  if (normalizedName) {
    searchValues.push({
      value: normalizedName,
      method: 'NORMALIZED_ACCOUNT_NAME'
    });
  }

  const tokens =
    getCreditReportCreditorTokens_(cleanedName);

  if (tokens.length >= 2) {
    searchValues.push({
      value: tokens.slice(0, 2).join(' '),
      method: 'FIRST_TWO_TOKENS'
    });
  }

  if (tokens.length >= 1) {
    searchValues.push({
      value: tokens[0],
      method: 'PRIMARY_TOKEN'
    });
  }

  let matchIndex = -1;
  let searchMethod = 'NOT_FOUND';

  for (
    let searchIndex = 0;
    searchIndex < searchValues.length;
    searchIndex++
  ) {
    const searchItem = searchValues[searchIndex];

    if (!searchItem.value) {
      continue;
    }

    matchIndex = lowerText.indexOf(
      searchItem.value,
      detailSearchStart
    );

    if (matchIndex !== -1) {
      searchMethod = searchItem.method;
      break;
    }
  }

  /*
   * Token proximity fallback:
   * Find the first meaningful token, then verify another token
   * appears nearby. This helps with shortened bank names.
   */
  if (
    matchIndex === -1 &&
    tokens.length >= 2
  ) {
    let tokenStart = lowerText.indexOf(
      tokens[0],
      detailSearchStart
    );

    while (tokenStart !== -1) {
      const nearbyText = lowerText.substring(
        tokenStart,
        Math.min(
          lowerText.length,
          tokenStart + 350
        )
      );

      const secondTokenFound =
        tokens.slice(1).some(function(token) {
          return nearbyText.indexOf(token) !== -1;
        });

      if (secondTokenFound) {
        matchIndex = tokenStart;
        searchMethod = 'TOKEN_PROXIMITY';
        break;
      }

      tokenStart = lowerText.indexOf(
        tokens[0],
        tokenStart + tokens[0].length
      );
    }
  }

  if (matchIndex === -1) {
    return {
      found: false,
      accountName: cleanedName,
      searchMethod: 'NOT_FOUND',
      startIndex: -1,
      preview: ''
    };
  }

  const previewStart =
    Math.max(0, matchIndex - 200);

  const previewEnd =
    Math.min(
      sourceText.length,
      matchIndex + 1800
    );

  return {
    found: true,
    accountName: cleanedName,
    searchMethod: searchMethod,
    startIndex: matchIndex,
    preview: sourceText
      .substring(previewStart, previewEnd)
      .replace(/\s+/g, ' ')
      .trim()
  };
}


/**
 * Builds core account details using the flexible locator.
 */
function buildFlexibleCoreCreditReportDetails_(
  reportText,
  accountIndex,
  maximumAccounts
) {
  const accounts =
    accountIndex &&
    Array.isArray(accountIndex.accounts)
      ? accountIndex.accounts
      : [];

  const limit = Math.min(
    Number(maximumAccounts) || accounts.length,
    accounts.length
  );

  const results = [];

  for (let index = 0; index < limit; index++) {
    const indexedAccount = accounts[index];

    const location =
      locateCreditReportAccountSectionFlexible_(
        reportText,
        indexedAccount.accountName
      );

    results.push(
      extractCoreCreditReportAccountDetails_(
        indexedAccount,
        location
      )
    );
  }

  return results;
}


/**
 * READ-ONLY TEST
 *
 * Retests the first five accounts using flexible matching.
 */
function testFlexibleCoreCreditReportExtraction() {
  console.log(
    'PHASE 3C FLEXIBLE ACCOUNT MATCHING STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const results =
    buildFlexibleCoreCreditReportDetails_(
      reportText,
      accountIndex,
      5
    );

  const locatedCount =
    results.filter(function(result) {
      return result.sectionFound;
    }).length;

  const highConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'HIGH';
    }).length;

  console.log(
    'Accounts tested: ' +
    results.length
  );

  console.log(
    'Sections located: ' +
    locatedCount
  );

  console.log(
    'High-confidence records: ' +
    highConfidenceCount
  );

  results.forEach(function(result) {
    console.log(
      JSON.stringify({
        section: result.section,
        accountName: result.accountName,
        sectionFound: result.sectionFound,
        searchMethod: result.searchMethod,
        accountNumber: result.accountNumber,
        accountStatus: result.accountStatus,
        creditLimit: result.creditLimit,
        reportedBalance: result.reportedBalance,
        highBalance: result.highBalance,
        confidence: result.confidence
      })
    );
  });

  console.log(
    'PHASE 3C FLEXIBLE ACCOUNT MATCHING COMPLETED'
  );

  return {
    accountsTested: results.length,
    sectionsLocated: locatedCount,
    highConfidenceRecords: highConfidenceCount,
    results: results
  };
}

/**
 * ============================================================
 * PHASE 4A — STRUCTURED ACCOUNT FIELD EXTRACTION
 * ============================================================
 *
 * Extracts additional account fields from live credit-report
 * account sections.
 *
 * READ-ONLY:
 * This does not modify Airtable or the original PDF.
 */


/**
 * Converts a credit-report date into MM/DD/YYYY when possible.
 */
function normalizeCreditReportDate_(value) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    !text ||
    /^N\/A$/i.test(text) ||
    /^NA$/i.test(text) ||
    /^null$/i.test(text)
  ) {
    return null;
  }

  const numericDate = text.match(
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/
  );

  if (numericDate) {
    const month = numericDate[1].padStart(2, '0');
    const day = numericDate[2].padStart(2, '0');

    let year = numericDate[3];

    if (year.length === 2) {
      year =
        Number(year) >= 70
          ? '19' + year
          : '20' + year;
    }

    return month + '/' + day + '/' + year;
  }

  const monthYear = text.match(
    /\b(\d{1,2})[\/\-](\d{4})\b/
  );

  if (monthYear) {
    return (
      monthYear[1].padStart(2, '0') +
      '/01/' +
      monthYear[2]
    );
  }

  return text;
}


/**
 * Extracts the first date matching any supplied label pattern.
 */
function extractCreditReportDateField_(
  preview,
  patterns
) {
  const rawValue =
    findFirstCreditReportValue_(
      preview,
      patterns
    );

  return normalizeCreditReportDate_(rawValue);
}


/**
 * Extracts Date Opened.
 */
function extractCreditReportDateOpened_(preview) {
  return extractCreditReportDateField_(
    preview,
    [
      /Date Opened\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Account Opened Date\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Opened\s+([0-9\/\-]{6,10}|N\/A)/i
    ]
  );
}


/**
 * Extracts Date Closed.
 */
function extractCreditReportDateClosed_(preview) {
  return extractCreditReportDateField_(
    preview,
    [
      /Date Closed\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Closed Date\s+([0-9\/\-]{6,10}|N\/A)/i
    ]
  );
}


/**
 * Extracts Last Reported / Last Updated date.
 */
function extractCreditReportLastReported_(preview) {
  return extractCreditReportDateField_(
    preview,
    [
      /Last Reported\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Date Reported\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Last Updated\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Reported Date\s+([0-9\/\-]{6,10}|N\/A)/i
    ]
  );
}


/**
 * Extracts Date of First Delinquency when listed.
 */
function extractCreditReportDofd_(preview) {
  return extractCreditReportDateField_(
    preview,
    [
      /Date of First Delinquency\s+([0-9\/\-]{6,10}|N\/A)/i,
      /Date First Major Delinquency Reported\s+([0-9\/\-]{6,10}|N\/A)/i,
      /DOFD\s+([0-9\/\-]{6,10}|N\/A)/i,
      /First Delinquency\s+([0-9\/\-]{6,10}|N\/A)/i
    ]
  );
}


/**
 * Extracts Original Creditor.
 */
function extractCreditReportOriginalCreditor_(preview) {
  const value =
    findFirstCreditReportValue_(
      preview,
      [
        /Original Creditor\s*:?\s*(.+?)(?=\s+Account Type|\s+Account Status|\s+Date Opened|\s+Credit Limit|\s+Reported Balance|$)/i,
        /Creditor Name\s*:?\s*(.+?)(?=\s+Account Type|\s+Account Status|\s+Date Opened|\s+Credit Limit|\s+Reported Balance|$)/i
      ]
    );

  return value || null;
}


/**
 * Extracts Account Type.
 */
function extractCreditReportAccountType_(preview) {
  const value =
    findFirstCreditReportValue_(
      preview,
      [
        /Account Type\s+(.+?)(?=\s+Account Status|\s+Date Opened|\s+Credit Limit|\s+Reported Balance|$)/i,
        /Loan Type Description\s+(.+?)(?=\s+Account Status|\s+Date Opened|\s+Credit Limit|\s+Reported Balance|$)/i
      ]
    );

  return value || null;
}


/**
 * Extracts monthly payment.
 */
function extractCreditReportMonthlyPayment_(preview) {
  const rawValue =
    findFirstCreditReportValue_(
      preview,
      [
        /Monthly Payment\s+\$?([0-9,]+|N\/A)/i,
        /Scheduled Payment\s+\$?([0-9,]+|N\/A)/i,
        /Payment Amount\s+\$?([0-9,]+|N\/A)/i
      ]
    );

  return parseCreditReportMoney_(rawValue);
}


/**
 * Extracts amount past due.
 */
function extractCreditReportPastDue_(preview) {
  const rawValue =
    findFirstCreditReportValue_(
      preview,
      [
        /Past Due Amount\s+\$?([0-9,]+|N\/A)/i,
        /Amount Past Due\s+\$?([0-9,]+|N\/A)/i,
        /Past Due\s+\$?([0-9,]+|N\/A)/i
      ]
    );

  return parseCreditReportMoney_(rawValue);
}


/**
 * Extracts charge-off amount.
 */
function extractCreditReportChargeOffAmount_(preview) {
  const rawValue =
    findFirstCreditReportValue_(
      preview,
      [
        /Charge Off Amount\s+\$?([0-9,]+|N\/A)/i,
        /Charge-Off Amount\s+\$?([0-9,]+|N\/A)/i,
        /Charged Off Amount\s+\$?([0-9,]+|N\/A)/i
      ]
    );

  return parseCreditReportMoney_(rawValue);
}


/**
 * Detects which bureau names appear in the account section.
 */
function extractCreditReportBureauFlags_(preview) {
  const text = String(preview || '').toLowerCase();

  return {
    equifax: text.indexOf('equifax') !== -1,
    experian: text.indexOf('experian') !== -1,
    transUnion:
      text.indexOf('transunion') !== -1 ||
      text.indexOf('trans union') !== -1
  };
}


/**
 * Builds one expanded structured account record.
 */
function extractStructuredCreditReportAccount_(
  indexedAccount,
  location
) {
  const coreRecord =
    extractCoreCreditReportAccountDetails_(
      indexedAccount,
      location
    );

  const preview =
    location && location.preview
      ? location.preview
      : '';

  const dateOpened =
    extractCreditReportDateOpened_(preview);

  const dateClosed =
    extractCreditReportDateClosed_(preview);

  const lastReported =
    extractCreditReportLastReported_(preview);

  const dofd =
    extractCreditReportDofd_(preview);

  const originalCreditor =
    extractCreditReportOriginalCreditor_(preview);

  const accountType =
    extractCreditReportAccountType_(preview);

  const monthlyPayment =
    extractCreditReportMonthlyPayment_(preview);

  const pastDue =
    extractCreditReportPastDue_(preview);

  const chargeOffAmount =
    extractCreditReportChargeOffAmount_(preview);

  const bureauFlags =
    extractCreditReportBureauFlags_(preview);

  const additionalValues = [
    dateOpened,
    dateClosed,
    lastReported,
    dofd,
    originalCreditor,
    accountType,
    monthlyPayment,
    pastDue,
    chargeOffAmount
  ].filter(function(value) {
    return value !== null &&
      value !== '' &&
      value !== undefined;
  }).length;

  const totalPopulatedFieldCount =
    coreRecord.populatedFieldCount +
    additionalValues;

  let structuredConfidence = 'LOW';

  if (
    coreRecord.sectionFound &&
    totalPopulatedFieldCount >= 7
  ) {
    structuredConfidence = 'HIGH';
  } else if (
    coreRecord.sectionFound &&
    totalPopulatedFieldCount >= 3
  ) {
    structuredConfidence = 'MEDIUM';
  }

  return {
    section: coreRecord.section,
    accountName: coreRecord.accountName,
    pageNumber: coreRecord.pageNumber,
    sectionFound: coreRecord.sectionFound,
    searchMethod: coreRecord.searchMethod,

    accountNumber: coreRecord.accountNumber,
    originalCreditor: originalCreditor,
    accountType: accountType,
    accountStatus: coreRecord.accountStatus,

    creditLimit: coreRecord.creditLimit,
    reportedBalance: coreRecord.reportedBalance,
    highBalance: coreRecord.highBalance,
    monthlyPayment: monthlyPayment,
    pastDue: pastDue,
    chargeOffAmount: chargeOffAmount,

    dateOpened: dateOpened,
    dateClosed: dateClosed,
    lastReported: lastReported,
    dofd: dofd,

    bureauFlags: bureauFlags,

    populatedFieldCount:
      totalPopulatedFieldCount,

    confidence:
      structuredConfidence,

    preview: preview
  };
}


/**
 * Builds expanded structured records using the flexible locator.
 */
function buildStructuredCreditReportAccounts_(
  reportText,
  accountIndex,
  maximumAccounts
) {
  const accounts =
    accountIndex &&
    Array.isArray(accountIndex.accounts)
      ? accountIndex.accounts
      : [];

  const limit = Math.min(
    Number(maximumAccounts) || accounts.length,
    accounts.length
  );

  const results = [];

  for (let index = 0; index < limit; index++) {
    const indexedAccount = accounts[index];

    const location =
      locateCreditReportAccountSectionFlexible_(
        reportText,
        indexedAccount.accountName
      );

    results.push(
      extractStructuredCreditReportAccount_(
        indexedAccount,
        location
      )
    );
  }

  return results;
}


/**
 * READ-ONLY TEST
 *
 * Tests five accounts and logs compact structured records.
 */
function testStructuredCreditReportAccountExtraction() {
  console.log(
    'PHASE 4A STRUCTURED EXTRACTION STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const results =
    buildStructuredCreditReportAccounts_(
      reportText,
      accountIndex,
      5
    );

  const locatedCount =
    results.filter(function(result) {
      return result.sectionFound;
    }).length;

  const highConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'HIGH';
    }).length;

  console.log(
    'Accounts tested: ' +
    results.length
  );

  console.log(
    'Sections located: ' +
    locatedCount
  );

  console.log(
    'High-confidence structured records: ' +
    highConfidenceCount
  );

  results.forEach(function(result) {
    console.log(
      JSON.stringify({
        section: result.section,
        accountName: result.accountName,
        sectionFound: result.sectionFound,
        searchMethod: result.searchMethod,

        accountNumber: result.accountNumber,
        originalCreditor: result.originalCreditor,
        accountType: result.accountType,
        accountStatus: result.accountStatus,

        creditLimit: result.creditLimit,
        reportedBalance: result.reportedBalance,
        highBalance: result.highBalance,
        monthlyPayment: result.monthlyPayment,
        pastDue: result.pastDue,
        chargeOffAmount: result.chargeOffAmount,

        dateOpened: result.dateOpened,
        dateClosed: result.dateClosed,
        lastReported: result.lastReported,
        dofd: result.dofd,

        bureauFlags: result.bureauFlags,
        populatedFieldCount:
          result.populatedFieldCount,
        confidence: result.confidence
      })
    );
  });

  console.log(
    'PHASE 4A STRUCTURED EXTRACTION COMPLETED'
  );

  return {
    accountsTested: results.length,
    sectionsLocated: locatedCount,
    highConfidenceRecords:
      highConfidenceCount,
    results: results
  };
}

/**
 * ============================================================
 * PHASE 4B — PRECISE BUREAU FIELD EXTRACTION
 * ============================================================
 *
 * Expands the account-section window and separates bureau
 * values without modifying Airtable.
 */


/**
 * Returns a larger account-detail section for field extraction.
 */
function locateDetailedCreditReportAccountSection_(
  reportText,
  accountName
) {
  const basicLocation =
    locateCreditReportAccountSectionFlexible_(
      reportText,
      accountName
    );

  if (!basicLocation.found) {
    return basicLocation;
  }

  const sourceText = String(reportText || '');

  const previewStart = Math.max(
    0,
    basicLocation.startIndex - 350
  );

  const previewEnd = Math.min(
    sourceText.length,
    basicLocation.startIndex + 5200
  );

  return {
    found: true,
    accountName: basicLocation.accountName,
    searchMethod: basicLocation.searchMethod,
    startIndex: basicLocation.startIndex,
    preview: sourceText
      .substring(previewStart, previewEnd)
      .replace(/\s+/g, ' ')
      .trim()
  };
}


/**
 * Stops extraction before the next known report label.
 */
function trimCreditReportFieldValue_(value) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  const stoppingLabels = [
    'Account Number',
    'Account Status',
    'Payment Status',
    'Credit Limit',
    'Reported Balance',
    'Current Balance',
    'High Balance',
    'Monthly Payment',
    'Past Due',
    'Date Opened',
    'Date Closed',
    'Last Reported',
    'Date Reported',
    'Account Type',
    'Loan Type',
    'Creditor Classification',
    'Activity Designator',
    'Payment History',
    'Payment Summary',
    'Contact Details',
    'Equifax',
    'Experian',
    'TransUnion'
  ];

  let earliestStop = text.length;

  stoppingLabels.forEach(function(label) {
    const labelIndex = text
      .toLowerCase()
      .indexOf(label.toLowerCase(), 1);

    if (
      labelIndex > 0 &&
      labelIndex < earliestStop
    ) {
      earliestStop = labelIndex;
    }
  });

  return text
    .substring(0, earliestStop)
    .trim();
}


/**
 * Extracts text after one label and stops before another label.
 */
function extractBoundedCreditReportField_(
  preview,
  labelPatterns
) {
  const text = String(preview || '');

  for (
    let index = 0;
    index < labelPatterns.length;
    index++
  ) {
    const match = text.match(labelPatterns[index]);

    if (match && match[1] !== undefined) {
      return trimCreditReportFieldValue_(
        match[1]
      );
    }
  }

  return '';
}


/**
 * Extracts the first three values following a report label.
 * The report generally lists values as:
 * Equifax, Experian, TransUnion.
 */
function extractCreditReportBureauTriplet_(
  preview,
  label
) {
  const text = String(preview || '');

  const escapedLabel = String(label)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pattern = new RegExp(
    escapedLabel +
    '\\s+' +
    '(\\$?[xX*0-9,./\\-]+|N\\/A|Yes|No|Open|Closed|Unknown)' +
    '\\s+' +
    '(\\$?[xX*0-9,./\\-]+|N\\/A|Yes|No|Open|Closed|Unknown)' +
    '\\s+' +
    '(\\$?[xX*0-9,./\\-]+|N\\/A|Yes|No|Open|Closed|Unknown)',
    'i'
  );

  const match = text.match(pattern);

  if (!match) {
    return {
      equifax: null,
      experian: null,
      transUnion: null
    };
  }

  return {
    equifax: match[1],
    experian: match[2],
    transUnion: match[3]
  };
}


/**
 * Converts a bureau money triplet into numeric values.
 */
function parseCreditReportMoneyTriplet_(triplet) {
  return {
    equifax:
      parseCreditReportMoney_(triplet.equifax),

    experian:
      parseCreditReportMoney_(triplet.experian),

    transUnion:
      parseCreditReportMoney_(triplet.transUnion)
  };
}


/**
 * Converts a bureau date triplet into normalized dates.
 */
function normalizeCreditReportDateTriplet_(triplet) {
  return {
    equifax:
      normalizeCreditReportDate_(triplet.equifax),

    experian:
      normalizeCreditReportDate_(triplet.experian),

    transUnion:
      normalizeCreditReportDate_(triplet.transUnion)
  };
}


/**
 * Extracts a cleaner account type.
 */
function extractPreciseCreditReportAccountType_(
  preview
) {
  const value =
    extractBoundedCreditReportField_(
      preview,
      [
        /Loan Type\s+(.+?)(?=\s+Creditor Classification|\s+Account Status|\s+Activity Designator|\s+Credit Limit|$)/i,

        /Account Type\s+(.+?)(?=\s+Account Status|\s+Activity Designator|\s+Credit Limit|\s+Reported Balance|$)/i
      ]
    );

  return value || null;
}


/**
 * Extracts creditor classification separately from account type.
 */
function extractCreditReportCreditorClassification_(
  preview
) {
  const value =
    extractBoundedCreditReportField_(
      preview,
      [
        /Creditor Classification\s+(.+?)(?=\s+Account Status|\s+Activity Designator|\s+Credit Limit|\s+Reported Balance|$)/i
      ]
    );

  return value || null;
}


/**
 * Extracts activity designator separately.
 */
function extractCreditReportActivityDesignator_(
  preview
) {
  const value =
    extractBoundedCreditReportField_(
      preview,
      [
        /Activity Designator\s+(.+?)(?=\s+Account Status|\s+Credit Limit|\s+Reported Balance|\s+Payment History|$)/i
      ]
    );

  return value || null;
}


/**
 * Builds one precise bureau-level structured account.
 */
function extractPreciseStructuredCreditAccount_(
  indexedAccount,
  location
) {
  const preview =
    location && location.preview
      ? location.preview
      : '';

  const coreRecord =
    extractCoreCreditReportAccountDetails_(
      indexedAccount,
      location
    );

  const accountNumbers =
    extractCreditReportBureauTriplet_(
      preview,
      'Account Number'
    );

  const creditLimits =
    parseCreditReportMoneyTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Credit Limit'
      )
    );

  const reportedBalances =
    parseCreditReportMoneyTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Reported Balance'
      )
    );

  const dateOpened =
    normalizeCreditReportDateTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Date Opened'
      )
    );

  const dateClosed =
    normalizeCreditReportDateTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Date Closed'
      )
    );

  const lastReported =
    normalizeCreditReportDateTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Last Reported'
      )
    );

  const accountType =
    extractPreciseCreditReportAccountType_(
      preview
    );

  const creditorClassification =
    extractCreditReportCreditorClassification_(
      preview
    );

  const activityDesignator =
    extractCreditReportActivityDesignator_(
      preview
    );

  const originalCreditor =
    extractCreditReportOriginalCreditor_(
      preview
    );

  const accountStatus =
    extractCreditReportAccountStatus_(
      preview
    );

  const bureauFlags =
    extractCreditReportBureauFlags_(
      preview
    );

  const populatedValues = [
    accountNumbers.equifax,
    accountNumbers.experian,
    accountNumbers.transUnion,

    creditLimits.equifax,
    creditLimits.experian,
    creditLimits.transUnion,

    reportedBalances.equifax,
    reportedBalances.experian,
    reportedBalances.transUnion,

    dateOpened.equifax,
    dateOpened.experian,
    dateOpened.transUnion,

    accountType,
    creditorClassification,
    activityDesignator,
    originalCreditor,
    accountStatus
  ].filter(function(value) {
    return value !== null &&
      value !== '' &&
      value !== undefined;
  }).length;

  let confidence = 'LOW';

  if (
    location.found &&
    populatedValues >= 10
  ) {
    confidence = 'HIGH';
  } else if (
    location.found &&
    populatedValues >= 5
  ) {
    confidence = 'MEDIUM';
  }

  return {
    section: indexedAccount.section,
    accountName: indexedAccount.accountName,
    indexedPageNumber:
      indexedAccount.pageNumber,

    sectionFound: location.found,
    searchMethod: location.searchMethod,

    accountNumbers: accountNumbers,

    accountType: accountType,
    originalCreditor: originalCreditor,
    creditorClassification:
      creditorClassification,
    activityDesignator:
      activityDesignator,
    accountStatus: accountStatus,

    creditLimits: creditLimits,
    reportedBalances: reportedBalances,

    dateOpened: dateOpened,
    dateClosed: dateClosed,
    lastReported: lastReported,

    bureauFlags: bureauFlags,

    populatedValueCount:
      populatedValues,

    confidence: confidence,

    preview: preview
  };
}


/**
 * Builds precise structured records for a limited sample.
 */
function buildPreciseStructuredCreditAccounts_(
  reportText,
  accountIndex,
  maximumAccounts
) {
  const accounts =
    accountIndex &&
    Array.isArray(accountIndex.accounts)
      ? accountIndex.accounts
      : [];

  const limit = Math.min(
    Number(maximumAccounts) || accounts.length,
    accounts.length
  );

  const results = [];

  for (
    let index = 0;
    index < limit;
    index++
  ) {
    const indexedAccount = accounts[index];

    const location =
      locateDetailedCreditReportAccountSection_(
        reportText,
        indexedAccount.accountName
      );

    results.push(
      extractPreciseStructuredCreditAccount_(
        indexedAccount,
        location
      )
    );
  }

  return results;
}


/**
 * READ-ONLY TEST
 *
 * Tests five accounts with precise bureau-level extraction.
 */
function testPreciseStructuredCreditReportExtraction() {
  console.log(
    'PHASE 4B PRECISE EXTRACTION STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const results =
    buildPreciseStructuredCreditAccounts_(
      reportText,
      accountIndex,
      5
    );

  const locatedCount =
    results.filter(function(result) {
      return result.sectionFound;
    }).length;

  const highConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'HIGH';
    }).length;

  console.log(
    'Accounts tested: ' +
    results.length
  );

  console.log(
    'Sections located: ' +
    locatedCount
  );

  console.log(
    'High-confidence precise records: ' +
    highConfidenceCount
  );

  results.forEach(function(result) {
    console.log(
      JSON.stringify({
        section: result.section,
        accountName: result.accountName,

        sectionFound:
          result.sectionFound,

        searchMethod:
          result.searchMethod,

        accountNumbers:
          result.accountNumbers,

        accountType:
          result.accountType,

        originalCreditor:
          result.originalCreditor,

        creditorClassification:
          result.creditorClassification,

        activityDesignator:
          result.activityDesignator,

        accountStatus:
          result.accountStatus,

        creditLimits:
          result.creditLimits,

        reportedBalances:
          result.reportedBalances,

        dateOpened:
          result.dateOpened,

        dateClosed:
          result.dateClosed,

        lastReported:
          result.lastReported,

        bureauFlags:
          result.bureauFlags,

        populatedValueCount:
          result.populatedValueCount,

        confidence:
          result.confidence
      })
    );
  });

  console.log(
    'PHASE 4B PRECISE EXTRACTION COMPLETED'
  );

  return {
    accountsTested: results.length,
    sectionsLocated: locatedCount,
    highConfidenceRecords:
      highConfidenceCount,
    results: results
  };
}

/**
 * ============================================================
 * PHASE 4C — CLEAN STRUCTURED ACCOUNT VALUES
 * ============================================================
 *
 * Cleans OCR-expanded field values and creates compact,
 * bureau-level structured records.
 *
 * READ-ONLY:
 * No Airtable records are created or updated.
 */


/**
 * Known labels that mark the beginning of another report field.
 */
function getCreditReportKnownFieldLabels_() {
  return [
    'Account Number',
    'Original Creditor',
    'Creditor Name',
    'Account Type',
    'Loan Type',
    'Loan Type Description',
    'Creditor Classification',
    'Account Status',
    'Payment Status',
    'Activity Designator',
    'Date Opened',
    'Date Closed',
    'Last Reported',
    'Date Reported',
    'Reported Date',
    'Last Updated',
    'Date of First Delinquency',
    'DOFD',
    'Credit Limit',
    'Reported Balance',
    'Current Balance',
    'High Balance',
    'High Credit',
    'Monthly Payment',
    'Scheduled Payment',
    'Past Due',
    'Past Due Amount',
    'Charge Off Amount',
    'Charge-Off Amount',
    'Payment History',
    'Payment Summary',
    'Contact Details',
    'Equifax',
    'Experian',
    'TransUnion',
    'Trans Union'
  ];
}


/**
 * Escapes text for safe use inside a regular expression.
 */
function escapeCreditReportRegex_(value) {
  return String(value || '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * Finds the section after a field label and stops at the next
 * known field label.
 */
function extractStrictCreditReportField_(
  preview,
  fieldLabels
) {
  const text = String(preview || '');

  const nextLabels =
    getCreditReportKnownFieldLabels_()
      .map(function(label) {
        return escapeCreditReportRegex_(label);
      })
      .join('|');

  for (
    let index = 0;
    index < fieldLabels.length;
    index++
  ) {
    const fieldLabel =
      escapeCreditReportRegex_(
        fieldLabels[index]
      );

    const pattern = new RegExp(
      fieldLabel +
      '\\s*:?\\s*' +
      '(.+?)' +
      '(?=\\s+(?:' +
      nextLabels +
      ')\\b|$)',
      'i'
    );

    const match = text.match(pattern);

    if (match && match[1]) {
      return String(match[1])
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  return '';
}


/**
 * Removes repeated OCR triplets from descriptive text fields.
 *
 * Example:
 * "creditcard creditcard creditcard"
 * becomes:
 * "creditcard"
 */
function collapseRepeatedCreditReportWords_(value) {
  const words = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(function(word) {
      return Boolean(word);
    });

  const collapsedWords = [];

  words.forEach(function(word) {
    const previousWord =
      collapsedWords.length
        ? collapsedWords[
            collapsedWords.length - 1
          ]
        : '';

    if (
      word.toLowerCase() !==
      String(previousWord).toLowerCase()
    ) {
      collapsedWords.push(word);
    }
  });

  return collapsedWords.join(' ').trim();
}


/**
 * Removes common bureau triplication.
 *
 * Example:
 * "Pays as Agreed Pays as Agreed Pays as Agreed"
 * becomes:
 * "Pays as Agreed"
 */
function collapseRepeatedCreditReportPhrases_(value) {
  let text = collapseRepeatedCreditReportWords_(
    value
  );

  if (!text) {
    return '';
  }

  const words = text.split(' ');

  for (
    let phraseLength = 1;
    phraseLength <= Math.floor(words.length / 2);
    phraseLength++
  ) {
    const firstPhrase =
      words.slice(0, phraseLength).join(' ');

    const secondPhrase =
      words.slice(
        phraseLength,
        phraseLength * 2
      ).join(' ');

    if (
      firstPhrase &&
      firstPhrase.toLowerCase() ===
      secondPhrase.toLowerCase()
    ) {
      const thirdPhrase =
        words.slice(
          phraseLength * 2,
          phraseLength * 3
        ).join(' ');

      if (
        !thirdPhrase ||
        thirdPhrase.toLowerCase() ===
        firstPhrase.toLowerCase()
      ) {
        return firstPhrase.trim();
      }
    }
  }

  return text;
}


/**
 * Cleans a descriptive report field.
 */
function cleanCreditReportDescription_(value) {
  const text =
    collapseRepeatedCreditReportPhrases_(
      value
    );

  if (
    !text ||
    /^N\/A$/i.test(text) ||
    /^Unknown$/i.test(text) ||
    /^null$/i.test(text)
  ) {
    return null;
  }

  return text;
}


/**
 * Returns the most meaningful non-empty bureau value.
 */
function selectCreditReportPrimaryBureauValue_(
  triplet
) {
  if (!triplet) {
    return null;
  }

  const values = [
    triplet.equifax,
    triplet.experian,
    triplet.transUnion
  ];

  for (
    let index = 0;
    index < values.length;
    index++
  ) {
    const value = values[index];

    if (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !/^N\/A$/i.test(String(value))
    ) {
      return value;
    }
  }

  return null;
}


/**
 * Extracts a strict account type.
 */
function extractCleanCreditReportAccountType_(
  preview
) {
  const rawValue =
    extractStrictCreditReportField_(
      preview,
      [
        'Loan Type Description',
        'Loan Type',
        'Account Type'
      ]
    );

  return cleanCreditReportDescription_(
    rawValue
  );
}


/**
 * Extracts a strict original creditor.
 */
function extractCleanCreditReportOriginalCreditor_(
  preview
) {
  const rawValue =
    extractStrictCreditReportField_(
      preview,
      [
        'Original Creditor',
        'Creditor Name'
      ]
    );

  return cleanCreditReportDescription_(
    rawValue
  );
}


/**
 * Extracts a strict creditor classification.
 */
function extractCleanCreditorClassification_(
  preview
) {
  const rawValue =
    extractStrictCreditReportField_(
      preview,
      [
        'Creditor Classification'
      ]
    );

  return cleanCreditReportDescription_(
    rawValue
  );
}


/**
 * Extracts a strict activity designator.
 */
function extractCleanActivityDesignator_(
  preview
) {
  const rawValue =
    extractStrictCreditReportField_(
      preview,
      [
        'Activity Designator'
      ]
    );

  return cleanCreditReportDescription_(
    rawValue
  );
}


/**
 * Extracts a strict account or payment status.
 */
function extractCleanCreditReportStatus_(
  preview
) {
  const rawValue =
    extractStrictCreditReportField_(
      preview,
      [
        'Account Status',
        'Payment Status'
      ]
    );

  return cleanCreditReportDescription_(
    rawValue
  );
}


/**
 * Counts populated bureau values.
 */
function countCreditReportTripletValues_(
  triplet
) {
  if (!triplet) {
    return 0;
  }

  return [
    triplet.equifax,
    triplet.experian,
    triplet.transUnion
  ].filter(function(value) {
    return value !== null &&
      value !== undefined &&
      value !== '' &&
      !/^N\/A$/i.test(String(value));
  }).length;
}


/**
 * Builds one cleaned structured account.
 */
function extractCleanStructuredCreditAccount_(
  indexedAccount,
  location
) {
  const preview =
    location && location.preview
      ? location.preview
      : '';

  const accountNumbers =
    extractCreditReportBureauTriplet_(
      preview,
      'Account Number'
    );

  const creditLimits =
    parseCreditReportMoneyTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Credit Limit'
      )
    );

  const reportedBalances =
    parseCreditReportMoneyTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Reported Balance'
      )
    );

  const dateOpened =
    normalizeCreditReportDateTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Date Opened'
      )
    );

  const dateClosed =
    normalizeCreditReportDateTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Date Closed'
      )
    );

  const lastReported =
    normalizeCreditReportDateTriplet_(
      extractCreditReportBureauTriplet_(
        preview,
        'Last Reported'
      )
    );

  const accountType =
    extractCleanCreditReportAccountType_(
      preview
    );

  const originalCreditor =
    extractCleanCreditReportOriginalCreditor_(
      preview
    );

  const creditorClassification =
    extractCleanCreditorClassification_(
      preview
    );

  const activityDesignator =
    extractCleanActivityDesignator_(
      preview
    );

  const accountStatus =
    extractCleanCreditReportStatus_(
      preview
    );

  const bureauFlags =
    extractCreditReportBureauFlags_(
      preview
    );

  const primaryAccountNumber =
    selectCreditReportPrimaryBureauValue_(
      accountNumbers
    );

  const primaryCreditLimit =
    selectCreditReportPrimaryBureauValue_(
      creditLimits
    );

  const primaryReportedBalance =
    selectCreditReportPrimaryBureauValue_(
      reportedBalances
    );

  const populatedValueCount =
    countCreditReportTripletValues_(
      accountNumbers
    ) +
    countCreditReportTripletValues_(
      creditLimits
    ) +
    countCreditReportTripletValues_(
      reportedBalances
    ) +
    countCreditReportTripletValues_(
      dateOpened
    ) +
    countCreditReportTripletValues_(
      dateClosed
    ) +
    countCreditReportTripletValues_(
      lastReported
    ) +
    [
      accountType,
      originalCreditor,
      creditorClassification,
      activityDesignator,
      accountStatus
    ].filter(function(value) {
      return value !== null &&
        value !== undefined &&
        value !== '';
    }).length;

  let confidence = 'LOW';

  if (
    location.found &&
    populatedValueCount >= 10
  ) {
    confidence = 'HIGH';
  } else if (
    location.found &&
    populatedValueCount >= 5
  ) {
    confidence = 'MEDIUM';
  }

  return {
    section:
      indexedAccount.section,

    accountName:
      cleanAccountNameForSectionSearch_(
        indexedAccount.accountName
      ),

    indexedPageNumber:
      indexedAccount.pageNumber,

    sectionFound:
      Boolean(location.found),

    searchMethod:
      location.searchMethod,

    primaryAccountNumber:
      primaryAccountNumber,

    accountNumbers:
      accountNumbers,

    accountType:
      accountType,

    originalCreditor:
      originalCreditor,

    creditorClassification:
      creditorClassification,

    activityDesignator:
      activityDesignator,

    accountStatus:
      accountStatus,

    primaryCreditLimit:
      primaryCreditLimit,

    creditLimits:
      creditLimits,

    primaryReportedBalance:
      primaryReportedBalance,

    reportedBalances:
      reportedBalances,

    dateOpened:
      dateOpened,

    dateClosed:
      dateClosed,

    lastReported:
      lastReported,

    bureauFlags:
      bureauFlags,

    populatedValueCount:
      populatedValueCount,

    confidence:
      confidence
  };
}


/**
 * Builds cleaned records for a limited number of accounts.
 */
function buildCleanStructuredCreditAccounts_(
  reportText,
  accountIndex,
  maximumAccounts
) {
  const accounts =
    accountIndex &&
    Array.isArray(accountIndex.accounts)
      ? accountIndex.accounts
      : [];

  const limit = Math.min(
    Number(maximumAccounts) ||
      accounts.length,
    accounts.length
  );

  const results = [];

  for (
    let index = 0;
    index < limit;
    index++
  ) {
    const indexedAccount =
      accounts[index];

    const location =
      locateDetailedCreditReportAccountSection_(
        reportText,
        indexedAccount.accountName
      );

    results.push(
      extractCleanStructuredCreditAccount_(
        indexedAccount,
        location
      )
    );
  }

  return results;
}


/**
 * READ-ONLY TEST
 *
 * Tests the first ten accounts across multiple account types.
 */
function testCleanStructuredCreditReportExtraction() {
  console.log(
    'PHASE 4C CLEAN EXTRACTION STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const results =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      10
    );

  const locatedCount =
    results.filter(function(result) {
      return result.sectionFound;
    }).length;

  const highConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'HIGH';
    }).length;

  const mediumConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'MEDIUM';
    }).length;

  const lowConfidenceCount =
    results.filter(function(result) {
      return result.confidence === 'LOW';
    }).length;

  console.log(
    'Accounts tested: ' +
    results.length
  );

  console.log(
    'Sections located: ' +
    locatedCount
  );

  console.log(
    'High-confidence records: ' +
    highConfidenceCount
  );

  console.log(
    'Medium-confidence records: ' +
    mediumConfidenceCount
  );

  console.log(
    'Low-confidence records: ' +
    lowConfidenceCount
  );

  results.forEach(function(result) {
    console.log(
      JSON.stringify(result)
    );
  });

  console.log(
    'PHASE 4C CLEAN EXTRACTION COMPLETED'
  );

  return {
    accountsTested:
      results.length,

    sectionsLocated:
      locatedCount,

    highConfidenceRecords:
      highConfidenceCount,

    mediumConfidenceRecords:
      mediumConfidenceCount,

    lowConfidenceRecords:
      lowConfidenceCount,

    results:
      results
  };
}

/**
 * ============================================================
 * PHASE 5A — AIRTABLE-READY RECORD MAPPING
 * ============================================================
 *
 * Converts cleaned credit-report records into objects matching
 * the Personal Credit Repair Airtable table.
 *
 * READ-ONLY:
 * This phase does NOT create, update, or delete Airtable data.
 */


/**
 * Converts null or undefined values into blank Airtable values.
 */
function cleanAirtableCreditValue_(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return value;
}


/**
 * Converts a bureau-presence flag into a reporting label.
 */
function formatCreditBureauReportingFlag_(value) {
  return value
    ? 'Reporting'
    : 'Not Reporting';
}


/**
 * Selects the first available date from a bureau triplet.
 */
function selectPrimaryCreditReportDate_(triplet) {
  if (!triplet) {
    return '';
  }

  return (
    triplet.equifax ||
    triplet.experian ||
    triplet.transUnion ||
    ''
  );
}


/**
 * Creates a review note describing the parser result.
 */
function buildCreditParserReviewNote_(record) {
  const notes = [];

  notes.push(
    'Credit-report parser confidence: ' +
    record.confidence
  );

  notes.push(
    'Source section: ' +
    record.section
  );

  notes.push(
    'Indexed PDF page: ' +
    record.indexedPageNumber
  );

  notes.push(
    'Search method: ' +
    record.searchMethod
  );

  notes.push(
    'Populated parser values: ' +
    record.populatedValueCount
  );

  if (!record.sectionFound) {
    notes.push(
      'WARNING: Account-detail section was not located.'
    );
  }

  return notes.join(' | ');
}


/**
 * Maps one cleaned parser result to the existing Personal
 * Credit Repair Airtable field structure.
 */
function buildAirtableReadyCreditRecord_(
  record
) {
  const accountNumbers =
    record.accountNumbers || {};

  const balances =
    record.reportedBalances || {};

  const openedDates =
    record.dateOpened || {};

  const closedDates =
    record.dateClosed || {};

  const reportedDates =
    record.lastReported || {};

  const bureauFlags =
    record.bureauFlags || {};

  const primaryDateOpened =
    selectPrimaryCreditReportDate_(
      openedDates
    );

  const primaryDateClosed =
    selectPrimaryCreditReportDate_(
      closedDates
    );

  const primaryLastReported =
    selectPrimaryCreditReportDate_(
      reportedDates
    );

  return {
    fields: {
      'Account Name':
        cleanAirtableCreditValue_(
          record.accountName
        ),

      'Account Number':
        cleanAirtableCreditValue_(
          record.primaryAccountNumber
        ),

      'Original Creditor':
        cleanAirtableCreditValue_(
          record.originalCreditor
        ),

      'Account Type':
        cleanAirtableCreditValue_(
          record.accountType
        ),

      'Status':
        cleanAirtableCreditValue_(
          record.accountStatus
        ),

      'Experian':
        formatCreditBureauReportingFlag_(
          bureauFlags.experian
        ),

      'TransUnion':
        formatCreditBureauReportingFlag_(
          bureauFlags.transUnion
        ),

      'Equifax':
        formatCreditBureauReportingFlag_(
          bureauFlags.equifax
        ),

      'Experian Balance':
        cleanAirtableCreditValue_(
          balances.experian
        ),

      'TransUnion Balance':
        cleanAirtableCreditValue_(
          balances.transUnion
        ),

      'Equifax Balance':
        cleanAirtableCreditValue_(
          balances.equifax
        ),

      'Date Opened':
        cleanAirtableCreditValue_(
          primaryDateOpened
        ),

      'Date Closed':
        cleanAirtableCreditValue_(
          primaryDateClosed
        ),

      'Last Reported':
        cleanAirtableCreditValue_(
          primaryLastReported
        ),

      /*
       * DOFD extraction will be added in the next parser phase.
       * These remain blank until directly supported by the PDF.
       */
      'Experian DOFD': '',
      'TransUnion DOFD': '',
      'Equifax DOFD': '',

      'Violation Tag':
        record.sectionFound
          ? ''
          : 'Parser Review Required',

      'Action Needed':
        record.confidence === 'LOW'
          ? 'Manual Review'
          : '',

      'Action Stage':
        'Report Import Review',

      'Note':
        buildCreditParserReviewNote_(
          record
        )
    },

    parserMetadata: {
      section:
        record.section,

      indexedPageNumber:
        record.indexedPageNumber,

      sectionFound:
        record.sectionFound,

      searchMethod:
        record.searchMethod,

      confidence:
        record.confidence,

      populatedValueCount:
        record.populatedValueCount,

      bureauAccountNumbers: {
        equifax:
          cleanAirtableCreditValue_(
            accountNumbers.equifax
          ),

        experian:
          cleanAirtableCreditValue_(
            accountNumbers.experian
          ),

        transUnion:
          cleanAirtableCreditValue_(
            accountNumbers.transUnion
          )
      },

      primaryCreditLimit:
        cleanAirtableCreditValue_(
          record.primaryCreditLimit
        ),

      bureauCreditLimits:
        record.creditLimits || {}
    }
  };
}


/**
 * Builds Airtable-ready objects for cleaned parser records.
 */
function buildAirtableReadyCreditRecords_(
  cleanRecords
) {
  const records =
    Array.isArray(cleanRecords)
      ? cleanRecords
      : [];

  return records.map(function(record) {
    return buildAirtableReadyCreditRecord_(
      record
    );
  });
}


/**
 * Validates required Airtable mapping fields.
 */
function validateAirtableReadyCreditRecord_(
  mappedRecord
) {
  const fields =
    mappedRecord &&
    mappedRecord.fields
      ? mappedRecord.fields
      : {};

  const missingRequiredFields = [];

  if (!fields['Account Name']) {
    missingRequiredFields.push(
      'Account Name'
    );
  }

  if (!fields['Account Number']) {
    missingRequiredFields.push(
      'Account Number'
    );
  }

  return {
    valid:
      missingRequiredFields.length === 0,

    missingRequiredFields:
      missingRequiredFields
  };
}


/**
 * READ-ONLY TEST
 *
 * Builds Airtable-ready records for the first 10 accounts.
 * Nothing is sent to Airtable.
 */
function testBuildAirtableReadyCreditRecords() {
  console.log(
    'PHASE 5A AIRTABLE MAPPING STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      10
    );

  const mappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const validationResults =
    mappedRecords.map(function(record) {
      return validateAirtableReadyCreditRecord_(
        record
      );
    });

  const validRecordCount =
    validationResults.filter(
      function(result) {
        return result.valid;
      }
    ).length;

  const reviewRequiredCount =
    validationResults.filter(
      function(result) {
        return !result.valid;
      }
    ).length;

  console.log(
    'Records mapped: ' +
    mappedRecords.length
  );

  console.log(
    'Valid Airtable-ready records: ' +
    validRecordCount
  );

  console.log(
    'Records requiring review: ' +
    reviewRequiredCount
  );

  mappedRecords.forEach(
    function(record, index) {
      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          validation:
            validationResults[index],

          fields:
            record.fields,

          parserMetadata:
            record.parserMetadata
        })
      );
    }
  );

  console.log(
    'PHASE 5A AIRTABLE MAPPING COMPLETED'
  );

  return {
    recordsMapped:
      mappedRecords.length,

    validRecords:
      validRecordCount,

    recordsRequiringReview:
      reviewRequiredCount,

    records:
      mappedRecords,

    validation:
      validationResults
  };
}

/**
 * ============================================================
 * PHASE 5B — READ-ONLY AIRTABLE SYNC PLAN
 * ============================================================
 *
 * Compares parser-generated records against existing Airtable
 * Personal Credit Repair records.
 *
 * READ-ONLY:
 * This phase does NOT create, update, or delete Airtable data.
 */


/**
 * Reads the Airtable connection settings already stored in
 * Apps Script Project Settings > Script Properties.
 */
function getCreditAirtableConfiguration_() {
  const properties =
    PropertiesService.getScriptProperties();

  const configuration = {
    baseId:
      properties.getProperty(
        'AIRTABLE_BASE_ID'
      ),

    tableId:
      properties.getProperty(
        'AIRTABLE_TABLE_ID'
      ),

    token:
      properties.getProperty(
        'AIRTABLE_TOKEN'
      )
  };

  const missingProperties = [];

  if (!configuration.baseId) {
    missingProperties.push(
      'AIRTABLE_BASE_ID'
    );
  }

  if (!configuration.tableId) {
    missingProperties.push(
      'AIRTABLE_TABLE_ID'
    );
  }

  if (!configuration.token) {
    missingProperties.push(
      'AIRTABLE_TOKEN'
    );
  }

  if (missingProperties.length) {
    throw new Error(
      'Missing Airtable Script Properties: ' +
      missingProperties.join(', ')
    );
  }

  return configuration;
}


/**
 * Builds the Airtable records endpoint.
 */
function buildCreditAirtableRecordsUrl_(
  configuration,
  offset
) {
  let url =
    'https://api.airtable.com/v0/' +
    encodeURIComponent(
      configuration.baseId
    ) +
    '/' +
    encodeURIComponent(
      configuration.tableId
    ) +
    '?pageSize=100';

  if (offset) {
    url +=
      '&offset=' +
      encodeURIComponent(offset);
  }

  return url;
}


/**
 * Reads one page of existing Airtable records.
 *
 * READ-ONLY GET request.
 */
function fetchCreditAirtableRecordPage_(
  configuration,
  offset
) {
  const response =
    UrlFetchApp.fetch(
      buildCreditAirtableRecordsUrl_(
        configuration,
        offset
      ),
      {
        method: 'get',

        headers: {
          Authorization:
            'Bearer ' +
            configuration.token
        },

        muteHttpExceptions: true
      }
    );

  const statusCode =
    response.getResponseCode();

  const responseText =
    response.getContentText();

  if (
    statusCode < 200 ||
    statusCode >= 300
  ) {
    throw new Error(
      'Airtable read failed. HTTP ' +
      statusCode +
      ': ' +
      responseText
    );
  }

  return JSON.parse(responseText);
}


/**
 * Loads all current Personal Credit Repair records.
 *
 * Handles Airtable pagination automatically.
 */
function fetchAllExistingCreditAirtableRecords_() {
  const configuration =
    getCreditAirtableConfiguration_();

  const records = [];

  let offset = '';

  do {
    const page =
      fetchCreditAirtableRecordPage_(
        configuration,
        offset
      );

    const pageRecords =
      Array.isArray(page.records)
        ? page.records
        : [];

    pageRecords.forEach(function(record) {
      records.push(record);
    });

    offset = page.offset || '';
  } while (offset);

  return records;
}


/**
 * Normalizes an account number for matching.
 *
 * Removes spaces, dashes, and mask characters.
 * Preserves visible digits and letters.
 */
function normalizeCreditAccountNumberForMatch_(
  value
) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}


/**
 * Returns the visible ending of an account number.
 *
 * Example:
 * "XXXXXXXX5613" -> "5613"
 */
function getCreditAccountNumberEnding_(value) {
  const normalized =
    normalizeCreditAccountNumberForMatch_(
      value
    );

  const visibleMatch =
    normalized.match(/([A-Z0-9]{4,8})$/);

  return visibleMatch
    ? visibleMatch[1]
    : normalized;
}


/**
 * Normalizes creditor names for matching.
 */
function normalizeCreditAccountNameForMatch_(
  value
) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(closed\)/gi, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\binc\b/g, ' ')
    .replace(/\bllc\b/g, ' ')
    .replace(/\bbank\b/g, ' ')
    .replace(/\bbancorp\b/g, ' ')
    .replace(/\bcompany\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Converts Airtable record data into a normalized matching
 * index.
 */
function buildExistingCreditAirtableIndex_(
  airtableRecords
) {
  const records =
    Array.isArray(airtableRecords)
      ? airtableRecords
      : [];

  return records.map(function(record) {
    const fields =
      record.fields || {};

    const accountName =
      fields['Account Name'] || '';

    const accountNumber =
      fields['Account Number'] || '';

    return {
      recordId:
        record.id,

      fields:
        fields,

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      normalizedName:
        normalizeCreditAccountNameForMatch_(
          accountName
        ),

      normalizedAccountNumber:
        normalizeCreditAccountNumberForMatch_(
          accountNumber
        ),

      accountNumberEnding:
        getCreditAccountNumberEnding_(
          accountNumber
        )
    };
  });
}


/**
 * Finds the best existing Airtable match.
 *
 * Priority:
 * 1. Exact normalized account number
 * 2. Same account-number ending plus same creditor name
 * 3. Same normalized creditor name
 */
function findExistingCreditAirtableMatch_(
  mappedRecord,
  existingIndex
) {
  const fields =
    mappedRecord.fields || {};

  const mappedName =
    normalizeCreditAccountNameForMatch_(
      fields['Account Name']
    );

  const mappedAccountNumber =
    normalizeCreditAccountNumberForMatch_(
      fields['Account Number']
    );

  const mappedEnding =
    getCreditAccountNumberEnding_(
      fields['Account Number']
    );

  if (mappedAccountNumber) {
    const exactNumberMatch =
      existingIndex.find(
        function(existingRecord) {
          return (
            existingRecord
              .normalizedAccountNumber &&
            existingRecord
              .normalizedAccountNumber ===
              mappedAccountNumber
          );
        }
      );

    if (exactNumberMatch) {
      return {
        matched:
          true,

        matchMethod:
          'EXACT_ACCOUNT_NUMBER',

        existingRecord:
          exactNumberMatch
      };
    }
  }

  if (
    mappedEnding &&
    mappedName
  ) {
    const endingAndNameMatch =
      existingIndex.find(
        function(existingRecord) {
          return (
            existingRecord
              .accountNumberEnding ===
              mappedEnding &&
            existingRecord
              .normalizedName ===
              mappedName
          );
        }
      );

    if (endingAndNameMatch) {
      return {
        matched:
          true,

        matchMethod:
          'ACCOUNT_ENDING_AND_NAME',

        existingRecord:
          endingAndNameMatch
      };
    }
  }

  if (mappedName) {
    const nameMatches =
      existingIndex.filter(
        function(existingRecord) {
          return (
            existingRecord
              .normalizedName ===
            mappedName
          );
        }
      );

    if (nameMatches.length === 1) {
      return {
        matched:
          true,

        matchMethod:
          'UNIQUE_ACCOUNT_NAME',

        existingRecord:
          nameMatches[0]
      };
    }

    if (nameMatches.length > 1) {
      return {
        matched:
          false,

        matchMethod:
          'AMBIGUOUS_ACCOUNT_NAME',

        possibleMatches:
          nameMatches
      };
    }
  }

  return {
    matched:
      false,

    matchMethod:
      'NO_MATCH'
  };
}


/**
 * Normalizes values before comparing Airtable fields.
 */
function normalizeCreditFieldForComparison_(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (typeof value === 'number') {
    return value;
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Compares mapped fields against an existing Airtable record.
 */
function compareCreditAirtableFields_(
  mappedFields,
  existingFields
) {
  const changes = {};

  Object.keys(mappedFields).forEach(
    function(fieldName) {
      const proposedValue =
        normalizeCreditFieldForComparison_(
          mappedFields[fieldName]
        );

      const existingValue =
        normalizeCreditFieldForComparison_(
          existingFields[fieldName]
        );

      /*
       * Blank parser values do not overwrite existing Airtable
       * values during planning.
       */
      if (
        proposedValue === '' ||
        proposedValue === null
      ) {
        return;
      }

      if (
        proposedValue !== existingValue
      ) {
        changes[fieldName] = {
          existing:
            existingValue,

          proposed:
            proposedValue
        };
      }
    }
  );

  return changes;
}


/**
 * Creates a single read-only sync instruction.
 */
function buildCreditAirtableSyncInstruction_(
  mappedRecord,
  validation,
  existingIndex
) {
  const fields =
    mappedRecord.fields || {};

  if (
    !validation ||
    !validation.valid
  ) {
    return {
      action:
        'REVIEW',

      reason:
        'Missing required fields',

      missingRequiredFields:
        validation
          ? validation.missingRequiredFields
          : [],

      fields:
        fields
    };
  }

  const match =
    findExistingCreditAirtableMatch_(
      mappedRecord,
      existingIndex
    );

  if (
    match.matchMethod ===
    'AMBIGUOUS_ACCOUNT_NAME'
  ) {
    return {
      action:
        'REVIEW',

      reason:
        'Multiple existing Airtable records match the account name',

      matchMethod:
        match.matchMethod,

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      possibleRecordIds:
        match.possibleMatches.map(
          function(record) {
            return record.recordId;
          }
        )
    };
  }

  if (!match.matched) {
    return {
      action:
        'CREATE',

      reason:
        'No existing Airtable record matched',

      matchMethod:
        match.matchMethod,

      fields:
        fields
    };
  }

  const changes =
    compareCreditAirtableFields_(
      fields,
      match.existingRecord.fields
    );

  const changedFieldNames =
    Object.keys(changes);

  if (!changedFieldNames.length) {
    return {
      action:
        'SKIP',

      reason:
        'Existing Airtable record already matches',

      matchMethod:
        match.matchMethod,

      existingRecordId:
        match.existingRecord.recordId,

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number']
    };
  }

  return {
    action:
      'UPDATE',

    reason:
      'Existing Airtable record contains different values',

    matchMethod:
      match.matchMethod,

    existingRecordId:
      match.existingRecord.recordId,

    accountName:
      fields['Account Name'],

    accountNumber:
      fields['Account Number'],

    changedFieldNames:
      changedFieldNames,

    changes:
      changes
  };
}


/**
 * Builds the complete read-only synchronization plan.
 */
function buildCreditAirtableSyncPlan_(
  mappedRecords,
  validationResults,
  existingAirtableRecords
) {
  const existingIndex =
    buildExistingCreditAirtableIndex_(
      existingAirtableRecords
    );

  return mappedRecords.map(
    function(mappedRecord, index) {
      return buildCreditAirtableSyncInstruction_(
        mappedRecord,
        validationResults[index],
        existingIndex
      );
    }
  );
}


/**
 * READ-ONLY TEST
 *
 * Compares the first ten parsed records against the current
 * Airtable Personal Credit Repair table.
 *
 * This function performs GET requests only.
 */
function testBuildCreditAirtableSyncPlan() {
  console.log(
    'PHASE 5B AIRTABLE SYNC PLAN STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      10
    );

  const mappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const validationResults =
    mappedRecords.map(function(record) {
      return validateAirtableReadyCreditRecord_(
        record
      );
    });

  const existingAirtableRecords =
    fetchAllExistingCreditAirtableRecords_();

  const syncPlan =
    buildCreditAirtableSyncPlan_(
      mappedRecords,
      validationResults,
      existingAirtableRecords
    );

  const createCount =
    syncPlan.filter(function(item) {
      return item.action === 'CREATE';
    }).length;

  const updateCount =
    syncPlan.filter(function(item) {
      return item.action === 'UPDATE';
    }).length;

  const skipCount =
    syncPlan.filter(function(item) {
      return item.action === 'SKIP';
    }).length;

  const reviewCount =
    syncPlan.filter(function(item) {
      return item.action === 'REVIEW';
    }).length;

  console.log(
    'Existing Airtable records loaded: ' +
    existingAirtableRecords.length
  );

  console.log(
    'Parser records evaluated: ' +
    mappedRecords.length
  );

  console.log(
    'CREATE actions: ' +
    createCount
  );

  console.log(
    'UPDATE actions: ' +
    updateCount
  );

  console.log(
    'SKIP actions: ' +
    skipCount
  );

  console.log(
    'REVIEW actions: ' +
    reviewCount
  );

  syncPlan.forEach(
    function(instruction, index) {
      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          instruction:
            instruction
        })
      );
    }
  );

  console.log(
    'PHASE 5B AIRTABLE SYNC PLAN COMPLETED'
  );

  return {
    existingAirtableRecords:
      existingAirtableRecords.length,

    parserRecordsEvaluated:
      mappedRecords.length,

    createActions:
      createCount,

    updateActions:
      updateCount,

    skipActions:
      skipCount,

    reviewActions:
      reviewCount,

    plan:
      syncPlan
  };
}

/**
 * ============================================================
 * PHASE 5C — DUPLICATE PROTECTION AND MATCH DIAGNOSTICS
 * ============================================================
 *
 * Improves account matching by:
 * - Comparing visible digits only
 * - Canonicalizing known creditor aliases
 * - Scoring creditor-name similarity
 * - Showing the closest existing Airtable matches
 * - Blocking unsafe CREATE recommendations
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Returns only visible digits from an account number.
 *
 * Examples:
 * "XXXXXXXX5613" -> "5613"
 * "****-0954"    -> "0954"
 */
function getVisibleCreditAccountDigits_(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .trim();
}


/**
 * Returns the last visible account-number digits.
 */
function getVisibleCreditAccountEnding_(value) {
  const digits =
    getVisibleCreditAccountDigits_(value);

  if (!digits) {
    return '';
  }

  return digits.slice(-8);
}


/**
 * Converts known creditor-name variations into one canonical
 * name for matching.
 */
function canonicalizeCreditCreditorName_(value) {
  let name =
    normalizeCreditAccountNameForMatch_(
      value
    );

  const aliasRules = [
    {
      pattern:
        /\bmission\s+lane\b/,
      canonical:
        'mission lane'
    },
    {
      pattern:
        /\bkikoff\b/,
      canonical:
        'kikoff'
    },
    {
      pattern:
        /\bopensky\b|\bopen\s+sky\b/,
      canonical:
        'opensky'
    },
    {
      pattern:
        /\batlas\b/,
      canonical:
        'atlas'
    },
    {
      pattern:
        /\bcurrent\b|\bcurrent\s+crb\b/,
      canonical:
        'current'
    },
    {
      pattern:
        /\bextra\b/,
      canonical:
        'extra'
    },
    {
      pattern:
        /\bjefferson\b/,
      canonical:
        'jefferson capital'
    },
    {
      pattern:
        /\blvnv\b/,
      canonical:
        'lvnv funding'
    },
    {
      pattern:
        /\bportfolio\s+recovery\b/,
      canonical:
        'portfolio recovery'
    },
    {
      pattern:
        /\bcredit\s+one\b/,
      canonical:
        'credit one'
    },
    {
      pattern:
        /\bfirst\s+premier\b/,
      canonical:
        'first premier'
    },
    {
      pattern:
        /\bmdg\b/,
      canonical:
        'mdg'
    },
    {
      pattern:
        /\baustin\s+capital\b/,
      canonical:
        'austin capital'
    },
    {
      pattern:
        /\bfortiva\b/,
      canonical:
        'fortiva'
    },
    {
      pattern:
        /\baffirm\b/,
      canonical:
        'affirm'
    },
    {
      pattern:
        /\bchime\b/,
      canonical:
        'chime'
    },
    {
      pattern:
        /\bkovo\b/,
      canonical:
        'kovo'
    }
  ];

  for (
    let index = 0;
    index < aliasRules.length;
    index++
  ) {
    const rule = aliasRules[index];

    if (rule.pattern.test(name)) {
      return rule.canonical;
    }
  }

  return name;
}


/**
 * Builds useful name tokens.
 */
function getCreditMatchTokens_(value) {
  return canonicalizeCreditCreditorName_(
    value
  )
    .split(' ')
    .map(function(token) {
      return token.trim();
    })
    .filter(function(token) {
      return token.length >= 3;
    });
}


/**
 * Calculates token similarity from 0 through 1.
 */
function calculateCreditNameSimilarity_(
  firstName,
  secondName
) {
  const firstTokens =
    getCreditMatchTokens_(firstName);

  const secondTokens =
    getCreditMatchTokens_(secondName);

  if (
    !firstTokens.length ||
    !secondTokens.length
  ) {
    return 0;
  }

  const firstSet = {};
  const secondSet = {};

  firstTokens.forEach(function(token) {
    firstSet[token] = true;
  });

  secondTokens.forEach(function(token) {
    secondSet[token] = true;
  });

  const allTokens = {};

  firstTokens.forEach(function(token) {
    allTokens[token] = true;
  });

  secondTokens.forEach(function(token) {
    allTokens[token] = true;
  });

  const unionTokens =
    Object.keys(allTokens);

  const matchingTokens =
    unionTokens.filter(function(token) {
      return (
        firstSet[token] &&
        secondSet[token]
      );
    });

  return unionTokens.length
    ? matchingTokens.length /
      unionTokens.length
    : 0;
}


/**
 * Creates an enhanced existing-record matching index.
 */
function buildEnhancedExistingCreditIndex_(
  airtableRecords
) {
  const records =
    Array.isArray(airtableRecords)
      ? airtableRecords
      : [];

  return records.map(function(record) {
    const fields =
      record.fields || {};

    const accountName =
      fields['Account Name'] || '';

    const accountNumber =
      fields['Account Number'] || '';

    return {
      recordId:
        record.id,

      fields:
        fields,

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      canonicalName:
        canonicalizeCreditCreditorName_(
          accountName
        ),

      visibleDigits:
        getVisibleCreditAccountDigits_(
          accountNumber
        ),

      visibleEnding:
        getVisibleCreditAccountEnding_(
          accountNumber
        )
    };
  });
}


/**
 * Scores one parser record against one Airtable record.
 */
function scoreCreditAirtableMatch_(
  mappedRecord,
  existingRecord
) {
  const fields =
    mappedRecord.fields || {};

  const parserName =
    fields['Account Name'] || '';

  const parserNumber =
    fields['Account Number'] || '';

  const parserCanonicalName =
    canonicalizeCreditCreditorName_(
      parserName
    );

  const parserVisibleDigits =
    getVisibleCreditAccountDigits_(
      parserNumber
    );

  const parserVisibleEnding =
    getVisibleCreditAccountEnding_(
      parserNumber
    );

  const nameSimilarity =
    calculateCreditNameSimilarity_(
      parserName,
      existingRecord.accountName
    );

  const canonicalNameMatch =
    Boolean(
      parserCanonicalName &&
      existingRecord.canonicalName &&
      parserCanonicalName ===
        existingRecord.canonicalName
    );

  let accountEndingMatch = false;

  if (
    parserVisibleEnding &&
    existingRecord.visibleEnding
  ) {
    accountEndingMatch =
      parserVisibleEnding ===
      existingRecord.visibleEnding ||
      parserVisibleEnding.endsWith(
        existingRecord.visibleEnding
      ) ||
      existingRecord.visibleEnding.endsWith(
        parserVisibleEnding
      );
  }

  let score = 0;
  const reasons = [];

  if (accountEndingMatch) {
    score += 70;
    reasons.push(
      'VISIBLE_ACCOUNT_ENDING_MATCH'
    );
  }

  if (canonicalNameMatch) {
    score += 25;
    reasons.push(
      'CANONICAL_NAME_MATCH'
    );
  } else if (nameSimilarity >= 0.75) {
    score += 20;
    reasons.push(
      'STRONG_NAME_SIMILARITY'
    );
  } else if (nameSimilarity >= 0.5) {
    score += 10;
    reasons.push(
      'PARTIAL_NAME_SIMILARITY'
    );
  }

  if (
    parserVisibleDigits &&
    existingRecord.visibleDigits &&
    parserVisibleDigits ===
      existingRecord.visibleDigits
  ) {
    score += 10;
    reasons.push(
      'EXACT_VISIBLE_DIGITS'
    );
  }

  return {
    existingRecordId:
      existingRecord.recordId,

    existingAccountName:
      existingRecord.accountName,

    existingAccountNumber:
      existingRecord.accountNumber,

    parserCanonicalName:
      parserCanonicalName,

    existingCanonicalName:
      existingRecord.canonicalName,

    parserVisibleEnding:
      parserVisibleEnding,

    existingVisibleEnding:
      existingRecord.visibleEnding,

    nameSimilarity:
      Number(
        nameSimilarity.toFixed(3)
      ),

    accountEndingMatch:
      accountEndingMatch,

    canonicalNameMatch:
      canonicalNameMatch,

    score:
      score,

    reasons:
      reasons
  };
}


/**
 * Returns the closest Airtable matches for one parser record.
 */
function findClosestCreditAirtableMatches_(
  mappedRecord,
  enhancedIndex,
  maximumMatches
) {
  const scoredMatches =
    enhancedIndex.map(function(existingRecord) {
      return scoreCreditAirtableMatch_(
        mappedRecord,
        existingRecord
      );
    });

  scoredMatches.sort(function(a, b) {
    return b.score - a.score;
  });

  return scoredMatches.slice(
    0,
    Number(maximumMatches) || 3
  );
}


/**
 * Produces a safe diagnostic recommendation.
 *
 * No CREATE is approved during this diagnostic phase.
 */
function buildSafeCreditMatchDiagnostic_(
  mappedRecord,
  validation,
  enhancedIndex
) {
  const fields =
    mappedRecord.fields || {};

  if (
    !validation ||
    !validation.valid
  ) {
    return {
      recommendation:
        'REVIEW',

      reason:
        'MISSING_REQUIRED_FIELDS',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      missingRequiredFields:
        validation
          ? validation.missingRequiredFields
          : []
    };
  }

  const closestMatches =
    findClosestCreditAirtableMatches_(
      mappedRecord,
      enhancedIndex,
      3
    );

  const bestMatch =
    closestMatches.length
      ? closestMatches[0]
      : null;

  if (
    bestMatch &&
    bestMatch.score >= 90
  ) {
    return {
      recommendation:
        'MATCH_CONFIRMED',

      reason:
        'STRONG_NAME_AND_ACCOUNT_MATCH',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      matchedRecordId:
        bestMatch.existingRecordId,

      bestMatch:
        bestMatch,

      closestMatches:
        closestMatches
    };
  }

  if (
    bestMatch &&
    bestMatch.score >= 70
  ) {
    return {
      recommendation:
        'MATCH_REVIEW',

      reason:
        'ACCOUNT_ENDING_MATCH_REQUIRES_CONFIRMATION',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      possibleRecordId:
        bestMatch.existingRecordId,

      bestMatch:
        bestMatch,

      closestMatches:
        closestMatches
    };
  }

  if (
    bestMatch &&
    bestMatch.score >= 20
  ) {
    return {
      recommendation:
        'DUPLICATE_REVIEW',

      reason:
        'POSSIBLE_NAME_MATCH',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      bestMatch:
        bestMatch,

      closestMatches:
        closestMatches
    };
  }

  return {
    recommendation:
      'CREATE_CANDIDATE_REVIEW',

    reason:
      'NO_STRONG_EXISTING_MATCH',

    accountName:
      fields['Account Name'],

    accountNumber:
      fields['Account Number'],

    closestMatches:
      closestMatches
  };
}


/**
 * READ-ONLY TEST
 *
 * Diagnoses matching for the first ten parser records.
 */
function testCreditAirtableMatchDiagnostics() {
  console.log(
    'PHASE 5C MATCH DIAGNOSTICS STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      10
    );

  const mappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const validationResults =
    mappedRecords.map(function(record) {
      return validateAirtableReadyCreditRecord_(
        record
      );
    });

  const existingAirtableRecords =
    fetchAllExistingCreditAirtableRecords_();

  const enhancedIndex =
    buildEnhancedExistingCreditIndex_(
      existingAirtableRecords
    );

  const diagnostics =
    mappedRecords.map(
      function(mappedRecord, index) {
        return buildSafeCreditMatchDiagnostic_(
          mappedRecord,
          validationResults[index],
          enhancedIndex
        );
      }
    );

  const confirmedCount =
    diagnostics.filter(function(item) {
      return (
        item.recommendation ===
        'MATCH_CONFIRMED'
      );
    }).length;

  const matchReviewCount =
    diagnostics.filter(function(item) {
      return (
        item.recommendation ===
        'MATCH_REVIEW'
      );
    }).length;

  const duplicateReviewCount =
    diagnostics.filter(function(item) {
      return (
        item.recommendation ===
        'DUPLICATE_REVIEW'
      );
    }).length;

  const createCandidateCount =
    diagnostics.filter(function(item) {
      return (
        item.recommendation ===
        'CREATE_CANDIDATE_REVIEW'
      );
    }).length;

  const reviewCount =
    diagnostics.filter(function(item) {
      return (
        item.recommendation ===
        'REVIEW'
      );
    }).length;

  console.log(
    'Existing Airtable records loaded: ' +
    existingAirtableRecords.length
  );

  console.log(
    'Parser records diagnosed: ' +
    diagnostics.length
  );

  console.log(
    'Confirmed matches: ' +
    confirmedCount
  );

  console.log(
    'Account-ending match reviews: ' +
    matchReviewCount
  );

  console.log(
    'Possible duplicate reviews: ' +
    duplicateReviewCount
  );

  console.log(
    'Create-candidate reviews: ' +
    createCandidateCount
  );

  console.log(
    'Required-field reviews: ' +
    reviewCount
  );

  diagnostics.forEach(
    function(diagnostic, index) {
      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          diagnostic:
            diagnostic
        })
      );
    }
  );

  console.log(
    'PHASE 5C MATCH DIAGNOSTICS COMPLETED'
  );

  return {
    existingAirtableRecords:
      existingAirtableRecords.length,

    parserRecordsDiagnosed:
      diagnostics.length,

    confirmedMatches:
      confirmedCount,

    accountEndingMatchReviews:
      matchReviewCount,

    possibleDuplicateReviews:
      duplicateReviewCount,

    createCandidateReviews:
      createCandidateCount,

    requiredFieldReviews:
      reviewCount,

    diagnostics:
      diagnostics
  };
}

/**
 * ============================================================
 * PHASE 5D — FULL SAFE CREDIT RECONCILIATION PLAN
 * ============================================================
 *
 * Evaluates all parsed credit-report accounts against existing
 * Airtable records using strict duplicate-protection rules.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Returns every useful parser-side creditor identity.
 */
function getParserCreditIdentityNames_(mappedRecord) {
  const fields =
    mappedRecord && mappedRecord.fields
      ? mappedRecord.fields
      : {};

  const names = [
    fields['Account Name'],
    fields['Original Creditor']
  ];

  return names
    .map(function(value) {
      return canonicalizeCreditCreditorName_(
        value
      );
    })
    .filter(function(value) {
      return Boolean(value);
    });
}


/**
 * Returns every useful existing Airtable creditor identity.
 */
function getExistingCreditIdentityNames_(
  existingRecord
) {
  const fields =
    existingRecord && existingRecord.fields
      ? existingRecord.fields
      : {};

  const names = [
    fields['Account Name'],
    fields['Original Creditor'],
    fields['Debt Buyer']
  ];

  return names
    .map(function(value) {
      return canonicalizeCreditCreditorName_(
        value
      );
    })
    .filter(function(value) {
      return Boolean(value);
    });
}


/**
 * Determines whether any parser identity matches any existing
 * Airtable identity.
 */
function compareCreditIdentityNames_(
  parserNames,
  existingNames
) {
  let exactMatch = false;
  let bestSimilarity = 0;

  parserNames.forEach(function(parserName) {
    existingNames.forEach(function(existingName) {
      if (
        parserName &&
        existingName &&
        parserName === existingName
      ) {
        exactMatch = true;
      }

      const similarity =
        calculateCreditNameSimilarity_(
          parserName,
          existingName
        );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
    });
  });

  return {
    exactMatch: exactMatch,

    bestSimilarity:
      Number(bestSimilarity.toFixed(3))
  };
}


/**
 * Scores one parser record against one existing Airtable record
 * using stricter reconciliation rules.
 */
function scoreSafeCreditReconciliationMatch_(
  mappedRecord,
  existingRecord
) {
  const parserFields =
    mappedRecord && mappedRecord.fields
      ? mappedRecord.fields
      : {};

  const existingFields =
    existingRecord && existingRecord.fields
      ? existingRecord.fields
      : {};

  const parserNumber =
    parserFields['Account Number'] || '';

  const existingNumber =
    existingFields['Account Number'] || '';

  const parserDigits =
    getVisibleCreditAccountDigits_(
      parserNumber
    );

  const existingDigits =
    getVisibleCreditAccountDigits_(
      existingNumber
    );

  const parserEnding =
    getVisibleCreditAccountEnding_(
      parserNumber
    );

  const existingEnding =
    getVisibleCreditAccountEnding_(
      existingNumber
    );

  const parserNames =
    getParserCreditIdentityNames_(
      mappedRecord
    );

  const existingNames =
    getExistingCreditIdentityNames_(
      existingRecord
    );

  const identityComparison =
    compareCreditIdentityNames_(
      parserNames,
      existingNames
    );

  let exactVisibleDigits = false;
  let endingMatch = false;

  if (
    parserDigits &&
    existingDigits &&
    parserDigits === existingDigits
  ) {
    exactVisibleDigits = true;
  }

  if (
    parserEnding &&
    existingEnding
  ) {
    endingMatch =
      parserEnding === existingEnding ||
      parserEnding.endsWith(
        existingEnding
      ) ||
      existingEnding.endsWith(
        parserEnding
      );
  }

  let score = 0;
  const reasons = [];

  if (exactVisibleDigits) {
    score += 80;

    reasons.push(
      'EXACT_VISIBLE_ACCOUNT_DIGITS'
    );
  } else if (endingMatch) {
    score += 65;

    reasons.push(
      'VISIBLE_ACCOUNT_ENDING_MATCH'
    );
  }

  if (identityComparison.exactMatch) {
    score += 30;

    reasons.push(
      'EXACT_CANONICAL_CREDITOR_MATCH'
    );
  } else if (
    identityComparison.bestSimilarity >= 0.75
  ) {
    score += 20;

    reasons.push(
      'STRONG_CREDITOR_SIMILARITY'
    );
  } else if (
    identityComparison.bestSimilarity >= 0.5
  ) {
    score += 10;

    reasons.push(
      'PARTIAL_CREDITOR_SIMILARITY'
    );
  }

  /*
   * An existing record with no account number can still be a
   * likely match, but it must never be automatically confirmed
   * using name evidence alone.
   */
  const existingNumberMissing =
    !existingDigits;

  return {
    existingRecordId:
      existingRecord.id,

    existingAccountName:
      existingFields['Account Name'] || '',

    existingOriginalCreditor:
      existingFields['Original Creditor'] || '',

    existingAccountNumber:
      existingNumber,

    parserAccountName:
      parserFields['Account Name'] || '',

    parserOriginalCreditor:
      parserFields['Original Creditor'] || '',

    parserAccountNumber:
      parserNumber,

    parserVisibleEnding:
      parserEnding,

    existingVisibleEnding:
      existingEnding,

    exactVisibleDigits:
      exactVisibleDigits,

    endingMatch:
      endingMatch,

    exactIdentityMatch:
      identityComparison.exactMatch,

    creditorSimilarity:
      identityComparison.bestSimilarity,

    existingNumberMissing:
      existingNumberMissing,

    score:
      score,

    reasons:
      reasons
  };
}


/**
 * Returns the strongest reconciliation candidates.
 */
function findSafeCreditReconciliationCandidates_(
  mappedRecord,
  existingAirtableRecords,
  maximumCandidates
) {
  const existingRecords =
    Array.isArray(existingAirtableRecords)
      ? existingAirtableRecords
      : [];

  const candidates =
    existingRecords.map(function(existingRecord) {
      return scoreSafeCreditReconciliationMatch_(
        mappedRecord,
        existingRecord
      );
    });

  candidates.sort(function(first, second) {
    return second.score - first.score;
  });

  return candidates.slice(
    0,
    Number(maximumCandidates) || 3
  );
}


/**
 * Builds one strict reconciliation decision.
 */
function buildSafeCreditReconciliationDecision_(
  mappedRecord,
  validation,
  existingAirtableRecords
) {
  const fields =
    mappedRecord && mappedRecord.fields
      ? mappedRecord.fields
      : {};

  if (
    !validation ||
    !validation.valid
  ) {
    return {
      decision:
        'INVALID_REVIEW',

      reason:
        'MISSING_REQUIRED_FIELDS',

      accountName:
        fields['Account Name'] || '',

      accountNumber:
        fields['Account Number'] || '',

      missingRequiredFields:
        validation
          ? validation.missingRequiredFields
          : []
    };
  }

  const candidates =
    findSafeCreditReconciliationCandidates_(
      mappedRecord,
      existingAirtableRecords,
      3
    );

  const bestCandidate =
    candidates.length
      ? candidates[0]
      : null;

  const secondCandidate =
    candidates.length > 1
      ? candidates[1]
      : null;

  const scoreMargin =
    bestCandidate
      ? bestCandidate.score -
        (
          secondCandidate
            ? secondCandidate.score
            : 0
        )
      : 0;

  /*
   * Automatic matching requires both:
   * - account-number evidence
   * - creditor identity evidence
   */
  if (
    bestCandidate &&
    bestCandidate.score >= 95 &&
    (
      bestCandidate.exactVisibleDigits ||
      bestCandidate.endingMatch
    ) &&
    bestCandidate.exactIdentityMatch &&
    scoreMargin >= 20
  ) {
    return {
      decision:
        'AUTO_MATCH',

      reason:
        'ACCOUNT_AND_CREDITOR_EVIDENCE_CONFIRMED',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      matchedRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate
    };
  }

  /*
   * Any meaningful name or number evidence is sent to review
   * instead of being treated as a new account.
   */
  if (
    bestCandidate &&
    bestCandidate.score >= 20
  ) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'POSSIBLE_EXISTING_AIRTABLE_ACCOUNT',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate,

      candidates:
        candidates
    };
  }

  return {
    decision:
      'CREATE_CANDIDATE_REVIEW',

    reason:
      'NO_MEANINGFUL_EXISTING_MATCH',

    accountName:
      fields['Account Name'],

    accountNumber:
      fields['Account Number'],

    candidates:
      candidates
  };
}


/**
 * Builds the full read-only reconciliation plan.
 */
function buildFullSafeCreditReconciliationPlan_(
  mappedRecords,
  validationResults,
  existingAirtableRecords
) {
  return mappedRecords.map(
    function(mappedRecord, index) {
      return buildSafeCreditReconciliationDecision_(
        mappedRecord,
        validationResults[index],
        existingAirtableRecords
      );
    }
  );
}


/**
 * Creates compact log output so all 37 decisions can be read.
 */
function buildCompactCreditReconciliationLog_(
  decision,
  index
) {
  const bestCandidate =
    decision.bestCandidate || {};

  return {
    recordNumber:
      index + 1,

    decision:
      decision.decision,

    reason:
      decision.reason,

    accountName:
      decision.accountName || '',

    accountNumber:
      decision.accountNumber || '',

    matchedRecordId:
      decision.matchedRecordId || '',

    score:
      decision.score || 0,

    scoreMargin:
      decision.scoreMargin || 0,

    closestExistingAccount:
      bestCandidate.existingAccountName || '',

    closestExistingNumber:
      bestCandidate.existingAccountNumber || '',

    evidence:
      bestCandidate.reasons || [],

    missingRequiredFields:
      decision.missingRequiredFields || []
  };
}


/**
 * READ-ONLY TEST
 *
 * Evaluates all 37 indexed report accounts against Airtable.
 */
function testSafeFullCreditReconciliationPlan() {
  console.log(
    'PHASE 5D FULL RECONCILIATION STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex.accounts.length
    );

  const mappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const validationResults =
    mappedRecords.map(function(record) {
      return validateAirtableReadyCreditRecord_(
        record
      );
    });

  const existingAirtableRecords =
    fetchAllExistingCreditAirtableRecords_();

  const decisions =
    buildFullSafeCreditReconciliationPlan_(
      mappedRecords,
      validationResults,
      existingAirtableRecords
    );

  const autoMatchCount =
    decisions.filter(function(item) {
      return item.decision === 'AUTO_MATCH';
    }).length;

  const matchReviewCount =
    decisions.filter(function(item) {
      return item.decision === 'MATCH_REVIEW';
    }).length;

  const createCandidateCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'CREATE_CANDIDATE_REVIEW'
      );
    }).length;

  const invalidReviewCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'INVALID_REVIEW'
      );
    }).length;

  console.log(
    'Existing Airtable records loaded: ' +
    existingAirtableRecords.length
  );

  console.log(
    'Report accounts evaluated: ' +
    mappedRecords.length
  );

  console.log(
    'AUTO_MATCH decisions: ' +
    autoMatchCount
  );

  console.log(
    'MATCH_REVIEW decisions: ' +
    matchReviewCount
  );

  console.log(
    'CREATE_CANDIDATE_REVIEW decisions: ' +
    createCandidateCount
  );

  console.log(
    'INVALID_REVIEW decisions: ' +
    invalidReviewCount
  );

  decisions.forEach(
    function(decision, index) {
      console.log(
        JSON.stringify(
          buildCompactCreditReconciliationLog_(
            decision,
            index
          )
        )
      );
    }
  );

  console.log(
    'PHASE 5D FULL RECONCILIATION COMPLETED'
  );

  return {
    existingAirtableRecords:
      existingAirtableRecords.length,

    reportAccountsEvaluated:
      mappedRecords.length,

    autoMatches:
      autoMatchCount,

    matchReviews:
      matchReviewCount,

    createCandidateReviews:
      createCandidateCount,

    invalidReviews:
      invalidReviewCount,

    decisions:
      decisions
  };
}

/**
 * ============================================================
 * PHASE 6A — WRITE-LOCKED AIRTABLE IMPORTER
 * ============================================================
 *
 * Converts reconciliation decisions into proposed Airtable
 * operations while keeping all write activity disabled.
 *
 * READ-ONLY:
 * Airtable writes are blocked by an explicit safety lock.
 */


/**
 * Master safety switch.
 *
 * This must remain FALSE during Phase 6A.
 */
function isCreditAirtableWriteEnabled_() {
  return false;
}


/**
 * Removes blank fields before creating an Airtable payload.
 *
 * This prevents blank parser values from overwriting existing
 * data during future update operations.
 */
function removeBlankCreditAirtableFields_(fields) {
  const sourceFields =
    fields && typeof fields === 'object'
      ? fields
      : {};

  const cleanedFields = {};

  Object.keys(sourceFields).forEach(
    function(fieldName) {
      const value =
        sourceFields[fieldName];

      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        return;
      }

      cleanedFields[fieldName] = value;
    }
  );

  return cleanedFields;
}


/**
 * Creates one proposed Airtable operation.
 *
 * Phase 6A allows planning only. Review decisions never become
 * write operations.
 */
function buildLockedCreditImportOperation_(
  mappedRecord,
  reconciliationDecision
) {
  const fields =
    mappedRecord && mappedRecord.fields
      ? mappedRecord.fields
      : {};

  const decision =
    reconciliationDecision || {};

  if (
    decision.decision === 'AUTO_MATCH'
  ) {
    return {
      operation:
        'PROPOSED_UPDATE',

      allowedToWrite:
        false,

      reason:
        'WRITE_LOCK_ACTIVE',

      airtableRecordId:
        decision.matchedRecordId || '',

      accountName:
        fields['Account Name'] || '',

      accountNumber:
        fields['Account Number'] || '',

      fields:
        removeBlankCreditAirtableFields_(
          fields
        ),

      reconciliationDecision:
        decision.decision
    };
  }

  if (
    decision.decision ===
    'CREATE_CANDIDATE_REVIEW'
  ) {
    return {
      operation:
        'BLOCKED_CREATE_REVIEW',

      allowedToWrite:
        false,

      reason:
        'CREATE_REQUIRES_MANUAL_APPROVAL',

      accountName:
        fields['Account Name'] || '',

      accountNumber:
        fields['Account Number'] || '',

      fields:
        removeBlankCreditAirtableFields_(
          fields
        ),

      reconciliationDecision:
        decision.decision
    };
  }

  if (
    decision.decision === 'MATCH_REVIEW'
  ) {
    return {
      operation:
        'BLOCKED_MATCH_REVIEW',

      allowedToWrite:
        false,

      reason:
        'POSSIBLE_EXISTING_RECORD_REQUIRES_CONFIRMATION',

      accountName:
        fields['Account Name'] || '',

      accountNumber:
        fields['Account Number'] || '',

      possibleRecordId:
        decision.bestCandidate
          ? decision.bestCandidate.existingRecordId
          : '',

      reconciliationDecision:
        decision.decision
    };
  }

  return {
    operation:
      'BLOCKED_INVALID_REVIEW',

    allowedToWrite:
      false,

    reason:
      decision.reason ||
      'INVALID_OR_INCOMPLETE_RECORD',

    accountName:
      fields['Account Name'] || '',

    accountNumber:
      fields['Account Number'] || '',

    missingRequiredFields:
      decision.missingRequiredFields || [],

    reconciliationDecision:
      decision.decision || 'UNKNOWN'
  };
}


/**
 * Builds the complete write-locked import plan.
 */
function buildLockedCreditImportPlan_(
  mappedRecords,
  reconciliationDecisions
) {
  const records =
    Array.isArray(mappedRecords)
      ? mappedRecords
      : [];

  const decisions =
    Array.isArray(reconciliationDecisions)
      ? reconciliationDecisions
      : [];

  return records.map(
    function(mappedRecord, index) {
      return buildLockedCreditImportOperation_(
        mappedRecord,
        decisions[index]
      );
    }
  );
}


/**
 * Validates that no operation can write during Phase 6A.
 */
function validateCreditImportWriteLock_(
  importPlan
) {
  const operations =
    Array.isArray(importPlan)
      ? importPlan
      : [];

  const unsafeOperations =
    operations.filter(function(operation) {
      return operation.allowedToWrite === true;
    });

  return {
    writeLockEnabled:
      !isCreditAirtableWriteEnabled_(),

    totalOperations:
      operations.length,

    unsafeOperationCount:
      unsafeOperations.length,

    safe:
      !isCreditAirtableWriteEnabled_() &&
      unsafeOperations.length === 0
  };
}


/**
 * Creates a compact log record.
 */
function buildCompactLockedImportLog_(
  operation,
  index
) {
  return {
    recordNumber:
      index + 1,

    operation:
      operation.operation,

    allowedToWrite:
      operation.allowedToWrite,

    reason:
      operation.reason,

    accountName:
      operation.accountName || '',

    accountNumber:
      operation.accountNumber || '',

    possibleRecordId:
      operation.possibleRecordId || '',

    airtableRecordId:
      operation.airtableRecordId || '',

    missingRequiredFields:
      operation.missingRequiredFields || []
  };
}


/**
 * READ-ONLY TEST
 *
 * Builds the complete 37-account importer plan while proving
 * that the write lock blocks every Airtable mutation.
 */
function testBuildLockedCreditImportPlan() {
  console.log(
    'PHASE 6A WRITE-LOCKED IMPORT PLAN STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex.accounts.length
    );

  const mappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const validationResults =
    mappedRecords.map(function(record) {
      return validateAirtableReadyCreditRecord_(
        record
      );
    });

  const existingAirtableRecords =
    fetchAllExistingCreditAirtableRecords_();

  const reconciliationDecisions =
    buildFullSafeCreditReconciliationPlan_(
      mappedRecords,
      validationResults,
      existingAirtableRecords
    );

  const importPlan =
    buildLockedCreditImportPlan_(
      mappedRecords,
      reconciliationDecisions
    );

  const writeLockValidation =
    validateCreditImportWriteLock_(
      importPlan
    );

  const proposedUpdateCount =
    importPlan.filter(function(item) {
      return (
        item.operation ===
        'PROPOSED_UPDATE'
      );
    }).length;

  const blockedCreateCount =
    importPlan.filter(function(item) {
      return (
        item.operation ===
        'BLOCKED_CREATE_REVIEW'
      );
    }).length;

  const blockedMatchCount =
    importPlan.filter(function(item) {
      return (
        item.operation ===
        'BLOCKED_MATCH_REVIEW'
      );
    }).length;

  const blockedInvalidCount =
    importPlan.filter(function(item) {
      return (
        item.operation ===
        'BLOCKED_INVALID_REVIEW'
      );
    }).length;

  console.log(
    'Import records evaluated: ' +
    importPlan.length
  );

  console.log(
    'Proposed updates: ' +
    proposedUpdateCount
  );

  console.log(
    'Blocked create reviews: ' +
    blockedCreateCount
  );

  console.log(
    'Blocked match reviews: ' +
    blockedMatchCount
  );

  console.log(
    'Blocked invalid reviews: ' +
    blockedInvalidCount
  );

  console.log(
    'Write lock enabled: ' +
    writeLockValidation.writeLockEnabled
  );

  console.log(
    'Unsafe operations detected: ' +
    writeLockValidation.unsafeOperationCount
  );

  console.log(
    'Import plan safe: ' +
    writeLockValidation.safe
  );

  importPlan.forEach(
    function(operation, index) {
      console.log(
        JSON.stringify(
          buildCompactLockedImportLog_(
            operation,
            index
          )
        )
      );
    }
  );

  console.log(
    'PHASE 6A WRITE-LOCKED IMPORT PLAN COMPLETED'
  );

  return {
    importRecordsEvaluated:
      importPlan.length,

    proposedUpdates:
      proposedUpdateCount,

    blockedCreateReviews:
      blockedCreateCount,

    blockedMatchReviews:
      blockedMatchCount,

    blockedInvalidReviews:
      blockedInvalidCount,

    writeLockValidation:
      writeLockValidation,

    importPlan:
      importPlan
  };
}

/**
 * ============================================================
 * PHASE 6B — SMART MULTI-FIELD AIRTABLE MATCHING
 * ============================================================
 *
 * Improves reconciliation by comparing account-number evidence,
 * creditor identity, balances, account type, status, and bureau
 * reporting patterns.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Normalizes a descriptive comparison value.
 */
function normalizeSmartCreditText_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/n\/a/g, ' ')
    .replace(/unknown/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Converts a comparison value into a finite number.
 */
function normalizeSmartCreditNumber_(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const cleaned = String(value)
    .replace(/[^0-9.-]/g, '');

  if (!cleaned) {
    return null;
  }

  const numericValue = Number(cleaned);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
}


/**
 * Returns unique numeric balances from an Airtable field set.
 */
function getSmartCreditBalances_(fields) {
  const source =
    fields && typeof fields === 'object'
      ? fields
      : {};

  const values = [
    source['Experian Balance'],
    source['TransUnion Balance'],
    source['Equifax Balance']
  ]
    .map(function(value) {
      return normalizeSmartCreditNumber_(
        value
      );
    })
    .filter(function(value) {
      return value !== null;
    });

  const uniqueValues = [];

  values.forEach(function(value) {
    if (uniqueValues.indexOf(value) === -1) {
      uniqueValues.push(value);
    }
  });

  return uniqueValues;
}


/**
 * Determines whether two balance collections share a value.
 *
 * A difference of $1 is allowed for minor OCR variation.
 */
function compareSmartCreditBalances_(
  parserBalances,
  existingBalances
) {
  const parserValues =
    Array.isArray(parserBalances)
      ? parserBalances
      : [];

  const existingValues =
    Array.isArray(existingBalances)
      ? existingBalances
      : [];

  for (
    let parserIndex = 0;
    parserIndex < parserValues.length;
    parserIndex++
  ) {
    for (
      let existingIndex = 0;
      existingIndex < existingValues.length;
      existingIndex++
    ) {
      const difference = Math.abs(
        parserValues[parserIndex] -
        existingValues[existingIndex]
      );

      if (difference <= 1) {
        return {
          matched: true,
          parserBalance:
            parserValues[parserIndex],
          existingBalance:
            existingValues[existingIndex]
        };
      }
    }
  }

  return {
    matched: false,
    parserBalance: null,
    existingBalance: null
  };
}


/**
 * Returns normalized creditor identities from parser fields.
 */
function getSmartParserCreditorNames_(mappedRecord) {
  const fields =
    mappedRecord &&
    mappedRecord.fields
      ? mappedRecord.fields
      : {};

  return [
    fields['Account Name'],
    fields['Original Creditor']
  ]
    .map(function(value) {
      return canonicalizeCreditCreditorName_(
        value
      );
    })
    .filter(function(value) {
      return Boolean(value);
    });
}


/**
 * Returns normalized creditor identities from Airtable fields.
 */
function getSmartExistingCreditorNames_(
  existingRecord
) {
  const fields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  return [
    fields['Account Name'],
    fields['Original Creditor'],
    fields['Debt Buyer']
  ]
    .map(function(value) {
      return canonicalizeCreditCreditorName_(
        value
      );
    })
    .filter(function(value) {
      return Boolean(value);
    });
}


/**
 * Finds the strongest creditor-name comparison.
 */
function compareSmartCreditorNames_(
  parserNames,
  existingNames
) {
  let exactMatch = false;
  let bestSimilarity = 0;

  parserNames.forEach(function(parserName) {
    existingNames.forEach(function(existingName) {
      if (
        parserName &&
        existingName &&
        parserName === existingName
      ) {
        exactMatch = true;
      }

      const similarity =
        calculateCreditNameSimilarity_(
          parserName,
          existingName
        );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
    });
  });

  return {
    exactMatch: exactMatch,
    similarity: Number(
      bestSimilarity.toFixed(3)
    )
  };
}


/**
 * Compares account type values.
 */
function compareSmartCreditAccountType_(
  parserFields,
  existingFields
) {
  const parserType =
    normalizeSmartCreditText_(
      parserFields['Account Type']
    );

  const existingType =
    normalizeSmartCreditText_(
      existingFields['Account Type']
    );

  if (!parserType || !existingType) {
    return {
      matched: false,
      similarity: 0
    };
  }

  const similarity =
    calculateCreditNameSimilarity_(
      parserType,
      existingType
    );

  return {
    matched:
      parserType === existingType ||
      similarity >= 0.6,

    similarity:
      Number(similarity.toFixed(3))
  };
}


/**
 * Compares account status values.
 */
function compareSmartCreditStatus_(
  parserFields,
  existingFields
) {
  const parserStatus =
    normalizeSmartCreditText_(
      parserFields['Status']
    );

  const existingStatus =
    normalizeSmartCreditText_(
      existingFields['Status']
    );

  if (!parserStatus || !existingStatus) {
    return {
      matched: false,
      similarity: 0
    };
  }

  const parserWords =
    parserStatus.split(' ');

  const existingWords =
    existingStatus.split(' ');

  const sharedWords =
    parserWords.filter(function(word) {
      return (
        word.length >= 4 &&
        existingWords.indexOf(word) !== -1
      );
    });

  const union = {};

  parserWords.forEach(function(word) {
    if (word.length >= 4) {
      union[word] = true;
    }
  });

  existingWords.forEach(function(word) {
    if (word.length >= 4) {
      union[word] = true;
    }
  });

  const unionCount =
    Object.keys(union).length;

  const similarity =
    unionCount
      ? sharedWords.length / unionCount
      : 0;

  return {
    matched:
      parserStatus === existingStatus ||
      similarity >= 0.4,

    similarity:
      Number(similarity.toFixed(3))
  };
}


/**
 * Compares bureau reporting labels.
 */
function compareSmartCreditBureaus_(
  parserFields,
  existingFields
) {
  const bureauNames = [
    'Experian',
    'TransUnion',
    'Equifax'
  ];

  let comparableCount = 0;
  let matchingCount = 0;

  bureauNames.forEach(function(fieldName) {
    const parserValue =
      normalizeSmartCreditText_(
        parserFields[fieldName]
      );

    const existingValue =
      normalizeSmartCreditText_(
        existingFields[fieldName]
      );

    if (
      !parserValue ||
      !existingValue
    ) {
      return;
    }

    comparableCount++;

    if (parserValue === existingValue) {
      matchingCount++;
    }
  });

  return {
    comparableCount:
      comparableCount,

    matchingCount:
      matchingCount,

    matched:
      comparableCount > 0 &&
      comparableCount === matchingCount
  };
}


/**
 * Scores one parser account against one Airtable account.
 */
function scoreSmartCreditMatch_(
  mappedRecord,
  existingRecord
) {
  const parserFields =
    mappedRecord &&
    mappedRecord.fields
      ? mappedRecord.fields
      : {};

  const existingFields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const parserNumber =
    parserFields['Account Number'] || '';

  const existingNumber =
    existingFields['Account Number'] || '';

  const parserDigits =
    getVisibleCreditAccountDigits_(
      parserNumber
    );

  const existingDigits =
    getVisibleCreditAccountDigits_(
      existingNumber
    );

  const parserEnding =
    getVisibleCreditAccountEnding_(
      parserNumber
    );

  const existingEnding =
    getVisibleCreditAccountEnding_(
      existingNumber
    );

  const exactDigitsMatch =
    Boolean(
      parserDigits &&
      existingDigits &&
      parserDigits === existingDigits
    );

  const endingMatch =
    Boolean(
      parserEnding &&
      existingEnding &&
      (
        parserEnding === existingEnding ||
        parserEnding.endsWith(
          existingEnding
        ) ||
        existingEnding.endsWith(
          parserEnding
        )
      )
    );

  const creditorComparison =
    compareSmartCreditorNames_(
      getSmartParserCreditorNames_(
        mappedRecord
      ),
      getSmartExistingCreditorNames_(
        existingRecord
      )
    );

  const balanceComparison =
    compareSmartCreditBalances_(
      getSmartCreditBalances_(
        parserFields
      ),
      getSmartCreditBalances_(
        existingFields
      )
    );

  const typeComparison =
    compareSmartCreditAccountType_(
      parserFields,
      existingFields
    );

  const statusComparison =
    compareSmartCreditStatus_(
      parserFields,
      existingFields
    );

  const bureauComparison =
    compareSmartCreditBureaus_(
      parserFields,
      existingFields
    );

  let score = 0;
  let supportingMatchCount = 0;

  const evidence = [];

  if (exactDigitsMatch) {
    score += 70;

    evidence.push(
      'EXACT_VISIBLE_ACCOUNT_DIGITS'
    );
  } else if (endingMatch) {
    score += 55;

    evidence.push(
      'VISIBLE_ACCOUNT_ENDING_MATCH'
    );
  }

  if (creditorComparison.exactMatch) {
    score += 28;
    supportingMatchCount++;

    evidence.push(
      'EXACT_CREDITOR_IDENTITY'
    );
  } else if (
    creditorComparison.similarity >= 0.75
  ) {
    score += 20;
    supportingMatchCount++;

    evidence.push(
      'STRONG_CREDITOR_SIMILARITY'
    );
  } else if (
    creditorComparison.similarity >= 0.5
  ) {
    score += 10;

    evidence.push(
      'PARTIAL_CREDITOR_SIMILARITY'
    );
  }

  if (balanceComparison.matched) {
    score += 12;
    supportingMatchCount++;

    evidence.push(
      'BUREAU_BALANCE_MATCH'
    );
  }

  if (typeComparison.matched) {
    score += 7;
    supportingMatchCount++;

    evidence.push(
      'ACCOUNT_TYPE_MATCH'
    );
  }

  if (statusComparison.matched) {
    score += 6;
    supportingMatchCount++;

    evidence.push(
      'ACCOUNT_STATUS_MATCH'
    );
  }

  if (bureauComparison.matched) {
    score += 5;
    supportingMatchCount++;

    evidence.push(
      'BUREAU_REPORTING_MATCH'
    );
  }

  return {
    existingRecordId:
      existingRecord.id,

    existingAccountName:
      existingFields['Account Name'] || '',

    existingAccountNumber:
      existingNumber,

    score:
      score,

    supportingMatchCount:
      supportingMatchCount,

    exactDigitsMatch:
      exactDigitsMatch,

    endingMatch:
      endingMatch,

    creditorExactMatch:
      creditorComparison.exactMatch,

    creditorSimilarity:
      creditorComparison.similarity,

    balanceMatch:
      balanceComparison.matched,

    parserMatchedBalance:
      balanceComparison.parserBalance,

    existingMatchedBalance:
      balanceComparison.existingBalance,

    accountTypeMatch:
      typeComparison.matched,

    statusMatch:
      statusComparison.matched,

    bureauReportingMatch:
      bureauComparison.matched,

    evidence:
      evidence
  };
}


/**
 * Returns the strongest smart-match candidates.
 */
function findSmartCreditMatchCandidates_(
  mappedRecord,
  existingRecords,
  maximumCandidates
) {
  const records =
    Array.isArray(existingRecords)
      ? existingRecords
      : [];

  const candidates =
    records.map(function(existingRecord) {
      return scoreSmartCreditMatch_(
        mappedRecord,
        existingRecord
      );
    });

  candidates.sort(function(first, second) {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    return (
      second.supportingMatchCount -
      first.supportingMatchCount
    );
  });

  return candidates.slice(
    0,
    Number(maximumCandidates) || 3
  );
}


/**
 * Builds one smart, read-only match decision.
 */
function buildSmartCreditMatchDecision_(
  mappedRecord,
  validation,
  existingRecords
) {
  const fields =
    mappedRecord &&
    mappedRecord.fields
      ? mappedRecord.fields
      : {};

  if (
    !validation ||
    !validation.valid
  ) {
    return {
      decision:
        'INVALID_REVIEW',

      reason:
        'MISSING_REQUIRED_FIELDS',

      accountName:
        fields['Account Name'] || '',

      accountNumber:
        fields['Account Number'] || '',

      missingRequiredFields:
        validation
          ? validation.missingRequiredFields
          : []
    };
  }

  const candidates =
    findSmartCreditMatchCandidates_(
      mappedRecord,
      existingRecords,
      3
    );

  const bestCandidate =
    candidates[0] || null;

  const secondCandidate =
    candidates[1] || null;

  const scoreMargin =
    bestCandidate
      ? bestCandidate.score -
        (
          secondCandidate
            ? secondCandidate.score
            : 0
        )
      : 0;

  /*
   * Strong automatic candidate:
   * account-number evidence plus supporting account evidence.
   */
  if (
    bestCandidate &&
    bestCandidate.score >= 90 &&
    (
      bestCandidate.exactDigitsMatch ||
      bestCandidate.endingMatch
    ) &&
    bestCandidate.supportingMatchCount >= 1 &&
    scoreMargin >= 15
  ) {
    return {
      decision:
        'SMART_AUTO_MATCH_CANDIDATE',

      reason:
        'ACCOUNT_NUMBER_AND_SUPPORTING_FIELDS_MATCH',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      matchedRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate
    };
  }

  /*
   * Strong identity plus at least two supporting fields can
   * create a high-priority review even without number evidence.
   */
  if (
    bestCandidate &&
    bestCandidate.score >= 45 &&
    bestCandidate.creditorExactMatch &&
    bestCandidate.supportingMatchCount >= 2
  ) {
    return {
      decision:
        'HIGH_PRIORITY_MATCH_REVIEW',

      reason:
        'CREDITOR_AND_MULTIPLE_SUPPORTING_FIELDS_MATCH',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      possibleRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate,

      candidates:
        candidates
    };
  }

  if (
    bestCandidate &&
    bestCandidate.score >= 20
  ) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'POSSIBLE_EXISTING_ACCOUNT',

      accountName:
        fields['Account Name'],

      accountNumber:
        fields['Account Number'],

      possibleRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate,

      candidates:
        candidates
    };
  }

  return {
    decision:
      'CREATE_CANDIDATE_REVIEW',

    reason:
      'NO_MEANINGFUL_EXISTING_MATCH',

    accountName:
      fields['Account Name'],

    accountNumber:
      fields['Account Number'],

    candidates:
      candidates
  };
}


/**
 * READ-ONLY TEST
 *
 * Evaluates all 37 accounts with smart multi-field matching.
 */
function testSmartCreditAirtableMatching() {
  console.log(
    'PHASE 6B SMART MATCHING STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex.accounts.length
    );

  const mappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const validationResults =
    mappedRecords.map(function(record) {
      return validateAirtableReadyCreditRecord_(
        record
      );
    });

  const existingAirtableRecords =
    fetchAllExistingCreditAirtableRecords_();

  const decisions =
    mappedRecords.map(
      function(mappedRecord, index) {
        return buildSmartCreditMatchDecision_(
          mappedRecord,
          validationResults[index],
          existingAirtableRecords
        );
      }
    );

  const autoCandidateCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'SMART_AUTO_MATCH_CANDIDATE'
      );
    }).length;

  const highPriorityReviewCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'HIGH_PRIORITY_MATCH_REVIEW'
      );
    }).length;

  const matchReviewCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'MATCH_REVIEW'
      );
    }).length;

  const createCandidateCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'CREATE_CANDIDATE_REVIEW'
      );
    }).length;

  const invalidCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'INVALID_REVIEW'
      );
    }).length;

  console.log(
    'Existing Airtable records loaded: ' +
    existingAirtableRecords.length
  );

  console.log(
    'Report accounts evaluated: ' +
    decisions.length
  );

  console.log(
    'Smart auto-match candidates: ' +
    autoCandidateCount
  );

  console.log(
    'High-priority match reviews: ' +
    highPriorityReviewCount
  );

  console.log(
    'Standard match reviews: ' +
    matchReviewCount
  );

  console.log(
    'Create-candidate reviews: ' +
    createCandidateCount
  );

  console.log(
    'Invalid reviews: ' +
    invalidCount
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  decisions.forEach(
    function(decision, index) {
      const bestCandidate =
        decision.bestCandidate || {};

      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          decision:
            decision.decision,

          reason:
            decision.reason,

          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          possibleRecordId:
            decision.possibleRecordId || '',

          matchedRecordId:
            decision.matchedRecordId || '',

          score:
            decision.score || 0,

          scoreMargin:
            decision.scoreMargin || 0,

          closestExistingAccount:
            bestCandidate.existingAccountName || '',

          closestExistingNumber:
            bestCandidate.existingAccountNumber || '',

          supportingMatchCount:
            bestCandidate.supportingMatchCount || 0,

          evidence:
            bestCandidate.evidence || [],

          missingRequiredFields:
            decision.missingRequiredFields || []
        })
      );
    }
  );

  console.log(
    'PHASE 6B SMART MATCHING COMPLETED'
  );

  return {
    existingAirtableRecords:
      existingAirtableRecords.length,

    reportAccountsEvaluated:
      decisions.length,

    smartAutoMatchCandidates:
      autoCandidateCount,

    highPriorityMatchReviews:
      highPriorityReviewCount,

    standardMatchReviews:
      matchReviewCount,

    createCandidateReviews:
      createCandidateCount,

    invalidReviews:
      invalidCount,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    decisions:
      decisions
  };
}

/**
 * ============================================================
 * PHASE 6C — EXACT AIRTABLE SCHEMA ADAPTER
 * ============================================================
 *
 * Adapts parser records to the real Personal Credit Repair
 * Airtable schema and excludes non-account control records.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Exact field names from the live Personal Credit Repair table.
 */
function getPersonalCreditAirtableSchemaMap_() {
  return {
    accountName: 'Account Name',
    accountNumber: 'Acct #',
    originalCreditor: 'Original Creditor',
    debtBuyer: 'Debt Buyer',
    accountType: 'Account Type',
    status: 'Status',

    experianReporting: 'Experian',
    transUnionReporting: 'TransUnion',
    equifaxReporting: 'Equifax',

    experianBalance: 'EXP  Balance',
    transUnionBalance: 'TU Balance',
    equifaxBalance: 'EQ Balance',

    dateOpened: 'Date Opened',
    dateClosed: 'Date Closed',
    lastReported: 'Last Reported',

    experianDofd: 'EXP DOFD',
    transUnionDofd: 'TU DOFD',
    equifaxDofd: 'EQ  DOFD',

    violationTag: 'Violation Tag',
    actionNeeded: 'Action Needed',
    actionStage: 'Action Stage',
    notes: 'Notes'
  };
}


/**
 * Converts parser bureau values into Airtable checkbox values.
 */
function convertCreditReportingValueToCheckbox_(value) {
  if (value === true) {
    return true;
  }

  if (
    value === false ||
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  const normalized =
    normalizeSmartCreditText_(value);

  if (!normalized) {
    return false;
  }

  const falseTerms = [
    'not reporting',
    'no',
    'false',
    'none',
    'not reported',
    'n a'
  ];

  for (
    let index = 0;
    index < falseTerms.length;
    index++
  ) {
    if (
      normalized.indexOf(
        falseTerms[index]
      ) !== -1
    ) {
      return false;
    }
  }

  const trueTerms = [
    'reporting',
    'reported',
    'yes',
    'true',
    'open',
    'closed',
    'collection',
    'charge off',
    'pays as agreed'
  ];

  for (
    let index = 0;
    index < trueTerms.length;
    index++
  ) {
    if (
      normalized.indexOf(
        trueTerms[index]
      ) !== -1
    ) {
      return true;
    }
  }

  return false;
}


/**
 * Returns the first usable field value.
 */
function getFirstUsableCreditField_(
  fields,
  possibleNames
) {
  const source =
    fields && typeof fields === 'object'
      ? fields
      : {};

  const names =
    Array.isArray(possibleNames)
      ? possibleNames
      : [];

  for (
    let index = 0;
    index < names.length;
    index++
  ) {
    const value =
      source[names[index]];

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      return value;
    }
  }

  return '';
}


/**
 * Converts one parser-mapped record into the exact Airtable
 * Personal Credit Repair field structure.
 */
function adaptParserRecordToPersonalCreditSchema_(
  mappedRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const source =
    mappedRecord &&
    mappedRecord.fields
      ? mappedRecord.fields
      : {};

  const adaptedFields = {};

  adaptedFields[schema.accountName] =
    getFirstUsableCreditField_(
      source,
      [
        'Account Name',
        'Creditor Name'
      ]
    );

  adaptedFields[schema.accountNumber] =
    getFirstUsableCreditField_(
      source,
      [
        'Account Number',
        'Acct #',
        'Primary Account Number'
      ]
    );

  adaptedFields[schema.originalCreditor] =
    getFirstUsableCreditField_(
      source,
      [
        'Original Creditor',
        'Original creditor'
      ]
    );

  adaptedFields[schema.debtBuyer] =
    getFirstUsableCreditField_(
      source,
      [
        'Debt Buyer',
        'Collection Agency'
      ]
    );

  adaptedFields[schema.accountType] =
    getFirstUsableCreditField_(
      source,
      [
        'Account Type'
      ]
    );

  adaptedFields[schema.status] =
    getFirstUsableCreditField_(
      source,
      [
        'Status',
        'Account Status'
      ]
    );

  adaptedFields[schema.experianReporting] =
    convertCreditReportingValueToCheckbox_(
      getFirstUsableCreditField_(
        source,
        [
          'Experian',
          'Experian Reporting'
        ]
      )
    );

  adaptedFields[schema.transUnionReporting] =
    convertCreditReportingValueToCheckbox_(
      getFirstUsableCreditField_(
        source,
        [
          'TransUnion',
          'Trans Union',
          'TransUnion Reporting'
        ]
      )
    );

  adaptedFields[schema.equifaxReporting] =
    convertCreditReportingValueToCheckbox_(
      getFirstUsableCreditField_(
        source,
        [
          'Equifax',
          'Equifax Reporting'
        ]
      )
    );

  adaptedFields[schema.experianBalance] =
    normalizeSmartCreditNumber_(
      getFirstUsableCreditField_(
        source,
        [
          'Experian Balance',
          'EXP Balance',
          'EXP  Balance'
        ]
      )
    );

  adaptedFields[schema.transUnionBalance] =
    normalizeSmartCreditNumber_(
      getFirstUsableCreditField_(
        source,
        [
          'TransUnion Balance',
          'TU Balance'
        ]
      )
    );

  adaptedFields[schema.equifaxBalance] =
    normalizeSmartCreditNumber_(
      getFirstUsableCreditField_(
        source,
        [
          'Equifax Balance',
          'EQ Balance'
        ]
      )
    );

  adaptedFields[schema.dateOpened] =
    getFirstUsableCreditField_(
      source,
      [
        'Date Opened'
      ]
    );

  adaptedFields[schema.dateClosed] =
    getFirstUsableCreditField_(
      source,
      [
        'Date Closed'
      ]
    );

  adaptedFields[schema.lastReported] =
    getFirstUsableCreditField_(
      source,
      [
        'Last Reported'
      ]
    );

  adaptedFields[schema.experianDofd] =
    getFirstUsableCreditField_(
      source,
      [
        'Experian DOFD',
        'EXP DOFD'
      ]
    );

  adaptedFields[schema.transUnionDofd] =
    getFirstUsableCreditField_(
      source,
      [
        'TransUnion DOFD',
        'TU DOFD'
      ]
    );

  adaptedFields[schema.equifaxDofd] =
    getFirstUsableCreditField_(
      source,
      [
        'Equifax DOFD',
        'EQ DOFD',
        'EQ  DOFD'
      ]
    );

  adaptedFields[schema.violationTag] =
    getFirstUsableCreditField_(
      source,
      [
        'Violation Tag'
      ]
    );

  adaptedFields[schema.actionNeeded] =
    getFirstUsableCreditField_(
      source,
      [
        'Action Needed'
      ]
    );

  adaptedFields[schema.actionStage] =
    getFirstUsableCreditField_(
      source,
      [
        'Action Stage'
      ]
    );

  adaptedFields[schema.notes] =
    getFirstUsableCreditField_(
      source,
      [
        'Note',
        'Notes'
      ]
    );

  return {
    fields:
      removeBlankCreditAirtableFields_(
        adaptedFields
      ),

    parserMetadata:
      mappedRecord.parserMetadata || null
  };
}


/**
 * Converts all parser records into the exact live schema.
 */
function adaptParserRecordsToPersonalCreditSchema_(
  mappedRecords
) {
  const records =
    Array.isArray(mappedRecords)
      ? mappedRecords
      : [];

  return records.map(function(record) {
    return adaptParserRecordToPersonalCreditSchema_(
      record
    );
  });
}


/**
 * Detects obvious Airtable rows that are not real credit
 * accounts.
 */
function isNonAccountPersonalCreditRecord_(
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const accountName =
    normalizeSmartCreditText_(
      fields[schema.accountName]
    );

  const accountNumber =
    getVisibleCreditAccountDigits_(
      fields[schema.accountNumber]
    );

  const originalCreditor =
    normalizeSmartCreditText_(
      fields[schema.originalCreditor]
    );

  const debtBuyer =
    normalizeSmartCreditText_(
      fields[schema.debtBuyer]
    );

  const accountType =
    normalizeSmartCreditText_(
      fields[schema.accountType]
    );

  const status =
    normalizeSmartCreditText_(
      fields[schema.status]
    );

  const balances =
    [
      fields[schema.experianBalance],
      fields[schema.transUnionBalance],
      fields[schema.equifaxBalance]
    ]
      .map(function(value) {
        return normalizeSmartCreditNumber_(
          value
        );
      })
      .filter(function(value) {
        return value !== null;
      });

  if (!accountName) {
    return true;
  }

  const nonAccountPhrases = [
    'fico score',
    'score went up',
    'score changed',
    'potentially negative alert',
    'monthly account statement',
    'dispute results',
    'dispute april',
    'transunion dispute',
    'equifax dispute',
    'experian dispute',
    'credit file alert'
  ];

  for (
    let index = 0;
    index < nonAccountPhrases.length;
    index++
  ) {
    if (
      accountName.indexOf(
        nonAccountPhrases[index]
      ) !== -1
    ) {
      return true;
    }
  }

  const bureauOnlyNames = [
    'experian',
    'equifax',
    'trans union',
    'transunion'
  ];

  if (
    bureauOnlyNames.indexOf(
      accountName
    ) !== -1 &&
    !accountNumber &&
    !originalCreditor &&
    !debtBuyer &&
    !accountType &&
    balances.length === 0
  ) {
    return true;
  }

  const hasAccountEvidence =
    Boolean(
      accountNumber ||
      originalCreditor ||
      debtBuyer ||
      accountType ||
      status ||
      balances.length
    );

  return !hasAccountEvidence;
}


/**
 * Returns only real account records from the Airtable table.
 */
function filterExistingPersonalCreditAccountRecords_(
  existingRecords
) {
  const records =
    Array.isArray(existingRecords)
      ? existingRecords
      : [];

  return records.filter(function(record) {
    return !isNonAccountPersonalCreditRecord_(
      record
    );
  });
}


/**
 * Returns exact-schema balances.
 */
function getExactSchemaCreditBalances_(fields) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  return [
    fields[schema.experianBalance],
    fields[schema.transUnionBalance],
    fields[schema.equifaxBalance]
  ]
    .map(function(value) {
      return normalizeSmartCreditNumber_(
        value
      );
    })
    .filter(function(value) {
      return value !== null;
    });
}


/**
 * Returns exact-schema creditor identities.
 */
function getExactSchemaCreditorNames_(fields) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  return [
    fields[schema.accountName],
    fields[schema.originalCreditor],
    fields[schema.debtBuyer]
  ]
    .map(function(value) {
      return canonicalizeCreditCreditorName_(
        value
      );
    })
    .filter(function(value) {
      return Boolean(value);
    });
}


/**
 * Scores an adapted parser record against a real Airtable
 * account record.
 */
function scoreExactSchemaCreditMatch_(
  adaptedParserRecord,
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const parserFields =
    adaptedParserRecord &&
    adaptedParserRecord.fields
      ? adaptedParserRecord.fields
      : {};

  const existingFields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const parserNumber =
    parserFields[schema.accountNumber] || '';

  const existingNumber =
    existingFields[schema.accountNumber] || '';

  const parserDigits =
    getVisibleCreditAccountDigits_(
      parserNumber
    );

  const existingDigits =
    getVisibleCreditAccountDigits_(
      existingNumber
    );

  const parserEnding =
    getVisibleCreditAccountEnding_(
      parserNumber
    );

  const existingEnding =
    getVisibleCreditAccountEnding_(
      existingNumber
    );

  const exactDigitsMatch =
    Boolean(
      parserDigits &&
      existingDigits &&
      parserDigits === existingDigits
    );

  const endingMatch =
    Boolean(
      parserEnding &&
      existingEnding &&
      (
        parserEnding === existingEnding ||
        parserEnding.endsWith(
          existingEnding
        ) ||
        existingEnding.endsWith(
          parserEnding
        )
      )
    );

  const creditorComparison =
    compareSmartCreditorNames_(
      getExactSchemaCreditorNames_(
        parserFields
      ),
      getExactSchemaCreditorNames_(
        existingFields
      )
    );

  const balanceComparison =
    compareSmartCreditBalances_(
      getExactSchemaCreditBalances_(
        parserFields
      ),
      getExactSchemaCreditBalances_(
        existingFields
      )
    );

  const typeComparison =
    compareSmartCreditAccountType_(
      {
        'Account Type':
          parserFields[schema.accountType]
      },
      {
        'Account Type':
          existingFields[schema.accountType]
      }
    );

  const statusComparison =
    compareSmartCreditStatus_(
      {
        'Status':
          parserFields[schema.status]
      },
      {
        'Status':
          existingFields[schema.status]
      }
    );

  let score = 0;
  let supportingMatchCount = 0;

  const evidence = [];

  if (exactDigitsMatch) {
    score += 70;

    evidence.push(
      'EXACT_ACCOUNT_DIGITS'
    );
  } else if (endingMatch) {
    score += 55;

    evidence.push(
      'ACCOUNT_ENDING_MATCH'
    );
  }

  if (creditorComparison.exactMatch) {
    score += 30;
    supportingMatchCount++;

    evidence.push(
      'EXACT_CREDITOR_MATCH'
    );
  } else if (
    creditorComparison.similarity >= 0.75
  ) {
    score += 22;
    supportingMatchCount++;

    evidence.push(
      'STRONG_CREDITOR_SIMILARITY'
    );
  } else if (
    creditorComparison.similarity >= 0.5
  ) {
    score += 12;

    evidence.push(
      'PARTIAL_CREDITOR_SIMILARITY'
    );
  }

  if (balanceComparison.matched) {
    score += 15;
    supportingMatchCount++;

    evidence.push(
      'BALANCE_MATCH'
    );
  }

  if (typeComparison.matched) {
    score += 8;
    supportingMatchCount++;

    evidence.push(
      'ACCOUNT_TYPE_MATCH'
    );
  }

  if (statusComparison.matched) {
    score += 7;
    supportingMatchCount++;

    evidence.push(
      'STATUS_MATCH'
    );
  }

  return {
    existingRecordId:
      existingRecord.id,

    existingAccountName:
      existingFields[schema.accountName] || '',

    existingAccountNumber:
      existingNumber,

    score:
      score,

    supportingMatchCount:
      supportingMatchCount,

    exactDigitsMatch:
      exactDigitsMatch,

    endingMatch:
      endingMatch,

    creditorExactMatch:
      creditorComparison.exactMatch,

    creditorSimilarity:
      creditorComparison.similarity,

    balanceMatch:
      balanceComparison.matched,

    accountTypeMatch:
      typeComparison.matched,

    statusMatch:
      statusComparison.matched,

    evidence:
      evidence
  };
}


/**
 * Returns best exact-schema match candidates.
 */
function findExactSchemaCreditMatchCandidates_(
  adaptedParserRecord,
  existingAccountRecords,
  maximumCandidates
) {
  const candidates =
    existingAccountRecords.map(
      function(existingRecord) {
        return scoreExactSchemaCreditMatch_(
          adaptedParserRecord,
          existingRecord
        );
      }
    );

  candidates.sort(function(first, second) {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    return (
      second.supportingMatchCount -
      first.supportingMatchCount
    );
  });

  return candidates.slice(
    0,
    Number(maximumCandidates) || 3
  );
}


/**
 * Builds one exact-schema match decision.
 */
function buildExactSchemaCreditMatchDecision_(
  adaptedRecord,
  existingAccountRecords
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    adaptedRecord &&
    adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const accountName =
    fields[schema.accountName] || '';

  const accountNumber =
    fields[schema.accountNumber] || '';

  if (
    !accountName ||
    !accountNumber
  ) {
    return {
      decision:
        'INVALID_REVIEW',

      reason:
        'MISSING_ACCOUNT_NAME_OR_NUMBER',

      accountName:
        accountName,

      accountNumber:
        accountNumber
    };
  }

  const candidates =
    findExactSchemaCreditMatchCandidates_(
      adaptedRecord,
      existingAccountRecords,
      3
    );

  const bestCandidate =
    candidates[0] || null;

  const secondCandidate =
    candidates[1] || null;

  const scoreMargin =
    bestCandidate
      ? bestCandidate.score -
        (
          secondCandidate
            ? secondCandidate.score
            : 0
        )
      : 0;

  if (
    bestCandidate &&
    bestCandidate.score >= 90 &&
    (
      bestCandidate.exactDigitsMatch ||
      bestCandidate.endingMatch
    ) &&
    bestCandidate.supportingMatchCount >= 1 &&
    scoreMargin >= 15
  ) {
    return {
      decision:
        'EXACT_AUTO_MATCH_CANDIDATE',

      reason:
        'ACCOUNT_NUMBER_AND_SUPPORTING_FIELDS_MATCH',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      matchedRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate
    };
  }

  if (
    bestCandidate &&
    bestCandidate.score >= 45 &&
    bestCandidate.creditorExactMatch &&
    bestCandidate.supportingMatchCount >= 2
  ) {
    return {
      decision:
        'HIGH_PRIORITY_MATCH_REVIEW',

      reason:
        'CREDITOR_AND_SUPPORTING_FIELDS_MATCH',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      possibleRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate,

      candidates:
        candidates
    };
  }

  if (
    bestCandidate &&
    bestCandidate.score >= 20
  ) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'POSSIBLE_EXISTING_ACCOUNT',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      possibleRecordId:
        bestCandidate.existingRecordId,

      score:
        bestCandidate.score,

      scoreMargin:
        scoreMargin,

      bestCandidate:
        bestCandidate,

      candidates:
        candidates
    };
  }

  return {
    decision:
      'CREATE_CANDIDATE_REVIEW',

    reason:
      'NO_MEANINGFUL_EXISTING_MATCH',

    accountName:
      accountName,

    accountNumber:
      accountNumber,

    candidates:
      candidates
  };
}


/**
 * READ-ONLY TEST
 *
 * Tests all 37 report accounts against only real Airtable
 * credit-account records using the exact live schema.
 */
function testExactPersonalCreditSchemaMatching() {
  console.log(
    'PHASE 6C EXACT SCHEMA MATCHING STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const cleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex.accounts.length
    );

  const genericMappedRecords =
    buildAirtableReadyCreditRecords_(
      cleanRecords
    );

  const adaptedRecords =
    adaptParserRecordsToPersonalCreditSchema_(
      genericMappedRecords
    );

  const allExistingRecords =
    fetchAllExistingCreditAirtableRecords_();

  const existingAccountRecords =
    filterExistingPersonalCreditAccountRecords_(
      allExistingRecords
    );

  const excludedExistingRecords =
    allExistingRecords.length -
    existingAccountRecords.length;

  const decisions =
    adaptedRecords.map(function(record) {
      return buildExactSchemaCreditMatchDecision_(
        record,
        existingAccountRecords
      );
    });

  const autoMatchCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'EXACT_AUTO_MATCH_CANDIDATE'
      );
    }).length;

  const highPriorityCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'HIGH_PRIORITY_MATCH_REVIEW'
      );
    }).length;

  const matchReviewCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'MATCH_REVIEW'
      );
    }).length;

  const createCandidateCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'CREATE_CANDIDATE_REVIEW'
      );
    }).length;

  const invalidCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'INVALID_REVIEW'
      );
    }).length;

  console.log(
    'All Airtable rows loaded: ' +
    allExistingRecords.length
  );

  console.log(
    'Real Airtable account rows retained: ' +
    existingAccountRecords.length
  );

  console.log(
    'Non-account Airtable rows excluded: ' +
    excludedExistingRecords
  );

  console.log(
    'Report accounts evaluated: ' +
    decisions.length
  );

  console.log(
    'Exact auto-match candidates: ' +
    autoMatchCount
  );

  console.log(
    'High-priority match reviews: ' +
    highPriorityCount
  );

  console.log(
    'Standard match reviews: ' +
    matchReviewCount
  );

  console.log(
    'Create-candidate reviews: ' +
    createCandidateCount
  );

  console.log(
    'Invalid reviews: ' +
    invalidCount
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  decisions.forEach(
    function(decision, index) {
      const bestCandidate =
        decision.bestCandidate || {};

      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          decision:
            decision.decision,

          reason:
            decision.reason,

          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          matchedRecordId:
            decision.matchedRecordId || '',

          possibleRecordId:
            decision.possibleRecordId || '',

          score:
            decision.score || 0,

          scoreMargin:
            decision.scoreMargin || 0,

          closestExistingAccount:
            bestCandidate.existingAccountName || '',

          closestExistingNumber:
            bestCandidate.existingAccountNumber || '',

          supportingMatchCount:
            bestCandidate.supportingMatchCount || 0,

          evidence:
            bestCandidate.evidence || []
        })
      );
    }
  );

  console.log(
    'PHASE 6C EXACT SCHEMA MATCHING COMPLETED'
  );

  return {
    allAirtableRows:
      allExistingRecords.length,

    retainedAccountRows:
      existingAccountRecords.length,

    excludedNonAccountRows:
      excludedExistingRecords,

    reportAccountsEvaluated:
      decisions.length,

    exactAutoMatches:
      autoMatchCount,

    highPriorityReviews:
      highPriorityCount,

    standardMatchReviews:
      matchReviewCount,

    createCandidateReviews:
      createCandidateCount,

    invalidReviews:
      invalidCount,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    decisions:
      decisions
  };
}

/**
 * ============================================================
 * PHASE 6D — BEST BUREAU ACCOUNT-NUMBER SELECTION
 * ============================================================
 *
 * Selects the bureau account-number value containing the best
 * usable visible digits instead of taking the first nonblank
 * masked value.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Counts visible numeric digits in an account-number value.
 */
function countVisibleCreditAccountDigits_(value) {
  return getVisibleCreditAccountDigits_(
    value
  ).length;
}


/**
 * Counts mask characters in an account-number value.
 */
function countCreditAccountMaskCharacters_(value) {
  const text = String(value || '');

  const matches = text.match(
    /[xX*]/g
  );

  return matches
    ? matches.length
    : 0;
}


/**
 * Determines whether an account-number value contains useful
 * visible account digits.
 */
function hasUsefulVisibleCreditDigits_(value) {
  return (
    countVisibleCreditAccountDigits_(value) > 0
  );
}


/**
 * Scores one bureau account-number candidate.
 *
 * Higher scores are better.
 */
function scoreCreditAccountNumberCandidate_(
  value,
  bureauName
) {
  const text = String(value || '')
    .trim();

  const visibleDigits =
    getVisibleCreditAccountDigits_(
      text
    );

  const visibleDigitCount =
    visibleDigits.length;

  const maskCount =
    countCreditAccountMaskCharacters_(
      text
    );

  const normalizedText =
    normalizeSmartCreditText_(
      text
    );

  let score = 0;
  const reasons = [];

  if (!text) {
    return {
      bureau:
        bureauName,

      value:
        '',

      visibleDigits:
        '',

      visibleDigitCount:
        0,

      maskCount:
        0,

      score:
        -100,

      reasons: [
        'BLANK_VALUE'
      ]
    };
  }

  if (
    normalizedText === 'n a' ||
    normalizedText === 'na' ||
    normalizedText === 'null'
  ) {
    return {
      bureau:
        bureauName,

      value:
        text,

      visibleDigits:
        '',

      visibleDigitCount:
        0,

      maskCount:
        maskCount,

      score:
        -90,

      reasons: [
        'UNUSABLE_VALUE'
      ]
    };
  }

  if (visibleDigitCount > 0) {
    score += visibleDigitCount * 20;

    reasons.push(
      'VISIBLE_DIGITS_' +
      visibleDigitCount
    );
  }

  if (visibleDigitCount >= 4) {
    score += 30;

    reasons.push(
      'USEFUL_ACCOUNT_ENDING'
    );
  }

  if (visibleDigitCount >= 8) {
    score += 25;

    reasons.push(
      'LONG_VISIBLE_NUMBER'
    );
  }

  if (
    visibleDigitCount === 0 &&
    maskCount > 0
  ) {
    score -= 40;

    reasons.push(
      'FULLY_MASKED'
    );
  }

  if (
    visibleDigitCount > 0 &&
    maskCount > 0
  ) {
    score += 5;

    reasons.push(
      'PARTIALLY_MASKED'
    );
  }

  if (
    visibleDigitCount > 0 &&
    maskCount === 0
  ) {
    score += 15;

    reasons.push(
      'UNMASKED_VISIBLE_DIGITS'
    );
  }

  /*
   * Small deterministic bureau preference used only when two
   * candidates otherwise contain the same amount of evidence.
   */
  if (bureauName === 'experian') {
    score += 3;
  } else if (bureauName === 'transUnion') {
    score += 2;
  } else if (bureauName === 'equifax') {
    score += 1;
  }

  return {
    bureau:
      bureauName,

    value:
      text,

    visibleDigits:
      visibleDigits,

    visibleDigitCount:
      visibleDigitCount,

    maskCount:
      maskCount,

    score:
      score,

    reasons:
      reasons
  };
}


/**
 * Selects the strongest account-number value from Equifax,
 * Experian, and TransUnion.
 */
function selectBestCreditAccountNumber_(
  accountNumbers
) {
  const triplet =
    accountNumbers || {};

  const candidates = [
    scoreCreditAccountNumberCandidate_(
      triplet.equifax,
      'equifax'
    ),

    scoreCreditAccountNumberCandidate_(
      triplet.experian,
      'experian'
    ),

    scoreCreditAccountNumberCandidate_(
      triplet.transUnion,
      'transUnion'
    )
  ];

  candidates.sort(function(first, second) {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    if (
      second.visibleDigitCount !==
      first.visibleDigitCount
    ) {
      return (
        second.visibleDigitCount -
        first.visibleDigitCount
      );
    }

    return first.maskCount - second.maskCount;
  });

  const bestCandidate =
    candidates[0] || null;

  if (
    !bestCandidate ||
    bestCandidate.score < 0
  ) {
    return {
      value: '',
      bureau: '',
      visibleDigits: '',
      score: 0,
      candidates: candidates
    };
  }

  return {
    value:
      bestCandidate.value,

    bureau:
      bestCandidate.bureau,

    visibleDigits:
      bestCandidate.visibleDigits,

    score:
      bestCandidate.score,

    reasons:
      bestCandidate.reasons,

    candidates:
      candidates
  };
}


/**
 * Rebuilds one clean parser record using the strongest bureau
 * account-number value.
 */
function applyBestAccountNumberToCleanRecord_(
  cleanRecord
) {
  const source =
    cleanRecord || {};

  const bestNumber =
    selectBestCreditAccountNumber_(
      source.accountNumbers
    );

  const updatedRecord =
    Object.assign(
      {},
      source
    );

  updatedRecord.primaryAccountNumber =
    bestNumber.value;

  updatedRecord.primaryAccountNumberBureau =
    bestNumber.bureau;

  updatedRecord.primaryVisibleAccountDigits =
    bestNumber.visibleDigits;

  updatedRecord.accountNumberSelectionScore =
    bestNumber.score;

  updatedRecord.accountNumberSelectionReasons =
    bestNumber.reasons || [];

  return updatedRecord;
}


/**
 * Applies best-number selection to every clean parser record.
 */
function applyBestAccountNumbersToCleanRecords_(
  cleanRecords
) {
  const records =
    Array.isArray(cleanRecords)
      ? cleanRecords
      : [];

  return records.map(function(record) {
    return applyBestAccountNumberToCleanRecord_(
      record
    );
  });
}


/**
 * Creates compact diagnostics for account-number selection.
 */
function buildCompactBestAccountNumberLog_(
  originalRecord,
  updatedRecord,
  index
) {
  const numbers =
    originalRecord.accountNumbers || {};

  return {
    recordNumber:
      index + 1,

    accountName:
      updatedRecord.accountName || '',

    equifaxNumber:
      numbers.equifax || '',

    experianNumber:
      numbers.experian || '',

    transUnionNumber:
      numbers.transUnion || '',

    selectedNumber:
      updatedRecord.primaryAccountNumber || '',

    selectedBureau:
      updatedRecord
        .primaryAccountNumberBureau || '',

    selectedVisibleDigits:
      updatedRecord
        .primaryVisibleAccountDigits || '',

    selectionScore:
      updatedRecord
        .accountNumberSelectionScore || 0,

    reasons:
      updatedRecord
        .accountNumberSelectionReasons || []
  };
}


/**
 * READ-ONLY TEST
 *
 * Rebuilds all 37 clean records using the strongest bureau
 * account number and reruns exact-schema matching.
 */
function testBestBureauAccountNumberMatching() {
  console.log(
    'PHASE 6D BEST ACCOUNT NUMBER STARTED'
  );

  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const originalCleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex.accounts.length
    );

  const improvedCleanRecords =
    applyBestAccountNumbersToCleanRecords_(
      originalCleanRecords
    );

  const genericMappedRecords =
    buildAirtableReadyCreditRecords_(
      improvedCleanRecords
    );

  const adaptedRecords =
    adaptParserRecordsToPersonalCreditSchema_(
      genericMappedRecords
    );

  const allExistingRecords =
    fetchAllExistingCreditAirtableRecords_();

  const existingAccountRecords =
    filterExistingPersonalCreditAccountRecords_(
      allExistingRecords
    );

  const decisions =
    adaptedRecords.map(function(record) {
      return buildExactSchemaCreditMatchDecision_(
        record,
        existingAccountRecords
      );
    });

  const selectedVisibleNumberCount =
    improvedCleanRecords.filter(
      function(record) {
        return Boolean(
          record.primaryVisibleAccountDigits
        );
      }
    ).length;

  const autoMatchCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'EXACT_AUTO_MATCH_CANDIDATE'
      );
    }).length;

  const highPriorityCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'HIGH_PRIORITY_MATCH_REVIEW'
      );
    }).length;

  const standardReviewCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'MATCH_REVIEW'
      );
    }).length;

  const createCandidateCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'CREATE_CANDIDATE_REVIEW'
      );
    }).length;

  const invalidCount =
    decisions.filter(function(item) {
      return (
        item.decision ===
        'INVALID_REVIEW'
      );
    }).length;

  console.log(
    'Report accounts evaluated: ' +
    improvedCleanRecords.length
  );

  console.log(
    'Records with visible account digits selected: ' +
    selectedVisibleNumberCount
  );

  console.log(
    'Exact auto-match candidates: ' +
    autoMatchCount
  );

  console.log(
    'High-priority match reviews: ' +
    highPriorityCount
  );

  console.log(
    'Standard match reviews: ' +
    standardReviewCount
  );

  console.log(
    'Create-candidate reviews: ' +
    createCandidateCount
  );

  console.log(
    'Invalid reviews: ' +
    invalidCount
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  improvedCleanRecords.forEach(
    function(record, index) {
      console.log(
        JSON.stringify(
          buildCompactBestAccountNumberLog_(
            originalCleanRecords[index],
            record,
            index
          )
        )
      );
    }
  );

  decisions.forEach(
    function(decision, index) {
      const bestCandidate =
        decision.bestCandidate || {};

      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          decision:
            decision.decision,

          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          matchedRecordId:
            decision.matchedRecordId || '',

          possibleRecordId:
            decision.possibleRecordId || '',

          score:
            decision.score || 0,

          scoreMargin:
            decision.scoreMargin || 0,

          closestExistingAccount:
            bestCandidate.existingAccountName || '',

          closestExistingNumber:
            bestCandidate.existingAccountNumber || '',

          evidence:
            bestCandidate.evidence || []
        })
      );
    }
  );

  console.log(
    'PHASE 6D BEST ACCOUNT NUMBER COMPLETED'
  );

  return {
    reportAccountsEvaluated:
      improvedCleanRecords.length,

    recordsWithVisibleDigits:
      selectedVisibleNumberCount,

    exactAutoMatches:
      autoMatchCount,

    highPriorityReviews:
      highPriorityCount,

    standardMatchReviews:
      standardReviewCount,

    createCandidateReviews:
      createCandidateCount,

    invalidReviews:
      invalidCount,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    improvedRecords:
      improvedCleanRecords,

    decisions:
      decisions
  };
}

/**
 * ============================================================
 * PHASE 6E — FALSE-MATCH REJECTION
 * ============================================================
 *
 * Rejects account-number matches when creditor identities
 * conflict.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Returns a normalized creditor identity set for a parser
 * record.
 */
function getParserCreditorIdentitySet_(
  adaptedRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    adaptedRecord &&
    adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const values = [
    fields[schema.accountName],
    fields[schema.originalCreditor],
    fields[schema.debtBuyer]
  ];

  const identities = [];

  values.forEach(function(value) {
    const canonical =
      canonicalizeCreditCreditorName_(
        value
      );

    if (
      canonical &&
      identities.indexOf(canonical) === -1
    ) {
      identities.push(canonical);
    }
  });

  return identities;
}


/**
 * Returns a normalized creditor identity set for an existing
 * Airtable record.
 */
function getExistingCreditorIdentitySet_(
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const values = [
    fields[schema.accountName],
    fields[schema.originalCreditor],
    fields[schema.debtBuyer]
  ];

  const identities = [];

  values.forEach(function(value) {
    const canonical =
      canonicalizeCreditCreditorName_(
        value
      );

    if (
      canonical &&
      identities.indexOf(canonical) === -1
    ) {
      identities.push(canonical);
    }
  });

  return identities;
}


/**
 * Determines whether two creditor identity sets are compatible.
 */
function compareCreditorIdentitySets_(
  parserIdentities,
  existingIdentities
) {
  const parserValues =
    Array.isArray(parserIdentities)
      ? parserIdentities
      : [];

  const existingValues =
    Array.isArray(existingIdentities)
      ? existingIdentities
      : [];

  let exactMatch = false;
  let bestSimilarity = 0;

  parserValues.forEach(function(parserIdentity) {
    existingValues.forEach(function(existingIdentity) {
      if (
        parserIdentity &&
        existingIdentity &&
        parserIdentity === existingIdentity
      ) {
        exactMatch = true;
      }

      const similarity =
        calculateCreditNameSimilarity_(
          parserIdentity,
          existingIdentity
        );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
    });
  });

  return {
    exactMatch:
      exactMatch,

    bestSimilarity:
      Number(
        bestSimilarity.toFixed(3)
      ),

    compatible:
      exactMatch ||
      bestSimilarity >= 0.6
  };
}


/**
 * Returns whether two creditor identities clearly conflict.
 */
function hasCreditorIdentityConflict_(
  parserIdentities,
  existingIdentities
) {
  const comparison =
    compareCreditorIdentitySets_(
      parserIdentities,
      existingIdentities
    );

  if (
    !parserIdentities.length ||
    !existingIdentities.length
  ) {
    return false;
  }

  return !comparison.compatible;
}


/**
 * Looks up an Airtable record by record ID.
 */
function findExistingCreditRecordById_(
  existingRecords,
  recordId
) {
  const records =
    Array.isArray(existingRecords)
      ? existingRecords
      : [];

  return (
    records.find(function(record) {
      return record.id === recordId;
    }) || null
  );
}


/**
 * Validates one Phase 6D exact-match decision.
 */
function validateExactCreditMatchDecision_(
  adaptedRecord,
  originalDecision,
  existingRecords
) {
  const decision =
    originalDecision || {};

  if (
    decision.decision !==
    'EXACT_AUTO_MATCH_CANDIDATE'
  ) {
    return Object.assign(
      {},
      decision,
      {
        falseMatchValidation:
          'NOT_AUTO_MATCH'
      }
    );
  }

  const matchedRecord =
    findExistingCreditRecordById_(
      existingRecords,
      decision.matchedRecordId
    );

  if (!matchedRecord) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'MATCHED_AIRTABLE_RECORD_NOT_FOUND',

      accountName:
        decision.accountName || '',

      accountNumber:
        decision.accountNumber || '',

      score:
        decision.score || 0,

      falseMatchValidation:
        'FAILED_RECORD_LOOKUP'
    };
  }

  const parserIdentities =
    getParserCreditorIdentitySet_(
      adaptedRecord
    );

  const existingIdentities =
    getExistingCreditorIdentitySet_(
      matchedRecord
    );

  const identityComparison =
    compareCreditorIdentitySets_(
      parserIdentities,
      existingIdentities
    );

  const creditorConflict =
    hasCreditorIdentityConflict_(
      parserIdentities,
      existingIdentities
    );

  if (creditorConflict) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'ACCOUNT_DIGITS_MATCH_BUT_CREDITOR_CONFLICTS',

      accountName:
        decision.accountName || '',

      accountNumber:
        decision.accountNumber || '',

      possibleRecordId:
        decision.matchedRecordId || '',

      score:
        decision.score || 0,

      scoreMargin:
        decision.scoreMargin || 0,

      parserCreditorIdentities:
        parserIdentities,

      existingCreditorIdentities:
        existingIdentities,

      creditorSimilarity:
        identityComparison.bestSimilarity,

      falseMatchValidation:
        'REJECTED_CREDITOR_CONFLICT'
    };
  }

  if (
    !identityComparison.compatible
  ) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'ACCOUNT_DIGITS_MATCH_WITHOUT_CREDITOR_CONFIRMATION',

      accountName:
        decision.accountName || '',

      accountNumber:
        decision.accountNumber || '',

      possibleRecordId:
        decision.matchedRecordId || '',

      score:
        decision.score || 0,

      scoreMargin:
        decision.scoreMargin || 0,

      parserCreditorIdentities:
        parserIdentities,

      existingCreditorIdentities:
        existingIdentities,

      creditorSimilarity:
        identityComparison.bestSimilarity,

      falseMatchValidation:
        'REQUIRES_CREDITOR_CONFIRMATION'
    };
  }

  return Object.assign(
    {},
    decision,
    {
      decision:
        'VALIDATED_AUTO_MATCH',

      reason:
        'ACCOUNT_DIGITS_AND_CREDITOR_IDENTITY_CONFIRMED',

      parserCreditorIdentities:
        parserIdentities,

      existingCreditorIdentities:
        existingIdentities,

      creditorSimilarity:
        identityComparison.bestSimilarity,

      falseMatchValidation:
        'PASSED'
    }
  );
}


/**
 * Builds the exact-schema decisions used by Phase 6D.
 */
function buildBestNumberExactSchemaDecisions_() {
  const reportText =
    extractLiveCreditReportText_();

  const accountIndex =
    buildCreditReportAccountIndex_(
      reportText
    );

  const originalCleanRecords =
    buildCleanStructuredCreditAccounts_(
      reportText,
      accountIndex,
      accountIndex.accounts.length
    );

  const improvedCleanRecords =
    applyBestAccountNumbersToCleanRecords_(
      originalCleanRecords
    );

  const genericMappedRecords =
    buildAirtableReadyCreditRecords_(
      improvedCleanRecords
    );

  const adaptedRecords =
    adaptParserRecordsToPersonalCreditSchema_(
      genericMappedRecords
    );

  const allExistingRecords =
    fetchAllExistingCreditAirtableRecords_();

  const existingAccountRecords =
    filterExistingPersonalCreditAccountRecords_(
      allExistingRecords
    );

  const decisions =
    adaptedRecords.map(function(record) {
      return buildExactSchemaCreditMatchDecision_(
        record,
        existingAccountRecords
      );
    });

  return {
    adaptedRecords:
      adaptedRecords,

    existingAccountRecords:
      existingAccountRecords,

    decisions:
      decisions
  };
}


/**
 * READ-ONLY TEST
 *
 * Revalidates all Phase 6D auto-match candidates and rejects
 * any account-number-only false matches.
 */
function testRejectFalseCreditMatches() {
  console.log(
    'PHASE 6E FALSE-MATCH REJECTION STARTED'
  );

  const source =
    buildBestNumberExactSchemaDecisions_();

  const validatedDecisions =
    source.decisions.map(
      function(decision, index) {
        return validateExactCreditMatchDecision_(
          source.adaptedRecords[index],
          decision,
          source.existingAccountRecords
        );
      }
    );

  const originalAutoMatchCount =
    source.decisions.filter(
      function(item) {
        return (
          item.decision ===
          'EXACT_AUTO_MATCH_CANDIDATE'
        );
      }
    ).length;

  const validatedAutoMatchCount =
    validatedDecisions.filter(
      function(item) {
        return (
          item.decision ===
          'VALIDATED_AUTO_MATCH'
        );
      }
    ).length;

  const rejectedConflictCount =
    validatedDecisions.filter(
      function(item) {
        return (
          item.falseMatchValidation ===
          'REJECTED_CREDITOR_CONFLICT'
        );
      }
    ).length;

  const downgradedReviewCount =
    validatedDecisions.filter(
      function(item) {
        return (
          item.decision ===
          'MATCH_REVIEW'
        );
      }
    ).length;

  const unchangedNonAutoCount =
    validatedDecisions.filter(
      function(item) {
        return (
          item.falseMatchValidation ===
          'NOT_AUTO_MATCH'
        );
      }
    ).length;

  console.log(
    'Report accounts evaluated: ' +
    validatedDecisions.length
  );

  console.log(
    'Original exact auto-match candidates: ' +
    originalAutoMatchCount
  );

  console.log(
    'Validated auto matches: ' +
    validatedAutoMatchCount
  );

  console.log(
    'Rejected creditor conflicts: ' +
    rejectedConflictCount
  );

  console.log(
    'Total match-review decisions: ' +
    downgradedReviewCount
  );

  console.log(
    'Unchanged non-auto decisions: ' +
    unchangedNonAutoCount
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  validatedDecisions.forEach(
    function(decision, index) {
      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          decision:
            decision.decision,

          reason:
            decision.reason,

          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          matchedRecordId:
            decision.matchedRecordId || '',

          possibleRecordId:
            decision.possibleRecordId || '',

          score:
            decision.score || 0,

          scoreMargin:
            decision.scoreMargin || 0,

          parserCreditorIdentities:
            decision.parserCreditorIdentities || [],

          existingCreditorIdentities:
            decision.existingCreditorIdentities || [],

          creditorSimilarity:
            decision.creditorSimilarity || 0,

          falseMatchValidation:
            decision.falseMatchValidation || ''
        })
      );
    }
  );

  console.log(
    'PHASE 6E FALSE-MATCH REJECTION COMPLETED'
  );

  return {
    reportAccountsEvaluated:
      validatedDecisions.length,

    originalAutoMatches:
      originalAutoMatchCount,

    validatedAutoMatches:
      validatedAutoMatchCount,

    rejectedCreditorConflicts:
      rejectedConflictCount,

    matchReviews:
      downgradedReviewCount,

    unchangedNonAutoDecisions:
      unchangedNonAutoCount,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    decisions:
      validatedDecisions
  };
}

/**
 * ============================================================
 * PHASE 6F — VALIDATED UPDATE PREVIEW AUDIT
 * ============================================================
 *
 * Produces a field-by-field preview for validated Airtable
 * matches without sending any update request.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Fields that must never be changed automatically unless their
 * identity evidence has already been validated.
 */
function getProtectedPersonalCreditFields_() {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  return [
    schema.accountName,
    schema.accountNumber,
    schema.originalCreditor,
    schema.debtBuyer
  ];
}


/**
 * Normalizes Airtable values for comparison.
 */
function normalizeExactSchemaComparisonValue_(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Determines whether a proposed parser value is usable.
 *
 * Blank values are ignored and will never overwrite Airtable.
 */
function isUsableCreditUpdateValue_(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  if (
    typeof value === 'number' &&
    !Number.isFinite(value)
  ) {
    return false;
  }

  return true;
}


/**
 * Compares the protected account name.
 */
function compareProtectedCreditAccountName_(
  parserValue,
  existingValue
) {
  const parserCanonical =
    canonicalizeCreditCreditorName_(
      parserValue
    );

  const existingCanonical =
    canonicalizeCreditCreditorName_(
      existingValue
    );

  return {
    parserCanonical:
      parserCanonical,

    existingCanonical:
      existingCanonical,

    compatible:
      Boolean(
        parserCanonical &&
        existingCanonical &&
        (
          parserCanonical ===
            existingCanonical ||
          calculateCreditNameSimilarity_(
            parserCanonical,
            existingCanonical
          ) >= 0.6
        )
      )
  };
}


/**
 * Compares the protected account number.
 */
function compareProtectedCreditAccountNumber_(
  parserValue,
  existingValue
) {
  const parserDigits =
    getVisibleCreditAccountDigits_(
      parserValue
    );

  const existingDigits =
    getVisibleCreditAccountDigits_(
      existingValue
    );

  const parserEnding =
    getVisibleCreditAccountEnding_(
      parserValue
    );

  const existingEnding =
    getVisibleCreditAccountEnding_(
      existingValue
    );

  const exactDigitsMatch =
    Boolean(
      parserDigits &&
      existingDigits &&
      parserDigits === existingDigits
    );

  const endingMatch =
    Boolean(
      parserEnding &&
      existingEnding &&
      (
        parserEnding === existingEnding ||
        parserEnding.endsWith(
          existingEnding
        ) ||
        existingEnding.endsWith(
          parserEnding
        )
      )
    );

  return {
    parserDigits:
      parserDigits,

    existingDigits:
      existingDigits,

    parserEnding:
      parserEnding,

    existingEnding:
      existingEnding,

    exactDigitsMatch:
      exactDigitsMatch,

    endingMatch:
      endingMatch,

    compatible:
      exactDigitsMatch ||
      endingMatch
  };
}


/**
 * Creates a field-by-field preview without changing Airtable.
 */
function buildValidatedCreditUpdatePreview_(
  adaptedRecord,
  validatedDecision,
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const proposedFields =
    adaptedRecord &&
    adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const existingFields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const protectedFields =
    getProtectedPersonalCreditFields_();

  const changes = {};
  const unchangedFields = [];
  const ignoredBlankFields = [];
  const protectedFieldChecks = [];

  Object.keys(proposedFields).forEach(
    function(fieldName) {
      const proposedValue =
        proposedFields[fieldName];

      const existingValue =
        existingFields[fieldName];

      if (
        !isUsableCreditUpdateValue_(
          proposedValue
        )
      ) {
        ignoredBlankFields.push(
          fieldName
        );

        return;
      }

      const normalizedProposed =
        normalizeExactSchemaComparisonValue_(
          proposedValue
        );

      const normalizedExisting =
        normalizeExactSchemaComparisonValue_(
          existingValue
        );

      if (
        protectedFields.indexOf(
          fieldName
        ) !== -1
      ) {
        let protectedCheck = {
          fieldName:
            fieldName,

          existingValue:
            existingValue === undefined
              ? ''
              : existingValue,

          proposedValue:
            proposedValue,

          compatible:
            true,

          checkType:
            'PROTECTED_IDENTITY_FIELD'
        };

        if (
          fieldName ===
          schema.accountName
        ) {
          protectedCheck =
            Object.assign(
              protectedCheck,
              compareProtectedCreditAccountName_(
                proposedValue,
                existingValue
              )
            );
        }

        if (
          fieldName ===
          schema.accountNumber
        ) {
          protectedCheck =
            Object.assign(
              protectedCheck,
              compareProtectedCreditAccountNumber_(
                proposedValue,
                existingValue
              )
            );
        }

        protectedFieldChecks.push(
          protectedCheck
        );

        /*
         * Protected identity fields are audited but are not
         * placed in the automatic update payload.
         */
        return;
      }

      if (
        normalizedProposed ===
        normalizedExisting
      ) {
        unchangedFields.push(
          fieldName
        );

        return;
      }

      changes[fieldName] = {
        existing:
          existingValue === undefined
            ? ''
            : existingValue,

        proposed:
          proposedValue
      };
    }
  );

  const identityConflicts =
    protectedFieldChecks.filter(
      function(check) {
        return check.compatible === false;
      }
    );

  const changeFieldNames =
    Object.keys(changes);

  return {
    accountName:
      proposedFields[schema.accountName] || '',

    accountNumber:
      proposedFields[schema.accountNumber] || '',

    airtableRecordId:
      existingRecord.id,

    validatedDecision:
      validatedDecision.decision,

    identitySafe:
      identityConflicts.length === 0,

    identityConflicts:
      identityConflicts,

    protectedFieldChecks:
      protectedFieldChecks,

    proposedChangeCount:
      changeFieldNames.length,

    proposedChangeFields:
      changeFieldNames,

    changes:
      changes,

    unchangedFields:
      unchangedFields,

    ignoredBlankFields:
      ignoredBlankFields,

    safeForControlledUpdate:
      identityConflicts.length === 0
  };
}


/**
 * Builds previews for only validated auto-match decisions.
 */
function buildValidatedCreditUpdatePreviews_(
  adaptedRecords,
  validatedDecisions,
  existingRecords
) {
  const previews = [];

  validatedDecisions.forEach(
    function(decision, index) {
      if (
        decision.decision !==
        'VALIDATED_AUTO_MATCH'
      ) {
        return;
      }

      const existingRecord =
        findExistingCreditRecordById_(
          existingRecords,
          decision.matchedRecordId
        );

      if (!existingRecord) {
        previews.push({
          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          airtableRecordId:
            decision.matchedRecordId || '',

          identitySafe:
            false,

          proposedChangeCount:
            0,

          proposedChangeFields: [],

          changes: {},

          unchangedFields: [],

          ignoredBlankFields: [],

          identityConflicts: [
            {
              fieldName:
                'Airtable Record',

              compatible:
                false,

              reason:
                'TARGET_RECORD_NOT_FOUND'
            }
          ],

          safeForControlledUpdate:
            false
        });

        return;
      }

      previews.push(
        buildValidatedCreditUpdatePreview_(
          adaptedRecords[index],
          decision,
          existingRecord
        )
      );
    }
  );

  return previews;
}


/**
 * Builds all Phase 6E data for reuse in the audit.
 */
function buildValidatedCreditMatchAuditSource_() {
  const source =
    buildBestNumberExactSchemaDecisions_();

  const validatedDecisions =
    source.decisions.map(
      function(decision, index) {
        return validateExactCreditMatchDecision_(
          source.adaptedRecords[index],
          decision,
          source.existingAccountRecords
        );
      }
    );

  return {
    adaptedRecords:
      source.adaptedRecords,

    existingAccountRecords:
      source.existingAccountRecords,

    validatedDecisions:
      validatedDecisions
  };
}


/**
 * Creates compact execution-log output.
 */
function buildCompactCreditUpdatePreviewLog_(
  preview,
  index
) {
  return {
    previewNumber:
      index + 1,

    accountName:
      preview.accountName,

    accountNumber:
      preview.accountNumber,

    airtableRecordId:
      preview.airtableRecordId,

    identitySafe:
      preview.identitySafe,

    proposedChangeCount:
      preview.proposedChangeCount,

    proposedChangeFields:
      preview.proposedChangeFields,

    changes:
      preview.changes,

    ignoredBlankFields:
      preview.ignoredBlankFields,

    identityConflicts:
      preview.identityConflicts,

    safeForControlledUpdate:
      preview.safeForControlledUpdate
  };
}


/**
 * READ-ONLY TEST
 *
 * Audits every validated match and previews proposed field
 * changes. No Airtable request is sent.
 */
function testValidatedCreditUpdatePreviewAudit() {
  console.log(
    'PHASE 6F UPDATE PREVIEW AUDIT STARTED'
  );

  const source =
    buildValidatedCreditMatchAuditSource_();

  const previews =
    buildValidatedCreditUpdatePreviews_(
      source.adaptedRecords,
      source.validatedDecisions,
      source.existingAccountRecords
    );

  const identitySafeCount =
    previews.filter(function(preview) {
      return preview.identitySafe;
    }).length;

  const identityConflictCount =
    previews.filter(function(preview) {
      return !preview.identitySafe;
    }).length;

  const changeRequiredCount =
    previews.filter(function(preview) {
      return (
        preview.proposedChangeCount > 0
      );
    }).length;

  const noChangeCount =
    previews.filter(function(preview) {
      return (
        preview.proposedChangeCount === 0
      );
    }).length;

  const controlledUpdateSafeCount =
    previews.filter(function(preview) {
      return (
        preview.safeForControlledUpdate
      );
    }).length;

  const totalProposedFieldChanges =
    previews.reduce(
      function(total, preview) {
        return (
          total +
          preview.proposedChangeCount
        );
      },
      0
    );

  console.log(
    'Validated matches audited: ' +
    previews.length
  );

  console.log(
    'Identity-safe targets: ' +
    identitySafeCount
  );

  console.log(
    'Identity conflicts detected: ' +
    identityConflictCount
  );

  console.log(
    'Records requiring field updates: ' +
    changeRequiredCount
  );

  console.log(
    'Records already matching: ' +
    noChangeCount
  );

  console.log(
    'Total proposed field changes: ' +
    totalProposedFieldChanges
  );

  console.log(
    'Safe controlled-update candidates: ' +
    controlledUpdateSafeCount
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  previews.forEach(
    function(preview, index) {
      console.log(
        JSON.stringify(
          buildCompactCreditUpdatePreviewLog_(
            preview,
            index
          )
        )
      );
    }
  );

  console.log(
    'PHASE 6F UPDATE PREVIEW AUDIT COMPLETED'
  );

  return {
    validatedMatchesAudited:
      previews.length,

    identitySafeTargets:
      identitySafeCount,

    identityConflicts:
      identityConflictCount,

    recordsRequiringUpdates:
      changeRequiredCount,

    recordsAlreadyMatching:
      noChangeCount,

    totalProposedFieldChanges:
      totalProposedFieldChanges,

    safeControlledUpdateCandidates:
      controlledUpdateSafeCount,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    previews:
      previews
  };
}

/**
 * ============================================================
 * PHASE 6G — CREDITOR-ROLE RECONCILIATION
 * ============================================================
 *
 * Distinguishes current furnisher, debt buyer, original
 * creditor, and collection-agency identities.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Converts a creditor value into a clean canonical identity.
 */
function normalizeCreditRoleIdentity_(value) {
  const canonical =
    canonicalizeCreditCreditorName_(
      value
    );

  return canonical || '';
}


/**
 * Adds a unique identity to a role collection.
 */
function addUniqueCreditRoleIdentity_(
  collection,
  value
) {
  const normalized =
    normalizeCreditRoleIdentity_(
      value
    );

  if (!normalized) {
    return;
  }

  if (
    collection.indexOf(normalized) === -1
  ) {
    collection.push(normalized);
  }
}


/**
 * Builds parser-side creditor roles.
 */
function buildParserCreditRoleProfile_(
  adaptedRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    adaptedRecord &&
    adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const profile = {
    accountNames: [],
    currentFurnishers: [],
    originalCreditors: [],
    debtBuyers: [],
    collectionAgencies: [],
    allIdentities: []
  };

  addUniqueCreditRoleIdentity_(
    profile.accountNames,
    fields[schema.accountName]
  );

  addUniqueCreditRoleIdentity_(
    profile.currentFurnishers,
    fields[schema.accountName]
  );

  addUniqueCreditRoleIdentity_(
    profile.originalCreditors,
    fields[schema.originalCreditor]
  );

  addUniqueCreditRoleIdentity_(
    profile.debtBuyers,
    fields[schema.debtBuyer]
  );

  [
    profile.accountNames,
    profile.currentFurnishers,
    profile.originalCreditors,
    profile.debtBuyers,
    profile.collectionAgencies
  ].forEach(function(values) {
    values.forEach(function(value) {
      addUniqueCreditRoleIdentity_(
        profile.allIdentities,
        value
      );
    });
  });

  return profile;
}


/**
 * Builds Airtable-side creditor roles.
 */
function buildExistingCreditRoleProfile_(
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const profile = {
    accountNames: [],
    currentFurnishers: [],
    originalCreditors: [],
    debtBuyers: [],
    collectionAgencies: [],
    allIdentities: []
  };

  addUniqueCreditRoleIdentity_(
    profile.accountNames,
    fields[schema.accountName]
  );

  addUniqueCreditRoleIdentity_(
    profile.currentFurnishers,
    fields[schema.accountName]
  );

  addUniqueCreditRoleIdentity_(
    profile.originalCreditors,
    fields[schema.originalCreditor]
  );

  addUniqueCreditRoleIdentity_(
    profile.debtBuyers,
    fields[schema.debtBuyer]
  );

  addUniqueCreditRoleIdentity_(
    profile.collectionAgencies,
    getFirstUsableCreditField_(
      fields,
      [
        'Collection Agency',
        'Current Furnisher',
        'Furnisher'
      ]
    )
  );

  [
    profile.accountNames,
    profile.currentFurnishers,
    profile.originalCreditors,
    profile.debtBuyers,
    profile.collectionAgencies
  ].forEach(function(values) {
    values.forEach(function(value) {
      addUniqueCreditRoleIdentity_(
        profile.allIdentities,
        value
      );
    });
  });

  return profile;
}


/**
 * Compares two identity lists.
 */
function compareCreditRoleIdentityLists_(
  firstList,
  secondList
) {
  const firstValues =
    Array.isArray(firstList)
      ? firstList
      : [];

  const secondValues =
    Array.isArray(secondList)
      ? secondList
      : [];

  let exactMatch = false;
  let bestSimilarity = 0;
  let matchedFirstIdentity = '';
  let matchedSecondIdentity = '';

  firstValues.forEach(function(firstIdentity) {
    secondValues.forEach(function(secondIdentity) {
      if (
        firstIdentity &&
        secondIdentity &&
        firstIdentity === secondIdentity
      ) {
        exactMatch = true;
        matchedFirstIdentity =
          firstIdentity;
        matchedSecondIdentity =
          secondIdentity;
      }

      const similarity =
        calculateCreditNameSimilarity_(
          firstIdentity,
          secondIdentity
        );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        matchedFirstIdentity =
          firstIdentity;
        matchedSecondIdentity =
          secondIdentity;
      }
    });
  });

  return {
    exactMatch:
      exactMatch,

    similarity:
      Number(
        bestSimilarity.toFixed(3)
      ),

    compatible:
      exactMatch ||
      bestSimilarity >= 0.6,

    matchedFirstIdentity:
      matchedFirstIdentity,

    matchedSecondIdentity:
      matchedSecondIdentity
  };
}


/**
 * Evaluates all valid creditor-role relationships.
 */
function compareCreditRoleProfiles_(
  parserProfile,
  existingProfile
) {
  const relationshipChecks = [];

  function addRelationshipCheck(
    relationship,
    firstList,
    secondList
  ) {
    const comparison =
      compareCreditRoleIdentityLists_(
        firstList,
        secondList
      );

    relationshipChecks.push({
      relationship:
        relationship,

      exactMatch:
        comparison.exactMatch,

      similarity:
        comparison.similarity,

      compatible:
        comparison.compatible,

      parserIdentity:
        comparison.matchedFirstIdentity,

      existingIdentity:
        comparison.matchedSecondIdentity
    });
  }

  addRelationshipCheck(
    'CURRENT_TO_CURRENT',
    parserProfile.currentFurnishers,
    existingProfile.currentFurnishers
  );

  addRelationshipCheck(
    'PARSER_CURRENT_TO_EXISTING_DEBT_BUYER',
    parserProfile.currentFurnishers,
    existingProfile.debtBuyers
  );

  addRelationshipCheck(
    'PARSER_CURRENT_TO_EXISTING_COLLECTION_AGENCY',
    parserProfile.currentFurnishers,
    existingProfile.collectionAgencies
  );

  addRelationshipCheck(
    'PARSER_ORIGINAL_TO_EXISTING_ORIGINAL',
    parserProfile.originalCreditors,
    existingProfile.originalCreditors
  );

  addRelationshipCheck(
    'PARSER_ORIGINAL_TO_EXISTING_ACCOUNT_NAME',
    parserProfile.originalCreditors,
    existingProfile.accountNames
  );

  addRelationshipCheck(
    'PARSER_DEBT_BUYER_TO_EXISTING_DEBT_BUYER',
    parserProfile.debtBuyers,
    existingProfile.debtBuyers
  );

  addRelationshipCheck(
    'PARSER_DEBT_BUYER_TO_EXISTING_ACCOUNT_NAME',
    parserProfile.debtBuyers,
    existingProfile.accountNames
  );

  addRelationshipCheck(
    'ANY_IDENTITY_TO_ANY_IDENTITY',
    parserProfile.allIdentities,
    existingProfile.allIdentities
  );

  const compatibleRelationships =
    relationshipChecks.filter(
      function(check) {
        return check.compatible;
      }
    );

  compatibleRelationships.sort(
    function(first, second) {
      if (
        second.exactMatch !==
        first.exactMatch
      ) {
        return second.exactMatch
          ? 1
          : -1;
      }

      return (
        second.similarity -
        first.similarity
      );
    }
  );

  const bestRelationship =
    compatibleRelationships[0] || null;

  return {
    compatible:
      compatibleRelationships.length > 0,

    compatibleRelationshipCount:
      compatibleRelationships.length,

    bestRelationship:
      bestRelationship,

    relationshipChecks:
      relationshipChecks
  };
}


/**
 * Determines whether the relationship looks like a legitimate
 * original-creditor / debt-buyer pairing.
 */
function isLegitimateCreditRoleRelationship_(
  roleComparison
) {
  if (
    !roleComparison ||
    !roleComparison.bestRelationship
  ) {
    return false;
  }

  const relationship =
    roleComparison
      .bestRelationship
      .relationship;

  const acceptedRelationships = [
    'CURRENT_TO_CURRENT',
    'PARSER_CURRENT_TO_EXISTING_DEBT_BUYER',
    'PARSER_CURRENT_TO_EXISTING_COLLECTION_AGENCY',
    'PARSER_ORIGINAL_TO_EXISTING_ORIGINAL',
    'PARSER_ORIGINAL_TO_EXISTING_ACCOUNT_NAME',
    'PARSER_DEBT_BUYER_TO_EXISTING_DEBT_BUYER',
    'PARSER_DEBT_BUYER_TO_EXISTING_ACCOUNT_NAME',
    'ANY_IDENTITY_TO_ANY_IDENTITY'
  ];

  return (
    acceptedRelationships.indexOf(
      relationship
    ) !== -1
  );
}


/**
 * Revalidates one Phase 6E decision using creditor roles.
 */
function reconcileValidatedCreditRoles_(
  adaptedRecord,
  validatedDecision,
  existingRecords
) {
  const decision =
    validatedDecision || {};

  if (
    decision.decision !==
    'VALIDATED_AUTO_MATCH'
  ) {
    return Object.assign(
      {},
      decision,
      {
        roleReconciliation:
          'NOT_VALIDATED_AUTO_MATCH'
      }
    );
  }

  const existingRecord =
    findExistingCreditRecordById_(
      existingRecords,
      decision.matchedRecordId
    );

  if (!existingRecord) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'TARGET_AIRTABLE_RECORD_NOT_FOUND',

      accountName:
        decision.accountName || '',

      accountNumber:
        decision.accountNumber || '',

      possibleRecordId:
        decision.matchedRecordId || '',

      roleReconciliation:
        'FAILED_RECORD_LOOKUP'
    };
  }

  const parserProfile =
    buildParserCreditRoleProfile_(
      adaptedRecord
    );

  const existingProfile =
    buildExistingCreditRoleProfile_(
      existingRecord
    );

  const roleComparison =
    compareCreditRoleProfiles_(
      parserProfile,
      existingProfile
    );

  const accountNumberCheck =
    compareProtectedCreditAccountNumber_(
      adaptedRecord.fields[
        getPersonalCreditAirtableSchemaMap_()
          .accountNumber
      ],
      existingRecord.fields[
        getPersonalCreditAirtableSchemaMap_()
          .accountNumber
      ]
    );

  if (!accountNumberCheck.compatible) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'ACCOUNT_NUMBER_EVIDENCE_FAILED',

      accountName:
        decision.accountName || '',

      accountNumber:
        decision.accountNumber || '',

      possibleRecordId:
        decision.matchedRecordId || '',

      parserRoleProfile:
        parserProfile,

      existingRoleProfile:
        existingProfile,

      roleComparison:
        roleComparison,

      roleReconciliation:
        'REJECTED_ACCOUNT_NUMBER'
    };
  }

  if (
    !isLegitimateCreditRoleRelationship_(
      roleComparison
    )
  ) {
    return {
      decision:
        'MATCH_REVIEW',

      reason:
        'NO_COMPATIBLE_CREDITOR_ROLE_RELATIONSHIP',

      accountName:
        decision.accountName || '',

      accountNumber:
        decision.accountNumber || '',

      possibleRecordId:
        decision.matchedRecordId || '',

      parserRoleProfile:
        parserProfile,

      existingRoleProfile:
        existingProfile,

      roleComparison:
        roleComparison,

      roleReconciliation:
        'REJECTED_ROLE_CONFLICT'
    };
  }

  return Object.assign(
    {},
    decision,
    {
      decision:
        'ROLE_VALIDATED_AUTO_MATCH',

      reason:
        'ACCOUNT_DIGITS_AND_CREDITOR_ROLES_CONFIRMED',

      parserRoleProfile:
        parserProfile,

      existingRoleProfile:
        existingProfile,

      roleComparison:
        roleComparison,

      roleReconciliation:
        'PASSED'
    }
  );
}


/**
 * Builds Phase 6G source data.
 */
function buildCreditRoleReconciliationSource_() {
  const source =
    buildBestNumberExactSchemaDecisions_();

  const phase6eDecisions =
    source.decisions.map(
      function(decision, index) {
        return validateExactCreditMatchDecision_(
          source.adaptedRecords[index],
          decision,
          source.existingAccountRecords
        );
      }
    );

  const roleValidatedDecisions =
    phase6eDecisions.map(
      function(decision, index) {
        return reconcileValidatedCreditRoles_(
          source.adaptedRecords[index],
          decision,
          source.existingAccountRecords
        );
      }
    );

  return {
    adaptedRecords:
      source.adaptedRecords,

    existingAccountRecords:
      source.existingAccountRecords,

    phase6eDecisions:
      phase6eDecisions,

    roleValidatedDecisions:
      roleValidatedDecisions
  };
}


/**
 * READ-ONLY TEST
 *
 * Revalidates all previously validated matches using creditor
 * role relationships.
 */
function testCreditRoleReconciliation() {
  console.log(
    'PHASE 6G CREDITOR ROLE RECONCILIATION STARTED'
  );

  const source =
    buildCreditRoleReconciliationSource_();

  const originalValidatedCount =
    source.phase6eDecisions.filter(
      function(item) {
        return (
          item.decision ===
          'VALIDATED_AUTO_MATCH'
        );
      }
    ).length;

  const roleValidatedCount =
    source.roleValidatedDecisions.filter(
      function(item) {
        return (
          item.decision ===
          'ROLE_VALIDATED_AUTO_MATCH'
        );
      }
    ).length;

  const rejectedRoleConflictCount =
    source.roleValidatedDecisions.filter(
      function(item) {
        return (
          item.roleReconciliation ===
          'REJECTED_ROLE_CONFLICT'
        );
      }
    ).length;

  const rejectedAccountNumberCount =
    source.roleValidatedDecisions.filter(
      function(item) {
        return (
          item.roleReconciliation ===
          'REJECTED_ACCOUNT_NUMBER'
        );
      }
    ).length;

  const roleReviewCount =
    source.roleValidatedDecisions.filter(
      function(item) {
        return item.decision === 'MATCH_REVIEW';
      }
    ).length;

  console.log(
    'Report accounts evaluated: ' +
    source.roleValidatedDecisions.length
  );

  console.log(
    'Original validated auto matches: ' +
    originalValidatedCount
  );

  console.log(
    'Role-validated auto matches: ' +
    roleValidatedCount
  );

  console.log(
    'Rejected creditor-role conflicts: ' +
    rejectedRoleConflictCount
  );

  console.log(
    'Rejected account-number conflicts: ' +
    rejectedAccountNumberCount
  );

  console.log(
    'Total role-based match reviews: ' +
    roleReviewCount
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  source.roleValidatedDecisions.forEach(
    function(decision, index) {
      const bestRelationship =
        decision.roleComparison &&
        decision.roleComparison.bestRelationship
          ? decision.roleComparison.bestRelationship
          : {};

      console.log(
        JSON.stringify({
          recordNumber:
            index + 1,

          decision:
            decision.decision,

          reason:
            decision.reason,

          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          matchedRecordId:
            decision.matchedRecordId || '',

          possibleRecordId:
            decision.possibleRecordId || '',

          roleReconciliation:
            decision.roleReconciliation || '',

          bestRoleRelationship:
            bestRelationship.relationship || '',

          parserRoleIdentity:
            bestRelationship.parserIdentity || '',

          existingRoleIdentity:
            bestRelationship.existingIdentity || '',

          roleSimilarity:
            bestRelationship.similarity || 0
        })
      );
    }
  );

  console.log(
    'PHASE 6G CREDITOR ROLE RECONCILIATION COMPLETED'
  );

  return {
    reportAccountsEvaluated:
      source.roleValidatedDecisions.length,

    originalValidatedAutoMatches:
      originalValidatedCount,

    roleValidatedAutoMatches:
      roleValidatedCount,

    rejectedRoleConflicts:
      rejectedRoleConflictCount,

    rejectedAccountNumberConflicts:
      rejectedAccountNumberCount,

    roleMatchReviews:
      roleReviewCount,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    decisions:
      source.roleValidatedDecisions
  };
}

/**
 * ============================================================
 * PHASE 6H — ROLE-AWARE UPDATE PREVIEW AUDIT
 * ============================================================
 *
 * Rebuilds the update preview using creditor-role validation.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Returns fields that must remain protected from automatic
 * overwrite.
 */
function getRoleAwareProtectedCreditFields_() {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  return [
    schema.accountName,
    schema.accountNumber,
    schema.originalCreditor,
    schema.debtBuyer
  ];
}


/**
 * Returns whether a field is a protected identity field.
 */
function isRoleAwareProtectedCreditField_(
  fieldName
) {
  return (
    getRoleAwareProtectedCreditFields_()
      .indexOf(fieldName) !== -1
  );
}


/**
 * Creates an identity audit for one role-validated match.
 */
function buildRoleAwareIdentityAudit_(
  adaptedRecord,
  roleValidatedDecision,
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const proposedFields =
    adaptedRecord &&
    adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const existingFields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const parserRoleProfile =
    buildParserCreditRoleProfile_(
      adaptedRecord
    );

  const existingRoleProfile =
    buildExistingCreditRoleProfile_(
      existingRecord
    );

  const roleComparison =
    compareCreditRoleProfiles_(
      parserRoleProfile,
      existingRoleProfile
    );

  const accountNumberCheck =
    compareProtectedCreditAccountNumber_(
      proposedFields[schema.accountNumber],
      existingFields[schema.accountNumber]
    );

  const roleRelationshipValid =
    isLegitimateCreditRoleRelationship_(
      roleComparison
    );

  const identitySafe =
    Boolean(
      accountNumberCheck.compatible &&
      roleRelationshipValid
    );

  return {
    identitySafe:
      identitySafe,

    accountNumberCompatible:
      accountNumberCheck.compatible,

    roleRelationshipValid:
      roleRelationshipValid,

    parserRoleProfile:
      parserRoleProfile,

    existingRoleProfile:
      existingRoleProfile,

    roleComparison:
      roleComparison,

    accountNumberCheck:
      accountNumberCheck,

    matchedRecordId:
      roleValidatedDecision.matchedRecordId || ''
  };
}


/**
 * Determines whether a proposed field should be excluded from
 * automatic update.
 */
function shouldExcludeRoleAwareUpdateField_(
  fieldName,
  proposedValue
) {
  if (
    isRoleAwareProtectedCreditField_(
      fieldName
    )
  ) {
    return true;
  }

  if (
    !isUsableCreditUpdateValue_(
      proposedValue
    )
  ) {
    return true;
  }

  return false;
}


/**
 * Builds one role-aware, read-only update preview.
 */
function buildRoleAwareCreditUpdatePreview_(
  adaptedRecord,
  roleValidatedDecision,
  existingRecord
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const proposedFields =
    adaptedRecord &&
    adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const existingFields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const identityAudit =
    buildRoleAwareIdentityAudit_(
      adaptedRecord,
      roleValidatedDecision,
      existingRecord
    );

  const changes = {};
  const unchangedFields = [];
  const ignoredBlankFields = [];
  const protectedFields = [];

  Object.keys(proposedFields).forEach(
    function(fieldName) {
      const proposedValue =
        proposedFields[fieldName];

      const existingValue =
        existingFields[fieldName];

      if (
        isRoleAwareProtectedCreditField_(
          fieldName
        )
      ) {
        protectedFields.push({
          fieldName:
            fieldName,

          existingValue:
            existingValue === undefined
              ? ''
              : existingValue,

          proposedValue:
            proposedValue
        });

        return;
      }

      if (
        !isUsableCreditUpdateValue_(
          proposedValue
        )
      ) {
        ignoredBlankFields.push(
          fieldName
        );

        return;
      }

      const normalizedProposed =
        normalizeExactSchemaComparisonValue_(
          proposedValue
        );

      const normalizedExisting =
        normalizeExactSchemaComparisonValue_(
          existingValue
        );

      if (
        normalizedProposed ===
        normalizedExisting
      ) {
        unchangedFields.push(
          fieldName
        );

        return;
      }

      changes[fieldName] = {
        existing:
          existingValue === undefined
            ? ''
            : existingValue,

        proposed:
          proposedValue
      };
    }
  );

  const proposedChangeFields =
    Object.keys(changes);

  const highRiskFields = [
    schema.status,
    schema.actionNeeded,
    schema.actionStage,
    schema.violationTag,
    schema.notes
  ];

  const highRiskChangeCount =
    proposedChangeFields.filter(
      function(fieldName) {
        return (
          highRiskFields.indexOf(
            fieldName
          ) !== -1
        );
      }
    ).length;

  const balanceFields = [
    schema.experianBalance,
    schema.transUnionBalance,
    schema.equifaxBalance
  ];

  const balanceChangeCount =
    proposedChangeFields.filter(
      function(fieldName) {
        return (
          balanceFields.indexOf(
            fieldName
          ) !== -1
        );
      }
    ).length;

  const bureauFields = [
    schema.experianReporting,
    schema.transUnionReporting,
    schema.equifaxReporting
  ];

  const bureauChangeCount =
    proposedChangeFields.filter(
      function(fieldName) {
        return (
          bureauFields.indexOf(
            fieldName
          ) !== -1
        );
      }
    ).length;

  let safetyScore = 100;

  if (!identityAudit.identitySafe) {
    safetyScore -= 100;
  }

  safetyScore -=
    proposedChangeFields.length * 3;

  safetyScore -=
    highRiskChangeCount * 10;

  safetyScore -=
    balanceChangeCount * 2;

  safetyScore -=
    bureauChangeCount * 2;

  if (safetyScore < 0) {
    safetyScore = 0;
  }

  return {
    accountName:
      proposedFields[schema.accountName] || '',

    accountNumber:
      proposedFields[schema.accountNumber] || '',

    airtableRecordId:
      existingRecord.id,

    decision:
      roleValidatedDecision.decision,

    identitySafe:
      identityAudit.identitySafe,

    identityAudit:
      identityAudit,

    protectedFields:
      protectedFields,

    proposedChangeCount:
      proposedChangeFields.length,

    proposedChangeFields:
      proposedChangeFields,

    changes:
      changes,

    unchangedFields:
      unchangedFields,

    ignoredBlankFields:
      ignoredBlankFields,

    highRiskChangeCount:
      highRiskChangeCount,

    balanceChangeCount:
      balanceChangeCount,

    bureauChangeCount:
      bureauChangeCount,

    safetyScore:
      safetyScore,

    safeForControlledUpdate:
      Boolean(
        identityAudit.identitySafe &&
        proposedChangeFields.length > 0 &&
        highRiskChangeCount === 0
      )
  };
}


/**
 * Builds previews for role-validated matches only.
 */
function buildRoleAwareCreditUpdatePreviews_(
  adaptedRecords,
  roleValidatedDecisions,
  existingRecords
) {
  const previews = [];

  roleValidatedDecisions.forEach(
    function(decision, index) {
      if (
        decision.decision !==
        'ROLE_VALIDATED_AUTO_MATCH'
      ) {
        return;
      }

      const existingRecord =
        findExistingCreditRecordById_(
          existingRecords,
          decision.matchedRecordId
        );

      if (!existingRecord) {
        previews.push({
          accountName:
            decision.accountName || '',

          accountNumber:
            decision.accountNumber || '',

          airtableRecordId:
            decision.matchedRecordId || '',

          identitySafe:
            false,

          proposedChangeCount:
            0,

          proposedChangeFields: [],

          changes: {},

          unchangedFields: [],

          ignoredBlankFields: [],

          protectedFields: [],

          highRiskChangeCount:
            0,

          balanceChangeCount:
            0,

          bureauChangeCount:
            0,

          safetyScore:
            0,

          safeForControlledUpdate:
            false,

          error:
            'TARGET_RECORD_NOT_FOUND'
        });

        return;
      }

      previews.push(
        buildRoleAwareCreditUpdatePreview_(
          adaptedRecords[index],
          decision,
          existingRecord
        )
      );
    }
  );

  return previews;
}


/**
 * Ranks previews from safest to least safe.
 */
function rankRoleAwareCreditUpdatePreviews_(
  previews
) {
  const ranked =
    Array.isArray(previews)
      ? previews.slice()
      : [];

  ranked.sort(function(first, second) {
    if (
      second.safeForControlledUpdate !==
      first.safeForControlledUpdate
    ) {
      return second.safeForControlledUpdate
        ? 1
        : -1;
    }

    if (
      second.safetyScore !==
      first.safetyScore
    ) {
      return (
        second.safetyScore -
        first.safetyScore
      );
    }

    if (
      first.highRiskChangeCount !==
      second.highRiskChangeCount
    ) {
      return (
        first.highRiskChangeCount -
        second.highRiskChangeCount
      );
    }

    return (
      first.proposedChangeCount -
      second.proposedChangeCount
    );
  });

  return ranked;
}


/**
 * Creates compact preview logging.
 */
function buildCompactRoleAwarePreviewLog_(
  preview,
  index
) {
  const bestRelationship =
    preview.identityAudit &&
    preview.identityAudit.roleComparison &&
    preview.identityAudit
      .roleComparison
      .bestRelationship
      ? preview.identityAudit
          .roleComparison
          .bestRelationship
      : {};

  return {
    previewNumber:
      index + 1,

    accountName:
      preview.accountName,

    accountNumber:
      preview.accountNumber,

    airtableRecordId:
      preview.airtableRecordId,

    identitySafe:
      preview.identitySafe,

    bestRoleRelationship:
      bestRelationship.relationship || '',

    parserRoleIdentity:
      bestRelationship.parserIdentity || '',

    existingRoleIdentity:
      bestRelationship.existingIdentity || '',

    proposedChangeCount:
      preview.proposedChangeCount,

    proposedChangeFields:
      preview.proposedChangeFields,

    highRiskChangeCount:
      preview.highRiskChangeCount,

    balanceChangeCount:
      preview.balanceChangeCount,

    bureauChangeCount:
      preview.bureauChangeCount,

    safetyScore:
      preview.safetyScore,

    safeForControlledUpdate:
      preview.safeForControlledUpdate,

    changes:
      preview.changes
  };
}


/**
 * READ-ONLY TEST
 *
 * Re-audits role-validated matches and identifies the safest
 * candidate for a future one-record controlled update test.
 */
function testRoleAwareCreditUpdatePreviewAudit() {
  console.log(
    'PHASE 6H ROLE-AWARE UPDATE PREVIEW STARTED'
  );

  const source =
    buildCreditRoleReconciliationSource_();

  const previews =
    buildRoleAwareCreditUpdatePreviews_(
      source.adaptedRecords,
      source.roleValidatedDecisions,
      source.existingAccountRecords
    );

  const rankedPreviews =
    rankRoleAwareCreditUpdatePreviews_(
      previews
    );

  const identitySafeCount =
    previews.filter(function(preview) {
      return preview.identitySafe;
    }).length;

  const identityConflictCount =
    previews.filter(function(preview) {
      return !preview.identitySafe;
    }).length;

  const updateRequiredCount =
    previews.filter(function(preview) {
      return (
        preview.proposedChangeCount > 0
      );
    }).length;

  const safeControlledCount =
    previews.filter(function(preview) {
      return (
        preview.safeForControlledUpdate
      );
    }).length;

  const totalProposedChanges =
    previews.reduce(
      function(total, preview) {
        return (
          total +
          preview.proposedChangeCount
        );
      },
      0
    );

  const safestCandidate =
    rankedPreviews.length
      ? rankedPreviews[0]
      : null;

  console.log(
    'Role-validated matches audited: ' +
    previews.length
  );

  console.log(
    'Identity-safe targets: ' +
    identitySafeCount
  );

  console.log(
    'Identity conflicts detected: ' +
    identityConflictCount
  );

  console.log(
    'Records requiring updates: ' +
    updateRequiredCount
  );

  console.log(
    'Total proposed field changes: ' +
    totalProposedChanges
  );

  console.log(
    'Safe controlled-update candidates: ' +
    safeControlledCount
  );

  console.log(
    'Safest controlled-update candidate: ' +
    (
      safestCandidate
        ? safestCandidate.accountName
        : 'NONE'
    )
  );

  console.log(
    'Safest candidate safety score: ' +
    (
      safestCandidate
        ? safestCandidate.safetyScore
        : 0
    )
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  rankedPreviews.forEach(
    function(preview, index) {
      console.log(
        JSON.stringify(
          buildCompactRoleAwarePreviewLog_(
            preview,
            index
          )
        )
      );
    }
  );

  console.log(
    'PHASE 6H ROLE-AWARE UPDATE PREVIEW COMPLETED'
  );

  return {
    roleValidatedMatchesAudited:
      previews.length,

    identitySafeTargets:
      identitySafeCount,

    identityConflicts:
      identityConflictCount,

    recordsRequiringUpdates:
      updateRequiredCount,

    totalProposedFieldChanges:
      totalProposedChanges,

    safeControlledUpdateCandidates:
      safeControlledCount,

    safestControlledUpdateCandidate:
      safestCandidate,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    rankedPreviews:
      rankedPreviews
  };
}

/**
 * ============================================================
 * PHASE 6I — PROTECTED UPDATE ALLOWLIST
 * ============================================================
 *
 * Restricts automated Airtable updates to verified credit-report
 * facts and permanently excludes operational, strategic, and
 * identity fields from automatic overwrite.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Exact fields permitted in a future controlled update.
 */
function getAllowedAutomaticCreditUpdateFields_() {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  return [
    schema.experianReporting,
    schema.transUnionReporting,
    schema.equifaxReporting,

    schema.experianBalance,
    schema.transUnionBalance,
    schema.equifaxBalance,

    schema.dateOpened,
    schema.dateClosed,
    schema.lastReported,

    schema.experianDofd,
    schema.transUnionDofd,
    schema.equifaxDofd
  ];
}


/**
 * Fields permanently blocked from automatic update.
 */
function getBlockedAutomaticCreditUpdateFields_() {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  return [
    schema.accountName,
    schema.accountNumber,
    schema.originalCreditor,
    schema.debtBuyer,
    schema.accountType,
    schema.status,
    schema.violationTag,
    schema.actionNeeded,
    schema.actionStage,
    schema.notes
  ];
}


/**
 * Returns whether a field is allowed for automatic update.
 */
function isAllowedAutomaticCreditUpdateField_(
  fieldName
) {
  return (
    getAllowedAutomaticCreditUpdateFields_()
      .indexOf(fieldName) !== -1
  );
}


/**
 * Returns whether a field is blocked from automatic update.
 */
function isBlockedAutomaticCreditUpdateField_(
  fieldName
) {
  return (
    getBlockedAutomaticCreditUpdateFields_()
      .indexOf(fieldName) !== -1
  );
}


/**
 * Detects obvious parser placeholder text.
 */
function isCreditParserPlaceholderValue_(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return true;
  }

  if (typeof value === 'boolean') {
    return false;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return false;
  }

  const normalized =
    normalizeSmartCreditText_(
      value
    );

  if (!normalized) {
    return true;
  }

  const placeholderValues = [
    'n a',
    'na',
    'unknown',
    'not available',
    'no data',
    'null',
    'undefined',
    'open open',
    'closed closed'
  ];

  return (
    placeholderValues.indexOf(
      normalized
    ) !== -1
  );
}


/**
 * Determines whether a balance value is valid.
 */
function isValidAutomaticCreditBalance_(value) {
  const numericValue =
    normalizeSmartCreditNumber_(
      value
    );

  return (
    numericValue !== null &&
    numericValue >= 0 &&
    numericValue <= 10000000
  );
}


/**
 * Determines whether a checkbox value is valid.
 */
function isValidAutomaticCreditCheckbox_(value) {
  return (
    value === true ||
    value === false
  );
}


/**
 * Determines whether a date-like value appears usable.
 */
function isValidAutomaticCreditDate_(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  const text =
    String(value).trim();

  if (
    !text ||
    isCreditParserPlaceholderValue_(
      text
    )
  ) {
    return false;
  }

  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{1,2}\/\d{4}$/,
    /^\d{4}-\d{2}$/
  ];

  return datePatterns.some(
    function(pattern) {
      return pattern.test(text);
    }
  );
}


/**
 * Validates one allowed field value according to field type.
 */
function validateAllowedCreditUpdateValue_(
  fieldName,
  value
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const checkboxFields = [
    schema.experianReporting,
    schema.transUnionReporting,
    schema.equifaxReporting
  ];

  const balanceFields = [
    schema.experianBalance,
    schema.transUnionBalance,
    schema.equifaxBalance
  ];

  const dateFields = [
    schema.dateOpened,
    schema.dateClosed,
    schema.lastReported,
    schema.experianDofd,
    schema.transUnionDofd,
    schema.equifaxDofd
  ];

  if (
    checkboxFields.indexOf(
      fieldName
    ) !== -1
  ) {
    return {
      valid:
        isValidAutomaticCreditCheckbox_(
          value
        ),

      normalizedValue:
        value,

      validationType:
        'CHECKBOX'
    };
  }

  if (
    balanceFields.indexOf(
      fieldName
    ) !== -1
  ) {
    const normalizedBalance =
      normalizeSmartCreditNumber_(
        value
      );

    return {
      valid:
        isValidAutomaticCreditBalance_(
          value
        ),

      normalizedValue:
        normalizedBalance,

      validationType:
        'BALANCE'
    };
  }

  if (
    dateFields.indexOf(
      fieldName
    ) !== -1
  ) {
    return {
      valid:
        isValidAutomaticCreditDate_(
          value
        ),

      normalizedValue:
        String(value || '').trim(),

      validationType:
        'DATE'
    };
  }

  return {
    valid: false,
    normalizedValue: value,
    validationType: 'UNSUPPORTED_FIELD'
  };
}


/**
 * Builds a safe field-level update payload from one role-aware
 * preview.
 */
function buildAllowlistedCreditUpdatePayload_(
  preview
) {
  const sourceChanges =
    preview &&
    preview.changes &&
    typeof preview.changes === 'object'
      ? preview.changes
      : {};

  const payload = {};
  const acceptedFields = [];
  const blockedFields = [];
  const rejectedInvalidFields = [];
  const unchangedFields = [];

  Object.keys(sourceChanges).forEach(
    function(fieldName) {
      const change =
        sourceChanges[fieldName] || {};

      const proposedValue =
        change.proposed;

      const existingValue =
        change.existing;

      if (
        isBlockedAutomaticCreditUpdateField_(
          fieldName
        )
      ) {
        blockedFields.push({
          fieldName: fieldName,
          existingValue: existingValue,
          proposedValue: proposedValue,
          reason: 'PERMANENTLY_BLOCKED_FIELD'
        });

        return;
      }

      if (
        !isAllowedAutomaticCreditUpdateField_(
          fieldName
        )
      ) {
        blockedFields.push({
          fieldName: fieldName,
          existingValue: existingValue,
          proposedValue: proposedValue,
          reason: 'FIELD_NOT_ON_ALLOWLIST'
        });

        return;
      }

      const validation =
        validateAllowedCreditUpdateValue_(
          fieldName,
          proposedValue
        );

      if (!validation.valid) {
        rejectedInvalidFields.push({
          fieldName: fieldName,
          existingValue: existingValue,
          proposedValue: proposedValue,
          validationType:
            validation.validationType,
          reason:
            'INVALID_OR_PLACEHOLDER_VALUE'
        });

        return;
      }

      const normalizedExisting =
        normalizeExactSchemaComparisonValue_(
          existingValue
        );

      const normalizedProposed =
        normalizeExactSchemaComparisonValue_(
          validation.normalizedValue
        );

      if (
        normalizedExisting ===
        normalizedProposed
      ) {
        unchangedFields.push(
          fieldName
        );

        return;
      }

      payload[fieldName] =
        validation.normalizedValue;

      acceptedFields.push({
        fieldName: fieldName,
        existingValue: existingValue,
        proposedValue:
          validation.normalizedValue,
        validationType:
          validation.validationType
      });
    }
  );

  return {
    airtableRecordId:
      preview.airtableRecordId || '',

    accountName:
      preview.accountName || '',

    accountNumber:
      preview.accountNumber || '',

    identitySafe:
      Boolean(
        preview.identitySafe
      ),

    payload:
      payload,

    acceptedFields:
      acceptedFields,

    acceptedFieldCount:
      acceptedFields.length,

    blockedFields:
      blockedFields,

    blockedFieldCount:
      blockedFields.length,

    rejectedInvalidFields:
      rejectedInvalidFields,

    rejectedInvalidFieldCount:
      rejectedInvalidFields.length,

    unchangedFields:
      unchangedFields,

    safeForControlledUpdate:
      Boolean(
        preview.identitySafe &&
        acceptedFields.length > 0 &&
        blockedFields.length >= 0
      )
  };
}


/**
 * Builds allowlisted payloads for all role-aware previews.
 */
function buildAllowlistedCreditUpdatePayloads_(
  roleAwarePreviews
) {
  const previews =
    Array.isArray(roleAwarePreviews)
      ? roleAwarePreviews
      : [];

  return previews.map(function(preview) {
    return buildAllowlistedCreditUpdatePayload_(
      preview
    );
  });
}


/**
 * Scores one allowlisted payload for the first controlled test.
 *
 * Higher scores indicate a safer and smaller test.
 */
function scoreControlledCreditUpdateCandidate_(
  candidate
) {
  if (
    !candidate ||
    !candidate.identitySafe ||
    !candidate.safeForControlledUpdate
  ) {
    return 0;
  }

  let score = 100;

  score -=
    candidate.acceptedFieldCount * 5;

  score -=
    candidate.rejectedInvalidFieldCount * 10;

  if (
    candidate.acceptedFieldCount === 1
  ) {
    score += 20;
  }

  if (
    candidate.acceptedFieldCount === 2
  ) {
    score += 10;
  }

  if (score < 0) {
    score = 0;
  }

  return score;
}


/**
 * Ranks safe candidates for a future single-record write test.
 */
function rankAllowlistedCreditUpdateCandidates_(
  candidates
) {
  const ranked =
    Array.isArray(candidates)
      ? candidates.slice()
      : [];

  ranked.forEach(function(candidate) {
    candidate.controlledTestScore =
      scoreControlledCreditUpdateCandidate_(
        candidate
      );
  });

  ranked.sort(function(first, second) {
    if (
      second.safeForControlledUpdate !==
      first.safeForControlledUpdate
    ) {
      return second.safeForControlledUpdate
        ? 1
        : -1;
    }

    if (
      second.controlledTestScore !==
      first.controlledTestScore
    ) {
      return (
        second.controlledTestScore -
        first.controlledTestScore
      );
    }

    return (
      first.acceptedFieldCount -
      second.acceptedFieldCount
    );
  });

  return ranked;
}


/**
 * Creates compact log output.
 */
function buildCompactAllowlistedCreditPayloadLog_(
  candidate,
  index
) {
  return {
    candidateNumber:
      index + 1,

    accountName:
      candidate.accountName,

    accountNumber:
      candidate.accountNumber,

    airtableRecordId:
      candidate.airtableRecordId,

    identitySafe:
      candidate.identitySafe,

    acceptedFieldCount:
      candidate.acceptedFieldCount,

    acceptedFields:
      candidate.acceptedFields,

    blockedFieldCount:
      candidate.blockedFieldCount,

    blockedFields:
      candidate.blockedFields,

    rejectedInvalidFieldCount:
      candidate.rejectedInvalidFieldCount,

    rejectedInvalidFields:
      candidate.rejectedInvalidFields,

    payload:
      candidate.payload,

    controlledTestScore:
      candidate.controlledTestScore,

    safeForControlledUpdate:
      candidate.safeForControlledUpdate
  };
}


/**
 * READ-ONLY TEST
 *
 * Applies the protected-field allowlist and identifies the
 * safest one-record controlled update candidate.
 */
function testProtectedCreditUpdateAllowlist() {
  console.log(
    'PHASE 6I PROTECTED UPDATE ALLOWLIST STARTED'
  );

  const source =
    buildCreditRoleReconciliationSource_();

  const roleAwarePreviews =
    buildRoleAwareCreditUpdatePreviews_(
      source.adaptedRecords,
      source.roleValidatedDecisions,
      source.existingAccountRecords
    );

  const candidates =
    buildAllowlistedCreditUpdatePayloads_(
      roleAwarePreviews
    );

  const rankedCandidates =
    rankAllowlistedCreditUpdateCandidates_(
      candidates
    );

  const identitySafeCount =
    candidates.filter(function(candidate) {
      return candidate.identitySafe;
    }).length;

  const safeCandidateCount =
    candidates.filter(function(candidate) {
      return (
        candidate.safeForControlledUpdate
      );
    }).length;

  const totalAcceptedFields =
    candidates.reduce(
      function(total, candidate) {
        return (
          total +
          candidate.acceptedFieldCount
        );
      },
      0
    );

  const totalBlockedFields =
    candidates.reduce(
      function(total, candidate) {
        return (
          total +
          candidate.blockedFieldCount
        );
      },
      0
    );

  const totalRejectedInvalidFields =
    candidates.reduce(
      function(total, candidate) {
        return (
          total +
          candidate
            .rejectedInvalidFieldCount
        );
      },
      0
    );

  const safestCandidate =
    rankedCandidates.length
      ? rankedCandidates[0]
      : null;

  console.log(
    'Role-aware matches evaluated: ' +
    candidates.length
  );

  console.log(
    'Identity-safe candidates: ' +
    identitySafeCount
  );

  console.log(
    'Safe allowlisted update candidates: ' +
    safeCandidateCount
  );

  console.log(
    'Total accepted update fields: ' +
    totalAcceptedFields
  );

  console.log(
    'Total blocked protected fields: ' +
    totalBlockedFields
  );

  console.log(
    'Total rejected invalid values: ' +
    totalRejectedInvalidFields
  );

  console.log(
    'Safest controlled-test candidate: ' +
    (
      safestCandidate
        ? safestCandidate.accountName
        : 'NONE'
    )
  );

  console.log(
    'Safest candidate field count: ' +
    (
      safestCandidate
        ? safestCandidate.acceptedFieldCount
        : 0
    )
  );

  console.log(
    'Safest candidate test score: ' +
    (
      safestCandidate
        ? safestCandidate.controlledTestScore
        : 0
    )
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  rankedCandidates.forEach(
    function(candidate, index) {
      console.log(
        JSON.stringify(
          buildCompactAllowlistedCreditPayloadLog_(
            candidate,
            index
          )
        )
      );
    }
  );

  console.log(
    'PHASE 6I PROTECTED UPDATE ALLOWLIST COMPLETED'
  );

  return {
    roleAwareMatchesEvaluated:
      candidates.length,

    identitySafeCandidates:
      identitySafeCount,

    safeAllowlistedCandidates:
      safeCandidateCount,

    totalAcceptedUpdateFields:
      totalAcceptedFields,

    totalBlockedProtectedFields:
      totalBlockedFields,

    totalRejectedInvalidValues:
      totalRejectedInvalidFields,

    safestControlledTestCandidate:
      safestCandidate,

    writeEnabled:
      isCreditAirtableWriteEnabled_(),

    rankedCandidates:
      rankedCandidates
  };
}

/**
 * ============================================================
 * PHASE 6J — SINGLE-RECORD DRY RUN
 * ============================================================
 *
 * Builds and validates the exact Airtable request for the safest
 * allowlisted candidate without sending the request.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Builds the Phase 6I candidate list for reuse.
 */
function buildProtectedCreditAllowlistSource_() {
  const source =
    buildCreditRoleReconciliationSource_();

  const roleAwarePreviews =
    buildRoleAwareCreditUpdatePreviews_(
      source.adaptedRecords,
      source.roleValidatedDecisions,
      source.existingAccountRecords
    );

  const candidates =
    buildAllowlistedCreditUpdatePayloads_(
      roleAwarePreviews
    );

  const rankedCandidates =
    rankAllowlistedCreditUpdateCandidates_(
      candidates
    );

  return {
    source:
      source,

    roleAwarePreviews:
      roleAwarePreviews,

    candidates:
      candidates,

    rankedCandidates:
      rankedCandidates
  };
}


/**
 * Selects the safest candidate that passed the allowlist.
 */
function selectSafestCreditDryRunCandidate_(
  rankedCandidates
) {
  const candidates =
    Array.isArray(rankedCandidates)
      ? rankedCandidates
      : [];

  return (
    candidates.find(function(candidate) {
      return (
        candidate.identitySafe === true &&
        candidate.safeForControlledUpdate === true &&
        candidate.acceptedFieldCount > 0 &&
        candidate.airtableRecordId
      );
    }) || null
  );
}


/**
 * Validates that the dry-run payload contains only approved
 * fields.
 */
function validateCreditDryRunFieldAllowlist_(
  payloadFields
) {
  const fields =
    payloadFields &&
    typeof payloadFields === 'object'
      ? payloadFields
      : {};

  const allowedFields =
    getAllowedAutomaticCreditUpdateFields_();

  const blockedFields =
    getBlockedAutomaticCreditUpdateFields_();

  const fieldNames =
    Object.keys(fields);

  const unauthorizedFields =
    fieldNames.filter(function(fieldName) {
      return (
        allowedFields.indexOf(
          fieldName
        ) === -1
      );
    });

  const protectedFieldsFound =
    fieldNames.filter(function(fieldName) {
      return (
        blockedFields.indexOf(
          fieldName
        ) !== -1
      );
    });

  return {
    valid:
      unauthorizedFields.length === 0 &&
      protectedFieldsFound.length === 0,

    fieldCount:
      fieldNames.length,

    fieldNames:
      fieldNames,

    unauthorizedFields:
      unauthorizedFields,

    protectedFieldsFound:
      protectedFieldsFound
  };
}


/**
 * Revalidates every proposed field value.
 */
function validateCreditDryRunFieldValues_(
  payloadFields
) {
  const fields =
    payloadFields &&
    typeof payloadFields === 'object'
      ? payloadFields
      : {};

  const results = [];

  Object.keys(fields).forEach(
    function(fieldName) {
      const validation =
        validateAllowedCreditUpdateValue_(
          fieldName,
          fields[fieldName]
        );

      results.push({
        fieldName:
          fieldName,

        value:
          fields[fieldName],

        valid:
          validation.valid,

        validationType:
          validation.validationType,

        normalizedValue:
          validation.normalizedValue
      });
    }
  );

  const invalidFields =
    results.filter(function(result) {
      return !result.valid;
    });

  return {
    valid:
      invalidFields.length === 0,

    results:
      results,

    invalidFields:
      invalidFields
  };
}


/**
 * Builds the exact Airtable PATCH body that would be sent.
 *
 * This function only creates an object in memory.
 */
function buildCreditDryRunRequestBody_(
  candidate
) {
  return {
    records: [
      {
        id:
          candidate.airtableRecordId,

        fields:
          candidate.payload
      }
    ],

    typecast:
      false
  };
}


/**
 * Builds the Airtable records URL without sending a request.
 */
function buildCreditDryRunRequestUrl_() {
  const configuration =
    getCreditAirtableConfiguration_();

  return (
    'https://api.airtable.com/v0/' +
    encodeURIComponent(
      configuration.baseId
    ) +
    '/' +
    encodeURIComponent(
      configuration.tableId
    )
  );
}


/**
 * Validates the structure of the simulated Airtable request.
 */
function validateCreditDryRunRequest_(
  candidate,
  requestBody
) {
  const errors = [];

  if (!candidate) {
    errors.push(
      'No safe candidate was selected.'
    );
  }

  if (
    candidate &&
    !candidate.airtableRecordId
  ) {
    errors.push(
      'Missing Airtable record ID.'
    );
  }

  if (
    candidate &&
    !candidate.identitySafe
  ) {
    errors.push(
      'Candidate identity is not safe.'
    );
  }

  if (
    candidate &&
    !candidate.safeForControlledUpdate
  ) {
    errors.push(
      'Candidate did not pass the controlled-update rules.'
    );
  }

  if (
    !requestBody ||
    !Array.isArray(requestBody.records) ||
    requestBody.records.length !== 1
  ) {
    errors.push(
      'Request must contain exactly one Airtable record.'
    );
  }

  const requestRecord =
    requestBody &&
    Array.isArray(requestBody.records)
      ? requestBody.records[0]
      : null;

  if (
    requestRecord &&
    requestRecord.id !==
      candidate.airtableRecordId
  ) {
    errors.push(
      'Request record ID does not match the selected candidate.'
    );
  }

  const fieldAllowlistValidation =
    validateCreditDryRunFieldAllowlist_(
      requestRecord
        ? requestRecord.fields
        : {}
    );

  const fieldValueValidation =
    validateCreditDryRunFieldValues_(
      requestRecord
        ? requestRecord.fields
        : {}
    );

  if (!fieldAllowlistValidation.valid) {
    errors.push(
      'Payload contains unauthorized or protected fields.'
    );
  }

  if (!fieldValueValidation.valid) {
    errors.push(
      'Payload contains invalid field values.'
    );
  }

  if (
    fieldAllowlistValidation.fieldCount === 0
  ) {
    errors.push(
      'Payload contains no update fields.'
    );
  }

  if (
    isCreditAirtableWriteEnabled_()
  ) {
    errors.push(
      'Airtable write mode must remain disabled during Phase 6J.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors:
      errors,

    fieldAllowlistValidation:
      fieldAllowlistValidation,

    fieldValueValidation:
      fieldValueValidation,

    writeEnabled:
      isCreditAirtableWriteEnabled_()
  };
}


/**
 * Creates a safe simulation summary.
 */
function buildCreditDryRunSimulation_(
  candidate,
  requestUrl,
  requestBody,
  validation
) {
  return {
    simulationOnly:
      true,

    requestWouldBeSent:
      false,

    method:
      'PATCH',

    requestUrl:
      requestUrl,

    targetRecordId:
      candidate.airtableRecordId,

    accountName:
      candidate.accountName,

    accountNumber:
      candidate.accountNumber,

    acceptedFieldCount:
      candidate.acceptedFieldCount,

    acceptedFields:
      candidate.acceptedFields,

    blockedFieldCount:
      candidate.blockedFieldCount,

    rejectedInvalidFieldCount:
      candidate.rejectedInvalidFieldCount,

    requestBody:
      requestBody,

    validation:
      validation
  };
}


/**
 * READ-ONLY TEST
 *
 * Generates the exact one-record Airtable payload but does not
 * call UrlFetchApp.fetch.
 */
function testSingleRecordDryRun() {
  console.log(
    'PHASE 6J SINGLE-RECORD DRY RUN STARTED'
  );

  const source =
    buildProtectedCreditAllowlistSource_();

  const candidate =
    selectSafestCreditDryRunCandidate_(
      source.rankedCandidates
    );

  if (!candidate) {
    throw new Error(
      'No safe allowlisted candidate is available for the dry run.'
    );
  }

  const requestUrl =
    buildCreditDryRunRequestUrl_();

  const requestBody =
    buildCreditDryRunRequestBody_(
      candidate
    );

  const validation =
    validateCreditDryRunRequest_(
      candidate,
      requestBody
    );

  const simulation =
    buildCreditDryRunSimulation_(
      candidate,
      requestUrl,
      requestBody,
      validation
    );

  console.log(
    'Selected candidate: ' +
    candidate.accountName
  );

  console.log(
    'Target Airtable record: ' +
    candidate.airtableRecordId
  );

  console.log(
    'Accepted update fields: ' +
    candidate.acceptedFieldCount
  );

  console.log(
    'Blocked protected fields: ' +
    candidate.blockedFieldCount
  );

  console.log(
    'Rejected invalid values: ' +
    candidate.rejectedInvalidFieldCount
  );

  console.log(
    'Payload field names: ' +
    Object.keys(candidate.payload).join(', ')
  );

  console.log(
    'Payload allowlist valid: ' +
    validation
      .fieldAllowlistValidation
      .valid
  );

  console.log(
    'Payload values valid: ' +
    validation
      .fieldValueValidation
      .valid
  );

  console.log(
    'Dry-run request valid: ' +
    validation.valid
  );

  console.log(
    'Request would be sent: false'
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  console.log(
    'SIMULATED REQUEST: ' +
    JSON.stringify(simulation)
  );

  console.log(
    'PHASE 6J SINGLE-RECORD DRY RUN COMPLETED'
  );

  return simulation;
}

/**
 * ============================================================
 * PHASE 6K — SINGLE CONTROLLED AIRTABLE WRITE
 * ============================================================
 *
 * Creates a locked, one-record Airtable update process.
 *
 * IMPORTANT:
 * Run phase6KSingleWritePreflight() first.
 * Do not run executePhase6KSingleControlledWrite() until the
 * preflight results have been reviewed and the separate write
 * authorization has been deliberately armed.
 */


/**
 * Exact authorization phrase required for the Phase 6K write.
 */
function getPhase6KAuthorizationPhrase_() {
  return 'AUTHORIZE_ONE_CREDIT_RECORD_ONLY';
}


/**
 * Resolves the Airtable personal access token without exposing
 * it in execution logs.
 */
function getPhase6KAirtableToken_() {
  const configuration =
    getCreditAirtableConfiguration_() || {};

  const scriptProperties =
    PropertiesService
      .getScriptProperties();

  const token =
    configuration.personalAccessToken ||
    configuration.accessToken ||
    configuration.apiToken ||
    configuration.token ||
    scriptProperties.getProperty(
      'AIRTABLE_PERSONAL_ACCESS_TOKEN'
    ) ||
    scriptProperties.getProperty(
      'AIRTABLE_TOKEN'
    ) ||
    '';

  if (!token) {
    throw new Error(
      'Airtable access token could not be resolved.'
    );
  }

  return token;
}


/**
 * Converts a byte array into a hexadecimal fingerprint.
 */
function convertDigestToHex_(digestBytes) {
  return digestBytes.map(function(byte) {
    const normalized =
      byte < 0
        ? byte + 256
        : byte;

    return (
      '0' +
      normalized.toString(16)
    ).slice(-2);
  }).join('');
}


/**
 * Generates a stable SHA-256 fingerprint for the exact target
 * record and exact payload.
 */
function buildPhase6KPayloadFingerprint_(
  recordId,
  payload
) {
  const canonicalPayload =
    JSON.stringify({
      recordId:
        recordId,

      payload:
        payload
    });

  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      canonicalPayload,
      Utilities.Charset.UTF_8
    );

  return convertDigestToHex_(digest);
}


/**
 * Rebuilds the safest Phase 6I candidate.
 */
function buildPhase6KCandidateSource_() {
  const allowlistSource =
    buildProtectedCreditAllowlistSource_();

  const candidate =
    selectSafestCreditDryRunCandidate_(
      allowlistSource.rankedCandidates
    );

  if (!candidate) {
    throw new Error(
      'No safe allowlisted candidate is available.'
    );
  }

  return {
    allowlistSource:
      allowlistSource,

    candidate:
      candidate
  };
}


/**
 * Finds the currently stored Airtable record before any update.
 */
function findCurrentPhase6KAirtableRecord_(
  recordId
) {
  const records =
    fetchAllExistingCreditAirtableRecords_();

  const record =
    records.find(function(item) {
      return item.id === recordId;
    });

  if (!record) {
    throw new Error(
      'The target Airtable record was not found.'
    );
  }

  return record;
}


/**
 * Captures only the Airtable fields that the controlled update
 * proposes to change.
 */
function buildPhase6KBeforeSnapshot_(
  existingRecord,
  payload
) {
  const existingFields =
    existingRecord &&
    existingRecord.fields
      ? existingRecord.fields
      : {};

  const beforeFields = {};

  Object.keys(payload).forEach(
    function(fieldName) {
      beforeFields[fieldName] =
        existingFields[fieldName] === undefined
          ? null
          : existingFields[fieldName];
    }
  );

  return {
    recordId:
      existingRecord.id,

    capturedAt:
      new Date().toISOString(),

    fields:
      beforeFields
  };
}


/**
 * Performs final validation before an authorization can even be
 * considered.
 */
function validatePhase6KControlledCandidate_(
  candidate,
  existingRecord
) {
  const errors = [];

  if (!candidate) {
    errors.push(
      'Candidate is missing.'
    );
  }

  if (
    candidate &&
    candidate.identitySafe !== true
  ) {
    errors.push(
      'Candidate identity is not safe.'
    );
  }

  if (
    candidate &&
    candidate.safeForControlledUpdate !== true
  ) {
    errors.push(
      'Candidate did not pass controlled-update rules.'
    );
  }

  if (
    candidate &&
    !candidate.airtableRecordId
  ) {
    errors.push(
      'Candidate Airtable record ID is missing.'
    );
  }

  if (
    candidate &&
    existingRecord &&
    candidate.airtableRecordId !==
      existingRecord.id
  ) {
    errors.push(
      'Current Airtable record does not match the candidate.'
    );
  }

  const allowlistValidation =
    validateCreditDryRunFieldAllowlist_(
      candidate
        ? candidate.payload
        : {}
    );

  const valueValidation =
    validateCreditDryRunFieldValues_(
      candidate
        ? candidate.payload
        : {}
    );

  if (!allowlistValidation.valid) {
    errors.push(
      'Payload contains unauthorized fields.'
    );
  }

  if (!valueValidation.valid) {
    errors.push(
      'Payload contains invalid values.'
    );
  }

  if (
    allowlistValidation.fieldCount < 1
  ) {
    errors.push(
      'Payload contains no update fields.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors:
      errors,

    allowlistValidation:
      allowlistValidation,

    valueValidation:
      valueValidation
  };
}


/**
 * Builds the complete preflight package.
 */
function buildPhase6KPreflightPackage_() {
  const source =
    buildPhase6KCandidateSource_();

  const candidate =
    source.candidate;

  const existingRecord =
    findCurrentPhase6KAirtableRecord_(
      candidate.airtableRecordId
    );

  const validation =
    validatePhase6KControlledCandidate_(
      candidate,
      existingRecord
    );

  const beforeSnapshot =
    buildPhase6KBeforeSnapshot_(
      existingRecord,
      candidate.payload
    );

  const fingerprint =
    buildPhase6KPayloadFingerprint_(
      candidate.airtableRecordId,
      candidate.payload
    );

  return {
    candidate:
      candidate,

    existingRecord:
      existingRecord,

    validation:
      validation,

    beforeSnapshot:
      beforeSnapshot,

    fingerprint:
      fingerprint,

    requestUrl:
      buildCreditDryRunRequestUrl_(),

    requestBody:
      buildCreditDryRunRequestBody_(
        candidate
      )
  };
}


/**
 * READ-ONLY PREFLIGHT
 *
 * Run this function now.
 *
 * It does not send any Airtable request and does not arm the
 * controlled write.
 */
function phase6KSingleWritePreflight() {
  console.log(
    'PHASE 6K SINGLE-WRITE PREFLIGHT STARTED'
  );

  const preflight =
    buildPhase6KPreflightPackage_();

  console.log(
    'Selected candidate: ' +
    preflight.candidate.accountName
  );

  console.log(
    'Target Airtable record: ' +
    preflight.candidate.airtableRecordId
  );

  console.log(
    'Approved field count: ' +
    preflight.candidate.acceptedFieldCount
  );

  console.log(
    'Approved fields: ' +
    Object.keys(
      preflight.candidate.payload
    ).join(', ')
  );

  console.log(
    'Preflight validation passed: ' +
    preflight.validation.valid
  );

  console.log(
    'Preflight errors: ' +
    JSON.stringify(
      preflight.validation.errors
    )
  );

  console.log(
    'Payload fingerprint: ' +
    preflight.fingerprint
  );

  console.log(
    'Current values snapshot: ' +
    JSON.stringify(
      preflight.beforeSnapshot
    )
  );

  console.log(
    'Proposed payload: ' +
    JSON.stringify(
      preflight.candidate.payload
    )
  );

  console.log(
    'Write authorization armed: false'
  );

  console.log(
    'Airtable request sent: false'
  );

  console.log(
    'PHASE 6K SINGLE-WRITE PREFLIGHT COMPLETED'
  );

  return {
    selectedCandidate:
      preflight.candidate.accountName,

    targetRecordId:
      preflight.candidate.airtableRecordId,

    approvedFields:
      Object.keys(
        preflight.candidate.payload
      ),

    validation:
      preflight.validation,

    payloadFingerprint:
      preflight.fingerprint,

    beforeSnapshot:
      preflight.beforeSnapshot,

    proposedPayload:
      preflight.candidate.payload,

    authorizationArmed:
      false,

    requestSent:
      false
  };
}


/**
 * Checks the separate Phase 6K authorization gate.
 *
 * Both script properties must match the current preflight.
 */
function validatePhase6KAuthorization_(
  preflight
) {
  const scriptProperties =
    PropertiesService
      .getScriptProperties();

  const authorization =
    scriptProperties.getProperty(
      'CREDIT_PHASE_6K_AUTHORIZATION'
    ) || '';

  const authorizedFingerprint =
    scriptProperties.getProperty(
      'CREDIT_PHASE_6K_FINGERPRINT'
    ) || '';

  const authorizedRecordId =
    scriptProperties.getProperty(
      'CREDIT_PHASE_6K_RECORD_ID'
    ) || '';

  const errors = [];

  if (
    authorization !==
    getPhase6KAuthorizationPhrase_()
  ) {
    errors.push(
      'Phase 6K authorization phrase is not armed.'
    );
  }

  if (
    authorizedFingerprint !==
    preflight.fingerprint
  ) {
    errors.push(
      'Authorized fingerprint does not match the current payload.'
    );
  }

  if (
    authorizedRecordId !==
    preflight.candidate.airtableRecordId
  ) {
    errors.push(
      'Authorized record ID does not match the current target.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors:
      errors
  };
}


/**
 * Clears the authorization immediately after any execution
 * attempt, successful or unsuccessful.
 */
function clearPhase6KAuthorization_() {
  const scriptProperties =
    PropertiesService
      .getScriptProperties();

  scriptProperties.deleteProperty(
    'CREDIT_PHASE_6K_AUTHORIZATION'
  );

  scriptProperties.deleteProperty(
    'CREDIT_PHASE_6K_FINGERPRINT'
  );

  scriptProperties.deleteProperty(
    'CREDIT_PHASE_6K_RECORD_ID'
  );
}


/**
 * LIVE SINGLE-RECORD EXECUTOR
 *
 * DO NOT RUN THIS FUNCTION YET.
 *
 * It is deliberately blocked until the preflight screenshots
 * are reviewed and the exact authorization properties are
 * manually entered.
 */
function executePhase6KSingleControlledWrite() {
  console.log(
    'PHASE 6K CONTROLLED WRITE STARTED'
  );

  const preflight =
    buildPhase6KPreflightPackage_();

  if (!preflight.validation.valid) {
    throw new Error(
      'Preflight validation failed: ' +
      preflight.validation.errors.join(
        ' | '
      )
    );
  }

  const authorization =
    validatePhase6KAuthorization_(
      preflight
    );

  if (!authorization.valid) {
    throw new Error(
      'Controlled write authorization failed: ' +
      authorization.errors.join(
        ' | '
      )
    );
  }

  const token =
    getPhase6KAirtableToken_();

  const requestOptions = {
    method:
      'patch',

    contentType:
      'application/json',

    headers: {
      Authorization:
        'Bearer ' + token
    },

    payload:
      JSON.stringify(
        preflight.requestBody
      ),

    muteHttpExceptions:
      true
  };

  let response;

  try {
    response =
      UrlFetchApp.fetch(
        preflight.requestUrl,
        requestOptions
      );
  } finally {
    clearPhase6KAuthorization_();
  }

  const responseCode =
    response.getResponseCode();

  const responseText =
    response.getContentText();

  if (
    responseCode < 200 ||
    responseCode >= 300
  ) {
    throw new Error(
      'Airtable update failed with HTTP ' +
      responseCode +
      ': ' +
      responseText
    );
  }

  console.log(
    'Updated Airtable record: ' +
    preflight.candidate.airtableRecordId
  );

  console.log(
    'Updated account: ' +
    preflight.candidate.accountName
  );

  console.log(
    'Updated fields: ' +
    Object.keys(
      preflight.candidate.payload
    ).join(', ')
  );

  console.log(
    'Airtable response code: ' +
    responseCode
  );

  console.log(
    'Authorization automatically cleared: true'
  );

  console.log(
    'PHASE 6K CONTROLLED WRITE COMPLETED'
  );

  return {
    success:
      true,

    responseCode:
      responseCode,

    recordId:
      preflight.candidate.airtableRecordId,

    accountName:
      preflight.candidate.accountName,

    updatedFields:
      Object.keys(
        preflight.candidate.payload
      ),

    beforeSnapshot:
      preflight.beforeSnapshot,

    payloadFingerprint:
      preflight.fingerprint,

    authorizationCleared:
      true
  };
}

function testAirtableConnection() {
  const properties =
    PropertiesService.getScriptProperties();

  const baseId =
    properties.getProperty('AIRTABLE_BASE_ID');

  const tableId =
    properties.getProperty('AIRTABLE_REVIEW_TABLE_ID');

  const token =
    properties.getProperty('AIRTABLE_TOKEN');

  const metadataUrl =
    'https://api.airtable.com/v0/meta/bases/' +
    baseId +
    '/tables';

  const response = UrlFetchApp.fetch(
    metadataUrl,
    {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token
      },
      muteHttpExceptions: true
    }
  );

  console.log(
    'HTTP status: ' +
    response.getResponseCode()
  );

  console.log(
    'Configured base ID: ' +
    baseId
  );

  console.log(
    'Configured review table ID: ' +
    tableId
  );

  const metadata = JSON.parse(
  response.getContentText()
);

metadata.tables.forEach(function(table) {
  console.log(table.name + ' = ' + table.id);
});
}



