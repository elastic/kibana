/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Complete with endpoint roles',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.skip('should validate complete + endpoint role access - requires serverless + role setup', async () => {
      // Skipped: serverless role validation
    });
  }
);
