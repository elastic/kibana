/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { spaceTest } from '../../fixtures';
import { LOGS_ML_INDEX } from '../../fixtures/constants';
import { resetLogsMlLogSources, setLogsMlLogSources } from '../../fixtures/logs_ml/log_sources';

/**
 * Logs read access without any Machine Learning privilege. No built-in role fits: every Kibana
 * base privilege includes ML. The only Elasticsearch access needed is reading the log source
 * index (the log view status check runs as the user); the ML APIs the page calls run as Kibana's
 * internal user, so no ML cluster privileges are required.
 */
const LOGS_READ_WITHOUT_ML_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [LOGS_ML_INDEX], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature: { logs: ['read'] }, spaces: ['*'] }],
};

spaceTest.describe(
  'Logs ML pages - no ML privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setLogsMlLogSources(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(LOGS_READ_WITHOUT_ML_ROLE);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await resetLogsMlLogSources(scoutSpace);
    });

    spaceTest(
      'shows the missing ML read privileges prompt on the anomalies page',
      async ({ pageObjects }) => {
        const { logsMlAnomaliesPage } = pageObjects;
        await logsMlAnomaliesPage.goTo();
        await expect(logsMlAnomaliesPage.missingMlReadPrivilegesPrompt).toBeVisible();
      }
    );

    spaceTest(
      'shows the missing ML read privileges prompt on the categories page',
      async ({ pageObjects }) => {
        const { logsMlCategoriesPage } = pageObjects;
        await logsMlCategoriesPage.goTo();
        await expect(logsMlCategoriesPage.missingMlReadPrivilegesPrompt).toBeVisible();
      }
    );
  }
);
