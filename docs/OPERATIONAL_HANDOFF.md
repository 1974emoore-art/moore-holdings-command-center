# Moore Holdings AI Command Center — Operational Handoff

## Production identity

- Repository: `1974emoore-art/moore-holdings-command-center`
- Protected branch: `main`
- Apps Script project: `10_VITKZtmyVRU1PXnomHw6oeNd1YGkJbrujKsCGurtyIKYXu9-UHUTF8`
- Production deployment: `AKfycbzXYZJv9gjhPFJpxPBizyci5Dp6ak0putViUSZ6Olurc_MhpZ1wmS9tfg20unaIKcszSw`
- Current repository baseline: Apps Script Version 59
- Verified production baseline: Apps Script Version 59
- Version 59 deployment verification run: `30711268426`
- Full seven-module health status: requires authenticated owner-session dashboard confirmation
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

## Verified production checkpoints

### GitHub-to-Apps-Script baseline — July 30, 2026

- GitHub deployment run: `30603339137`
- Apps Script production version: 32
- Phase 7 controlled dry run: passed
- Production review data after dry run: 21 total, 0 pending, 8 approved, 10 hold, 3 rejected
- Production record changes during dry run: zero

### Phase 10 evidence-driven V2 production — July 31, 2026

- Apps Script production version: 38
- GitHub commit: `fd8aff1a71cc56617cf87efb451e9a6fa80380ab`
- Approved execution function: `runApprovedPhase10V2CorrectionProduction`
- Promotion candidates received: 3
- Evidence-supported bureau-specific drafts: 5
- Blocked drafts: 0
- PDFs created: 5
- Failed: 0
- Skipped: 0
- Ready to print: 5
- Airtable records updated: 0
- Letters mailed automatically: 0
- Original documents and PDFs: preserved
- Airtable live writes: disarmed

The five generated packets cover Jefferson Capital Systems, LLC for Experian and Equifax, and MDG US INC for Experian, TransUnion, and Equifax. Physical printing, enclosure assembly, signature, certified mailing, and tracking entry remain separate fulfillment steps.


### Reliable source-page evidence gate — July 31, 2026

- Apps Script production version: 43
- GitHub commit: `74c229ff4cc9b98ca24bc68a1fbfdba9070372be`
- Phase 9 now joins held-account candidates to the live credit-report parser.
- Phase 10 packet approval requires a matching bureau, reliable account reference, valid source-report page, located report section, and MEDIUM or HIGH parser confidence.
- Missing, ambiguous, or LOW-confidence source evidence remains blocked.
- Previously generated Version 38 packets must be revalidated before printing or mailing.
- Airtable live writes remain disarmed.
- No correspondence or mailing action occurred during deployment.

### Unified Command Center core — August 1, 2026

- Verified production version: 59
- Version 59 source commit: `8cd8c5a5a0f81b1c4c1ba7c20b5e03d5cb862d5e`
- Deployment verification run: `30711268426`
- Connected dashboard cores: Personal Credit, Business Credit, Finance & Cash Flow, Turo Fleet, Real Estate, Trading Research, and Business Growth & Expansion
- Automatic owner-session System Health panel: implemented
- Pull-request validation run: `30696050234`
- Pull-request validation result: passed
- Open pull requests after merge: zero
- Airtable live writes: disarmed
- Governed external actions: zero

## Current controlled execution step

1. Open the authenticated production dashboard and allow the Version 59 System Health panel to run.
2. Record full operational health only if it reports **HEALTHY**, **7 / 7** modules, zero Airtable writes, zero trading execution, and zero business launches.
3. GitHub verifies deployment integrity only. Do not restore the unsupported external `scripts.run` health path; Google returns HTTP 403 outside the owner session.
4. If any dashboard value fails, keep live writes disarmed and follow `PRODUCTION_RECOVERY.md`.
5. Continue the separate collector-evidence review in issue #33 without acknowledging debt, sending correspondence, changing Airtable, or altering certified-mail tracking until account mapping is verified.


### Version 59 synchronized production contract — August 1, 2026

- Main production deployment: verified at Version 59
- Main deployment run: `30711268426`
- Owner-only API deployment: verified at Version 59
- Deployment-integrity run: `30711337039`
- Command Center health expectation: 59
- Phase 9/10 read-only preview expectation: 59
- CI prevents the two production-version expectations from diverging
- Airtable live writes remain disarmed
- Full seven-module operational health remains authenticated owner-session-only
