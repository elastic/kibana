/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';

test.describe(
  'Value lists management modal',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test.skip('can open and close the modal', async () => {
      // Needs: createListsIndex, waitForValueListsModalToBeLoaded
    });

    test.describe('create list types', () => {
      test.skip('creates a "keyword" list from an uploaded file', async () => {});
      test.skip('creates a "text" list from an uploaded file', async () => {});
      test.skip('creates an "ip" list from an uploaded file', async () => {});
      test.skip('creates an "ip_range" list from an uploaded file', async () => {});
    });

    test.describe('delete list types', () => {
      test.skip('deletes list types', async () => {});
    });

    test.describe('export list types', () => {
      test.skip('exports list types', async () => {});
    });
  }
);
