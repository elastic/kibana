/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandDottedObject } from './expand_dotted_object';

const testFlattenedObj = {
  'flattened.property.a': 'valueA',
  'flattened.property.b': 'valueB',
  regularProp: {
    nestedProp: 'nestedValue',
  },
  'nested.array': [
    {
      arrayProp: 'arrayValue',
    },
  ],
  emptyArray: [],
};
describe('expandDottedObject(obj)', () => {
  it('retrieves values from flattened keys', () => {
    const expanded: any = expandDottedObject(testFlattenedObj);

    expect(expanded.flattened.property.a).toEqual('valueA');
    expect(expanded.flattened.property.b).toEqual('valueB');
  });
  it('retrieves values from nested keys', () => {
    const expanded: any = expandDottedObject(testFlattenedObj);

    expect(Array.isArray(expanded.nested.array)).toBeTruthy();
    expect(expanded.nested.array[0].arrayProp).toEqual('arrayValue');
  });
  it("doesn't break regular value access", () => {
    const expanded: any = expandDottedObject(testFlattenedObj);

    expect(expanded.regularProp.nestedProp).toEqual('nestedValue');
  });
  describe('columnar (flattened) process sources', () => {
    const flatProcessSource = {
      'process.entity_id': 'child',
      'process.args': ['vi', '-R', 'b.txt', 'a.txt', 'b.txt'],
      'process.parent.entity_id': 'parent',
      'process.parent.args': ['bash', '-c', 'vi -R b.txt a.txt b.txt'],
      'process.session_leader.entity_id': 'session',
      'process.session_leader.args': ['bash', '--login', '-i'],
      'process.group_leader.entity_id': 'group',
      'process.group_leader.args': ['vi', '-R', 'b.txt'],
      'process.entry_leader.entity_id': 'entry',
      'process.entry_leader.args': ['sshd', '-D', '-e', '-D'],
      'process.previous': [
        { args: ['sh', '-c', 'exec bash'], executable: '/bin/sh' },
        { args: ['bash', '-c', 'exec vi', '-x'], executable: '/bin/bash' },
        { args: ['env', 'vi', '-R'], executable: '/usr/bin/env' },
      ],
    };

    it('expands every process and keeps each args array in its original order', () => {
      const expanded: any = expandDottedObject(flatProcessSource);

      expect(expanded).toEqual({
        process: {
          entity_id: 'child',
          args: ['vi', '-R', 'b.txt', 'a.txt', 'b.txt'],
          parent: {
            entity_id: 'parent',
            args: ['bash', '-c', 'vi -R b.txt a.txt b.txt'],
          },
          session_leader: {
            entity_id: 'session',
            args: ['bash', '--login', '-i'],
          },
          group_leader: {
            entity_id: 'group',
            args: ['vi', '-R', 'b.txt'],
          },
          entry_leader: {
            entity_id: 'entry',
            args: ['sshd', '-D', '-e', '-D'],
          },
          previous: [
            { args: ['sh', '-c', 'exec bash'], executable: '/bin/sh' },
            { args: ['bash', '-c', 'exec vi', '-x'], executable: '/bin/bash' },
            { args: ['env', 'vi', '-R'], executable: '/usr/bin/env' },
          ],
        },
      });
    });

    it('keeps order regardless of the order of the flat keys', () => {
      const reversedKeys = Object.fromEntries(Object.entries(flatProcessSource).reverse());

      expect(expandDottedObject(reversedKeys)).toEqual(expandDottedObject(flatProcessSource));
    });

    it('keeps the order of args across multiple process events', () => {
      const events = [
        { 'process.entity_id': 'p1', 'process.args': ['ls', '-l', '-a', '/tmp'] },
        { 'process.entity_id': 'p2', 'process.args': ['grep', '-v', 'z', '-i', 'a'] },
        { 'process.entity_id': 'p3', 'process.args': ['cat', 'c', 'b', 'a', 'b'] },
      ];

      const expanded: any[] = events.map(expandDottedObject);

      expect(expanded.map(({ process }) => process.entity_id)).toEqual(['p1', 'p2', 'p3']);
      expect(expanded.map(({ process }) => process.args)).toEqual([
        ['ls', '-l', '-a', '/tmp'],
        ['grep', '-v', 'z', '-i', 'a'],
        ['cat', 'c', 'b', 'a', 'b'],
      ]);
    });
  });
});
