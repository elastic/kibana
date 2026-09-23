/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { apiTest, tags, testData, runWorkflow, waitForExecution } from '../fixtures';

// Inline ID — avoid importing @kbn/workflows managed YAML (Playwright esbuild cannot load it).
const ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';

const EMIT_OUTPUT_STEP_ID = 'emit_workflow_output';
const FAIL_EMPTY_CALLER_ALERTS_STEP_ID = 'fail_empty_caller_alerts';

/** Prefer the finish record — enter/scope records for the same stepId often have `output: null`. */
const findStepWithOutput = (
  steps: WorkflowStepExecutionDto[],
  stepId: string
): WorkflowStepExecutionDto | undefined =>
  [...steps].reverse().find((step) => step.stepId === stepId && step.output != null);

/**
 * Runtime regression for the managed Alert Analysis workflow without calledByWorker.
 * Proves the standalone / manual path still completes (skip analysis when there is no
 * connector or pending alerts) and does not take the Worker fail-loud empty-alerts gate.
 * Installation is async on plugin start, so we poll until the managed document is valid.
 */
apiTest.describe(
  'Alert Analysis managed workflow — standalone run',
  { tag: [...tags.stateful.classic] },
  () => {
    let editorHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      apiTest.setTimeout(90_000);

      const editorCredentials = await samlAuth.asInteractiveUser('editor');
      editorHeaders = { ...editorCredentials.cookieHeader, ...testData.COMMON_HEADERS };

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(
              `api/workflows/workflow/${ALERT_ANALYSIS_WORKFLOW_ID}`,
              { headers: editorHeaders, responseType: 'json' }
            );
            return response.statusCode === 200
              ? (response.body as { valid?: boolean }).valid
              : false;
          },
          { timeout: 30_000, intervals: [1_000] }
        )
        .toBe(true);
    });

    apiTest(
      'completes without calledByWorker and does not fail the empty-alerts Worker gate',
      async ({ apiClient }) => {
        // Omit calledByWorker entirely — same as a UI / rule-triggered run.
        const workflowExecutionId = await runWorkflow(
          apiClient,
          editorHeaders,
          ALERT_ANALYSIS_WORKFLOW_ID
        );
        const execution = await waitForExecution(
          apiClient,
          editorHeaders,
          workflowExecutionId,
          60_000
        );

        expect(execution.status).toBe(ExecutionStatus.COMPLETED);
        expect(
          execution.stepExecutions.some((step) => step.stepId === FAIL_EMPTY_CALLER_ALERTS_STEP_ID)
        ).toBe(false);

        const emitStep = findStepWithOutput(execution.stepExecutions, EMIT_OUTPUT_STEP_ID);
        expect(emitStep).toBeDefined();
        expect(emitStep?.output).toMatchObject({
          verdicts: [],
          false_positive_count: 0,
          true_positive_count: 0,
          inconclusive_count: 0,
          auto_closed_ids: [],
          missing_alert_ids: [],
        });
      }
    );

    apiTest('fails when calledByWorker is true and alerts is empty', async ({ apiClient }) => {
      const workflowExecutionId = await runWorkflow(
        apiClient,
        editorHeaders,
        ALERT_ANALYSIS_WORKFLOW_ID,
        { calledByWorker: true, alerts: [] }
      );
      const execution = await waitForExecution(
        apiClient,
        editorHeaders,
        workflowExecutionId,
        60_000
      );

      // The executions API often omits execution.error / step.output for workflow.fail even when
      // includeOutput=true; the reliable signal is status failed + the fail step having run.
      expect(execution.status).toBe(ExecutionStatus.FAILED);
      expect(
        execution.stepExecutions.some((step) => step.stepId === FAIL_EMPTY_CALLER_ALERTS_STEP_ID)
      ).toBe(true);
    });
  }
);
