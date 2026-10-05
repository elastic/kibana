/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import {
  apiTest,
  tags,
  testData,
  createWorkflow,
  deleteWorkflow,
  waitForExecutionForRule,
} from '../fixtures';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';
const RECORD_EVENT_STEP_ID = 'record_event';

// Records the event fields so a run can be matched to the rule it was started for.
const triggerWorkflowYaml = `
name: security.detectionRulesCreated trigger test
enabled: true
triggers:
  - type: security.detectionRulesCreated
steps:
  - name: ${RECORD_EVENT_STEP_ID}
    type: data.set
    with:
      ids: "\${{ event.ids }}"
      source: "\${{ event.source }}"
      totalCount: "\${{ event.totalCount }}"
`;

const eventOf = (execution: WorkflowExecutionDto) =>
  execution.stepExecutions.find(({ stepId }) => stepId === RECORD_EVENT_STEP_ID)?.output as {
    ids: string[];
    source?: string;
    totalCount: number;
  };

// Proves the trigger is emitted by the real rule-management routes and reaches a subscribed
// workflow. The unit tests drive the client and the route with a mock event bus, so only this
// test fails if the production wiring (request context, route registration, event bridge) breaks.
apiTest.describe(
  'security.detectionRulesCreated trigger',
  { tag: [...tags.stateful.classic] },
  () => {
    let editorHeaders: Record<string, string>;
    let workflowId: string;
    const createdRuleIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      apiTest.setTimeout(60_000);

      const editorCredentials = await samlAuth.asInteractiveUser('editor');
      editorHeaders = { ...editorCredentials.cookieHeader, ...testData.COMMON_HEADERS };
      workflowId = await createWorkflow(apiClient, editorHeaders, triggerWorkflowYaml);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteWorkflow(apiClient, editorHeaders, workflowId);

      if (createdRuleIds.length > 0) {
        await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
          headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: { action: 'delete', ids: createdRuleIds },
        });
      }
    });

    apiTest(
      'starts a subscribed workflow when a rule is created through the API',
      async ({ apiClient }) => {
        const response = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
          headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: {
            type: 'query',
            name: `Scout rules created trigger ${Date.now()}`,
            description: 'Created by a Scout API test',
            query: '*:*',
            language: 'kuery',
            severity: 'low',
            risk_score: 21,
            enabled: false,
          },
        });
        expect(response).toHaveStatusCode(200);
        const { id } = response.body as { id: string };
        createdRuleIds.push(id);

        const execution = await waitForExecutionForRule(apiClient, editorHeaders, workflowId, id);

        expect(eventOf(execution)).toMatchObject({ ids: [id], source: 'api', totalCount: 1 });
      }
    );

    apiTest('starts it again for a rule created by duplicating one', async ({ apiClient }) => {
      const [sourceRuleId] = createdRuleIds;
      const response = await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
        headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
        responseType: 'json',
        body: {
          action: 'duplicate',
          ids: [sourceRuleId],
          duplicate: { include_exceptions: false, include_expired_exceptions: false },
        },
      });
      expect(response).toHaveStatusCode(200);
      const [{ id }] = (
        response.body as { attributes: { results: { created: Array<{ id: string }> } } }
      ).attributes.results.created;
      createdRuleIds.push(id);

      const execution = await waitForExecutionForRule(apiClient, editorHeaders, workflowId, id);

      expect(eventOf(execution)).toMatchObject({ ids: [id], source: 'duplicate', totalCount: 1 });
    });
  }
);
