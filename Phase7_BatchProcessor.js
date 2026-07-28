/**
 * ============================================================
 * PHASE 7A — FULL CREDIT REPORT BATCH PROCESSING PLAN
 * ============================================================
 *
 * Processes every parsed credit-report account through the
 * completed Phase 6 matching, role-validation, and protected
 * update systems.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Converts one Phase 6 decision into a Phase 7 batch category.
 */
function classifyPhase7BatchDecision_(
  adaptedRecord,
  decision,
  existingRecords
) {
  const schema =
    getPersonalCreditAirtableSchemaMap_();

  const fields =
    adaptedRecord && adaptedRecord.fields
      ? adaptedRecord.fields
      : {};

  const accountName =
    fields[schema.accountName] || '';

  const accountNumber =
    fields[schema.accountNumber] || '';

  if (!decision) {
    return {
      batchAction: 'ERROR_REVIEW',
      reason: 'MISSING_DECISION',
      accountName: accountName,
      accountNumber: accountNumber
    };
  }

  if (
    decision.decision ===
    'ROLE_VALIDATED_AUTO_MATCH'
  ) {
    const existingRecord =
      findExistingCreditRecordById_(
        existingRecords,
        decision.matchedRecordId
      );

    if (!existingRecord) {
      return {
        batchAction: 'ERROR_REVIEW',
        reason: 'TARGET_AIRTABLE_RECORD_NOT_FOUND',
        accountName: accountName,
        accountNumber: accountNumber,
        airtableRecordId:
          decision.matchedRecordId || ''
      };
    }

    const preview =
      buildRoleAwareCreditUpdatePreview_(
        adaptedRecord,
        decision,
        existingRecord
      );

    const candidate =
      buildAllowlistedCreditUpdatePayload_(
        preview
      );

    if (
      candidate.identitySafe &&
      candidate.acceptedFieldCount > 0
    ) {
      return {
        batchAction: 'SAFE_UPDATE',
        reason:
          'ROLE_VALIDATED_ALLOWLISTED_CHANGES',

        accountName:
          candidate.accountName,

        accountNumber:
          candidate.accountNumber,

        airtableRecordId:
          candidate.airtableRecordId,

        acceptedFieldCount:
          candidate.acceptedFieldCount,

        acceptedFields:
          candidate.acceptedFields,

        blockedFieldCount:
          candidate.blockedFieldCount,

        rejectedInvalidFieldCount:
          candidate.rejectedInvalidFieldCount,

        payload:
          candidate.payload
      };
    }

    return {
      batchAction: 'NO_CHANGE',
      reason:
        'AIRTABLE_ALREADY_MATCHES_OR_NO_ALLOWED_CHANGES',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      airtableRecordId:
        decision.matchedRecordId || '',

      acceptedFieldCount:
        candidate.acceptedFieldCount,

      blockedFieldCount:
        candidate.blockedFieldCount,

      rejectedInvalidFieldCount:
        candidate.rejectedInvalidFieldCount
    };
  }

  if (
    decision.decision ===
    'HIGH_PRIORITY_MATCH_REVIEW'
  ) {
    return {
      batchAction:
        'HIGH_PRIORITY_REVIEW',

      reason:
        decision.reason ||
        'STRONG_POSSIBLE_EXISTING_MATCH',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      possibleRecordId:
        decision.possibleRecordId || '',

      score:
        decision.score || 0
    };
  }

  if (
    decision.decision ===
    'MATCH_REVIEW'
  ) {
    return {
      batchAction:
        'MATCH_REVIEW',

      reason:
        decision.reason ||
        'POSSIBLE_EXISTING_ACCOUNT',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      possibleRecordId:
        decision.possibleRecordId || '',

      score:
        decision.score || 0
    };
  }

  if (
    decision.decision ===
    'CREATE_CANDIDATE_REVIEW'
  ) {
    return {
      batchAction:
        'CREATE_REVIEW',

      reason:
        decision.reason ||
        'NO_MEANINGFUL_EXISTING_MATCH',

      accountName:
        accountName,

      accountNumber:
        accountNumber
    };
  }

  if (
    decision.decision ===
    'INVALID_REVIEW'
  ) {
    return {
      batchAction:
        'INVALID_REVIEW',

      reason:
        decision.reason ||
        'MISSING_REQUIRED_INFORMATION',

      accountName:
        accountName,

      accountNumber:
        accountNumber,

      missingRequiredFields:
        decision.missingRequiredFields || []
    };
  }

  return {
    batchAction:
      'UNCLASSIFIED_REVIEW',

    reason:
      'UNRECOGNIZED_DECISION_' +
      String(decision.decision || 'UNKNOWN'),

    accountName:
      accountName,

    accountNumber:
      accountNumber
  };
}


