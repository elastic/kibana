/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';

test.describe.skip('All rules read only', { tag: [...tags.stateful.classic] }, () => {
  test.skip('read only user cannot edit rules', () => {
    // Requires createUsersAndRoles
  });
});
