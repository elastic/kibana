/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attributeColumn, inventoryType, typesFixture as types } from '../../__fixtures__/types';
import { getAttributeLabel } from './labels';

describe('getAttributeLabel', () => {
  it('returns the first label found for the attribute', () => {
    expect(
      getAttributeLabel(
        [
          inventoryType({ type: 'a', columns: [attributeColumn('os.type')] }),
          inventoryType({ type: 'b', columns: [attributeColumn('os.type', 'Operating system')] }),
        ],
        'os.type'
      )
    ).toBe('Operating system');
  });

  it('falls back to the attribute name', () => {
    expect(getAttributeLabel(types, 'os.type')).toBe('os.type');
  });
});
