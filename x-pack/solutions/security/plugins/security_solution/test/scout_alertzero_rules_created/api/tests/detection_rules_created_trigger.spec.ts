/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_INTERNAL_ORIGIN_HEADER, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { ApiClient } from '../../../scout/workflows/api/fixtures';
import {
  apiTest,
  tags,
  testData,
  createWorkflow,
  deleteWorkflow,
  runWorkflow,
  waitForExecution,
  waitForExecutionForRule,
} from '../../../scout/workflows/api/fixtures';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';
const RECORD_EVENT_STEP_ID = 'record_event';
const CREATE_RULE_STEP_ID = 'create_rule';
const SETTINGS_URL = '/internal/kibana/settings';
// The trigger is only emitted while AlertZero is enabled in the space; the setting is off by default.
const ALERTZERO_ENABLED_SETTING = 'securitySolution:enableAlertZero';
const SETUP_TIMEOUT_MS = 60_000;

// What AlertZero's rule creation action runs: the `security.createRule` step, started by hand here.
const createRuleWorkflowYaml = `
name: security.detectionRulesCreated trigger test - create rule step
enabled: true
triggers:
  - type: manual
steps:
  - name: ${CREATE_RULE_STEP_ID}
    type: security.createRule
    with:
      rule:
        type: esql
        language: esql
        name: "Scout rules created trigger step ${Date.now()}"
        description: Created by a Scout API test
        query: "FROM logs-* | LIMIT 1"
        severity: low
        risk_score: 21
`;

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
    // Turning AlertZero on for the space is an administration action.
    let adminHeaders: Record<string, string>;
    let workflowId: string;
    let createRuleWorkflowId: string;
    const createdRuleIds: string[] = [];

    // Creates a disabled query rule through the API and remembers it for cleanup.
    const createQueryRule = async (apiClient: ApiClient): Promise<string> => {
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
      return id;
    };

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);

      const editorCredentials = await samlAuth.asInteractiveUser('editor');
      editorHeaders = { ...editorCredentials.cookieHeader, ...testData.COMMON_HEADERS };
      const adminCredentials = await samlAuth.asInteractiveUser('admin');
      adminHeaders = {
        ...adminCredentials.cookieHeader,
        ...testData.COMMON_HEADERS,
        ...ELASTIC_INTERNAL_ORIGIN_HEADER,
      };
      const settings = await apiClient.post(SETTINGS_URL, {
        headers: adminHeaders,
        responseType: 'json',
        body: { changes: { [ALERTZERO_ENABLED_SETTING]: true } },
      });
      expect(settings).toHaveStatusCode(200);
      workflowId = await createWorkflow(apiClient, editorHeaders, triggerWorkflowYaml);
      createRuleWorkflowId = await createWorkflow(apiClient, editorHeaders, createRuleWorkflowYaml);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await Promise.all([
        deleteWorkflow(apiClient, editorHeaders, workflowId),
        deleteWorkflow(apiClient, editorHeaders, createRuleWorkflowId),
      ]);

      if (createdRuleIds.length > 0) {
        const response = await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
          headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: { action: 'delete', ids: createdRuleIds },
        });
        // A partial failure answers 500, so a rule left behind fails the suite instead of leaking.
        expect(response).toHaveStatusCode(200);
      }

      await apiClient.post(SETTINGS_URL, {
        headers: adminHeaders,
        responseType: 'json',
        body: { changes: { [ALERTZERO_ENABLED_SETTING]: null } },
      });
    });

    apiTest(
      'starts a subscribed workflow when a rule is created through the API',
      async ({ apiClient }) => {
        const id = await createQueryRule(apiClient);

        const execution = await waitForExecutionForRule(apiClient, editorHeaders, workflowId, id);

        expect(eventOf(execution)).toMatchObject({ ids: [id], source: 'api', totalCount: 1 });
      }
    );

    apiTest('starts it again for a rule created by duplicating one', async ({ apiClient }) => {
      const sourceRuleId = await createQueryRule(apiClient);
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

    apiTest(
      'starts it for a rule created by the security.createRule workflow step',
      async ({ apiClient }) => {
        const executionId = await runWorkflow(apiClient, editorHeaders, createRuleWorkflowId);
        const creation = await waitForExecution(apiClient, editorHeaders, executionId);
        const { id } = creation.stepExecutions.find(({ stepId }) => stepId === CREATE_RULE_STEP_ID)
          ?.output as { id: string };
        createdRuleIds.push(id);

        const execution = await waitForExecutionForRule(apiClient, editorHeaders, workflowId, id);

        expect(eventOf(execution)).toMatchObject({ ids: [id], source: 'api', totalCount: 1 });
      }
    );
  }
);
