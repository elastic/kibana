/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { ApiClient } from '../fixtures';
import { apiTest, tags, testData, waitForExecution } from '../fixtures';

// Inline IDs to avoid pulling in @kbn/workflows, which imports YAML files that
// Playwright's esbuild transform cannot load (same convention as the
// significant_events managed-workflows spec).
const RULE_PREVIEW_WORKFLOW_ID = 'system-security-rule-preview';

// Continuous Threat Hunt is a dynamic, templated Worker: it is installed per
// space on first enable, never at startup, and the installed document id carries
// a space suffix (`resolveWorkflowDocumentId` in
// workflows_management/server/services/managed_workflows_service.ts). Resolve the
// definition id from the live catalog instead of hardcoding one, because it was
// renamed on main while this branch's base still carried the `dark_` prefix.
const CTH_WORKER_IDS = [
  'system-security-dark-continuous-threat-hunt',
  'system-security-hunt-continuous-threat-hunt',
] as const;

const SPACE_ID = 'default';

// A suite-owned source index. `WHERE false` does not bypass ES|QL source
// resolution: on a cluster with no matching index the query fails to resolve and
// the preview reports `succeeded: false`, so relying on `logs-*` would make this
// suite's happy path depend on unrelated suites or deployment data.
// The name is suffixed with the Playwright worker index
// (TEST_PARALLEL_INDEX, set per worker process) so concurrent runs against
// the same Scout server each own — and only delete — their own index.
const SOURCE_INDEX = `alertzero-preview-source-${process.env.TEST_PARALLEL_INDEX ?? '0'}`;

const installedWorkflowId = (definitionId: string) => `${definitionId}-${SPACE_ID}`;

// The workflow.output step persists its rendered `with:` object as the step's
// own `output`. Each step produces two entries in stepExecutions — an "enter"
// record (output: null) and a "result" record (output: data) — so read the
// emit_result result record, never the execution-level DTO (which has no output).
const EMIT_RESULT_STEP_ID = 'emit_result';

type Execution = Awaited<ReturnType<typeof waitForExecution>>;

const emitResultOutput = (execution: Execution): Record<string, unknown> => {
  const emit = (execution.stepExecutions ?? []).find(
    (s) => s.stepId === EMIT_RESULT_STEP_ID && s.output != null
  );
  return (emit?.output ?? {}) as Record<string, unknown>;
};

// A valid ESQL rule preview that matches nothing, so it exercises the real
// enforcing surface (kibana.request → detection_engine/rules/preview → the
// .preview alert index) and reports a zero count.
const happyPathPreviewBody = () => ({
  type: 'esql',
  language: 'esql',
  name: 'AlertZero preview smoke',
  description: 'Matches nothing; verifies the preview workflow reports a zero alert count.',
  query: `FROM ${SOURCE_INDEX} | WHERE false`,
  severity: 'low',
  risk_score: 21,
  invocationCount: 1,
  timeframeEnd: new Date().toISOString(),
});

const runManagedWorkflow = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  workflowId: string,
  inputs: Record<string, unknown>
): Promise<Execution> => {
  const res = await apiClient.post(`/api/workflows/workflow/${workflowId}/run`, {
    headers,
    responseType: 'json',
    body: { inputs },
  });
  expect(res).toHaveStatusCode(200);
  const executionId = (res.body as { workflowExecutionId: string }).workflowExecutionId;
  return waitForExecution(apiClient, headers, executionId);
};

