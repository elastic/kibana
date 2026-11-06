/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { spaceTest } from '../../fixtures';
import { LOGS_ML_INDEX } from '../../fixtures/constants';

// The setup screen only shows while no Logs ML job exists for the space. Job IDs include the
// space ID, so the per-worker space guarantees that regardless of what other suites left behind.
spaceTest.describe(
  'Logs ML pages - setup',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID]: [LOGS_ML_INDEX],
      });
    });

    // Setting up ML jobs needs the ML `all` privilege, which `editor` gets from the Kibana `all`
    // base privilege.
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID);
    });

    spaceTest('shows the setup screen on the anomalies page', async ({ pageObjects }) => {
      const { logsMlAnomaliesPage } = pageObjects;
      await logsMlAnomaliesPage.goTo();
      await expect(logsMlAnomaliesPage.setupScreen).toBeVisible();
    });

    spaceTest('shows the setup screen on the categories page', async ({ pageObjects }) => {
      const { logsMlCategoriesPage } = pageObjects;
      await logsMlCategoriesPage.goTo();
      await expect(logsMlCategoriesPage.setupScreen).toBeVisible();
    });
  }
);
