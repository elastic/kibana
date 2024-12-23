/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObject } from './utils';

describe('FlattenObject', () => {
  it('flattens multi level item', () => {
    const data = {
      key0: 'value',
      key1: {
        item1: 'value 1',
        item2: { itemA: 'value 2' },
      },
      key2: {
        item3: { itemA: { itemAB: 'value AB' } },
        item4: 'value 4',
      },
    };

    const flatten = flattenObject(data);
    expect(flatten).toEqual({
      key0: 'value',
      'key2.item3.itemA.itemAB': 'value AB',
      'key2.item4': 'value 4',
      'key1.item1': 'value 1',
      'key1.item2.itemA': 'value 2',
    });
  });

  it('does not flatten an array item', () => {
    const data = {
      key1: {
        item1: 'value 1',
        item2: { itemA: 'value 2' },
      },
      key2: {
        item3: { itemA: { itemAB: 'value AB' } },
        item4: 'value 4',
        item5: [1],
        item6: { itemA: [1, 2, 3] },
      },
      key3: ['item7', 'item8'],
    };

    const flatten = flattenObject(data);
    expect(flatten).toEqual({
      key3: ['item7', 'item8'],
      'key2.item3.itemA.itemAB': 'value AB',
      'key2.item4': 'value 4',
      'key2.item5': [1],
      'key2.item6.itemA': [1, 2, 3],
      'key1.item1': 'value 1',
      'key1.item2.itemA': 'value 2',
    });
  });
});
