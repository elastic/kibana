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

spaceTest.describe(
  'Logs ML pages - ML read privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID]: [LOGS_ML_INDEX],
      });
    });

    // `viewer` gets ML read (but not ML all) from the Kibana `read` base privilege, so it can see
    // ML results but not set up the jobs.
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID);
    });

    spaceTest(
      'shows the missing ML all privileges prompt on the anomalies page',
      async ({ pageObjects }) => {
        const { logsMlAnomaliesPage } = pageObjects;
        await logsMlAnomaliesPage.goTo();
        await expect(logsMlAnomaliesPage.missingMlAllPrivilegesPrompt).toBeVisible();
      }
    );

    spaceTest(
      'shows the missing ML all privileges prompt on the categories page',
      async ({ pageObjects }) => {
        const { logsMlCategoriesPage } = pageObjects;
        await logsMlCategoriesPage.goTo();
        await expect(logsMlCategoriesPage.missingMlAllPrivilegesPrompt).toBeVisible();
      }
    );
  }
);
