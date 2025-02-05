/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIconFromFieldName } from './helpers';

describe('helpers', () => {
  describe('getIconFromFieldName', () => {
    it('returns the expected icon for a known field name', () => {
      const fieldName = 'host.name';
      const expectedIcon = 'desktop';

      const icon = getIconFromFieldName(fieldName);

      expect(icon).toEqual(expectedIcon);
    });

    it('returns an empty string for an unknown field name', () => {
      const fieldName = 'unknown.field';
      const emptyIcon = '';

      const icon = getIconFromFieldName(fieldName);

      expect(icon).toEqual(emptyIcon);
    });
  });
});
