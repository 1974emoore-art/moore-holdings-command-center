/** Release 3 Business Credit readiness dashboard visibility. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const chain = [
    'applyDashboardReviewRoutingPatch_','applyDashboardNotificationsPatch_',
    'applyDashboardHealthDrilldownPatch_','applyDashboardKpiNavigationPatch_',
    'applyDashboardHashRoutingPatch_','applyDashboardMobileNavigationPatch_',
    'applyDashboardDailyBriefingPatch_','applyDashboardActivityRecoveryPatch_',
    'applyDashboardOperationsTimelinePatch_','applyDashboardExecutiveWorkQueuePatch_',
    'applyDashboardProgressDeadlinePatch_','applyCreditLifecycleDashboardPatch_',
    'applyCreditLifecycleDashboardActionsPatch_','applyPersonalCreditMailDashboardPatch_'
  ];
  let output = source;
  chain.forEach(function(name) { if (typeof this[name] === 'function') output = this[name](output); }, this);
  return HtmlService.createHtmlOutput(applyBusinessCreditReadinessDashboardPatch_(output)).setTitle('Moore Holdings Credit Agent');
}

function applyBusinessCreditReadinessDashboardPatch_(source) {
  let patched = String(source || '');
  const anchor = '    <section id="personalCreditMailLifecycle"';
  const panel = '    <section id="businessCreditReadinessPanel" class="panel" style="margin-bottom:20px;">\n' +
    '      <div class="panel-header"><div><h2>Business Credit Readiness</h2><div class="card-note">Foundation, D-U-N-S, vendors, tradelines, bureau coverage, utilization, and application gating</div></div><button class="btn-primary" onclick="refreshBusinessCreditReadiness()">Refresh Readiness</button></div>\n' +
    '      <div id="businessCreditReadinessSummary" class="cards" style="padding:18px;margin-bottom:0;"></div>\n' +
    '      <div id="businessCreditReadinessBlockers" class="card-note" style="padding:0 18px 12px;"></div>\n' +
    '      <div class="table-wrap" style="margin:0 18px 18px;border:1px solid var(--border);border-radius:10px;"><table aria-label="Business Credit readiness details"><thead><tr><th>Control</th><th>Status</th><th>Evidence</th></tr></thead><tbody id="businessCreditReadinessRows"><tr><td colspan="3" class="loading">Loading Business Credit readiness...</td></tr></tbody></table></div>\n' +
    '      <div class="footer-note" style="padding:0 18px 18px;">Application submission is disabled. Executive review and governed execution remain mandatory.</div>\n' +
    '    </section>\n\n' + anchor;
  if (patched.indexOf(anchor) === -1) throw new Error('Business Credit readiness dashboard anchor missing.');
  patched = patched.replace(anchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function collectBusinessCreditReadinessInput(){const rows=Array.prototype.slice.call(document.querySelectorAll('#businessCreditRows tr, #businessCreditLifecycleWorkspace .card, #businessCreditModule tr'));const text=rows.map(function(row){return (row.textContent||'').replace(/\\s+/g,' ').trim();}).join(' | ').toLowerCase();const vendors=rows.filter(function(row){return /vendor/.test((row.textContent||'').toLowerCase());}).map(function(row){const value=(row.textContent||'').toLowerCase();return {status:/active|open|reporting/.test(value)?'ACTIVE':'PENDING',reporting:/reporting|reports/.test(value)};});const tradelines=rows.filter(function(row){return /tradeline|trade line/.test((row.textContent||'').toLowerCase());}).map(function(row){const value=(row.textContent||'').toLowerCase();return {status:/active|open|reporting/.test(value)?'ACTIVE':'PENDING',reporting:/reporting|reports/.test(value)};});const bureaus=['experian','equifax','dun & bradstreet'].map(function(name){return {name:name,reportingDetected:text.indexOf(name)!==-1&&/reporting|reported/.test(text)};});const utilizationMatch=text.match(/utilization[^0-9]{0,12}([0-9]{1,3})%/);const openApplications=rows.filter(function(row){return /application/.test((row.textContent||'').toLowerCase());}).map(function(row){const value=(row.textContent||'').toLowerCase();return {status:/submitted/.test(value)?'SUBMITTED':/review/.test(value)?'UNDER_REVIEW':'DRAFT'};});return {foundation:{entityActive:/entity active|llc active|active entity/.test(text),einVerified:/ein verified|ein active/.test(text),businessAddressVerified:/address verified|business address/.test(text),businessPhoneVerified:/phone verified|business phone/.test(text),businessBankingActive:/banking active|bluevine|business bank/.test(text),dunsEstablished:/d-u-n-s|duns/.test(text)},vendors:vendors,tradelines:tradelines,bureaus:bureaus,applications:openApplications,utilizationPercent:utilizationMatch?Number(utilizationMatch[1]):0,latePaymentsLast12Months:/late payment|past due|delinquent/.test(text)?1:0};}\n\n" +
    "    function renderBusinessCreditReadiness(result){const summary=document.getElementById('businessCreditReadinessSummary');const body=document.getElementById('businessCreditReadinessRows');const blockers=document.getElementById('businessCreditReadinessBlockers');if(!summary||!body||!blockers)return;summary.innerHTML='';[['Readiness Score',result.readinessScore+'%'],['Stage',result.readinessBand],['Funding Ready',result.fundingReady?'YES':'NO'],['Open Applications',result.openApplicationCount]].forEach(function(entry){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-value\"></div>';card.querySelector('.card-label').textContent=entry[0];card.querySelector('.card-value').textContent=entry[1];summary.appendChild(card);});blockers.textContent=result.blockers.length?'Blockers: '+result.blockers.join(' • ')+' | Next: '+result.nextRecommendedAction:'No readiness blockers. Next: '+result.nextRecommendedAction;body.innerHTML='';const details=[['Entity active',result.foundationChecks.entityActive,'Foundation'],['EIN verified',result.foundationChecks.einVerified,'Foundation'],['Business address verified',result.foundationChecks.businessAddressVerified,'Foundation'],['Business phone verified',result.foundationChecks.businessPhoneVerified,'Foundation'],['Business banking active',result.foundationChecks.businessBankingActive,'Foundation'],['D-U-N-S established',result.foundationChecks.dunsEstablished,'Foundation'],['Reporting vendors',result.reportingVendorCount>=3,result.reportingVendorCount+' active reporting vendors'],['Reporting tradelines',result.reportingTradelineCount>=3,result.reportingTradelineCount+' active reporting tradelines'],['Bureau coverage',result.bureauCoverageCount>=2,result.bureauCoverageCount+' bureaus detected'],['Utilization',result.utilizationPercent<=30,result.utilizationPercent+'%'],['Application submission',false,'Disabled — executive review required']];details.forEach(function(entry){const tr=document.createElement('tr');[entry[0],entry[1]?'READY':'ACTION REQUIRED',entry[2]].forEach(function(value){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);});body.appendChild(tr);});}\n\n" +
    "    function refreshBusinessCreditReadiness(){const input=collectBusinessCreditReadinessInput();google.script.run.withSuccessHandler(renderBusinessCreditReadiness).withFailureHandler(function(error){showMessage(error&&error.message?error.message:String(error),'error');}).buildBusinessCreditReadiness(input);}\n\n" +
    "    window.addEventListener('load',refreshBusinessCreditReadiness);\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Business Credit readiness script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
