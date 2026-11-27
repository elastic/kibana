/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';
import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../common/endpoint/constants';
import type { WorkflowInsightActionType } from '../../../../../common/endpoint/types/workflow_insights';
import { apiTest, tags } from '../fixtures';

apiTest.describe(
  'Workflow insights APIs on Security Complete',
  { tag: tags.serverless.security.complete },
  () => {
    // An id unique to this run matches no stored insight, so the reads neither depend on nor
    // update (defend insights' last viewed date) data that other suites own.
    const targetId = `scout-workflow-insights-${uuidv4()}`;
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('platform_engineer');
      headers = { ...cookieHeader, ...INTERNAL_API_HEADERS };
    });

    apiTest('allows reading workflow insights', async ({ apiClient }) => {
      const query = new URLSearchParams({
        actionTypes: JSON.stringify(['refreshed'] satisfies WorkflowInsightActionType[]),
        targetIds: JSON.stringify([targetId]),
      });

      const response = await apiClient.get(`${WORKFLOW_INSIGHTS_ROUTE}?${query}`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual([]);
    });

    apiTest('allows reading running defend insights', async ({ apiClient }) => {
      const query = new URLSearchParams({ status: 'running', endpoint_ids: targetId });

      const response = await apiClient.get(`${DEFEND_INSIGHTS}?${query}`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ data: [] });
    });
  }
);
