/**
 * ============================================================
 * PHASE 7D — REVIEW RECORD BATCH WRITER PREFLIGHT
 * ============================================================
 *
 * Packages the validated Phase 7C review records into Airtable
 * batch-create requests.
 *
 * READ-ONLY:
 * No Airtable request is sent.
 */

const PHASE7_REVIEW_BATCH_SIZE = 10;


/**
 * Splits an array into Airtable-safe batches.
 */
function chunkPhase7ReviewRecords_(records, batchSize) {
  const chunks = [];

  for (
    let index = 0;
    index < records.length;
    index += batchSize
  ) {
    chunks.push(
      records.slice(
        index,
        index + batchSize
      )
    );
  }

  return chunks;
}


/**
 * Converts one Phase 7C workflow record into Airtable's
 * batch-create record format.
 */
function buildPhase7ReviewCreateRecord_(reviewRecord) {
  return {
    fields: reviewRecord.fields
  };
}


/**
 * Creates the complete read-only batch-write plan.
 */
function buildPhase7ReviewWriterPlan_() {
  const workflow =
    buildPhase7AirtableReviewWorkflow_();

  const validation =
    validatePhase7AirtableReviewWorkflow_(
      workflow
    );

  if (!validation.valid) {
    throw new Error(
      'Phase 7C workflow validation failed: ' +
      JSON.stringify(validation.errors)
    );
  }

  const createRecords =
    workflow.airtableReviewRecords.map(
      function(reviewRecord) {
        return buildPhase7ReviewCreateRecord_(
          reviewRecord
        );
      }
    );

  const batches =
    chunkPhase7ReviewRecords_(
      createRecords,
      PHASE7_REVIEW_BATCH_SIZE
    );

  return {
    workflow: workflow,
    workflowValidation: validation,
    createRecords: createRecords,
    batches: batches,
    batchSize: PHASE7_REVIEW_BATCH_SIZE
  };
}


/**
 * Validates a prepared Airtable batch.
 */