/**
 * Builds the complete 37-account Phase 7 batch plan.
 */
function buildPhase7FullBatchPlan_() {
  const source =
    buildCreditRoleReconciliationSource_();

  const batchItems =
    source.adaptedRecords.map(
      function(record, index) {
        const item =
          classifyPhase7BatchDecision_(
            record,
            source.roleValidatedDecisions[index],
            source.existingAccountRecords
          );

        item.reportRecordNumber =
          index + 1;

        return item;
      }
    );

  return {
    source: source,
    batchItems: batchItems
  };
}


/**
 * Counts batch items by action.
 */
function countPhase7BatchActions_(
  batchItems,
  actionName
) {
  return batchItems.filter(
    function(item) {
      return (
        item.batchAction ===
        actionName
      );
    }
  ).length;
}


/**
 * Counts every accepted field across safe updates.
 */
function countPhase7AcceptedFields_(
  batchItems
) {
  return batchItems.reduce(
    function(total, item) {
      return (
        total +
        Number(
          item.acceptedFieldCount || 0
        )
      );
    },
    0
  );
}


/**
 * Validates that the batch plan is read-only and structurally
 * safe.
 */
function validatePhase7BatchPlan_(
  batchItems
) {
  const errors = [];

  if (!Array.isArray(batchItems)) {
    errors.push(
      'Batch items are not an array.'
    );
  }

  if (
    Array.isArray(batchItems) &&
    batchItems.length !== 37
  ) {
    errors.push(
      'Expected 37 report accounts but received ' +
      batchItems.length +
      '.'
    );
  }

  const unsafePayloads =
    Array.isArray(batchItems)
      ? batchItems.filter(
          function(item) {
            if (
              item.batchAction !==
              'SAFE_UPDATE'
            ) {
              return false;
            }

            const validation =
              validateCreditDryRunFieldAllowlist_(
                item.payload || {}
              );

            return !validation.valid;
          }
        )
      : [];

  if (unsafePayloads.length) {
    errors.push(
      'One or more safe-update payloads contain unauthorized fields.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors:
      errors,

    totalItems:
      Array.isArray(batchItems)
        ? batchItems.length
        : 0,

    unsafePayloadCount:
      unsafePayloads.length,

    writeEnabled:
      isCreditAirtableWriteEnabled_()
  };
}


/**
 * Creates compact execution-log output.
 */
function buildCompactPhase7BatchLog_(
  item
) {
  return {
    reportRecordNumber:
      item.reportRecordNumber,

    batchAction:
      item.batchAction,

    reason:
      item.reason,

    accountName:
      item.accountName || '',

    accountNumber:
      item.accountNumber || '',

    airtableRecordId:
      item.airtableRecordId || '',

    possibleRecordId:
      item.possibleRecordId || '',

    acceptedFieldCount:
      item.acceptedFieldCount || 0,

    acceptedFields:
      item.acceptedFields || [],

    payload:
      item.payload || {},

    score:
      item.score || 0,

    missingRequiredFields:
      item.missingRequiredFields || []
  };
}


/**
 * READ-ONLY TEST
 *
 * Processes the complete report and builds one batch plan for
 * all 37 accounts.
 */
function testPhase7FullBatchProcessingPlan() {
  console.log(
    'PHASE 7A FULL BATCH PLAN STARTED'
  );

  const result =
    buildPhase7FullBatchPlan_();

  const batchItems =
    result.batchItems;

  const validation =
    validatePhase7BatchPlan_(
      batchItems
    );

  const safeUpdateCount =
    countPhase7BatchActions_(
      batchItems,
      'SAFE_UPDATE'
    );

  const noChangeCount =
    countPhase7BatchActions_(
      batchItems,
      'NO_CHANGE'
    );

  const highPriorityReviewCount =
    countPhase7BatchActions_(
      batchItems,
      'HIGH_PRIORITY_REVIEW'
    );

  const matchReviewCount =
    countPhase7BatchActions_(
      batchItems,
      'MATCH_REVIEW'
    );

  const createReviewCount =
    countPhase7BatchActions_(
      batchItems,
      'CREATE_REVIEW'
    );

  const invalidReviewCount =
    countPhase7BatchActions_(
      batchItems,
      'INVALID_REVIEW'
    );

  const otherReviewCount =
    batchItems.length -
    safeUpdateCount -
    noChangeCount -
    highPriorityReviewCount -
    matchReviewCount -
    createReviewCount -
    invalidReviewCount;

  const totalAcceptedFields =
    countPhase7AcceptedFields_(
      batchItems
    );

  console.log(
    'Report accounts processed: ' +
    batchItems.length
  );

  console.log(
    'Safe Airtable updates: ' +
    safeUpdateCount
  );

  console.log(
    'Accounts already current: ' +
    noChangeCount
  );

  console.log(
    'High-priority reviews: ' +
    highPriorityReviewCount
  );

  console.log(
    'Standard match reviews: ' +
    matchReviewCount
  );

  console.log(
    'Create-candidate reviews: ' +
    createReviewCount
  );

  console.log(
    'Invalid reviews: ' +
    invalidReviewCount
  );

  console.log(
    'Other review actions: ' +
    otherReviewCount
  );

  console.log(
    'Total approved field changes: ' +
    totalAcceptedFields
  );

  console.log(
    'Batch plan validation passed: ' +
    validation.valid
  );

  console.log(
    'Batch plan errors: ' +
    JSON.stringify(
      validation.errors
    )
  );

  console.log(
    'Airtable writes enabled: ' +
    isCreditAirtableWriteEnabled_()
  );

  batchItems.forEach(
    function(item) {
      console.log(
        JSON.stringify(
          buildCompactPhase7BatchLog_(
            item
          )
        )
      );
    }
  );

  console.log(
    'PHASE 7A FULL BATCH PLAN COMPLETED'
  );

  return {
    reportAccountsProcessed:
      batchItems.length,

    safeAirtableUpdates:
      safeUpdateCount,

    accountsAlreadyCurrent:
      noChangeCount,

    highPriorityReviews:
      highPriorityReviewCount,

    standardMatchReviews:
      matchReviewCount,

    createCandidateReviews:
      createReviewCount,

    invalidReviews:
      invalidReviewCount,

    otherReviewActions:
      otherReviewCount,

    totalApprovedFieldChanges:
      totalAcceptedFields,

    validation:
      validation,

    batchItems:
      batchItems
  };
}/**
 * ============================================================
 * PHASE 7B — FULL BATCH REVIEW QUEUE
 * ============================================================
 *
 * Organizes every non-current account into one structured
 * review queue.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */

function getPhase7ReviewPriority_(batchAction) {
  const priorities = {
    HIGH_PRIORITY_REVIEW: 1,
    MATCH_REVIEW: 2,
    CREATE_REVIEW: 3,
    INVALID_REVIEW: 4,
    ERROR_REVIEW: 5,
    UNCLASSIFIED_REVIEW: 6
  };

  return priorities[batchAction] || 99;
}


function buildPhase7BatchReviewQueue_() {
  const result =
    buildPhase7FullBatchPlan_();

  const reviewQueue =
    result.batchItems
      .filter(function(item) {
        return (
          item.batchAction !== 'SAFE_UPDATE' &&
          item.batchAction !== 'NO_CHANGE'
        );
      })
      .map(function(item) {
        return {
          reportRecordNumber:
            item.reportRecordNumber,

          priority:
            getPhase7ReviewPriority_(
              item.batchAction
            ),

          reviewType:
            item.batchAction,

          reason:
            item.reason || '',

          accountName:
            item.accountName || '',

          accountNumber:
            item.accountNumber || '',

          possibleRecordId:
            item.possibleRecordId || '',

          score:
            Number(item.score || 0),

          missingRequiredFields:
            item.missingRequiredFields || [],

          recommendedAction:
            buildPhase7RecommendedReviewAction_(
              item
            )
        };
      })
      .sort(function(a, b) {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }

        return b.score - a.score;
      });

  return {
    batchPlan:
      result,

    reviewQueue:
      reviewQueue
  };
}


