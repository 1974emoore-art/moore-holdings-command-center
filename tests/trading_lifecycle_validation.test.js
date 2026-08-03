const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('apps-script/TradingLifecycle.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const result = sandbox.buildTradingLifecycle({
  lifecycleStage: 'PAPER_TRADING',
  research: [{ status: 'COMPLETE' }, { status: 'OPEN' }],
  watchlist: [{ status: 'ACTIVE' }, { status: 'PAUSED' }],
  theses: [{ summary: 'Test thesis', timeHorizon: '90 days', invalidationCondition: 'Breaks support' }],
  marketEvidence: [{ verificationStatus: 'VERIFIED' }, { verificationStatus: 'PENDING' }],
  risks: [{ status: 'OPEN' }],
  alerts: [{ status: 'TRIGGERED' }],
  paperTrades: [{ status: 'OPEN' }, { status: 'CLOSED', realizedPnl: 125 }],
  approvals: [{ status: 'PENDING' }],
  auditHistory: [{ id: 1 }],
  lessonsLearned: [{ note: 'Respect invalidation levels' }]
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(result.lifecycleStage === 'PAPER_TRADING', 'lifecycle stage missing');
assert(result.openResearchCount === 1, 'research count incorrect');
assert(result.activeWatchlistCount === 1, 'watchlist count incorrect');
assert(result.unverifiedEvidenceCount === 1, 'evidence verification incorrect');
assert(result.unresolvedRiskCount === 1, 'risk count incorrect');
assert(result.triggeredAlertCount === 1, 'alert count incorrect');
assert(result.openPaperTradeCount === 1, 'paper trade count incorrect');
assert(result.realizedPaperPnl === 125, 'paper P&L incorrect');
assert(result.pendingApprovalCount === 1, 'approval count incorrect');
assert(result.liveTradingEnabled === false, 'live trading must remain disabled');
assert(result.brokerOrderSubmissionEnabled === false, 'broker orders must remain disabled');
assert(result.moneyMovementEnabled === false, 'money movement must remain disabled');
assert(result.externalBrokerMessagingEnabled === false, 'broker messaging must remain disabled');
assert(result.executiveReviewRequired === true, 'executive review required');
assert(result.governedExecutionRequired === true, 'governed execution required');
assert(result.strictNoHypeNoGuarantee === true, 'no-hype control required');
assert(result.disclaimer.includes('No performance guarantee'), 'disclaimer missing');

const preview = sandbox.previewTradingAction({ type: 'PAPER_TRADE' });
assert(preview.status === 'PREVIEW_ONLY', 'action must remain preview-only');
assert(preview.liveExecutionEnabled === false, 'live execution must remain disabled');
assert(preview.requiresExecutiveApproval === true, 'approval must be required');

const prohibited = /(placeOrder|submitOrder|executeTrade|withdrawFunds|depositFunds|transferFunds)\s*\(/;
assert(!prohibited.test(source), 'prohibited live-trading call detected');

console.log('Trading lifecycle validation passed.');
