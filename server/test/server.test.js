const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRoomId, isPoint, roomFromDoc } = require('../index');

test('room identifiers and document names are constrained', () => {
  assert.equal(normalizeRoomId('Demo-Room'), 'demo-room');
  assert.equal(normalizeRoomId('../private'), null);
  assert.equal(roomFromDoc('syncspace-demo-room'), 'demo-room');
  assert.equal(roomFromDoc('other-document'), null);
});

test('whiteboard coordinates reject invalid values', () => {
  assert.equal(isPoint([120, 340]), true);
  assert.equal(isPoint([Infinity, 1]), false);
  assert.equal(isPoint([1, 2, 3]), false);
});
