import test from 'node:test';
import assert from 'node:assert/strict';
import { REST_DELAY_MS, shouldEnterRest } from '../src/screensaver.js';
test('reposo espera cinco minutos y solo entra en Inicio disponible y visible',()=>{
 const state={lastActivity:100,now:100+REST_DELAY_MS,eligible:true,visible:true,active:false};
 assert.equal(REST_DELAY_MS,300000);
 assert.equal(shouldEnterRest({...state,now:state.now-1}),false);
 assert.equal(shouldEnterRest(state),true);
 for(const change of [{eligible:false},{visible:false},{active:true},{lastActivity:state.now}])assert.equal(shouldEnterRest({...state,...change}),false);
});
