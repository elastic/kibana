/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { KibanaRole } from '@kbn/scout-oblt';
import type { WorkflowExecutionDto, WorkflowExecutionListDto } from '@kbn/workflows';
import { NIGHTSHIFT_ENABLED_FLAG, NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import {
  apiTest,
  COMMON_HEADERS,
  cancelWorkflowRuns,
  listSharedInvestigations,
  startUnresponsiveLlm,
  uniqueId,
  getSharedInvestigation,
} from '../fixtures';
import type { SharedInvestigation } from '../fixtures';

// An automation's workflow is bound to the Nightshift automations service account, and the
// workflows plugin requires the cluster privilege `manage_security` to write a bound workflow.
// Creating, changing and deleting automations therefore needs more than Nightshift privileges.
const ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_security'], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        [NIGHTSHIFT_FEATURE_ID]: ['all'],
        agentBuilder: ['all'],
        workflowsManagement: ['all'],
        actions: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
const WORKFLOW_HEADERS = { ...COMMON_HEADERS, 'elastic-api-version': '2023-10-31' };
const AUTOMATIONS_PATH = 'internal/nightshift/automations';

apiTest.describe('Scheduled Nightshift automations', { tag: tags.stateful.classic }, () => {
  let cookieHeader: Record<string, string>;
  let llm: Awaited<ReturnType<typeof startUnresponsiveLlm>>;
  const automations: Array<{ id: string; workflowId: string }> = [];

  apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: true },
    });
    ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));
    llm = await startUnresponsiveLlm();
  });

  apiTest.afterEach(async ({ apiClient, kbnClient }) => {
    for (const automation of automations.splice(0)) {
      await cancelWorkflowRuns(kbnClient, automation.workflowId);
      await apiClient.delete(`${AUTOMATIONS_PATH}/${automation.id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
    }
    await cancelWorkflowRuns(kbnClient);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    llm.close();
    await apiServices.core.settings({
      'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: null },
    });
  });

  apiTest(
    'an edited schedule starts a scoped investigation and stops it at the configured timeout',
    async ({ apiClient, kbnClient }) => {
      apiTest.setTimeout(240_000);
      const name = uniqueId('scout-scheduled');
      const due = new Date(Date.now() + 90_000);
      const schedule = {
        kind: 'schedule',
        schedulePreset: 'daily',
        timezone: 'UTC',
        time: due.toISOString().slice(11, 16),
        scopeQuery: 'service.name:checkout',
      };
      const body = {
        name,
        isEnabled: true,
        trigger: { rows: [{ kind: 'alert' }, schedule] },
        execution: { promptTemplate: 'Review checkout errors during the last hour.' },
        completions: [],
        runtime: { timeoutSeconds: 30 },
      };
      for (const isEnabled of [false, true]) {
        const response = await apiClient.post(AUTOMATIONS_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            ...body,
            isEnabled,
            trigger: isEnabled
              ? {
                  rows: [
                    { kind: 'alert' },
                    {
                      ...schedule,
                      time: `${String((due.getUTCHours() + 1) % 24).padStart(2, '0')}:${String(
                        due.getUTCMinutes()
                      ).padStart(2, '0')}`,
                    },
                  ],
                }
              : body.trigger,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        automations.push(response.body as { id: string; workflowId: string });
      }
      const [disabled, enabled] = automations;
      const updated = await apiClient.put(`${AUTOMATIONS_PATH}/${enabled.id}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { trigger: { rows: body.trigger.rows } },
        responseType: 'json',
      });
      expect(updated).toHaveStatusCode(200);
      expect(updated.body).toMatchObject({ trigger: body.trigger });
      const workflow = await kbnClient.request<{ valid: boolean }>({
        method: 'GET',
        path: `/api/workflows/workflow/${enabled.workflowId}`,
        headers: WORKFLOW_HEADERS,
      });
      expect(workflow.data.valid).toBe(true);

      let investigation: SharedInvestigation | undefined;
      await expect
        .poll(
          async () => {
            const response = await listSharedInvestigations(
              apiClient,
              cookieHeader,
              'subject_type=manual'
            );
            expect(response).toHaveStatusCode(200);
            const { results } = response.body as { results: SharedInvestigation[] };
            investigation = results.find((item) =>
              item.subjects.some((subject) => subject.summary === name)
            );
            return investigation?.in_progress;
          },
          { timeout: 150_000, intervals: [1_000] }
        )
        .toBe(true);
      if (!investigation) throw new Error('Scheduled investigation was not created');
      const investigationId = investigation.id;
      expect(investigation.subjects).toMatchObject([
        { type: 'manual', id: investigationId, trigger_type: 'automatic' },
      ]);

      const getRuns = () =>
        kbnClient.request<WorkflowExecutionListDto>({
          method: 'GET',
          path: '/api/workflows/workflow/system-nightshift-investigation/executions',
          headers: WORKFLOW_HEADERS,
          query: { concurrencyGroupKey: `investigation:${investigationId}`, size: 20 },
        });
      const runs = await getRuns();
      expect(runs.data.results).toHaveLength(1);
      const execution = await kbnClient.request<WorkflowExecutionDto>({
        method: 'GET',
        path: `/api/workflows/executions/${runs.data.results[0].id}`,
        headers: WORKFLOW_HEADERS,
      });
      // The run executes the stored definition untouched, because the space's entry point is
      // bound to a service account. The automation's timeout travels as an input, which the
      // entry point applies to the step that runs this workflow.
      expect(execution.data.workflowDefinition.settings?.timeout).toBe('60m');
      expect(execution.data.context).toMatchObject({
        inputs: {
          message: body.execution.promptTemplate,
          timeout_seconds: body.runtime.timeoutSeconds,
          context: { scope_query: schedule.scopeQuery, source: 'manual' },
        },
      });
      // The entry point caps its investigation step with the automation's timeout, so the run it
      // waits on is cancelled when that elapses, rather than timing itself out.
      await expect
        .poll(async () => (await getRuns()).data.results[0]?.status, {
          timeout: 90_000,
          intervals: [1_000],
        })
        .toBe('cancelled');
      await expect
        .poll(
          async () => {
            const response = await getSharedInvestigation(apiClient, cookieHeader, investigationId);
            return (response.body as SharedInvestigation).in_progress;
          },
          { timeout: 30_000, intervals: [1_000] }
        )
        .toBe(false);
      const disabledRuns = await apiClient.get(`${AUTOMATIONS_PATH}/${disabled.id}/runs`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(disabledRuns).toHaveStatusCode(200);
      expect(disabledRuns.body).toMatchObject({ total: 0, runs: [] });
    }
  );

  apiTest(
    'rejects unsupported schedules and missing instructions without creating an automation',
    async ({ apiClient }) => {
      for (const overrides of [
        { execution: {} },
        {
          trigger: {
            rows: [{ kind: 'schedule', schedulePreset: 'custom' }],
          },
        },
        {
          trigger: {
            rows: [{ kind: 'schedule', schedulePreset: 'daily', time: '25:00' }],
          },
        },
      ]) {
        const response = await apiClient.post(AUTOMATIONS_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
          body: {
            name: uniqueId('invalid-schedule'),
            trigger: {
              rows: [{ kind: 'schedule', schedulePreset: 'daily', time: '09:00' }],
            },
            execution: { promptTemplate: 'Review health.' },
            completions: [],
            runtime: {},
            ...overrides,
          },
        });
        expect(response).toHaveStatusCode(400);
      }
    }
  );
});
