// Run after npm install: node --test tests/tamil-calendar-sep19.test.cjs
// Uses the real Swiss Ephemeris dependency, not mocked solar positions.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=path.resolve(__dirname,'../transit_panchang.js');
const context={require:require('node:module').createRequire(file),module:{exports:{}},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(file,'utf8')+'\nmodule.exports.calendar=tamilSolarDate;',context);
const calendar=context.module.exports.calendar;
const input={lat:11.23,lon:78.88,utcOffsetMinutes:330,time:'12:00'};
for(const [date,month,day] of [
 ['2026-09-16','Avani',30],['2026-09-17','Avani',31],
 ['2026-09-18','Purattasi',1],['2026-09-19','Purattasi',2],['2026-09-20','Purattasi',3],
 ['2026-10-17','Purattasi',30],['2026-10-18','Aippasi',1]
]) test(`${date}: ${month} ${day}`,()=>{
 const actual=calendar({...input,date});assert.ok(actual);assert.equal(actual.monthEn,month);assert.equal(actual.day,day);
});
test('daily date does not advance with time; birth before sunrise uses previous day',()=>{
 for(const time of ['00:01','12:00','23:59']) assert.equal(calendar({...input,date:'2026-09-19',time}).day,2);
 assert.equal(calendar({...input,date:'2026-09-19',time:'04:00',mode:'birth'}).day,1);
 assert.equal(calendar({...input,date:'2026-09-19',time:'09:00',mode:'birth'}).day,2);
});
test('Purattasi override records the civil start separately from astronomical ingress',()=>{
 const r=calendar({...input,date:'2026-09-19'});
 assert.equal(r.monthStartDate,'2026-09-18');assert.equal(r.ingressDate,'2026-09-17');
});
