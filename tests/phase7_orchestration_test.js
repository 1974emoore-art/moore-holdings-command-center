function testPhase7OrchestrationDefaultDryRun() {
  const result = runPhase7FullSequence({ liveMode: false });
  if (!result || result.mode !== 'dry-run') {
    throw new Error('Expected dry-run mode by default.');
  }
  if (result.summary && result.summary.liveWritesRequested === true) {
    throw new Error('Live writes should not be requested in dry-run mode.');
  }
  if (!result.summary || !result.summary.completed) {
    throw new Error('Phase 7 sequence should complete.');
  }
}

function testPhase7OrchestrationLiveModeRequiresApproval() {
  const result = runPhase7FullSequence({ liveMode: true, approved: false });
  if (!result || result.mode !== 'blocked') {
    throw new Error('Live mode should be blocked without approval.');
  }
}

function testPhase7OrchestrationApprovedLiveModeRequiresSeparateAuthorization() {
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('PHASE7_WRITE_AUTHORIZATION');

  const result = runPhase7FullSequence({
    liveMode: true,
    approved: true
  });

  if (!result || result.mode !== 'blocked') {
    throw new Error(
      'Approved live mode must remain blocked until authorization is separately armed.'
    );
  }

  if (!result.summary || result.summary.completed) {
    throw new Error('Blocked live mode must not report completion.');
  }
}


function testPhase7ReviewIdentityKeyIsStableAcrossClassificationChanges() {
  const first = buildPhase7ReviewIdentityKey_({
    'Account Name': 'Jefferson Capital Ll',
    'Account Number': '6900',
    'Action Stage': 'High Priority Match Review',
    'Violation Tag': 'CREDITOR_AND_SUPPORTING_FIELDS_MATCH'
  });
  const rerun = buildPhase7ReviewIdentityKey_({
    'Account Name': ' Jefferson-Capital LL ',
    'Account Number': '6900',
    'Action Stage': 'Match Review',
    'Violation Tag': 'POSSIBLE_EXISTING_ACCOUNT'
  });

  if (first !== rerun) {
    throw new Error('Classification drift must not change review identity.');
  }
}


function testPhase7ReconciliationPreservesHumanDecision() {
  const candidate = {
    fields: {
      'Account Name': 'Atlas',
      'Account Number': '1107',
      'Status': 'Pending',
      'Action Stage': 'Match Review',
      'Violation Tag': 'POSSIBLE_EXISTING_ACCOUNT'
    }
  };
  const existing = {
    id: 'recExisting',
    fields: {
      'Account Name': 'Atlas',
      'Account Number': '1107',
      'Status': 'Rejected',
      'Action Stage': 'Match Review',
      'Violation Tag': 'POSSIBLE_EXISTING_ACCOUNT'
    }
  };

  const result = reconcilePhase7ReviewCreates_([candidate], [existing]);

  if (result.createRecords.length !== 0) {
    throw new Error('A rerun must not create a duplicate review.');
  }
  if (result.skippedExisting.length !== 1) {
    throw new Error('Expected one preserved existing review.');
  }
  if (result.skippedExisting[0].preservedStatus !== 'Rejected') {
    throw new Error('The existing human decision must be preserved.');
  }
}


function testPhase7ReconciliationCreatesOnlyNewIdentityOnce() {
  const candidate = {
    fields: {
      'Account Name': 'New Account',
      'Account Number': '1234',
      'Status': 'Pending',
      'Action Stage': 'Match Review',
      'Violation Tag': 'POSSIBLE_EXISTING_ACCOUNT'
    }
  };

  const result = reconcilePhase7ReviewCreates_(
    [candidate, candidate],
    []
  );

  if (result.createRecords.length !== 1) {
    throw new Error('Duplicate candidates in one run must collapse to one create.');
  }
  if (result.skippedExisting.length !== 1) {
    throw new Error('The second candidate should be recorded as skipped.');
  }
}
