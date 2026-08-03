/** Release 3 governed preview and approval-queue controls for credit lifecycle workspaces. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const chain = [
    'applyDashboardReviewRoutingPatch_','applyDashboardNotificationsPatch_',
    'applyDashboardHealthDrilldownPatch_','applyDashboardKpiNavigationPatch_',
    'applyDashboardHashRoutingPatch_','applyDashboardMobileNavigationPatch_',
    'applyDashboardDailyBriefingPatch_','applyDashboardActivityRecoveryPatch_',
    'applyDashboardOperationsTimelinePatch_','applyDashboardExecutiveWorkQueuePatch_',
    'applyDashboardProgressDeadlinePatch_','applyCreditLifecycleDashboardPatch_'
  ];
  let output = source;
  chain.forEach(function(name) { if (typeof this[name] === 'function') output = this[name](output); }, this);
  return HtmlService.createHtmlOutput(applyCreditLifecycleDashboardActionsPatch_(output)).setTitle('Moore Holdings Credit Agent');
}

function applyCreditLifecycleDashboardActionsPatch_(source) {
  let patched = String(source || '');
  const oldRender = "card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div><button class=\"btn-primary\">Review</button>';const notes=card.querySelectorAll('.card-note');card.querySelector('.card-label').textContent=record.priority+' — '+record.lifecycleStage;notes[0].textContent=record.title;notes[1].textContent=record.type+' • '+record.status+' • Preview required before action';card.querySelector('button').onclick=function(){activateCommandCenterModule(moduleName==='BUSINESS_CREDIT'?'businessCreditModule':'personalCreditModule',false);};attention.appendChild(card);";
  const newRender = "card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div><div class=\"action-buttons\"><button class=\"btn-primary\" data-credit-action=\"preview\">Preview</button><button class=\"btn-gold\" data-credit-action=\"queue\">Queue for Approval</button><button class=\"btn-neutral\" data-credit-action=\"open\">Open Module</button></div>';const notes=card.querySelectorAll('.card-note');card.querySelector('.card-label').textContent=record.priority+' — '+record.lifecycleStage;notes[0].textContent=record.title;notes[1].textContent=record.type+' • '+record.status+' • No execution without executive approval';card.querySelector('[data-credit-action=\"preview\"]').onclick=function(){runCreditLifecycleGovernedPreview(moduleName,record,false,card);};card.querySelector('[data-credit-action=\"queue\"]').onclick=function(){runCreditLifecycleGovernedPreview(moduleName,record,true,card);};card.querySelector('[data-credit-action=\"open\"]').onclick=function(){activateCommandCenterModule(moduleName==='BUSINESS_CREDIT'?'businessCreditModule':'personalCreditModule',false);};attention.appendChild(card);";
  if (patched.indexOf(oldRender) === -1) throw new Error('Credit lifecycle action-card anchor missing.');
  patched = patched.replace(oldRender, newRender);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function buildCreditLifecycleDashboardRequest(moduleName,record){return {module:moduleName,record:{recordId:record.recordId,sourceRecordId:record.sourceRecordId||'',type:record.type,title:record.title,lifecycleStage:record.lifecycleStage,status:record.status,priority:record.priority,dueAt:record.dueAt||null},reason:'Prepare governed credit lifecycle work for executive review.'};}\n\n" +
    "    function renderCreditLifecycleGovernedResult(card,result){if(!card)return;let status=card.querySelector('.credit-governed-result');if(!status){status=document.createElement('div');status.className='card-note credit-governed-result';card.appendChild(status);}const mode=result&&result.mode?result.mode:'UNKNOWN';const action=result&&result.governedAction?result.governedAction:{};status.textContent=mode+' — '+(action.actionType||action.status||'Governed action prepared')+'. Approval performed: no. Execution performed: no.';}\n\n" +
    "    function runCreditLifecycleGovernedPreview(moduleName,record,queueRequested,card){const request=buildCreditLifecycleDashboardRequest(moduleName,record);const runner=google.script.run.withSuccessHandler(function(result){renderCreditLifecycleGovernedResult(card,result);if(queueRequested===true&&typeof loadGovernedActionQueue==='function')loadGovernedActionQueue();showMessage(queueRequested===true?'Credit work queued for executive approval.':'Credit work preview created.','success');}).withFailureHandler(function(error){showMessage(error&&error.message?error.message:String(error),'error');});if(queueRequested===true)runner.queueCreditLifecycleWorkForApproval(request);else runner.previewCreditLifecycleWork(request);}\n\n" +
    scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Credit lifecycle actions script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
