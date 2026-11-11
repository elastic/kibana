/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags, type ApiClientFixture, type KibanaRole } from '@kbn/scout-oblt';
import { NIGHTSHIFT_ENABLED_FLAG, NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import {
  apiTest,
  COMMON_HEADERS,
  NIGHTSHIFT_READ_ROLE,
  disableInvestigationRunLimits,
  startUnresponsiveLlm,
  uniqueId,
} from '../fixtures';

const createRequest =
  (apiClient: ApiClientFixture, cookies: () => Record<string, string>) =>
  <T = object>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    body?: object,
    auth = cookies()
  ) =>
    apiClient[method]<T>(path, {
      headers: {
        ...COMMON_HEADERS,
        ...auth,
        ...(path.startsWith('api/workflows') ? { 'elastic-api-version': '2023-10-31' } : {}),
      },
      responseType: 'json',
      ...(body ? { body } : {}),
    });

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
const PATH = 'internal/nightshift/automations';
const RECOVERY_JOURNEY_TIMEOUT_MS = 240_000;
const SCHEDULED_RUN_TIMEOUT_MS = 150_000;
const MANUAL_RUN_TIMEOUT_MS = 60_000;
interface Automation {
  id: string;
  workflowId: string;
  previousWorkflowIds?: string[];
  isEnabled: boolean;
  backingWorkflow: { state: string };
}
interface History {
  runs: Array<{ id: string; investigationId?: string }>;
  total: number;
  usedToday: number;
}

