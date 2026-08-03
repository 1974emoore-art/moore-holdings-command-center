function buildAutomationAndAiAgentsLifecycle(input) {
  const data = input || {};
  const agents = Array.isArray(data.agents) ? data.agents : [];
  const workflows = Array.isArray(data.workflows) ? data.workflows : [];
  const integrations = Array.isArray(data.integrations) ? data.integrations : [];
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];
  const auditHistory = Array.isArray(data.auditHistory) ? data.auditHistory : [];

  const activeAgents = agents.filter(a => a.status === 'ACTIVE').length;
  const approvalAwareAgents = agents.filter(a => a.requiresExecutiveApproval === true).length;
  const scheduledWorkflows = workflows.filter(w => w.scheduleEnabled === true).length;
  const healthyIntegrations = integrations.filter(i => i.status === 'HEALTHY').length;
  const failedIntegrations = integrations.filter(i => i.status === 'FAILED').length;
  const openIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
  const recoveryReady = incidents.filter(i => i.recoveryPlan && i.recoveryVerified === true).length;

  const blockers = [];
  if (!agents.length) blockers.push('No AI agents are registered.');
  if (agents.some(a => !a.owner)) blockers.push('One or more AI agents have no accountable owner.');
  if (agents.some(a => a.highRisk === true && a.requiresExecutiveApproval !== true)) {
    blockers.push('A high-risk AI agent is missing mandatory executive approval controls.');
  }
  if (workflows.some(w => w.enabled === true && !w.lastVerifiedAt)) {
    blockers.push('An enabled workflow has not been verified.');
  }
  if (failedIntegrations > 0) blockers.push('One or more integrations are failed.');
  if (openIncidents > 0 && recoveryReady < openIncidents) {
    blockers.push('One or more open incidents lack a verified recovery plan.');
  }

  let nextRecommendedAction = 'Review automation performance and optimize the highest-value workflow.';
  if (!agents.length) nextRecommendedAction = 'Register the first governed AI agent and assign an accountable owner.';
  else if (failedIntegrations > 0) nextRecommendedAction = 'Repair failed integrations and verify recovery before re-enabling dependent workflows.';
  else if (blockers.length) nextRecommendedAction = blockers[0];

  return {
    lifecycleStage: data.lifecycleStage || 'OPERATIONS',
    activeAgents,
    approvalAwareAgents,
    scheduledWorkflows,
    totalIntegrations: integrations.length,
    healthyIntegrations,
    failedIntegrations,
    openIncidents,
    recoveryReady,
    auditEvents: auditHistory.length,
    blockers,
    nextRecommendedAction,
    governance: {
      previewRequired: true,
      executiveApprovalRequired: true,
      verificationRequired: true,
      auditRequired: true,
      directHighRiskExecutionEnabled: false,
      directExternalMessagingEnabled: false,
      directPaymentEnabled: false,
      directDeletionEnabled: false
    },
    lifecycleCoverage: {
      agentRegistry: true,
      workflowScheduling: true,
      integrations: true,
      approvalAwareness: true,
      monitoring: true,
      failureDetection: true,
      recoveryPlanning: true,
      verification: true,
      auditHistory: true,
      optimization: true,
      retirementAndLessons: true
    }
  };
}

if (typeof module !== 'undefined') {
  module.exports = { buildAutomationAndAiAgentsLifecycle };
}
