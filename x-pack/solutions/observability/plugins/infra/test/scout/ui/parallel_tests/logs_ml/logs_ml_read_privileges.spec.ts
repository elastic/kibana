/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { spaceTest } from '../../fixtures';
import { resetLogsMlLogSources, setLogsMlLogSources } from '../../fixtures/logs_ml/log_sources';

spaceTest.describe(
  'Logs ML pages - ML read privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setLogsMlLogSources(scoutSpace);
    });

    // `viewer` gets ML read (but not ML all) from the Kibana `read` base privilege, so it can see
    // ML results but not set up the jobs.
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await resetLogsMlLogSources(scoutSpace);
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
