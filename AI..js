/**
 * ============================================================
 * Moore Holdings AI Command Center
 * Shared Engine
 * AI.gs
 * Version: 1.0
 * ============================================================
 *
 * Purpose:
 * Central AI services used by all Command Center modules.
 *
 * NOTE:
 * Stage 2 only establishes the foundation.
 * No existing Credit Module code is modified.
 *
 * ============================================================
 */
function getAIServiceStatus() {
  return {
    service: "AI",
    status: "Ready",
    version: SHARED_ENGINE_CONFIG.VERSION
  };
}

function buildSharedPriorityActions_(
  missingData,
  possibleDuplicates,
  bureauIssues,
  creditorRoleIssues
) {
  const actions = [];

  missingData = missingData || [];
  possibleDuplicates = possibleDuplicates || [];
  bureauIssues = bureauIssues || [];
  creditorRoleIssues = creditorRoleIssues || [];

  // Priority actions for possible duplicate accounts
  possibleDuplicates.forEach(function (item) {
    const accountA = item.accountA || "Unknown account";
    const accountB = item.accountB || "Unknown account";
    const confidence = item.confidence || "Review required";
    const reasons = Array.isArray(item.reasons)
      ? item.reasons.join("; ")
      : item.reasons || "Similar account information detected";
const evidence = "Duplicate score: " + (item.score || 0) + "; " + reasons;
    actions.push({
      category: "Possible Duplicate",
      severity: "HIGH",
      score: 100,
      accountName: accountA + " / " + accountB,
      issue: "Two records may represent the same credit account.",
      whyItMatters:
        "Duplicate records can distort account totals, balances, dispute history, and future agent recommendations.",
      recommendedAction:
        "Compare both Airtable records and the original credit reports. Merge or remove a record only after confirming they represent the same account.",
      details: evidence,
      confidence: confidence,
      recordIds: [item.recordAId, item.recordBId].filter(function (id) {
        return Boolean(id);
      })
    });
  });

  // Priority actions for bureau inconsistencies
  bureauIssues.forEach(function (item) {
    actions.push({
      category: "Bureau Inconsistency",
      severity: "HIGH",
      score: 90,
      accountName: item.accountName || "Unknown account",
      issue: item.issue || "Conflicting bureau information detected.",
      whyItMatters:
        "Conflicting information between Experian, TransUnion, and Equifax may support further investigation or dispute preparation.",
      recommendedAction:
        "Compare the account across all three current credit reports. Confirm balances, status, dates, ownership, and account numbers before selecting the next action.",
      details: item.issue || "",
evidence: item.details || "",
      confidence: "Review required",
      recordIds: item.recordId ? [item.recordId] : []
    });
  });

  // Priority actions for creditor-role problems
  creditorRoleIssues.forEach(function (item) {
    const issueText =
      item.issue ||
      item.message ||
      item.reason ||
      "The original creditor or debt-buyer role needs clarification.";

    actions.push({
      category: "Creditor Role",
      severity: "MEDIUM-HIGH",
      score: 80,
      accountName: item.accountName || "Unknown account",
      issue: issueText,
      whyItMatters:
        "Incorrect creditor roles can cause the wrong company to receive a letter or the wrong dispute strategy to be used.",
      recommendedAction:
        "Verify the original creditor, current owner, debt buyer, and collection agency before preparing correspondence.",
      details: issueText,
evidence: item.details || "",
      confidence: "Review required",
      recordIds: item.recordId ? [item.recordId] : []
    });
  });

  // Priority actions for missing account data
  missingData.forEach(function (item) {
    const missingFields = Array.isArray(item.missingFields)
      ? item.missingFields
      : [];

    const fieldList =
      missingFields.length > 0
        ? missingFields.join(", ")
        : "Required account information";

    actions.push({
      category: "Missing Data",
      severity: "MEDIUM",
      score: 60 + Math.min(missingFields.length, 10),
      accountName: item.accountName || "Unknown account",
      issue: "Missing fields: " + fieldList,
      whyItMatters:
        "Incomplete records weaken comparisons, deadline tracking, document generation, and automated recommendations.",
      recommendedAction:
        "Use the latest original credit reports and supporting documents to complete the missing Airtable fields, then run the scanner again.",
      details: fieldList,
     evidence: fieldList,
      confidence: "Confirmed missing data",
      recordIds: item.recordId ? [item.recordId] : []
    });
  });

  // Highest-value actions appear first.
  actions.sort(function (a, b) {
    return b.score - a.score;
  });

  // Add visible priority numbers after sorting.
  return actions.map(function (action, index) {
    action.priority = index + 1;
    return action;
  });
}