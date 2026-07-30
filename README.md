# moore-holdings-command-center
Moore Holdings AI Command Center Operating System

## Phase 7 review workflow

The repository now includes a controlled Phase 7 orchestration entry point named runPhase7FullSequence.

### Default execution
- Run the workflow in dry-run mode by default.
- No Airtable writes are sent unless liveMode is explicitly enabled and approved.

### How to run it
1. Open the Apps Script project and run runPhase7FullSequence from the script editor, or use the dashboard button labeled "Run Phase 7 Review".
2. The workflow will:
   - build the full Phase 7 batch plan,
   - build the review queue,
   - build the Airtable review workflow,
   - validate every stage,
   - stop early if validation or data issues are found.
3. Review the execution log and returned summary before enabling live writes.

### Live mode
- Live mode requires both liveMode: true and approved: true.
- The orchestrator will only write to Airtable after those conditions are met.
- Do not enable live writes until the dry-run summary is reviewed and the required Airtable properties are configured.
