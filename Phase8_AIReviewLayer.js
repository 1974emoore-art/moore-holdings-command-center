/**
 * ============================================================
 * PHASE 8 — AI REVIEW LAYER
 * Moore Holdings Credit Repair Agent
 * Owner: Ernest Moore Jr.
 * ============================================================
 *
 * PURPOSE:
 * - Read Phase 7 Review records from Airtable.
 * - Organize and prioritize review decisions.
 * - Recommend the next safe action.
 * - Preserve Ernest's approval authority.
 * - Never change Personal Credit Repair records.
 *
 * SAFETY:
 * - testPhase8AIReviewLayer() is read-only.
 * - runPhase8AIReviewLayer() is read-only.
 * - A review status can change only through
 *   setPhase8ReviewDecision() with the exact confirmation code.
 */

const PHASE8_CONFIRMATION_CODE =
  'ERNEST_APPROVES_REVIEW_DECISION';

const PHASE8_ALLOWED_DECISIONS = [
  'Approved',
  'Rejected',
  'Hold'
];


/**
 * Main read-only Phase 8 test.
 */
function testPhase8AIReviewLayer() {
  console.log('PHASE 8 AI REVIEW LAYER TEST STARTED');

  const result = buildPhase8AIReviewLayer_();

  console.log(
    'Review records received: ' +
    result.summary.totalRecords
  );

  console.log(
    'High-priority reviews: ' +
    result.summary.highPriority
  );

  console.log(
    'Medium-priority reviews: ' +
    result.summary.mediumPriority
  );

  console.log(
    'Low-priority reviews: ' +
    result.summary.lowPriority
  );

  console.log(
    'Pending reviews: ' +
    result.summary.pending
  );

  console.log(
    'Approved reviews: ' +
    result.summary.approved
  );

  console.log(
    'Rejected reviews: ' +
    result.summary.rejected
  );

  console.log(
    'Reviews on hold: ' +
    result.summary.hold
  );

  console.log(
    'Validation passed: ' +
    result.validation.valid
  );

  console.log(
    'Validation errors: ' +
    JSON.stringify(result.validation.errors)
  );

  console.log('Airtable records changed: false');
  console.log('PHASE 8 AI REVIEW LAYER TEST COMPLETED');

  return result;
}


/**
 * Main read-only Phase 8 processor.
 */
function runPhase8AIReviewLayer() {
  console.log('PHASE 8 AI REVIEW LAYER STARTED');

  const result = buildPhase8AIReviewLayer_();

  if (!result.validation.valid) {
    throw new Error(
      'Phase 8 validation failed: ' +
      JSON.stringify(result.validation.errors)
    );
  }

  result.reviews.forEach(function(review, index) {
    console.log(
      JSON.stringify({
        reviewNumber: index + 1,
        recordId: review.recordId,
        accountName: review.accountName,
        accountNumber: review.accountNumber,
        priority: review.priority,
        actionStage: review.actionStage,
        currentDecision: review.currentDecision,
        recommendedDecision: review.recommendedDecision,
        recommendedNextAction: review.recommendedNextAction,
        letterReadiness: review.letterReadiness
      })
    );
  });

  console.log(
    'Total Phase 8 reviews processed: ' +
    result.summary.totalRecords
  );

  console.log('Personal Credit Repair records changed: false');
  console.log('PHASE 8 AI REVIEW LAYER COMPLETED');

  return result;
}


/**
 * Supplies Phase 8 data to the Phase 9 dashboard.
 */
function getPhase8AIReviewLayerData() {
  return buildPhase8AIReviewLayer_();
}


/**
 * Builds the complete Phase 8 review layer.
 */
