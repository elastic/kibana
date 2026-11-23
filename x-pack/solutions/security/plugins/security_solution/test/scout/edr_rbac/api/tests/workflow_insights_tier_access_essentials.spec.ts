/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DefendInsightsPostRequestBodyInput } from '@kbn/elastic-assistant-common';
import { DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';
import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  WORKFLOW_INSIGHTS_ROUTE,
  WORKFLOW_INSIGHTS_UPDATE_ROUTE,
} from '../../../../../common/endpoint/constants';
import type { WorkflowInsightActionType } from '../../../../../common/endpoint/types/workflow_insights';
import { apiTest, tags } from '../fixtures';

apiTest.describe(
  'Workflow insights APIs on Security Essentials',
  { tag: tags.serverless.security.essentials },
  () => {
    // An id unique to this run matches no stored insight.
    const targetId = `scout-workflow-insights-${uuidv4()}`;
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      // The tier guards under test exist to stop `application: '*'` roles from bypassing product
      // gating, so a `*` role is the strictest case: if `admin` is denied, every role is.
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...cookieHeader, ...INTERNAL_API_HEADERS, 'kbn-xsrf': 'true' };
    });

    apiTest('denies reading workflow insights', async ({ apiClient }) => {
      const query = new URLSearchParams({
        actionTypes: JSON.stringify(['refreshed'] satisfies WorkflowInsightActionType[]),
        targetIds: JSON.stringify([targetId]),
      });

      const response = await apiClient.get(`${WORKFLOW_INSIGHTS_ROUTE}?${query}`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('denies updating a workflow insight', async ({ apiClient }) => {
      const remediated: WorkflowInsightActionType = 'remediated';

      const response = await apiClient.put(
        WORKFLOW_INSIGHTS_UPDATE_ROUTE.replace('{insightId}', targetId),
        {
          headers,
          body: { action: { type: remediated } },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(403);
    });

    apiTest('does not expose reading running defend insights', async ({ apiClient }) => {
      const query = new URLSearchParams({ status: 'running', endpoint_ids: targetId });

      const response = await apiClient.get(`${DEFEND_INSIGHTS}?${query}`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('does not expose creating defend insights', async ({ apiClient }) => {
      const body: DefendInsightsPostRequestBodyInput = {
        endpointIds: [targetId],
        insightType: 'incompatible_antivirus',
        anonymizationFields: [],
        replacements: {},
        subAction: 'invokeAI',
        apiConfig: { connectorId: targetId, actionTypeId: '.gen-ai' },
      };

      const response = await apiClient.post(DEFEND_INSIGHTS, {
        headers,
        body,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });
  }
);
