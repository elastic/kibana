/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenProps } from './flatten_props';

describe('flattenProps', () => {
  it(`does not break on empty object`, () => {
    const props = flattenProps({});
    expect(props).toStrictEqual([]);
  });

  it(`does not break on nested object`, () => {
    const props = flattenProps({
      entity: {
        attributes: {},
      },
    });

    expect(props).toStrictEqual([]);
  });

  it(`does not break on null`, () => {
    const props = flattenProps(undefined as unknown as Object);
    expect(props).toStrictEqual([]);
  });

  it(`returns nested value even with empty before`, () => {
    const props = flattenProps({
      entity: {
        attributes: {},
      },
      user: {
        name: 'romulo',
      },
    });

    expect(props).toStrictEqual([{ path: ['user', 'name'], value: 'romulo' }]);
  });

  it(`works with many types`, () => {
    const props = flattenProps({
      empty: {},
      rootBoolean: false,
      emptyArray: [],
      rootPositiveBoolean: true,
      rootZero: 0,
      rootArray: ['2', '5'],
      rootInt: 1,
      nested: {
        level1Float: 0.2,
        empty: {},
        level2Object: {
          arrayInteger: [4, 5, 6],
          aString: 'string',
        },
      },
    });

    expect(props).toStrictEqual([
      { path: ['rootBoolean'], value: false },
      { path: ['rootPositiveBoolean'], value: true },
      { path: ['rootZero'], value: 0 },
      { path: ['rootArray'], value: ['2', '5'] },
      { path: ['rootInt'], value: 1 },
      { path: ['nested', 'level1Float'], value: 0.2 },
      { path: ['nested', 'level2Object', 'arrayInteger'], value: [4, 5, 6] },
      { path: ['nested', 'level2Object', 'aString'], value: 'string' },
    ]);
  });
});
