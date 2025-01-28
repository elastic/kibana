/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserName } from './get_user_flyout_panel_props';

describe('getUserFlyoutPanelProps', () => {
  describe('isUserName', () => {
    it('returns true when fieldName is "user.name"', () => {
      const fieldName = 'user.name';
      const result = isUserName(fieldName);

      expect(result).toBe(true);
    });

    it('returns false when fieldName is NOT "user.name"', () => {
      const fieldName = 'other.field';
      const result = isUserName(fieldName);

      expect(result).toBe(false);
    });
  });
});
