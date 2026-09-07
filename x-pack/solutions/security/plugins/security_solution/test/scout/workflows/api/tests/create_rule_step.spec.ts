/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
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
const CREATE_RULE_STEP_ID = 'create_rule';

const validRuleWorkflowYaml = (ruleName: string) => `
name: security.createRule step test - valid rule
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
        name: "${ruleName}"
        description: Created by a Scout API test
        query: "FROM logs-* | LIMIT 1"
        severity: low
        risk_score: 21
`;

const invalidRuleWorkflowYaml = `
name: security.createRule step test - invalid rule
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
        name: Rule with timeline_id but no timeline_title
        description: Should fail create-rule API cross-field validation
        query: "FROM logs-* | LIMIT 1"
        severity: low
        risk_score: 21
        timeline_id: "some-timeline-id"
`;

apiTest.describe('security.createRule workflow step', { tag: [...tags.stateful.classic] }, () => {
  let editorHeaders: Record<string, string>;
  let validWorkflowId: string;
  let invalidWorkflowId: string;
  const createdRuleIds: string[] = [];

  apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
    apiTest.setTimeout(60_000);

    const editorCredentials = await samlAuth.asInteractiveUser('editor');
    editorHeaders = { ...editorCredentials.cookieHeader, ...testData.COMMON_HEADERS };

    validWorkflowId = await createWorkflow(
      apiClient,
      editorHeaders,
      validRuleWorkflowYaml(`Scout createRule step test ${Date.now()}`)
    );
    invalidWorkflowId = await createWorkflow(apiClient, editorHeaders, invalidRuleWorkflowYaml);
  });

  apiTest.afterAll(async ({ apiClient }) => {
    // Delete workflows
    await Promise.all([
      deleteWorkflow(apiClient, editorHeaders, validWorkflowId),
      deleteWorkflow(apiClient, editorHeaders, invalidWorkflowId),
    ]);

    // Delete created rules
    if (createdRuleIds.length > 0) {
      await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
        headers: editorHeaders,
        responseType: 'json',
        body: { action: 'delete', ids: createdRuleIds },
      });
    }
  });

  apiTest(
    'creates a real, disabled-by-default rule when "enabled" is omitted',
    async ({ apiClient }) => {
      const workflowExecutionId = await runWorkflow(apiClient, editorHeaders, validWorkflowId);
      const execution = await waitForExecution(apiClient, editorHeaders, workflowExecutionId);

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);

      const step = execution.stepExecutions.find((s) => s.stepId === CREATE_RULE_STEP_ID);
      expect(step).toBeDefined();

      const output = step?.output as { id?: string; enabled?: boolean } | undefined;
      const ruleId = output?.id;
      if (!ruleId) {
        throw new Error('Expected the create_rule step output to include the created rule id');
      }
      createdRuleIds.push(ruleId);

      expect(output?.enabled).toBe(false);

      const readResponse = await apiClient.get(`${DETECTION_ENGINE_RULES_URL}?id=${ruleId}`, {
        headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
        responseType: 'json',
      });
      expect(readResponse).toHaveStatusCode(200);
      expect((readResponse.body as { enabled: boolean }).enabled).toBe(false);
    }
  );

  apiTest('fails the step when the API rejects an invalid rule body', async ({ apiClient }) => {
    const workflowExecutionId = await runWorkflow(apiClient, editorHeaders, invalidWorkflowId);
    const execution = await waitForExecution(apiClient, editorHeaders, workflowExecutionId);

    expect(execution.status).toBe(ExecutionStatus.FAILED);

    const step = execution.stepExecutions.find((s) => s.stepId === CREATE_RULE_STEP_ID);
    expect(step).toBeDefined();
    expect(step?.error?.message).toContain('Failed to create detection rule');
  });
});