apiTest.describe(
  'AlertZero managed detection-rule workflows',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
      await esClient.indices.create({
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'keyword' },
          },
        },
      });
      await esClient.index({
        index: SOURCE_INDEX,
        refresh: true,
        document: { '@timestamp': new Date().toISOString(), message: 'alertzero preview source' },
      });
    });

    apiTest.afterAll(async ({ esClient, apiClient, samlAuth }) => {
      // The Continuous Threat Hunt test enables the Worker (a persistent
      // install-side effect in the shared default space); managed workflows
      // cannot be deleted, so restore the prior state by disabling it. Runs
      // even when that test failed midway, which is why the PATCH tolerates a
      // worker the catalog no longer lists.
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const internalHeaders = { ...cookieHeader, ...testData.INTERNAL_COMMON_HEADERS };
      const catalogResponse = await apiClient.get('internal/alertzero/workers', {
        headers: internalHeaders,
        responseType: 'json',
      });
      if (catalogResponse.statusCode === 200) {
        const workerIds = (
          (catalogResponse.body as { workers?: Array<{ id: string }> }).workers ?? []
        ).map((worker) => worker.id);
        const workerId = CTH_WORKER_IDS.find((id) => workerIds.includes(id));
        if (workerId) {
          await apiClient.patch(`internal/alertzero/workers/${workerId}`, {
            headers: internalHeaders,
            responseType: 'json',
            body: { enabled: false },
          });
        }
      }
      await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
    });

    apiTest('rule_preview: is installed and valid', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('editor');
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(
              `api/workflows/workflow/${RULE_PREVIEW_WORKFLOW_ID}`,
              { headers: { ...cookieHeader, ...testData.COMMON_HEADERS }, responseType: 'json' }
            );
            return response.statusCode === 200 ? response.body.valid : false;
          },
          { timeout: 20_000, intervals: [1_000] }
        )
        .toBe(true);
    });

    apiTest(
      'rule_preview: succeeds and reports a zero alert count for a query that matches nothing',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('editor');
        const headers = { ...cookieHeader, ...testData.COMMON_HEADERS };

        const execution = await runManagedWorkflow(apiClient, headers, RULE_PREVIEW_WORKFLOW_ID, {
          preview_body: happyPathPreviewBody(),
          space_id: SPACE_ID,
        });

        expect(execution.status).toBe(ExecutionStatus.COMPLETED);
        const outputs = emitResultOutput(execution);
        expect(outputs.succeeded).toBe(true);
        // The count is the value callers diff tuning proposals on. `-1` is the
        // workflow's own fallback when the count is unavailable, and
        // `Number.isFinite(-1)` is true, so assert the exact expected value:
        // this query matches nothing, so the only correct count is zero.
        expect(outputs.alert_count).toBe(0);
        expect(outputs.error_text ?? '').toBe('');
      }
    );

    apiTest(
      'continuous_threat_hunt worker: installs as a console stub until real coverage exists',
      async ({ apiClient, samlAuth }) => {
        // Guard against #290148-style landings: if this Worker ever stops being a
        // console stub, this assertion fails and forces a real executing test (and
        // eval suite) to be added in the same PR.
        //
        // Admin is required here: listing and enabling a Worker is an AlertZero
        // API write (`alertzero_write`), and installing the Worker is what creates
        // the per-space managed document this test asserts on.
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        // Internal AlertZero routes need `elastic-api-version: 1`; the public
        // workflows API would reject that version, so keep the two sets apart.
        const internalHeaders = { ...cookieHeader, ...testData.INTERNAL_COMMON_HEADERS };
        const workflowsHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS };

        const catalogResponse = await apiClient.get('internal/alertzero/workers', {
          headers: internalHeaders,
          responseType: 'json',
        });
        expect(catalogResponse).toHaveStatusCode(200);
        const workerIds = (
          (catalogResponse.body as { workers?: Array<{ id: string }> }).workers ?? []
        ).map((worker) => worker.id);
        const workerId = CTH_WORKER_IDS.find((id) => workerIds.includes(id));
        expect(workerId).toBeDefined();

        const installResponse = await apiClient.patch(
          `internal/alertzero/workers/${workerId as string}`,
          { headers: internalHeaders, responseType: 'json', body: { enabled: true } }
        );
        expect(
          installResponse,
          `enabling the Worker failed: ${JSON.stringify(installResponse.body)}`
        ).toHaveStatusCode(200);

        const workflowId = installedWorkflowId(workerId as string);
        await expect
          .poll(
            async () => {
              const response = await apiClient.get(`api/workflows/workflow/${workflowId}`, {
                headers: workflowsHeaders,
                responseType: 'json',
              });
              return response.statusCode;
            },
            { timeout: 20_000, intervals: [1_000] }
          )
          .toBe(200);

        const workflowResponse = await apiClient.get(`api/workflows/workflow/${workflowId}`, {
          headers: workflowsHeaders,
          responseType: 'json',
        });
        const yaml = (workflowResponse.body as { yaml?: string }).yaml ?? '';

        // `toContain('type: console')` alone would still pass after a real step is
        // appended next to the stub, so pin the whole step list instead: exactly
        // one step, and it is the console stub.
        const stepsIndex = yaml.search(/^steps:/m);
        expect(stepsIndex).toBeGreaterThan(-1);
        const stepsSection = yaml.slice(stepsIndex);
        expect(stepsSection).toContain('- name: stub');
        const stepTypes = [...stepsSection.matchAll(/^\s*type: (\S+)/gm)].map((match) => match[1]);
        expect(stepTypes).toStrictEqual(['console']);
      }
    );
  }
);
