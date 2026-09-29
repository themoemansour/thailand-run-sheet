import test from 'node:test';
import assert from 'node:assert/strict';
import { planText } from '../src/assets/js/pages/calendar.js';

test('copied plan keeps fixed itinerary and each separate occurrence', () => {
  const entry = {id:'a',day_id:'d14',slot:'morning',title:'A shared walk',cost_low:100,cost_high:200,sort_order:0,created_at:'2026-01-01'};
  const text = planText([entry,{...entry,id:'b'}]);
  assert.equal((text.match(/A shared walk/g) || []).length,2);
  assert.match(text,/Land Suvarnabhumi 23:30/);
  assert.match(text,/Per person, activities: ฿200–400/);
  assert.match(planText([]),/nothing planned yet/);
});
