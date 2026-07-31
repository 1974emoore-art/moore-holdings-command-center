# Command Center Production Recovery

Use this runbook only when GitHub opens the issue **[Production Incident] Command Center health check failed**.

## Safety rules

- Keep Airtable live-write authorization disarmed.
- Do not edit production source directly in the Apps Script browser editor.
- Do not create a new deployment ID.
- Preserve the existing production deployment ID.
- Fix source or workflow defects through a reviewed GitHub pull request.

## Recovery order

1. Open the failed health-check run linked in the incident.
2. Identify the first failed verification:
   - authorization,
   - project mapping,
   - deployment version, or
   - live dashboard HTTP response.
3. If authorization failed, restore only the protected `CLASPRC_JSON` GitHub secret.
4. If project mapping failed, verify `.clasp.json` still points to the approved production Script ID.
5. If deployment verification failed, inspect the latest production deployment workflow before rerunning it.
6. If dashboard reachability failed, confirm the existing deployment ID still serves the web app.
7. Make code or workflow changes through a branch and pull request.
8. Run the read-only health check again.
9. Confirm the incident closes automatically only after every verification passes.

## Approved production identifiers

- Apps Script project: `10_VITKZtmyVRU1PXnomHw6oeNd1YGkJbrujKsCGurtyIKYXu9-UHUTF8`
- Production deployment: `AKfycbzXYZJv9gjhPFJpxPBizyci5Dp6ak0putViUSZ6Olurc_MhpZ1wmS9tfg20unaIKcszSw`

## Escalation rule

If the same check fails twice, stop automated deployment activity and investigate the exact failing log. Never bypass the verification or enable live Airtable writes to force progress.
