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
});
