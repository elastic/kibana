/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { ELASTIC_INTERNAL_ORIGIN_HEADER, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
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
const WORKER_ID = 'system-security-floor-alert-triage';
const WORKER_URL = `/internal/alertzero/workers/${WORKER_ID}`;
const ATTACH_WORKFLOW_ID = 'system-security-floor-alert-triage-attach-new-rules';
const SETUP_TIMEOUT_MS = 120_000;
const POLL_TIMEOUT_MS = 30_000;

// Both settings are per space and default off; the Worker cannot be enabled without them.
const SETTINGS = {
  'securitySolution:enableAlertZero': true,
  'securitySolution:alertAnalysisWorkflowEnabled': true,
};

interface RuleAction {
  action_type_id?: string;
  params?: { subActionParams?: { workflowId?: string } };
}

const patchRuleWorkflowYaml = (ruleId: string) => `
name: attach new rules test - patch rule step
enabled: true
triggers:
  - type: manual
steps:
  - name: patch_rule
    type: security.patchRule
    with:
      patch:
        id: "${ruleId}"
        risk_score: 42
`;

// The attach workflow is started by the creation event, calls AlertZero's attach route as the user
// who created the rule, and the route attaches the Worker's rule action only while the Worker is
// enabled in the space. The Jest contract tests check the URL, body and schemas on each side; this
// is the only test that runs the whole path.
apiTest.describe(
  'Alert Triage attach new rules workflow',
  { tag: [...tags.stateful.classic] },
  () => {
    // The rule creator, who needs rule write access but no AlertZero privilege.
    let headers: Record<string, string>;
    // Enabling the Worker is an AlertZero administration action.
    let adminHeaders: Record<string, string>;
    const createdRuleIds: string[] = [];
    const createdWorkflowIds: string[] = [];

    const createRule = async (apiClient: ApiClientFixture, name: string): Promise<string> => {
      const response = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
        headers: { ...headers, ...PUBLIC_API_HEADERS },
        responseType: 'json',
        body: {
          type: 'query',
          name,
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

    const getRuleActions = async (
      apiClient: ApiClientFixture,
      id: string
    ): Promise<RuleAction[]> => {
      const response = await apiClient.get(`${DETECTION_ENGINE_RULES_URL}?id=${id}`, {
        headers: { ...headers, ...PUBLIC_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return (response.body as { actions: RuleAction[] }).actions;
    };

    const carriesWorkerAction = (actions: RuleAction[]) =>
      actions.some(
        ({ action_type_id: type, params }) =>
          type === '.workflows' &&
          params?.subActionParams?.workflowId?.startsWith(WORKER_ID) === true
      );

    const setWorkerEnabled = async (apiClient: ApiClientFixture, enabled: boolean) => {
      const response = await apiClient.patch(WORKER_URL, {
        headers: { ...adminHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { enabled },
      });
      expect(response).toHaveStatusCode(200);
    };

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);

      const credentials = await samlAuth.asInteractiveUser('editor');
      headers = {
        ...credentials.cookieHeader,
        ...testData.COMMON_HEADERS,
        ...ELASTIC_INTERNAL_ORIGIN_HEADER,
      };
      const adminCredentials = await samlAuth.asInteractiveUser('admin');
      adminHeaders = {
        ...adminCredentials.cookieHeader,
        ...testData.COMMON_HEADERS,
        ...ELASTIC_INTERNAL_ORIGIN_HEADER,
      };
      const settings = await apiClient.post('/internal/kibana/settings', {
        headers: adminHeaders,
        responseType: 'json',
        body: { changes: SETTINGS },
      });
      expect(settings).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await setWorkerEnabled(apiClient, false);
      await Promise.all(createdWorkflowIds.map((id) => deleteWorkflow(apiClient, headers, id)));

      if (createdRuleIds.length > 0) {
        await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
          headers: { ...headers, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: { action: 'delete', ids: createdRuleIds },
        });
      }

      await apiClient.post('/internal/kibana/settings', {
        headers: adminHeaders,
        responseType: 'json',
        body: {
          changes: {
            'securitySolution:enableAlertZero': null,
            'securitySolution:alertAnalysisWorkflowEnabled': null,
          },
        },
      });
    });

    apiTest('leaves a new rule alone while the Worker is off', async ({ apiClient }) => {
      const id = await createRule(apiClient, `Scout attach new rules off ${Date.now()}`);

      const execution = await waitForExecutionForRule(
        apiClient,
        headers,
        ATTACH_WORKFLOW_ID,
        id,
        POLL_TIMEOUT_MS
      );

      // Nothing to do is a normal result: the run completes, it does not fail.
      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(carriesWorkerAction(await getRuleActions(apiClient, id))).toBe(false);
    });

    apiTest(
      'attaches a new rule to the Worker while it is on, and a later patch keeps the action',
      async ({ apiClient }) => {
        await setWorkerEnabled(apiClient, true);
        const id = await createRule(apiClient, `Scout attach new rules on ${Date.now()}`);

        const execution = await waitForExecutionForRule(
          apiClient,
          headers,
          ATTACH_WORKFLOW_ID,
          id,
          POLL_TIMEOUT_MS
        );

        expect(execution.status).toBe(ExecutionStatus.COMPLETED);
        expect(carriesWorkerAction(await getRuleActions(apiClient, id))).toBe(true);

        // Rule tuning edits rules through the same step. The edit sends no `actions`, so it must
        // not remove the action the Worker needs.
        const patchWorkflowId = await createWorkflow(apiClient, headers, patchRuleWorkflowYaml(id));
        createdWorkflowIds.push(patchWorkflowId);
        const patched = await waitForExecution(
          apiClient,
          headers,
          await runWorkflow(apiClient, headers, patchWorkflowId)
        );

        expect(patched.status).toBe(ExecutionStatus.COMPLETED);
        expect(carriesWorkerAction(await getRuleActions(apiClient, id))).toBe(true);
      }
    );
  }
);
