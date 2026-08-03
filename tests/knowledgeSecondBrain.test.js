const assert = require('assert');
const knowledge = require('../src/apps-script/knowledgeSecondBrain');

const entries = [
  {
    id: 'sop-1',
    title: 'Certified Mail SOP',
    type: 'SOP',
    module: 'Personal Credit',
    owner: 'CEO',
    status: 'ACTIVE',
    storageLocation: 'Google Drive/SOPs',
    summary: 'Mailing and evidence retention procedure',
    reviewDueAt: '2026-07-01T00:00:00Z'
  },
  {
    id: 'evidence-1',
    title: 'Certified receipt',
    type: 'EVIDENCE',
    module: 'Personal Credit',
    owner: 'CEO',
    status: 'REVIEW',
    storageLocation: 'Google Drive/Evidence',
    summary: 'USPS certified mail receipt',
    evidenceVerified: false
  },
  {
    id: 'policy-1',
    title: 'High-risk action policy',
    type: 'POLICY',
    module: 'Enterprise',
    owner: 'CEO',
    status: 'DRAFT',
    storageLocation: 'GitHub/Policies',
    summary: 'Executive approval boundary'
  }
];

const snapshot = knowledge.buildSnapshot({
  entries,
  links: [{ fromId: 'sop-1', toId: 'evidence-1', relationship: 'SUPPORTED_BY' }],
  nowIso: '2026-08-03T20:00:00Z'
});

assert.strictEqual(snapshot.totalEntries, 3);
assert.strictEqual(snapshot.sops, 1);
assert.strictEqual(snapshot.evidenceItems, 1);
assert.strictEqual(snapshot.overdueReviews, 1);
assert.strictEqual(snapshot.unverifiedEvidence, 1);
assert.strictEqual(snapshot.linkedRelationships, 1);
assert(snapshot.blockers.some((item) => item.includes('overdue')));
assert(snapshot.blockers.some((item) => item.includes('verification')));
assert.strictEqual(snapshot.governance.publishExternallyEnabled, false);
assert.strictEqual(snapshot.governance.deletePermanentlyEnabled, false);
assert.strictEqual(snapshot.governance.overwriteApprovedRecordEnabled, false);
assert.strictEqual(snapshot.governance.executiveApprovalRequiredForPolicies, true);
assert.strictEqual(snapshot.governance.verificationRequiredForEvidence, true);

const searchResults = knowledge.searchEntries(entries, 'certified', { module: 'Personal Credit' });
assert.strictEqual(searchResults.length, 2);
assert.strictEqual(knowledge.searchEntries(entries, '', { type: 'POLICY' }).length, 1);

const source = require('fs').readFileSync(require.resolve('../src/apps-script/knowledgeSecondBrain'), 'utf8');
[
  /publishExternallyEnabled:\s*false/,
  /deletePermanentlyEnabled:\s*false/,
  /overwriteApprovedRecordEnabled:\s*false/,
  /executiveApprovalRequiredForPolicies:\s*true/,
  /verificationRequiredForEvidence:\s*true/,
  /auditRequired:\s*true/
].forEach((pattern) => assert(pattern.test(source), `Missing governance control: ${pattern}`));

console.log('Knowledge Center and Second Brain validation passed.');
