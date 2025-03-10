/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandDottedObject } from './expand_dotted';

describe('Expand Dotted', () => {
  it('expands simple dotted fields to nested objects', () => {
    const simpleDottedObj = {
      'kibana.test.1': 'the spice must flow',
      'kibana.test.2': 2,
      'kibana.test.3': null,
    };
    expect(expandDottedObject(simpleDottedObj)).toEqual({
      kibana: {
        test: {
          1: 'the spice must flow',
          2: 2,
          3: null,
        },
      },
    });
  });

  it('expands complex dotted fields to nested objects', () => {
    const complexDottedObj = {
      'kibana.test.1': 'the spice must flow',
      'kibana.test.2': ['a', 'b', 'c', 'd'],
      'kibana.test.3': null,
      'signal.test': {
        key: 'val',
      },
      'kibana.alert.ancestors': [
        {
          name: 'ancestor1',
        },
        {
          name: 'ancestor2',
        },
      ],
      flat: 'yep',
    };
    expect(expandDottedObject(complexDottedObj)).toEqual({
      kibana: {
        alert: {
          ancestors: [
            {
              name: 'ancestor1',
            },
            {
              name: 'ancestor2',
            },
          ],
        },
        test: {
          1: 'the spice must flow',
          2: ['a', 'b', 'c', 'd'],
          3: null,
        },
      },
      signal: {
        test: {
          key: 'val',
        },
      },
      flat: 'yep',
    });
  });

  it('overwrites earlier fields when later fields conflict', () => {
    const simpleDottedObj = {
      'kibana.test.1': 'the spice must flow',
      'kibana.test': 2,
    };
    expect(expandDottedObject(simpleDottedObj)).toEqual({
      kibana: {
        test: 2,
      },
    });
  });

  it('expands non dotted field without changing it other than reference', () => {
    const simpleDottedObj = {
      test: { value: '123' },
    };
    expect(expandDottedObject(simpleDottedObj)).toEqual(simpleDottedObj);
  });

  it('expands empty object without changing it other than reference', () => {
    const simpleDottedObj = {};
    expect(expandDottedObject(simpleDottedObj)).toEqual(simpleDottedObj);
  });

  it('if we allow arrays as a type, it should not touch them', () => {
    const simpleDottedObj: string[] = ['hello'];
    expect(expandDottedObject(simpleDottedObj)).toEqual(simpleDottedObj);
  });
  it('if array has 1 item, it should be taken out of array if expandDottedObject second argument is true', () => {
    const complexDottedObj = {
      'kibana.test.1': 'the spice must flow',
      'kibana.test.2': ['a', 'b', 'c', 'd'],
      'kibana.test.3': null,
      'kibana.test.4': ['a'],
    };
    expect(expandDottedObject(complexDottedObj, true)).toEqual({
      kibana: {
        test: {
          1: 'the spice must flow',
          2: ['a', 'b', 'c', 'd'],
          3: null,
          4: 'a',
        },
      },
    });
  });
  it('if array has 1 item, it should still return an array if expandDottedObject second argument is not set (default)', () => {
    const complexDottedObj = {
      'kibana.test.1': 'the spice must flow',
      'kibana.test.2': ['a', 'b', 'c', 'd'],
      'kibana.test.3': null,
      'kibana.test.4': ['a'],
    };
    expect(expandDottedObject(complexDottedObj)).toEqual({
      kibana: {
        test: {
          1: 'the spice must flow',
          2: ['a', 'b', 'c', 'd'],
          3: null,
          4: ['a'],
        },
      },
    });
  });
  it('should merge objects when field represented as an object followed by similar dotted field', () => {
    const dottedObj = {
      kibana: { test2: 'b', test3: 'c' },
      'kibana.test1': 'a',
      'kibana.test3': 'd',
    };
    expect(expandDottedObject(dottedObj)).toEqual({
      kibana: { test1: 'a', test2: 'b', test3: 'd' },
    });
  });
  it('should merge objects when dotted field followed by similar field represented as an object', () => {
    const dottedObj = {
      'kibana.test1': 'a',
      'kibana.test3': 'd',
      kibana: { test2: 'b', test3: 'c' },
    };
    expect(expandDottedObject(dottedObj)).toEqual({
      kibana: { test1: 'a', test2: 'b', test3: 'c' },
    });
  });
});
