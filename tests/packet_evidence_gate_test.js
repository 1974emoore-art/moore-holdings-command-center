function testPacketEvidenceGateAllowsExactBureauAndReferenceMatch() {
  const result = assessPacketEvidence({
    bureau: 'Experian',
    accountReference: 'ABCD-1234',
    sourceEntries: [
      {
        bureau: 'Experian',
        accountReference: 'XXXX1234',
        reported: true
      }
    ]
  });

  if (result.status !== 'READY_FOR_PHYSICAL_REVIEW') {
    throw new Error('A supported bureau/reference match should pass.');
  }
}

function testPacketEvidenceGateBlocksWrongBureau() {
  const result = assessPacketEvidence({
    bureau: 'TransUnion',
    accountReference: 'XXXX1234',
    sourceEntries: [
      {
        bureau: 'Experian',
        accountReference: 'XXXX1234',
        reported: true
      }
    ]
  });

  if (result.status !== 'BLOCKED_EVIDENCE_MISMATCH') {
    throw new Error('A different bureau must not satisfy the packet gate.');
  }
}

function testPacketEvidenceGateBlocksDifferentReference() {
  const result = assessPacketEvidence({
    bureau: 'Equifax',
    accountReference: 'XXXX1234',
    sourceEntries: [
      {
        bureau: 'Equifax',
        accountReference: 'XXXX9876',
        reported: true
      }
    ]
  });

  if (result.status !== 'BLOCKED_EVIDENCE_MISMATCH') {
    throw new Error('A different account reference must not satisfy the gate.');
  }
}

function testPacketEvidenceGateRejectsInsufficientVisibleSuffix() {
  const result = assessPacketEvidence({
    bureau: 'Experian',
    accountReference: '618XXXX',
    sourceEntries: [
      {
        bureau: 'Experian',
        accountReference: 'XXX',
        reported: true
      }
    ]
  });

  if (result.status !== 'BLOCKED_EVIDENCE_MISMATCH') {
    throw new Error('Short or ambiguous masked references must not match.');
  }
}

function testPacketEvidenceGateRequiresReportedTrue() {
  const result = assessPacketEvidence({
    bureau: 'TransUnion',
    accountReference: 'XXXX1234',
    sourceEntries: [
      {
        bureau: 'TransUnion',
        accountReference: 'XXXX1234',
        reported: false
      }
    ]
  });

  if (result.status !== 'BLOCKED_EVIDENCE_MISMATCH') {
    throw new Error('A non-reporting bureau entry must not pass.');
  }
}

function testPacketEvidenceGateHasNoSideEffects() {
  const result = assessPacketEvidence({});

  if (
    !result.readOnly ||
    result.airtableRecordsChanged !== 0 ||
    result.filesCreated !== 0 ||
    result.messagesSent !== 0 ||
    result.mailingStatusChanged !== false
  ) {
    throw new Error('Packet evidence assessment must remain read-only.');
  }
}
