/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { typesFixture as types } from './__fixtures__/types';
import { getAttributeLabel } from './labels';

describe('getAttributeLabel', () => {
  it('returns the first label found for the attribute', () => {
    expect(
      getAttributeLabel(
        [
          {
            type: 'a',
            name: 'A',
            sources: [],
            attributes: [{ name: 'os.type' }],
            suggestedFilters: [],
          },
          {
            type: 'b',
            name: 'B',
            sources: [],
            attributes: [{ name: 'os.type', label: 'Operating system' }],
            suggestedFilters: [],
          },
        ],
        'os.type'
      )
    ).toBe('Operating system');
  });

  it('falls back to the attribute name', () => {
    expect(getAttributeLabel(types, 'os.type')).toBe('os.type');
  });
});
