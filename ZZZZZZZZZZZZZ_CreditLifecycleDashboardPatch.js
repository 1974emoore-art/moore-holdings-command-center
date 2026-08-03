/** Release 3 read-only Personal and Business Credit lifecycle workspaces. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const chain = [
    'applyDashboardReviewRoutingPatch_','applyDashboardNotificationsPatch_',
    'applyDashboardHealthDrilldownPatch_','applyDashboardKpiNavigationPatch_',
    'applyDashboardHashRoutingPatch_','applyDashboardMobileNavigationPatch_',
    'applyDashboardDailyBriefingPatch_','applyDashboardActivityRecoveryPatch_',
    'applyDashboardOperationsTimelinePatch_','applyDashboardExecutiveWorkQueuePatch_',
    'applyDashboardProgressDeadlinePatch_'
  ];
  let output = source;
  chain.forEach(function(name) { if (typeof this[name] === 'function') output = this[name](output); }, this);
  return HtmlService.createHtmlOutput(applyCreditLifecycleDashboardPatch_(output)).setTitle('Moore Holdings Credit Agent');
}

function applyCreditLifecycleDashboardPatch_(source) {
  let patched = String(source || '');
  const businessAnchor = '    <section id="businessCreditModule"';
  const personalPanel = '    <section id="personalCreditLifecycleWorkspace" class="panel" style="margin-bottom:20px;">\n' +
    '      <div class="panel-header"><div><h2>Personal Credit Lifecycle</h2><div class="card-note">Reports, accounts, disputes, letters, evidence, certified mail, responses, deadlines, and follow-up</div></div><button class="btn-primary" onclick="refreshCreditLifecycleWorkspace(\'PERSONAL_CREDIT\')">Refresh Lifecycle</button></div>\n' +
    '      <div id="personalCreditLifecycleSummary" class="cards" style="padding:18px;margin-bottom:0;"></div>\n' +
    '      <div id="personalCreditLifecycleAttention" class="cards" style="padding:0 18px 18px;margin-bottom:0;"><div class="empty">Load Personal Credit data to build the lifecycle queue.</div></div>\n' +
    '    </section>\n\n' + businessAnchor;
  if (patched.indexOf(businessAnchor) === -1) throw new Error('Business Credit module anchor missing.');
  patched = patched.replace(businessAnchor, personalPanel);

  const financeAnchor = '    <section id="financeModule"';
  const businessPanel = '    <section id="businessCreditLifecycleWorkspace" class="panel" style="margin-bottom:20px;">\n' +
    '      <div class="panel-header"><div><h2>Business Credit Lifecycle</h2><div class="card-note">Foundation, D-U-N-S, vendors, tradelines, reporting, cards, funding readiness, applications, growth, and exit</div></div><button class="btn-primary" onclick="refreshCreditLifecycleWorkspace(\'BUSINESS_CREDIT\')">Refresh Lifecycle</button></div>\n' +
    '      <div id="businessCreditLifecycleSummary" class="cards" style="padding:18px;margin-bottom:0;"></div>\n' +
    '      <div id="businessCreditLifecycleAttention" class="cards" style="padding:0 18px 18px;margin-bottom:0;"><div class="empty">Load Business Credit data to build the lifecycle queue.</div></div>\n' +
    '    </section>\n\n' + financeAnchor;
  if (patched.indexOf(financeAnchor) === -1) throw new Error('Finance module anchor missing.');
  patched = patched.replace(financeAnchor, businessPanel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function collectCreditLifecycleRecords(moduleName) {\n" +
    "      const business=moduleName==='BUSINESS_CREDIT'; const rows=Array.prototype.slice.call(document.querySelectorAll(business?'#businessCreditRows tr':'#personalReviewQueue tr, #reviewRows tr, #personalCreditRows tr'));\n" +
    "      return rows.filter(function(row){return row.querySelectorAll('td').length>1;}).map(function(row,index){const cells=row.querySelectorAll('td');const text=(row.textContent||'').replace(/\\s+/g,' ').trim();const status=/approved|complete|closed/i.test(text)?'COMPLETED':'OPEN';const priority=/critical|high/i.test(text)?'HIGH':'NORMAL';return {recordId:(business?'BC-':'PC-')+(index+1),type:business?inferBusinessCreditLifecycleType_(text):inferPersonalCreditLifecycleType_(text),title:(cells[0]&&cells[0].textContent||text||'Credit record').trim(),lifecycleStage:inferCreditLifecycleStage_(text),status:status,priority:priority,approvalStatus:/approval/i.test(text)?'PENDING':'NOT_REQUIRED',sourceRecordId:row.getAttribute('data-record-id')||''};});\n" +
    "    }\n\n" +
    "    function inferPersonalCreditLifecycleType_(text){const value=String(text||'').toLowerCase();if(/certified|tracking|delivered/.test(value))return 'CERTIFIED_MAIL';if(/letter/.test(value))return 'LETTER';if(/response/.test(value))return 'RESPONSE';if(/dispute/.test(value))return 'DISPUTE';if(/validation|debt validation/.test(value))return 'VALIDATION';if(/report/.test(value))return 'CREDIT_REPORT';if(/score/.test(value))return 'SCORE';if(/bureau/.test(value))return 'BUREAU';if(/attachment|evidence/.test(value))return 'EVIDENCE';return 'ACCOUNT';}\n\n" +
    "    function inferBusinessCreditLifecycleType_(text){const value=String(text||'').toLowerCase();if(/d-u-n-s|duns/.test(value))return 'DUNS';if(/vendor/.test(value))return 'VENDOR';if(/tradeline/.test(value))return 'TRADELINE';if(/bureau|reporting/.test(value))return 'BUREAU_REPORTING';if(/card/.test(value))return 'CARD';if(/funding|readiness/.test(value))return 'FUNDING_READINESS';if(/application/.test(value))return 'APPLICATION';return 'FOUNDATION';}\n\n" +
    "    function inferCreditLifecycleStage_(text){const value=String(text||'').toLowerCase();if(/closed|archive|lesson/.test(value))return 'RETAINED_KNOWLEDGE';if(/growth|optimi/.test(value))return 'GROWTH_OPTIMIZATION';if(/monitor|reporting/.test(value))return 'MONITORING_REPORTING';if(/active|sent|delivered|waiting|operation/.test(value))return 'DAILY_OPERATIONS';if(/approve|startup|apply/.test(value))return 'APPROVAL_STARTUP';if(/plan|readiness/.test(value))return 'PLANNING';if(/research|verify|validation/.test(value))return 'RESEARCH_VALIDATION';return 'INTAKE';}\n\n" +
    "    function renderCreditLifecycleWorkspace(moduleName,workspace){const prefix=moduleName==='BUSINESS_CREDIT'?'businessCredit':'personalCredit';const summary=document.getElementById(prefix+'LifecycleSummary');const attention=document.getElementById(prefix+'LifecycleAttention');if(!summary||!attention)return;summary.innerHTML='';[['Records',workspace.records.length],['Needs Attention',workspace.attentionCount],['Lifecycle Stages',workspace.stages.length],['Execution','Governed Only']].forEach(function(entry){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-value\"></div>';card.querySelector('.card-label').textContent=entry[0];card.querySelector('.card-value').textContent=entry[1];summary.appendChild(card);});attention.innerHTML='';const open=workspace.records.filter(function(record){return record.requiresAttention;}).sort(function(a,b){const rank={CRITICAL:0,HIGH:1,NORMAL:2,LOW:3};return rank[a.priority]-rank[b.priority];}).slice(0,8);if(!open.length){attention.innerHTML='<div class=\"empty\">No open lifecycle work detected.</div>';return;}open.forEach(function(record){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div><button class=\"btn-primary\">Review</button>';const notes=card.querySelectorAll('.card-note');card.querySelector('.card-label').textContent=record.priority+' — '+record.lifecycleStage;notes[0].textContent=record.title;notes[1].textContent=record.type+' • '+record.status+' • Preview required before action';card.querySelector('button').onclick=function(){activateCommandCenterModule(moduleName==='BUSINESS_CREDIT'?'businessCreditModule':'personalCreditModule',false);};attention.appendChild(card);});}\n\n" +
    "    function refreshCreditLifecycleWorkspace(moduleName){const records=collectCreditLifecycleRecords(moduleName);google.script.run.withSuccessHandler(function(workspace){renderCreditLifecycleWorkspace(moduleName,workspace);}).withFailureHandler(function(error){showMessage(error&&error.message?error.message:String(error),'error');}).buildCreditLifecycleWorkspace(moduleName,records);}\n\n" +
    "    window.addEventListener('load',function(){refreshCreditLifecycleWorkspace('PERSONAL_CREDIT');refreshCreditLifecycleWorkspace('BUSINESS_CREDIT');});\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Credit lifecycle script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