function buildPhase7RecommendedReviewAction_(item) {
  switch (item.batchAction) {
    case 'HIGH_PRIORITY_REVIEW':
      return 'Confirm the proposed Airtable match before update.';

    case 'MATCH_REVIEW':
      return 'Compare creditor name, account number, balance, and bureau reporting.';

    case 'CREATE_REVIEW':
      return 'Confirm this is a real tradeline before creating a new Airtable record.';

    case 'INVALID_REVIEW':
      return 'Locate the missing account name or account number.';

    case 'ERROR_REVIEW':
      return 'Inspect the parser or Airtable target error.';

    default:
      return 'Manual review required.';
  }
}


function countPhase7ReviewType_(
  reviewQueue,
  reviewType
) {
  return reviewQueue.filter(function(item) {
    return item.reviewType === reviewType;
  }).length;
}


/**
 * READ-ONLY TEST
 */
function testPhase7FullBatchReviewQueue() {
  console.log(
    'PHASE 7B FULL REVIEW QUEUE STARTED'
  );

  const result =
    buildPhase7BatchReviewQueue_();

  const queue =
    result.reviewQueue;

  console.log(
    'Total report accounts: ' +
    result.batchPlan.batchItems.length
  );

  console.log(
    'Total accounts requiring review: ' +
    queue.length
  );

  console.log(
    'High-priority reviews: ' +
    countPhase7ReviewType_(
      queue,
      'HIGH_PRIORITY_REVIEW'
    )
  );

  console.log(
    'Standard match reviews: ' +
    countPhase7ReviewType_(
      queue,
      'MATCH_REVIEW'
    )
  );

  console.log(
    'Create reviews: ' +
    countPhase7ReviewType_(
      queue,
      'CREATE_REVIEW'
    )
  );

  console.log(
    'Invalid reviews: ' +
    countPhase7ReviewType_(
      queue,
      'INVALID_REVIEW'
    )
  );

  queue.forEach(function(item) {
    console.log(
      JSON.stringify(item)
    );
  });

  console.log(
    'Airtable request sent: false'
  );

  console.log(
    'PHASE 7B FULL REVIEW QUEUE COMPLETED'
  );

  return result;
}
/**
 * ============================================================
 * PHASE 7C — AIRTABLE REVIEW WORKFLOW PLAN
 * ============================================================
 *
 * Converts the Phase 7B review queue into Airtable-ready review
 * records while preventing duplicate review items.
 *
 * READ-ONLY:
 * No Airtable records are created, updated, or deleted.
 */