function buildPhase8AIReviewLayer_() {
  const records = fetchPhase8ReviewRecords_();

  const reviews = records
    .map(function(record) {
      return analyzePhase8ReviewRecord_(record);
    })
    .filter(function(review) {
      return review !== null;
    });

  reviews.sort(function(a, b) {
    const priorityDifference =
      phase8PriorityRank_(a.priority) -
      phase8PriorityRank_(b.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return String(a.accountName).localeCompare(
      String(b.accountName)
    );
  });

  const validation =
    validatePhase8AIReviewLayer_(reviews);

  return {
    generatedAt: new Date().toISOString(),
    ownerLegalName: 'Ernest Moore Jr.',
    mode: 'READ_ONLY_REVIEW_LAYER',
    sourceTable: 'Phase 7 Review',
    reviews: reviews,
    summary: buildPhase8Summary_(reviews),
    validation: validation,
    personalCreditRecordsChanged: false
  };
}


/**
 * Converts one Airtable record into a Phase 8 review.
 */
function analyzePhase8ReviewRecord_(record) {
  const fields = record.fields || {};

  const name = cleanPhase8Value_(fields['Name']);
  const accountName =
    cleanPhase8Value_(fields['Account Name']);
  const accountNumber =
    cleanPhase8Value_(fields['Account Number']);

  if (!name && !accountName) {
    return null;
  }

  const priority =
    cleanPhase8Value_(fields['Priority']) || 'Medium';

  const actionStage =
    cleanPhase8Value_(fields['Action Stage']) ||
    'Review Required';

  const actionNeeded =
    cleanPhase8Value_(fields['Action Needed']) ||
    'Manual review required.';

  const violationTag =
    cleanPhase8Value_(fields['Violation Tag']);

  const notes =
    cleanPhase8Value_(fields['Notes']);

  const currentDecision =
    normalizePhase8Decision_(fields['Status']);

  const recommendation =
    buildPhase8Recommendation_({
      priority: priority,
      actionStage: actionStage,
      actionNeeded: actionNeeded,
      violationTag: violationTag,
      accountName: accountName,
      accountNumber: accountNumber
    });

  return {
    recordId: record.id,
    name: name,
    accountName: accountName || 'Unknown account',
    accountNumber: accountNumber || 'N/A',
    priority: priority,
    actionStage: actionStage,
    actionNeeded: actionNeeded,
    violationTag: violationTag,
    notes: notes,
    currentDecision: currentDecision,
    recommendedDecision:
      recommendation.recommendedDecision,
    recommendedNextAction:
      recommendation.recommendedNextAction,
    letterReadiness:
      recommendation.letterReadiness,
    requiresErnestApproval: true
  };
}


/**
 * Creates the safe recommendation for one review.
 */
function buildPhase8Recommendation_(review) {
  const stage = String(
    review.actionStage || ''
  ).toLowerCase();

  const priority = String(
    review.priority || ''
  ).toLowerCase();

  if (
    stage.indexOf('invalid') !== -1 ||
    stage.indexOf('hold') !== -1
  ) {
    return {
      recommendedDecision: 'Hold',
      recommendedNextAction:
        'Verify the account identity and missing information before any dispute or Airtable update.',
      letterReadiness: 'Not Ready'
    };
  }

  if (
    stage.indexOf('new account') !== -1
  ) {
    return {
      recommendedDecision: 'Hold',
      recommendedNextAction:
        'Confirm that this is a real credit account and match it to the correct bureau and Airtable record.',
      letterReadiness: 'Needs Verification'
    };
  }

  if (
    stage.indexOf('high priority') !== -1 ||
    priority === 'high'
  ) {
    return {
      recommendedDecision: 'Hold',
      recommendedNextAction:
        'Perform high-priority manual comparison of creditor name, account number, bureau reporting, dates, balance, and status.',
      letterReadiness: 'Priority Review'
    };
  }

  if (
    stage.indexOf('match review') !== -1
  ) {
    return {
      recommendedDecision: 'Hold',
      recommendedNextAction:
        'Compare the proposed Airtable match against the fresh credit report before approving any update.',
      letterReadiness: 'Needs Match Approval'
    };
  }

  return {
    recommendedDecision: 'Hold',
    recommendedNextAction:
      review.actionNeeded ||
      'Review the record and supporting evidence.',
    letterReadiness: 'Manual Review'
  };
}


/**
 * Produces Phase 8 summary totals.
 */
function buildPhase8Summary_(reviews) {
  const summary = {
    totalRecords: reviews.length,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hold: 0
  };

  reviews.forEach(function(review) {
    const priority = String(
      review.priority || ''
    ).toLowerCase();

    if (priority === 'high') {
      summary.highPriority += 1;
    } else if (priority === 'low') {
      summary.lowPriority += 1;
    } else {
      summary.mediumPriority += 1;
    }

    const decision = review.currentDecision;

    if (decision === 'Approved') {
      summary.approved += 1;
    } else if (decision === 'Rejected') {
      summary.rejected += 1;
    } else if (decision === 'Hold') {
      summary.hold += 1;
    } else {
      summary.pending += 1;
    }
  });

  return summary;
}


/**
 * Validates the complete Phase 8 review layer.
 */
function validatePhase8AIReviewLayer_(reviews) {
  const errors = [];

  if (!Array.isArray(reviews)) {
    errors.push('Phase 8 reviews are not an array.');

    return {
      valid: false,
      errors: errors
    };
  }

  if (reviews.length === 0) {
    errors.push(
      'No populated Phase 7 Review records were found.'
    );
  }

  const seenRecordIds = {};

  reviews.forEach(function(review, index) {
    if (!review.recordId) {
      errors.push(
        'Review ' + (index + 1) +
        ' is missing an Airtable record ID.'
      );
    }

    if (seenRecordIds[review.recordId]) {
      errors.push(
        'Duplicate Airtable record ID: ' +
        review.recordId
      );
    }

    seenRecordIds[review.recordId] = true;

    if (!review.accountName) {
      errors.push(
        'Review ' + (index + 1) +
        ' is missing Account Name.'
      );
    }

    if (!review.actionStage) {
      errors.push(
        'Review ' + (index + 1) +
        ' is missing Action Stage.'
      );
    }

    if (!review.priority) {
      errors.push(
        'Review ' + (index + 1) +
        ' is missing Priority.'
      );
    }

    if (!review.recommendedNextAction) {
      errors.push(
        'Review ' + (index + 1) +
        ' is missing a recommended next action.'
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors
  };
}


/**
 * Changes only the Status field in Phase 7 Review.
 *
 * This function is intended for Phase 9 dashboard buttons.
 * It does not update Personal Credit Repair.
 */
function setPhase8ReviewDecision(
  recordId,
  decision,
  confirmationCode
) {
  if (
    confirmationCode !== PHASE8_CONFIRMATION_CODE
  ) {
    throw new Error(
      'Ernest approval confirmation is required.'
    );
  }

  if (!recordId) {
    throw new Error(
      'Airtable review record ID is required.'
    );
  }

  if (
    PHASE8_ALLOWED_DECISIONS.indexOf(decision) === -1
  ) {
    throw new Error(
      'Decision must be Approved, Rejected, or Hold.'
    );
  }

  const config = getPhase8Config_();

  const url =
    'https://api.airtable.com/v0/' +
    config.baseId +
    '/' +
    config.reviewTableId +
    '/' +
    recordId;

  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + config.token
    },
    payload: JSON.stringify({
      fields: {
        Status: decision
      },
      typecast: true
    }),
    muteHttpExceptions: true
  });

  const responseCode =
    response.getResponseCode();

  const responseText =
    response.getContentText();

  if (
    responseCode < 200 ||
    responseCode >= 300
  ) {
    throw new Error(
      'Phase 8 decision update failed with HTTP ' +
      responseCode +
      ': ' +
      responseText
    );
  }

  return {
    success: true,
    recordId: recordId,
    decision: decision,
    personalCreditRecordsChanged: false
  };
}


/**
 * Reads every record from Phase 7 Review.
 */
function fetchPhase8ReviewRecords_() {
  const config = getPhase8Config_();
  const records = [];
  let offset = '';

  do {
    let url =
      'https://api.airtable.com/v0/' +
      config.baseId +
      '/' +
      config.reviewTableId +
      '?pageSize=100';

    if (offset) {
      url +=
        '&offset=' +
        encodeURIComponent(offset);
    }

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + config.token
      },
      muteHttpExceptions: true
    });

    const responseCode =
      response.getResponseCode();

    const responseText =
      response.getContentText();

    if (
      responseCode < 200 ||
      responseCode >= 300
    ) {
      throw new Error(
        'Phase 8 Airtable read failed with HTTP ' +
        responseCode +
        ': ' +
        responseText
      );
    }

    const data = JSON.parse(responseText);

    (data.records || []).forEach(function(record) {
      records.push(record);
    });

    offset = data.offset || '';
  } while (offset);

  return records;
}


