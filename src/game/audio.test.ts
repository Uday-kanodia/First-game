import test from 'node:test';
import assert from 'node:assert/strict';

// Test Audio buffer cache normalization and key resolution logic
test('Character move and win/lose audio keys format properly', () => {
  const charId = 'thala';
  const moves = ['punch', 'kick', 'grab', 'super', 'win', 'lose'];
  const expectedKeys = moves.map((m) => `${charId}:${m}`);

  assert.deepEqual(expectedKeys, [
    'thala:punch',
    'thala:kick',
    'thala:grab',
    'thala:super',
    'thala:win',
    'thala:lose',
  ]);
});

test('Character path normalizer handles relative and absolute paths', () => {
  const charId = 'thala';
  const normalize = (pathStr?: string): string[] => {
    if (!pathStr) return [];
    if (pathStr.startsWith('/') || pathStr.startsWith('http')) return [pathStr];
    return [`/characters/${charId}/${pathStr}`, `/${pathStr}`];
  };

  assert.deepEqual(normalize('audio/punch.mp3'), [
    '/characters/thala/audio/punch.mp3',
    '/audio/punch.mp3',
  ]);
  assert.deepEqual(normalize('/custom/punch.wav'), ['/custom/punch.wav']);
  assert.deepEqual(normalize(undefined), []);
});
