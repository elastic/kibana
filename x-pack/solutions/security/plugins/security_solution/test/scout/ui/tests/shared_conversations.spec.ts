/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../fixtures';

// TODO: Skipped due to https://github.com/elastic/kibana/issues/235416
// The entire shared_conversations suite is skipped in Cypress as well.
// This test requires multi-user authentication and sharing features that are
// currently broken. Migrate when the underlying issue is resolved.
test.describe.skip('Assistant Conversation Sharing', { tag: ['@ess'] }, () => {
  test('Share modal works', async () => {
    // Placeholder for shared conversation tests
  });

  test('Shared conversations appear for the user they were shared with', async () => {
    // Placeholder
  });

  test('Dismissed callout remains dismissed', async () => {
    // Placeholder
  });

  test('Duplicate conversation allows user to continue a shared conversation', async () => {
    // Placeholder
  });
});
