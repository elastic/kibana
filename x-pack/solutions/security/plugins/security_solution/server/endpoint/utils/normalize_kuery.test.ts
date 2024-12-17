/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeKuery } from './normalize_kuery';

describe('normalizeKuery', () => {
  [
    { input: 'user.name: John', output: 'user.attributes.name: John' },
    {
      input: 'user.name: John and user.age > 30',
      output: 'user.attributes.name: John and user.attributes.age > 30',
    },
    { input: 'product.name: Apple', output: 'product.name: Apple' },
    { input: '', output: '' },
  ].forEach(({ input, output }) => {
    it(`should normalize Kuery with single occurrence:`, () => {
      expect(normalizeKuery('user', input)).toEqual(output);
    });
  });

  it('should handle Kuery input without savedObjectType', () => {
    const kueryInput = 'name: John';
    expect(normalizeKuery('', kueryInput)).toEqual(kueryInput);
  });
});
