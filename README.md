# moore-holdings-command-center

Moore Holdings AI Command Center Operating System

## Production operations

- [Operational handoff and verified checkpoints](docs/OPERATIONAL_HANDOFF.md)
- [Production recovery runbook](docs/PRODUCTION_RECOVERY.md)
- Verified production baseline: Apps Script Version 59
- Full seven-module operational health is confirmed only inside the authenticated owner dashboard when it reports **HEALTHY** across **7 / 7** modules.
- Production deployments are manual, immutable, and independently verified.
- Production rollback is manual, confirmation-gated, and preserves the existing deployment ID.
- Daily health checks are read-only and create a single managed incident on failure.
- Airtable live-write authorization remains disarmed by default.

## Phase 7 review workflow

The repository includes a controlled Phase 7 orchestration entry point named `runPhase7FullSequence`.

### Default execution

- Run the workflow in dry-run mode by default.
- No Airtable writes are sent unless `liveMode` is explicitly enabled and approved.

### How to run it

1. Open the Apps Script project and run `runPhase7FullSequence` from the script editor, or use the dashboard button labeled **Run Phase 7 Review**.
2. The workflow will:
   - build the full Phase 7 batch plan,
   - build the review queue,
   - build the Airtable review workflow,
   - validate every stage, and
   - stop early if validation or data issues are found.
3. Review the execution log and returned summary before enabling live writes.

### Live mode

- Live mode requires both `liveMode: true` and `approved: true`.
- The orchestrator writes to Airtable only after those conditions are met.
- Do not enable live writes until the dry-run summary is reviewed and the required Airtable properties are configured.