function validatePhase7ReviewWriterBatch_(batch) {
  const errors = [];

  if (!Array.isArray(batch)) {
    errors.push(
      'Batch is not an array.'
    );

    return {
      valid: false,
      errors: errors,
      recordCount: 0
    };
  }

  if (!batch.length) {
    errors.push(
      'Batch contains no records.'
    );
  }

  if (
    batch.length >
    PHASE7_REVIEW_BATCH_SIZE
  ) {
    errors.push(
      'Batch exceeds the maximum size of ' +
      PHASE7_REVIEW_BATCH_SIZE +
      '.'
    );
  }

  batch.forEach(function(record, index) {
    if (
      !record ||
      !record.fields
    ) {
      errors.push(
        'Batch record ' +
        (index + 1) +
        ' is missing its fields object.'
      );

      return;
    }

    if (!record.fields['Name']) {
      errors.push(
        'Batch record ' +
        (index + 1) +
      ' is missing Name.'
      );
    }

    if (!record.fields['Action Needed']) {
      errors.push(
        'Batch record ' +
        (index + 1) +
        ' is missing Action Needed.'
      );
    }

    if (!record.fields['Action Stage']) {
      errors.push(
        'Batch record ' +
        (index + 1) +
        ' is missing Action Stage.'
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors,
    recordCount: batch.length
  };
}


/**
 * Validates the entire writer plan.
 */
function validatePhase7ReviewWriterPlan_(plan) {
  const errors = [];

  if (!plan) {
    errors.push(
      'Writer plan is missing.'
    );

    return {
      valid: false,
      errors: errors,
      totalRecords: 0,
      totalBatches: 0
    };
  }

  if (
    plan.createRecords.length !==
    plan.workflow.airtableReviewRecords.length
  ) {
    errors.push(
      'Prepared record count does not match the Phase 7C workflow.'
    );
  }

  plan.batches.forEach(
    function(batch, index) {
      const batchValidation =
        validatePhase7ReviewWriterBatch_(
          batch
        );

      if (!batchValidation.valid) {
        errors.push(
          'Batch ' +
          (index + 1) +
          ' failed validation: ' +
          JSON.stringify(
            batchValidation.errors
          )
        );
      }
    }
  );

  const totalBatchedRecords =
    plan.batches.reduce(
      function(total, batch) {
        return total + batch.length;
      },
      0
    );

  if (
    totalBatchedRecords !==
    plan.createRecords.length
  ) {
    errors.push(
      'Batched record count does not match prepared record count.'
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    totalRecords:
      plan.createRecords.length,
    totalBatches:
      plan.batches.length,
    totalBatchedRecords:
      totalBatchedRecords
  };
}


/**
 * READ-ONLY TEST
 */
function testPhase7ReviewWriterPreflight() {
  console.log(
    'PHASE 7D REVIEW WRITER PREFLIGHT STARTED'
  );

  const plan =
    buildPhase7ReviewWriterPlan_();

  const validation =
    validatePhase7ReviewWriterPlan_(
      plan
    );

  console.log(
    'Review records received: ' +
    plan.workflow.airtableReviewRecords.length
  );

  console.log(
    'Prepared Airtable records: ' +
    plan.createRecords.length
  );

  console.log(
    'Batch size: ' +
    plan.batchSize
  );

  console.log(
    'Total batches prepared: ' +
    plan.batches.length
  );

  plan.batches.forEach(
    function(batch, index) {
      console.log(
        'Batch ' +
        (index + 1) +
        ' record count: ' +
        batch.length
      );
    }
  );

  console.log(
    'Writer plan validation passed: ' +
    validation.valid
  );

  console.log(
    'Writer plan errors: ' +
    JSON.stringify(
      validation.errors
    )
  );

  console.log(
    'Airtable request sent: false'
  );

  console.log(
    'PHASE 7D REVIEW WRITER PREFLIGHT COMPLETED'
  );

  return {
    reviewRecordsReceived:
      plan.workflow.airtableReviewRecords.length,

    preparedAirtableRecords:
      plan.createRecords.length,

    batchSize:
      plan.batchSize,

    totalBatchesPrepared:
      plan.batches.length,

    validation:
      validation,

    batches:
      plan.batches
  };
}

/**
 * PHASE 7 LIVE REVIEW WRITER
 *
 * Creates the validated Phase 7 review records in Airtable.
 * Maximum 10 records per Airtable request.
 *
 * Required Script Properties:
 * AIRTABLE_BASE_ID
 * AIRTABLE_TOKEN
 * AIRTABLE_REVIEW_TABLE_ID
 * PHASE7_WRITE_AUTHORIZATION = AUTHORIZE_PHASE7_REVIEW_CREATE
 */
function executePhase7ReviewWriter() {
  console.log('PHASE 7 LIVE REVIEW WRITER STARTED');

  const properties =
    PropertiesService.getScriptProperties();

  const baseId =
    properties.getProperty('AIRTABLE_BASE_ID');

  const token =
    properties.getProperty('AIRTABLE_TOKEN');

  const reviewTableId =
    properties.getProperty('AIRTABLE_REVIEW_TABLE_ID');

  const authorization =
    properties.getProperty('PHASE7_WRITE_AUTHORIZATION');

  if (
    authorization !==
    'AUTHORIZE_PHASE7_REVIEW_CREATE'
  ) {
    throw new Error(
      'Phase 7 write authorization is not armed.'
    );
  }

  if (!baseId || !token || !reviewTableId) {
    throw new Error(
      'Missing AIRTABLE_BASE_ID, AIRTABLE_TOKEN, or AIRTABLE_REVIEW_TABLE_ID.'
    );
  }

  const plan =
    buildPhase7ReviewWriterPlan_();

  if (
    !plan ||
    !plan.workflowValidation ||
    !plan.workflowValidation.valid
  ) {
    throw new Error(
      'Phase 7 workflow validation failed.'
    );
  }

  if (
    !Array.isArray(plan.batches) ||
    !plan.batches.length
  ) {
    throw new Error(
      'No Phase 7 review batches are available.'
    );
  }

  const url =
    'https://api.airtable.com/v0/' +
    baseId +
    '/' +
    reviewTableId;

  let totalCreated = 0;
  const batchResults = [];

  try {
    plan.batches.forEach(function(batch, index) {
      const batchValidation =
        validatePhase7ReviewWriterBatch_(batch);

      if (!batchValidation.valid) {
        throw new Error(
          'Batch ' +
          (index + 1) +
          ' validation failed: ' +
          batchValidation.errors.join(' | ')
        );
      }

      const response =
        UrlFetchApp.fetch(
          url,
          {
            method: 'post',
            contentType: 'application/json',
            headers: {
              Authorization:
                'Bearer ' + token
            },
            payload: JSON.stringify({
              records: batch,
              typecast: true
            }),
            muteHttpExceptions: true
          }
        );

      const responseCode =
        response.getResponseCode();

      const responseText =
        response.getContentText();

      if (
        responseCode < 200 ||
        responseCode >= 300
      ) {
        throw new Error(
          'Phase 7 Airtable batch ' +
          (index + 1) +
          ' failed with HTTP ' +
          responseCode +
          ': ' +
          responseText
        );
      }

      const responseData =
        JSON.parse(responseText);

      const createdCount =
        Array.isArray(responseData.records)
          ? responseData.records.length
          : 0;

      totalCreated += createdCount;

      batchResults.push({
        batchNumber: index + 1,
        requested: batch.length,
        created: createdCount,
        responseCode: responseCode
      });

      console.log(
        'Phase 7 batch ' +
        (index + 1) +
        ' created: ' +
        createdCount
      );
    });
  } finally {
    properties.deleteProperty(
      'PHASE7_WRITE_AUTHORIZATION'
    );
  }

  console.log(
    'Total Phase 7 review records created: ' +
    totalCreated
  );

  console.log(
    'PHASE 7 LIVE REVIEW WRITER COMPLETED'
  );

  return {
    batchesSubmitted: plan.batches.length,
    totalRequested: plan.createRecords.length,
    totalCreated: totalCreated,
    batchResults: batchResults,
    authorizationCleared: true
  };
}


function armPhase7WriteAuthorization() {
  const properties = PropertiesService.getScriptProperties();

  properties.setProperty(
    'PHASE7_WRITE_AUTHORIZATION',
    'AUTHORIZE_PHASE7_REVIEW_CREATE'
  );

  console.log('Phase 7 write authorization armed.');
}

