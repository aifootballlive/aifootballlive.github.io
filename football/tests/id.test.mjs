import test from 'node:test';
import assert from 'node:assert/strict';
import {eventId} from '../id.mjs';
test('LAN HTTP generates independent event IDs without secure-context randomUUID',()=>{
  const source={getRandomValues:array=>crypto.getRandomValues(array)};
  const ids=Array.from({length:100},()=>eventId(source));
  assert.equal(new Set(ids).size,100);
  for(const id of ids)assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
