/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import type { DetectionRuleApiService } from '@kbn/scout-security/src/playwright/fixtures/worker/apis/detection_rule';
import { apiTest } from '../fixtures';
import type { WorkflowsApiService } from '../fixtures/services/workflows_api_service';

const PREBUILT_WORKFLOW_ID = 'workflow-00000000-0000-5ec0-0000-fa15e00a1e72';

apiTest.describe(
  'Prebuilt "Fix false positive alerts" workflow execution',
  { tag: [...tags.stateful.classic] },
  () => {
    let workflowsApi: WorkflowsApiService;
    let detectionRule: DetectionRuleApiService;
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
      workflowsApi = apiServices.workflowsApi;
      detectionRule = apiServices.detectionRule;
      adminCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterAll(async () => {
      await detectionRule.deleteAll();
    });

    apiTest(
      'prebuilt workflow is installed and present in default space',
      async ({ apiClient }) => {
        const workflow = await workflowsApi.getWorkflow(PREBUILT_WORKFLOW_ID);

        expect(workflow).toBeDefined();
        expect(workflow?.name).toBe('Fix false positive alerts');
        expect(workflow?.enabled).toBe(true);
        expect(workflow?.valid).toBe(true);

        const response = await apiClient.get(`/api/workflows/workflow/${PREBUILT_WORKFLOW_ID}`, {
          headers: { ...adminCredentials.apiKeyHeader },
        });
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'creating a detection rule triggers the prebuilt workflow and the fix_false_positives step is executed',
      async ({ apiClient }) => {
        const ruleId = `trigger-test-${Date.now()}`;
        await detectionRule.createCustomQueryRule({
          ...CUSTOM_QUERY_RULE,
          rule_id: ruleId,
          name: `Scout trigger test rule ${ruleId}`,
        });

        // Poll for at least one execution of the prebuilt workflow.
        // The trigger fires asynchronously after rule creation so we need to wait.
        const execution = await workflowsApi.waitForWorkflowExecution(PREBUILT_WORKFLOW_ID);

        // The workflow has a single step: fix_false_positives (type: ai.agent).
        // Without a real LLM connector it will fail, but the step should still
        // appear in stepExecutions proving the trigger fired and the step ran.
        expect(execution.stepExecutions.length).toBeGreaterThan(0);

        const stepIds = execution.stepExecutions.map((s) => s.stepId);
        expect(stepIds).toContain('fix_false_positives');

        const response = await apiClient.get(
          `/api/workflows/executions/${execution.id}?includeOutput=true`,
          { headers: { ...adminCredentials.apiKeyHeader } }
        );
        expect(response).toHaveStatusCode(200);
      }
    );
  }
);
