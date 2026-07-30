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
