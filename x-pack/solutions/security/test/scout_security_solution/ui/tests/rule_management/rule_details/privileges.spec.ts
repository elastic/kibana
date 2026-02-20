/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';

test.describe.skip(
  'Rule details - privileges',
  { tag: [...tags.stateful.classic] },
  () => {
    test.skip('rulesAll user can edit and delete rule', () => {
      // Requires createUsersAndRoles with rulesAll, rulesRead
    });

    test.skip('rulesRead user cannot edit or delete rule', () => {});
  }
);
