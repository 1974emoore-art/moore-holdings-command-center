# Moore Holdings AI Command Center — Operational Handoff

## Production identity

- Repository: `1974emoore-art/moore-holdings-command-center`
- Protected branch: `main`
- Apps Script project: `10_VITKZtmyVRU1PXnomHw6oeNd1YGkJbrujKsCGurtyIKYXu9-UHUTF8`
- Production deployment: `AKfycbzXYZJv9gjhPFJpxPBizyci5Dp6ak0putViUSZ6Olurc_MhpZ1wmS9tfg20unaIKcszSw`
- Verified production baseline: Apps Script Version 32
- Live-write default: disarmed

## Normal operating path

1. Make source changes on a dedicated GitHub branch.
2. Open a pull request.
3. Require the Apps Script validation workflow to pass.
4. Merge the validated pull request into `main`.
5. Run the manual production deployment workflow.
6. Require the workflow to create an immutable version and verify that the existing production deployment points to it.
7. Run `runPhase7FullSequence()` in dry-run mode.
8. Confirm production totals remain unchanged before considering any live-write approval.

## Automated controls

### Daily health check

The Command Center Production Health Check runs daily and verifies:

- protected authorization availability,
- Apps Script project mapping,
- immutable production deployment version, and
- live dashboard reachability.

A failure opens or updates one GitHub production incident. A later successful check records recovery and closes that incident.

### Deployment verification

The production workflow independently checks the deployment table after redeployment. A green workflow means the existing production deployment ID actually points to the newly created immutable version.

### Rollback

Rollback is manual and approval-gated. It requires:

- an existing immutable target version,
- the exact confirmation word `ROLLBACK`, and
- an executive reason.

Rollback preserves the existing production deployment ID and independently verifies the restored version.

## Approval boundaries

Separate executive approval is required before:

- any production deployment,
- any production rollback,
- arming Airtable live writes,
- changing protected authorization or permissions, or
- deleting or replacing production data.

Routine validation, dry runs, health checks, issue updates, documentation, and pull-request preparation remain non-writing or reversible operating work.

## Incident response

Follow [PRODUCTION_RECOVERY.md](PRODUCTION_RECOVERY.md). While a production incident is open:

- do not arm Airtable live writes,
- do not edit Apps Script production source in the browser,
- do not create a replacement deployment ID, and
- do not bypass failed verification.

## Official production checkpoint

The first fully verified GitHub-to-Apps-Script production release completed on July 30, 2026:

- GitHub deployment run: `30603339137`
- Apps Script production version: `32`
- Phase 7 controlled dry run: passed
- Production review data after dry run: 21 total, 0 pending, 8 approved, 10 hold, 3 rejected
- Production record changes during dry run: zero
