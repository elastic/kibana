/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Trusted Apps RBAC',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.skip('should enforce trusted apps RBAC - requires loginWithCustomRole', async () => {
      // Skipped: requires custom role with trusted_apps privileges
    });
  }
);
