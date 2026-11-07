/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEntityRow } from './entity_row';

describe('parseEntityRow', () => {
  it('reads a flat row of scalars and lists', () => {
    const json = JSON.stringify({
      'entity.id': 'k8s.pod:u1',
      'k8s.pod.uid': 'u1',
      count: 3,
      paused: false,
      'k8s.cluster.name': null,
      tags: ['a', 'b'],
    });

    expect(parseEntityRow(json)).toEqual(JSON.parse(json));
  });

  it.each([
    ['not JSON', '{'],
    ['an array', '[1]'],
    ['a scalar', '"x"'],
    ['null', 'null'],
    ['an empty object', '{}'],
    ['a nested object', '{"a":{"b":1}}'],
    ['a list holding an object', '{"a":[{"b":1}]}'],
  ])('rejects %s', (_label, json) => {
    expect(parseEntityRow(json)).toBeNull();
  });

  it('rejects a row with too many columns', () => {
    const wide = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`c${index}`, 'x']));

    expect(parseEntityRow(JSON.stringify(wide))).toBeNull();
  });
});
