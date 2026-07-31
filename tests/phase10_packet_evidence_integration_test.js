function testPhase10PacketEvidenceIntegrationPassesMappedSource() {
  const entries = buildPhase10PacketSourceEntries_(
    {
      sourceEntries: [
        {
          bureau: 'Experian',
          accountNumberMasked: 'XXXX1234',
          reported: true
        }
      ]
    },
    {}
  );

  const result = assessPacketEvidence({
    bureau: 'Experian',
    accountReference: 'ABCD1234',
    sourceEntries: entries
  });

  if (result.status !== 'READY_FOR_PHYSICAL_REVIEW') {
    throw new Error('Mapped Phase 10 source evidence should pass.');
  }
}

function testPhase10PacketEvidenceIntegrationBlocksMissingSource() {
  const entries = buildPhase10PacketSourceEntries_({}, {});

  const result = assessPacketEvidence({
    bureau: 'Equifax',
    accountReference: 'XXXX1234',
    sourceEntries: entries
  });

  if (result.status !== 'BLOCKED_EVIDENCE_MISMATCH') {
    throw new Error('Phase 10 must block when source entries are missing.');
  }
}

function testPhase10PacketEvidenceIntegrationBlocksNonReportingBureau() {
  const entries = buildPhase10PacketSourceEntries_(
    {},
    {
      bureauEvidence: [
        {
          creditBureau: 'TransUnion',
          partialAccountNumber: 'XXXX1234',
          reportingStatus: 'not reported'
        }
      ]
    }
  );

  const result = assessPacketEvidence({
    bureau: 'TransUnion',
    accountReference: 'XXXX1234',
    sourceEntries: entries
  });

  if (result.status !== 'BLOCKED_EVIDENCE_MISMATCH') {
    throw new Error('A non-reporting bureau must remain blocked.');
  }
}
