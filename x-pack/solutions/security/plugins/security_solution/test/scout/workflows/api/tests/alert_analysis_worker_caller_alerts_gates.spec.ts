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
const FAIL_MISSING_WORKER_FLAG_STEP_ID = 'fail_caller_alerts_without_worker_flag';

const CALLER_ALERT = {
  _id: 'alert-without-worker-flag',
  _index: '.internal.alerts-security.alerts-default-000001',
  '@timestamp': '2026-01-01T00:00:00.000Z',
  kibana: { alert: { rule: { uuid: '11111111-1111-1111-1111-111111111111' } } },
};

/** Prefer the finish record — enter/scope records for the same stepId often have `output: null`. */
const findStepWithOutput = (
  steps: WorkflowStepExecutionDto[],
  stepId: string
): WorkflowStepExecutionDto | undefined =>
  [...steps].reverse().find((step) => step.stepId === stepId && step.output != null);

/**
 * Gate / skip-path runtime checks for the managed Alert Analysis workflow.
 *
 * These runs supply no alert event (and no connector), so analysis_enabled skips
 * classification, tags, notes, and auto-close. They do not replace alert-bearing
 * writeback coverage (eval suite / desk smoke with a connector). They do prove:
 *   - the managed workflow is installed and runnable
 *   - omitting both calledByWorker and alerts hits neither fail gate
 *   - calledByWorker + empty alerts fails instead of completing empty
 *   - alerts without calledByWorker fails instead of analysing nothing
 */
apiTest.describe(
  'Alert Analysis managed workflow — caller alerts gates',
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
      'skip-path run without calledByWorker completes and does not hit the empty-alerts fail gate',
      async ({ apiClient }) => {
        // Omit calledByWorker — empty manual inputs → no pending alerts → analysis skipped.
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

    // Caller alerts are read only when calledByWorker is set, so without the flag the run would
    // analyse the (absent) trigger event and complete empty as if there had been no work.
    apiTest('fails when alerts are supplied without calledByWorker', async ({ apiClient }) => {
      const workflowExecutionId = await runWorkflow(
        apiClient,
        editorHeaders,
        ALERT_ANALYSIS_WORKFLOW_ID,
        { alerts: [CALLER_ALERT] }
      );
      const execution = await waitForExecution(
        apiClient,
        editorHeaders,
        workflowExecutionId,
        60_000
      );

      expect(execution.status).toBe(ExecutionStatus.FAILED);
      expect(
        execution.stepExecutions.some((step) => step.stepId === FAIL_MISSING_WORKER_FLAG_STEP_ID)
      ).toBe(true);
    });
  }
);
