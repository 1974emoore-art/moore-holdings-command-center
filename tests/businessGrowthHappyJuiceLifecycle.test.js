const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('apps-script/businessGrowthHappyJuiceLifecycle.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

assert.equal(typeof sandbox.buildBusinessGrowthHappyJuiceLifecycle, 'function');

const result = sandbox.buildBusinessGrowthHappyJuiceLifecycle({
  ideas: [{ name: 'Happy Juice', status: 'ACTIVE', approvalStatus: 'APPROVED' }],
  products: [{
    name: 'Happy Juice Original', status: 'LAUNCHED', formulaStatus: 'COMPLETE',
    labelStatus: 'COMPLETE', packagingStatus: 'COMPLETE', complianceStatus: 'COMPLETE',
    unitCost: 3, targetPrice: 8
  }],
  customers: [{ id: 'c1' }],
  orders: [{ id: 'o1', status: 'OPEN' }],
  revenue: [{ amount: 100, status: 'CLEARED' }],
  expenses: [{ amount: 40, status: 'PAID' }],
  documents: [{ required: true, fileId: 'doc1' }],
  tasks: [{ status: 'DONE' }]
});

assert.equal(result.approvedIdeaCount, 1);
assert.equal(result.launchReadyProductCount, 1);
assert.equal(result.activeProductCount, 1);
assert.equal(result.openOrderCount, 1);
assert.equal(result.netCashFlow, 60);
assert.equal(result.controls.productLaunchExecutionEnabled, false);
assert.equal(result.controls.paymentExecutionEnabled, false);
assert.equal(result.controls.externalMessagingEnabled, false);
assert.equal(result.controls.executiveReviewRequired, true);
assert.ok(result.lifecycleCoverage.includes('exit'));
assert.ok(result.lifecycleCoverage.includes('retainedKnowledge'));

const unsafePatterns = [
  /sendEmail\s*\(/,
  /UrlFetchApp\.fetch\s*\(/,
  /createOrder\s*\(/,
  /chargePayment\s*\(/,
  /issueRefund\s*\(/,
  /launchProduct\s*\(/
];
unsafePatterns.forEach((pattern) => assert.equal(pattern.test(source), false, `Unsafe external action detected: ${pattern}`));

console.log('Business Growth and Happy Juice lifecycle validation passed.');