/**
 * Creates a stable key for one review item.
 */
function buildPhase7ReviewKey_(item) {
  return [
    String(item.reviewType || '').trim().toLowerCase(),
    String(item.accountName || '').trim().toLowerCase(),
    String(item.accountNumber || '').trim().toLowerCase(),
    String(item.possibleRecordId || '').trim().toLowerCase()
  ].join('|');
}


/**
 * Removes duplicate review items.
 */
function deduplicatePhase7ReviewQueue_(reviewQueue) {
  const seenKeys = {};
  const uniqueItems = [];
  const duplicateItems = [];

  reviewQueue.forEach(function(item) {
    const reviewKey =
      buildPhase7ReviewKey_(item);

    if (seenKeys[reviewKey]) {
      duplicateItems.push(item);
      return;
    }

    seenKeys[reviewKey] = true;
    uniqueItems.push(item);
  });

  return {
    uniqueItems:
      uniqueItems,

    duplicateItems:
      duplicateItems
  };
}


/**
 * Maps the internal review type to a user-facing Action Stage.
 */
function mapPhase7ReviewStage_(reviewType) {
  const stageMap = {
    HIGH_PRIORITY_REVIEW:
      'High Priority Match Review',

    MATCH_REVIEW:
      'Match Review',

    CREATE_REVIEW:
      'New Account Review',

    INVALID_REVIEW:
      'Missing Data Review',

    ERROR_REVIEW:
      'Parser Error Review',

    UNCLASSIFIED_REVIEW:
      'Manual Review'
  };

  return (
    stageMap[reviewType] ||
    'Manual Review'
  );
}


