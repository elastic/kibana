/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe('Missing privileges callout', {
  tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
}, () => {
  test.skip('displays missing privileges callout when user lacks access', async () => {
    // Needs: loginWithUser with restricted role, visit alerts URL
  });
});
