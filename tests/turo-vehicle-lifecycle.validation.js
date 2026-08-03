'use strict';
const fs=require('fs');const vm=require('vm');
const source=fs.readFileSync('TuroVehicleLifecycle.js','utf8');
const sandbox={};vm.createContext(sandbox);vm.runInContext(source,sandbox);
const result=sandbox.buildTuroVehicleLifecycle({
  vehicleId:'TURO-001',vehicleTarget:'2025 Toyota Corolla',vin:'TESTVIN123',
  research:{marketValidated:true,demandScore:82},
  acquisition:{purchasePrice:25000,downPayment:2000,initialCosts:900,monthlyPayment:525,executiveApproved:true,acquiredAt:'2026-08-01'},
  operations:{listingActive:true,maintenanceCurrent:true,utilizationPercent:72,openIncidentCount:0},
  compliance:{insuranceCurrent:true,registrationCurrent:true},
  financials:{monthlyRevenue:1450,monthlyExpenses:380,performanceTracked:true},
  growthDecision:'HOLD_AND_OPTIMIZE',
  exit:{replacementPlan:'Review at 80,000 miles',exitStrategy:'Sell before major depreciation',lessonsLearned:'Economy demand validated'}
});
if(result.lifecycleStage!=='ACTIVE_OPERATIONS')throw new Error('Active vehicle stage not detected.');
if(result.netMonthlyCashFlow!==545)throw new Error('Net monthly cash flow calculation failed.');
if(result.completionPercent!==100)throw new Error('Lifecycle completion should be 100%.');
if(result.blockers.length)throw new Error('Complete lifecycle should have no blockers: '+result.blockers.join(','));
if(result.acquisitionSubmissionAllowed!==false||result.purchaseExecutionAllowed!==false)throw new Error('Acquisition and purchase must remain governed.');
if(result.executiveReviewRequired!==true||result.governedExecutionRequired!==true)throw new Error('Governance controls missing.');
const incomplete=sandbox.buildTuroVehicleLifecycle({vehicleTarget:'Jeep Wrangler',research:{marketValidated:false}});
['COMPLETE_MARKET_RESEARCH','COMPLETE_ACQUISITION_ECONOMICS','REQUIRE_EXECUTIVE_ACQUISITION_APPROVAL','CREATE_REPLACEMENT_PLAN','CREATE_EXIT_PLAN'].forEach(x=>{if(!incomplete.blockers.includes(x))throw new Error('Missing blocker '+x);});
if(/UrlFetchApp\.|GmailApp\.|MailApp\.|SpreadsheetApp\.|DriveApp\.|CalendarApp\./.test(source))throw new Error('Lifecycle foundation must not perform external actions.');
console.log('Turo vehicle lifecycle validation passed.');