/**
 * Maps the review type to a user-facing priority.
 */
function mapPhase7ReviewPriorityLabel_(reviewType) {
  const priorityMap = {
    HIGH_PRIORITY_REVIEW:
      'High',

    MATCH_REVIEW:
      'Medium',

    CREATE_REVIEW:
      'Medium',

    INVALID_REVIEW:
      'High',

    ERROR_REVIEW:
      'High',

    UNCLASSIFIED_REVIEW:
      'Medium'
  };

  return (
    priorityMap[reviewType] ||
    'Medium'
  );
}


/**
 * Builds one Airtable-ready review task.
 *
 * This is only an in-memory object. It is not sent anywhere.
 */
function buildPhase7AirtableReviewRecord_(item) {
  return {
    reviewKey:
      buildPhase7ReviewKey_(item),

    fields: {
      'Name':
        item.accountName
          ? 'Review ' + item.accountName
          : 'Review credit report record ' +
            item.reportRecordNumber,

      'Account Name':
        item.accountName || '',

      'Account Number':
        item.accountNumber || '',

      'Action Needed':
        item.recommendedAction ||
        'Manual review required.',

      'Action Stage':
        mapPhase7ReviewStage_(
          item.reviewType
        ),

      'Priority':
        mapPhase7ReviewPriorityLabel_(
          item.reviewType
        ),

      'Violation Tag':
        item.reason || '',

      'Notes':
        [
          'Credit report record: ' +
            item.reportRecordNumber,

          'Review type: ' +
            item.reviewType,

          'Possible Airtable record: ' +
            (item.possibleRecordId || 'None'),

          'Match score: ' +
            Number(item.score || 0),

          'Missing fields: ' +
            (
              item.missingRequiredFields &&
              item.missingRequiredFields.length
                ? item.missingRequiredFields.join(', ')
                : 'None'
            )
        ].join('\n')
    },

    metadata: {
      reportRecordNumber:
        item.reportRecordNumber,

      reviewType:
        item.reviewType,

      possibleRecordId:
        item.possibleRecordId || '',

      score:
        Number(item.score || 0)
    }
  };
}


/**
 * Builds the complete Airtable review workflow plan.
 */
function buildPhase7AirtableReviewWorkflow_() {
  const queueResult =
    buildPhase7BatchReviewQueue_();

  const deduplicated =
    deduplicatePhase7ReviewQueue_(
      queueResult.reviewQueue
    );

  const reviewRecords =
    deduplicated.uniqueItems.map(
      function(item) {
        return (
          buildPhase7AirtableReviewRecord_(
            item
          )
        );
      }
    );

  return {
    batchPlan:
      queueResult.batchPlan,

    originalReviewQueue:
      queueResult.reviewQueue,

    uniqueReviewItems:
      deduplicated.uniqueItems,

    duplicateReviewItems:
      deduplicated.duplicateItems,

    airtableReviewRecords:
      reviewRecords
  };
}


/**
 * Validates one review record.
 */