/**
 * Loads the existing secure Airtable settings.
 */
function getPhase8Config_() {
  const properties =
    PropertiesService.getScriptProperties();

  const config = {
    baseId:
      properties.getProperty('AIRTABLE_BASE_ID'),
    token:
      properties.getProperty('AIRTABLE_TOKEN'),
    reviewTableId:
      properties.getProperty(
        'AIRTABLE_REVIEW_TABLE_ID'
      )
  };

  const missing = [];

  if (!config.baseId) {
    missing.push('AIRTABLE_BASE_ID');
  }

  if (!config.token) {
    missing.push('AIRTABLE_TOKEN');
  }

  if (!config.reviewTableId) {
    missing.push('AIRTABLE_REVIEW_TABLE_ID');
  }

  if (missing.length > 0) {
    throw new Error(
      'Missing secure setting(s): ' +
      missing.join(', ')
    );
  }

  return config;
}


/**
 * Normalizes Airtable values safely.
 */
function cleanPhase8Value_(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(', ').trim();
  }

  if (
    typeof value === 'object'
  ) {
    return JSON.stringify(value);
  }

  return String(value).trim();
}


/**
 * Normalizes the existing review decision.
 */
function normalizePhase8Decision_(value) {
  const decision =
    cleanPhase8Value_(value);

  if (
    PHASE8_ALLOWED_DECISIONS.indexOf(
      decision
    ) !== -1
  ) {
    return decision;
  }

  return 'Pending';
}


/**
 * Sorts High before Medium before Low.
 */
function phase8PriorityRank_(priority) {
  const normalized =
    String(priority || '').toLowerCase();

  if (normalized === 'high') {
    return 1;
  }

  if (normalized === 'medium') {
    return 2;
  }

  if (normalized === 'low') {
    return 3;
  }

  return 4;
}
