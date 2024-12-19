/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasUserCRUDPermission } from '.';

describe('privileges utils', () => {
  describe('hasUserCRUDPermission', () => {
    test("returns true when user's CRUD operations are null", () => {
      const result = hasUserCRUDPermission(null);

      expect(result).toBeTruthy();
    });

    test('returns false when user cannot CRUD', () => {
      const result = hasUserCRUDPermission(false);

      expect(result).toBeFalsy();
    });

    test('returns true when user can CRUD', () => {
      const result = hasUserCRUDPermission(true);

      expect(result).toBeTruthy();
    });
  });
});
