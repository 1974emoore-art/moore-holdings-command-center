const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('ZZZZZZZZZZ_RealEstateLifecycleModel.js', 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

const result = context.buildRealEstateLifecycle({
  market: 'Gatlinburg',
  propertyName: 'Cabin Target',
  stage: 'RESEARCH',
  monthlyRevenue: 4200,
  monthlyMortgage: 1800,
  monthlyOperatingExpenses: 900,
  monthlyReserves: 300,
  cashInvested: 40000,
  marketResearchComplete: true,
  compsVerified: true,
  underwritingComplete: true,
  financingPlanComplete: true,
  strRulesVerified: true,
  maintenanceCurrent: true,
  insuranceCurrent: true,
  requiredDocumentsComplete: true
});

assert.strictEqual(result.monthlyNetCashFlow, 1200);
assert.strictEqual(result.annualCashFlow, 14400);
assert.strictEqual(result.cashOnCashReturn, 36);
assert.strictEqual(result.canSubmitOffer, false);
assert.strictEqual(result.canExecutePurchase, false);
assert.strictEqual(result.canSendExternalMessage, false);
assert.strictEqual(result.requiresExecutiveReview, true);
assert.strictEqual(result.requiresGovernedExecution, true);
assert.ok(Array.isArray(result.blockers));
console.log('Real Estate Lifecycle Validation passed');
