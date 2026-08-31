/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '../fixtures';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';
const RULE_API_VERSION = '2023-10-31';
const UPDATE_RULE_STEP_ID = 'update_rule';

const RULE_SIGNATURE_ID = `scout-update-rule-step-test`;
const UPDATED_QUERY = 'host.name: * and not user.name: svc_backup';

const updateRuleWorkflowYaml = `
name: security.updateRule step test - valid update
enabled: true
triggers:
  - type: manual
steps:
  - name: ${UPDATE_RULE_STEP_ID}
    type: security.updateRule
    with:
      update:
        rule_id: "${RULE_SIGNATURE_ID}"
        query: "${UPDATED_QUERY}"
        severity: medium
`;

const missingRuleWorkflowYaml = `
name: security.updateRule step test - missing rule
enabled: true
triggers:
  - type: manual
steps:
  - name: ${UPDATE_RULE_STEP_ID}
    type: security.updateRule
    with:
      update:
        rule_id: does-not-exist
        severity: medium
`;

apiTest.describe('security.updateRule workflow step', { tag: [...tags.stateful.classic] }, () => {
  let editorHeaders: Record<string, string>;
  let updateWorkflowId: string;
  let missingRuleWorkflowId: string;
  let createdRuleId: string;

  apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
    apiTest.setTimeout(60_000);

    const editorCredentials = await samlAuth.asInteractiveUser('editor');
    editorHeaders = { ...editorCredentials.cookieHeader, ...testData.COMMON_HEADERS };

    const createResponse = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
      headers: { ...editorHeaders, 'elastic-api-version': RULE_API_VERSION },
      responseType: 'json',
      body: {
        type: 'query',
        rule_id: RULE_SIGNATURE_ID,
        name: 'Scout updateRule step test',
        description: 'Created by a Scout API test',
        query: 'host.name: *',
        severity: 'low',
        risk_score: 21,
        index: ['logs-*'],
        enabled: false,
      },
    });
    expect(createResponse).toHaveStatusCode(200);
    createdRuleId = (createResponse.body as { id: string }).id;

    updateWorkflowId = await createWorkflow(apiClient, editorHeaders, updateRuleWorkflowYaml);
    missingRuleWorkflowId = await createWorkflow(apiClient, editorHeaders, missingRuleWorkflowYaml);
  });

  apiTest.afterAll(async ({ apiClient }) => {
    // Delete workflows
    await Promise.all([
      deleteWorkflow(apiClient, editorHeaders, updateWorkflowId),
      deleteWorkflow(apiClient, editorHeaders, missingRuleWorkflowId),
    ]);

    // Delete created rule
    if (createdRuleId) {
      await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
        headers: editorHeaders,
        responseType: 'json',
        body: { action: 'delete', ids: [createdRuleId] },
      });
    }
  });

  apiTest('patches only the provided fields of an existing rule', async ({ apiClient }) => {
    const workflowExecutionId = await runWorkflow(apiClient, editorHeaders, updateWorkflowId);
    const execution = await waitForExecution(apiClient, editorHeaders, workflowExecutionId);

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);

    // Make sure that the `security.updateRule` step actually ran
    const step = execution.stepExecutions.find((s) => s.stepId === UPDATE_RULE_STEP_ID);
    expect(step).toBeDefined();

    // Check the rule after the update
    const output = step?.output as
      | { id?: string; query?: string; severity?: string; name?: string }
      | undefined;
    expect(output?.id).toBe(createdRuleId);
    expect(output?.query).toBe(UPDATED_QUERY);
    expect(output?.severity).toBe('medium');
    // Untouched fields are preserved by the partial update.
    expect(output?.name).toBe('Scout updateRule step test');

    const readResponse = await apiClient.get(
      `${DETECTION_ENGINE_RULES_URL}?rule_id=${RULE_SIGNATURE_ID}`,
      {
        headers: { ...editorHeaders, 'elastic-api-version': RULE_API_VERSION },
        responseType: 'json',
      }
    );
    expect(readResponse).toHaveStatusCode(200);
    const readRule = readResponse.body as { query: string; severity: string; enabled: boolean };
    expect(readRule.query).toBe(UPDATED_QUERY);
    expect(readRule.severity).toBe('medium');
    expect(readRule.enabled).toBe(false);
  });

  apiTest('fails the step when the rule does not exist', async ({ apiClient }) => {
    const workflowExecutionId = await runWorkflow(apiClient, editorHeaders, missingRuleWorkflowId);
    const execution = await waitForExecution(apiClient, editorHeaders, workflowExecutionId);

    expect(execution.status).toBe(ExecutionStatus.FAILED);

    const step = execution.stepExecutions.find((s) => s.stepId === UPDATE_RULE_STEP_ID);
    expect(step).toBeDefined();
    expect(step?.error?.message).toContain('Failed to update detection rule');
  });
});