function validatePhase7AirtableReviewRecord_(
  reviewRecord
) {
  const errors = [];

  if (
    !reviewRecord ||
    !reviewRecord.reviewKey
  ) {
    errors.push(
      'Missing review key.'
    );
  }

  if (
    !reviewRecord ||
    !reviewRecord.fields
  ) {
    errors.push(
      'Missing fields object.'
    );
  }

  const fields =
    reviewRecord &&
    reviewRecord.fields
      ? reviewRecord.fields
      : {};

  if (!fields['Name']) {
  errors.push(
    'Missing Name.'
  );
}

  if (!fields['Action Needed']) {
    errors.push(
      'Missing Action Needed.'
    );
  }

  if (!fields['Action Stage']) {
    errors.push(
      'Missing Action Stage.'
    );
  }

  if (!fields['Priority']) {
    errors.push(
      'Missing Priority.'
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
 * Validates the complete Phase 7C workflow.
 */
function validatePhase7AirtableReviewWorkflow_(
  workflow
) {
  const errors = [];

  const records =
    workflow &&
    Array.isArray(
      workflow.airtableReviewRecords
    )
      ? workflow.airtableReviewRecords
      : [];

  if (!records.length) {
    errors.push(
      'No Airtable review records were generated.'
    );
  }

  const invalidRecords =
    records.filter(function(record) {
      return (
        !validatePhase7AirtableReviewRecord_(
          record
        ).valid
      );
    });

  if (invalidRecords.length) {
    errors.push(
      invalidRecords.length +
      ' review records failed validation.'
    );
  }

  const reviewKeys =
    records.map(function(record) {
      return record.reviewKey;
    });

  const uniqueReviewKeys =
    Array.from(
      new Set(reviewKeys)
    );

  if (
    uniqueReviewKeys.length !==
    reviewKeys.length
  ) {
    errors.push(
      'Duplicate review keys remain.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors:
      errors,

    generatedRecordCount:
      records.length,

    invalidRecordCount:
      invalidRecords.length,

    duplicateKeyCount:
      reviewKeys.length -
      uniqueReviewKeys.length
  };
}


/**
 * READ-ONLY TEST
 */
function testPhase7AirtableReviewWorkflowPlan() {
  console.log(
    'PHASE 7C AIRTABLE REVIEW WORKFLOW STARTED'
  );

  const workflow =
    buildPhase7AirtableReviewWorkflow_();

  const validation =
    validatePhase7AirtableReviewWorkflow_(
      workflow
    );

  console.log(
    'Original review queue items: ' +
    workflow.originalReviewQueue.length
  );

  console.log(
    'Unique review items: ' +
    workflow.uniqueReviewItems.length
  );

  console.log(
    'Duplicate review items removed: ' +
    workflow.duplicateReviewItems.length
  );

  console.log(
    'Airtable review records generated: ' +
    workflow.airtableReviewRecords.length
  );

  console.log(
    'Workflow validation passed: ' +
    validation.valid
  );

  console.log(
    'Workflow validation errors: ' +
    JSON.stringify(
      validation.errors
    )
  );

  console.log(
    'Invalid generated records: ' +
    validation.invalidRecordCount
  );

  console.log(
    'Duplicate review keys remaining: ' +
    validation.duplicateKeyCount
  );

  workflow.airtableReviewRecords.forEach(
    function(record, index) {
      console.log(
        JSON.stringify({
          reviewNumber:
            index + 1,

          reviewKey:
            record.reviewKey,

          taskName:
            record.fields['Name'],

          actionStage:
            record.fields['Action Stage'],

          priority:
            record.fields['Priority'],

          actionNeeded:
            record.fields['Action Needed']
        })
      );
    }
  );

  console.log(
    'Airtable request sent: false'
  );

  console.log(
    'PHASE 7C AIRTABLE REVIEW WORKFLOW COMPLETED'
  );

  return {
    originalReviewQueueItems:
      workflow.originalReviewQueue.length,

    uniqueReviewItems:
      workflow.uniqueReviewItems.length,

    duplicateReviewItemsRemoved:
      workflow.duplicateReviewItems.length,

    airtableReviewRecordsGenerated:
      workflow.airtableReviewRecords.length,

    validation:
      validation,

    workflow:
      workflow
  };
}







