/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';

test.describe.skip('Cases privileges', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices }) => {
    await apiServices.cases?.deleteAll().catch(() => {});
    await browserAuth.loginAsAdmin();
  });

  test.skip('User with secAll role can create a case', async () => {
    // Requires createUsersAndRoles/deleteUsersAndRoles - complex RBAC setup
  });

  test.skip('User with secReadCasesAll role can create a case', async () => {});

  test.skip('User with secAllCasesNoDelete role can create a case', async () => {});

  test.skip('User with secAllCasesOnlyReadDelete role cannot create a case', async () => {});
});
