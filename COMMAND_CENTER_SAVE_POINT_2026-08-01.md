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

**Phase 6 is completed and closed. Do not reopen, rewrite, or re-investigate Phase 6.**

Resume at the Version 44 production checkpoint with the unfinished review work:

1. Continue the read-only Phase 9 held-account promotion review.
2. Treat the two observed cross-creditor proposals as rejected review findings; do not alter completed Phase 6 code solely because those held items require human/evidence review.
3. Preserve the supported MDG USA / MDG US relationship.
4. Keep Kovo / The Aligned Company held unless reliable source evidence establishes the relationship.
5. Revalidate the five V2 packet candidates through the completed Phase 9 provenance and Phase 10 evidence gates.
6. Produce an aggregate-only review result when Google execution authorization permits.
7. Keep unsupported packets on hold.
8. Keep Airtable writes, PDFs, email, mailing, and payments disabled unless separately and specifically authorized at the required execution gate.

## Completion Boundary

Do only work that directly advances the Command Center toward completion. Do not add side features, recreate completed work, mutate production data, or repeat the failed Google execution-deployment experiments.
