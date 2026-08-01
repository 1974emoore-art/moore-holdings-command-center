# Moore Holdings AI Command Center — Official Save Point

**Verified:** August 1, 2026 (America/Chicago)  
**Authoritative branch:** `main`  
**Code checkpoint before this record:** `c1467a6c294d8967deca55f7f742a777a4e779a7`  
**Production Apps Script version:** Version 44  
**Operating rule:** Resume from this file. Do not rebuild completed phases or restart manual file-by-file Apps Script inspection.

## Completed and Preserved

The following work is complete and already represented in repository history:

- Phase 7 controlled batch processing and review workflow.
- Original artifact preservation.
- Bureau-specific, evidence-driven packet logic.
- Masked account references.
- Collector deadline classification with invalid-date blocking.
- Blocking of unsupported mail-ready packets.
- Phase 10 packet evidence matching.
- Phase 9 source-report provenance requirements.
- Reliable source-page and parser-confidence requirements.
- Protected owner-only aggregate Phase 9/10 preview bridge.
- Validation-enforced boundaries of zero Airtable writes, zero record changes, zero file/PDF creation, zero messages or mailing, and zero payments.
- Production web deployment preserved at Version 44.

Relevant merged checkpoints include:

- `56bbf915` — block unsupported mail-ready packets.
- `dbb9dfdb` — enforce Phase 10 packet evidence matching.
- `7fb7e119` — require Phase 9 source-report provenance.
- `74c229ff` — require reliable source pages and parser confidence.
- `272f008a` — record Version 43 production handoff.
- `4bf02b7b` — add protected aggregate-only Phase 9/10 preview bridge.
- `2ee82ebf`, `7930745d`, and `c1467a6c` — correct and finalize the protected preview invocation path.

## Verified Safety State

During this work:

- Airtable records changed: **0**
- Phase 8 decisions changed: **0**
- Files/PDFs created: **0**
- Letters mailed: **0**
- Messages sent: **0**
- Payments authorized: **0**

No live data correction should occur until the matching defect below is corrected and regression-tested.

## Current External Blocker

The Version 44 aggregate preview could not be remotely executed because Google returned:

> Unable to run script function. Please make sure you have permission to run the script function.

The command syntax and deployment path were corrected. This remaining failure is a Google Apps Script execution-authorization barrier, not evidence that the completed Apps Script cleanup was lost or incomplete. Do not create additional deployments merely to repeat this test.

## Read-Only Held-Account Findings

The Phase 7 Review table currently contains **10 held records**, although the earlier working reference was six.

Verified grouping:

- 3 missing account name or number.
- 3 with no meaningful existing match.
- 2 possible-existing-account reviews.
- 2 creditor-and-supporting-fields match reviews.

Confirmed data-integrity findings:

1. A Jefferson Capital candidate was incorrectly proposed against a Celtic Bank / Surge record.
2. An Affirm candidate was incorrectly proposed against an SC Department of Social Services child-support record.
3. The MDG USA / MDG US proposed match points to the correct MDG record and must remain supported.
4. Kovo / The Aligned Company requires evidence-based alias handling and must remain held unless reliable account evidence supports the relationship.
5. Current is a legitimate positive tradeline; do not blacklist it as parser contamination.
6. The Aligned Company may be associated with Kovo; do not blacklist it without evidence.

## Exact Resume Task

Resume with the narrow matching-integrity correction:

1. Locate the Phase 6 candidate scoring and role-validation logic used by Phase 7.
2. Make creditor/account-identity conflicts a hard blocker so balance or bureau similarities cannot produce cross-creditor matches.
3. Preserve controlled normalization for genuine name variants such as MDG USA / MDG US.
4. Add regression coverage for:
   - Jefferson must not match Celtic Bank / Surge.
   - Affirm must not match SC Department of Social Services.
   - MDG variants may match the verified MDG record.
   - Kovo / The Aligned Company remains held without reliable account evidence.
5. Run repository validation and GitHub checks.
6. Prepare the focused change for review.
7. Only after the correction is validated, re-run the read-only held-account and five V2 packet-candidate review.
8. Keep Airtable writes, PDFs, email, mailing, and payments disabled unless separately and specifically authorized at the required execution gate.

## Completion Boundary

Do only work that directly advances the Command Center toward completion. Do not add side features, recreate completed work, mutate production data, or repeat the failed Google execution-deployment experiments.