apiTest.describe(
  'Automation backing workflow recovery',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.observability.complete],
  },
  () => {
    let cookieHeader: Record<string, string>;
    let llm: Awaited<ReturnType<typeof startUnresponsiveLlm>>;
    let automation: Automation | undefined;
    const workflowIds = new Set<string>();

    apiTest.beforeAll(async ({ apiServices, samlAuth, kbnUrl, log }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: true },
      });
      await disableInvestigationRunLimits({ kbnUrl, samlAuth, log });
      ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));
      llm = await startUnresponsiveLlm();
    });

    apiTest.afterAll(async ({ apiClient, apiServices, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));
      const request = createRequest(apiClient, () => cookieHeader);
      for (const id of [...workflowIds, 'system-nightshift-investigation']) {
        await request('post', `api/workflows/workflow/${id}/executions/cancel`);
      }
      if (automation) {
        await request('post', `${PATH}/${automation.id}/repair`);
        await request('delete', `${PATH}/${automation.id}`);
      }
      llm.close();
      await apiServices.core.settings({
        'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: null },
      });
    });

    apiTest(
      'preserves automatic usage and history when paused, repaired and run again',
      async ({ apiClient, samlAuth }) => {
        apiTest.setTimeout(RECOVERY_JOURNEY_TIMEOUT_MS);
        const request = createRequest(apiClient, () => cookieHeader);
        const due = new Date(Date.now() + 90_000);
        const created = await request('post', PATH, {
          name: uniqueId('scout-recovery'),
          isEnabled: true,
          trigger: {
            rows: [
              {
                kind: 'schedule',
                schedulePreset: 'daily',
                time: due.toISOString().slice(11, 16),
                timezone: 'UTC',
              },
            ],
          },
          execution: { promptTemplate: 'Review checkout health.' },
          completions: [],
          runtime: { timeoutSeconds: 30, dailyDispatchLimit: 3 },
        });
        expect(created).toHaveStatusCode(200);
        automation = created.body as Automation;
        const id = automation.id;
        const originalWorkflowId = automation.workflowId;
        workflowIds.add(originalWorkflowId);
        const getHistory = async (query = ''): Promise<History> => {
          const response = await request('get', `${PATH}/${id}/runs${query}`);
          expect(response).toHaveStatusCode(200);
          return response.body as History;
        };
        let before: History = { runs: [], total: 0, usedToday: 0 };
        await expect
          .poll(
            async () => {
              before = await getHistory();
              return Boolean(before.runs[0]?.investigationId);
            },
            { timeout: SCHEDULED_RUN_TIMEOUT_MS, intervals: [1_000] }
          )
          .toBe(true);
        expect(before.usedToday).toBe(1);
        expect(before.total).toBe(1);
        expect(
          await request('post', `api/workflows/workflow/${originalWorkflowId}/executions/cancel`)
        ).toHaveStatusCode(200);

        expect(await request('put', `${PATH}/${id}`, { isEnabled: false })).toHaveStatusCode(200);

        expect(
          await request('delete', 'api/workflows', { ids: [originalWorkflowId] })
        ).toHaveStatusCode(200);
        const missing = await request('get', `${PATH}/${id}`);
        expect(missing).toHaveStatusCode(200);
        expect(missing.body).toMatchObject({
          isEnabled: false,
          backingWorkflow: { state: 'missing' },
        });
        const refusedRun = await request('post', `${PATH}/${id}/run`);
        expect(refusedRun).toHaveStatusCode(409);
        expect(refusedRun.body).toMatchObject({ message: expect.stringContaining('Repair') });

        const readAuth = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ROLE);
        const readWarning = await request('get', `${PATH}/${id}`, undefined, readAuth.cookieHeader);
        expect(readWarning).toHaveStatusCode(200);
        expect(readWarning.body).toMatchObject({ backingWorkflow: { state: 'missing' } });
        expect(
          await request('post', `${PATH}/${id}/repair`, undefined, readAuth.cookieHeader)
        ).toHaveStatusCode(403);
        ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));

        for (const body of [{ isEnabled: true }, { name: 'Changed' }]) {
          const refusedUpdate = await request('put', `${PATH}/${id}`, body);
          expect(refusedUpdate).toHaveStatusCode(409);
          expect(refusedUpdate.body).toMatchObject({ message: expect.stringContaining('Repair') });
        }
        const pausedMissing = await request('put', `${PATH}/${id}`, { isEnabled: false });
        expect(pausedMissing).toHaveStatusCode(200);
        expect(pausedMissing.body).toMatchObject({
          isEnabled: false,
          workflowId: originalWorkflowId,
          backingWorkflow: { state: 'missing' },
        });
        const repaired = await request('post', `${PATH}/${id}/repair`);
        expect(repaired).toHaveStatusCode(200);
        automation = repaired.body as Automation;
        workflowIds.add(automation.workflowId);
        expect(automation).toMatchObject({
          isEnabled: false,
          previousWorkflowIds: [originalWorkflowId],
          backingWorkflow: { state: 'available' },
        });
        expect(automation.workflowId).not.toBe(originalWorkflowId);
        const workflow = await request('get', `api/workflows/workflow/${automation.workflowId}`);
        expect(workflow).toHaveStatusCode(200);
        expect(workflow.body).toMatchObject({
          enabled: false,
          definition: { settings: { run_as: 'kibana/nightshift_automations' } },
        });
        expect(await getHistory()).toMatchObject({
          total: before.total,
          usedToday: before.usedToday,
          runs: [
            expect.objectContaining({
              id: before.runs[0].id,
              investigationId: before.runs[0].investigationId,
            }),
          ],
        });
        const enabled = await request('put', `${PATH}/${id}`, { isEnabled: true });
        expect(enabled).toHaveStatusCode(200);
        const run = await request('post', `${PATH}/${id}/run`);
        expect(run).toHaveStatusCode(200);
        const { workflowExecutionId } = run.body as { workflowExecutionId: string };
        let after: History = before;
        await expect
          .poll(
            async () => {
              after = await getHistory();
              return Boolean(
                after.runs.find((item) => item.id === workflowExecutionId)?.investigationId
              );
            },
            { timeout: MANUAL_RUN_TIMEOUT_MS, intervals: [1_000] }
          )
          .toBe(true);
        expect(after.total).toBe(2);
        expect(after.usedToday).toBe(before.usedToday);
        expect(new Set(after.runs.map((item) => item.investigationId)).size).toBe(2);
        const firstPage = await getHistory('?page=1&size=1');
        const secondPage = await getHistory('?page=2&size=1');
        expect(firstPage.total).toBe(2);
        expect(secondPage.total).toBe(2);
        expect(new Set([firstPage.runs[0].id, secondPage.runs[0].id])).toStrictEqual(
          new Set(after.runs.map((item) => item.id))
        );
        expect(
          await request('post', `api/workflows/workflow/${automation.workflowId}/executions/cancel`)
        ).toHaveStatusCode(200);
        expect(
          await request('delete', 'api/workflows', {
            ids: [automation.workflowId],
          })
        ).toHaveStatusCode(200);
        expect(await request('delete', `${PATH}/${id}`)).toHaveStatusCode(200);
        automation = undefined;
      }
    );
  }
);
