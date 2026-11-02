/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import { ALERTZERO_WORKERS_URL, HUNT_WORKER_INDEX_COVERAGE_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import {
  apiTest,
  readSupplyStatus,
  runCleanupSteps,
  setDefaultIndexInSpace,
  setHuntEnabled,
  setSupplyWorkflowEnabled,
  setupHuntPrerequisites,
  spaceUrl,
  tags,
  waitForFinishedSweepGate,
  withHuntHeaders,
} from '../fixtures';
import type { HuntPrerequisites, SupplyWorkflowKey } from '../fixtures';

const RUN = Date.now();
const SPACE = `hunt-cov-sweep-${RUN}`;
const CUSTOM_PATTERN = `custom-edr-b-${RUN}-*`;
const CUSTOM_INDEX = `custom-edr-b-${RUN}-1`;
const DEPLOYMENT_SUPPLY_KEYS: readonly SupplyWorkflowKey[] = ['ingest', 'enrich'];
const HUNT_WORKER_ID_FRAGMENT = 'hunt-continuous-threat-hunt';

interface WorkerRow {
  id: string;
  workflowId: string | null;
  state: string;
  stateReason?: string;
}

/**
 * The Hunt worker's index coverage route, sweep path: the worker's own view of the default data
 * view, read from the stored `check_index_scope` output of its last finished sweep. The fake
 * `.gen-ai` connector makes later steps fail; the gate step runs before any model call. The
 * universe names only a custom pattern the built-in role cannot read, so the sweep is blocked.
 */
apiTest.describe(
  'Hunt Watch - worker index coverage, sweep path',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;
    let prerequisites: HuntPrerequisites;
    const initialSupplyEnabled: Partial<Record<SupplyWorkflowKey, boolean>> = {};

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      await apiServices.spaces.create({ id: SPACE, name: SPACE });
      await apiServices.spaces.setSolutionView({ id: SPACE, solution: 'security' });
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = withHuntHeaders(cookieHeader);
      await esClient.index({
        index: CUSTOM_INDEX,
        document: { '@timestamp': new Date().toISOString(), message: 'scout' },
        refresh: true,
      });
      prerequisites = await setupHuntPrerequisites({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
      });
      // Enabling Hunt turns the deployment-wide ingest and enrich workflows on, and disabling it
      // turns them off when no other space hunts. Record them so afterAll puts them back.
      const baseline = await readSupplyStatus(apiClient, adminHeaders, SPACE);
      expect(baseline.statusCode).toBe(200);
      for (const key of DEPLOYMENT_SUPPLY_KEYS) {
        initialSupplyEnabled[key] = baseline.body.workflows.find((row) => row.key === key)?.enabled;
      }
      await setDefaultIndexInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
        patterns: [CUSTOM_PATTERN],
      });
    });

    apiTest.afterAll(async ({ apiServices, apiClient, esClient }) => {
      await runCleanupSteps([
        {
          name: 'disable the hunt worker',
          run: () =>
            setHuntEnabled({ apiClient, headers: adminHeaders, spaceId: SPACE, enabled: false }),
        },
        {
          name: 'restore deployment supply rows',
          run: async () => {
            const after = await readSupplyStatus(apiClient, adminHeaders, SPACE);
            for (const key of DEPLOYMENT_SUPPLY_KEYS) {
              const initial = initialSupplyEnabled[key];
              const current =
                after.statusCode === 200
                  ? after.body.workflows.find((row) => row.key === key)
                  : undefined;
              if (initial !== undefined && current?.installed && current.enabled !== initial) {
                await setSupplyWorkflowEnabled({
                  apiClient,
                  headers: adminHeaders,
                  key,
                  enabled: initial,
                });
              }
            }
          },
        },
        {
          name: 'delete the custom index',
          run: () => esClient.indices.delete({ index: CUSTOM_INDEX, ignore_unavailable: true }),
        },
        { name: 'clean up prerequisites', run: async () => prerequisites.cleanup() },
        { name: `delete space ${SPACE}`, run: () => apiServices.spaces.delete(SPACE) },
      ]);
    });

    apiTest('reads the last sweep and reports the worker as degraded', async ({ apiClient }) => {
      const enabled = await setHuntEnabled({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
        enabled: true,
        serviceAccountId: prerequisites.serviceAccountId,
      });
      expect(enabled.statusCode).toBe(200);

      const listed = await apiClient.get(spaceUrl(ALERTZERO_WORKERS_URL, SPACE), {
        headers: adminHeaders,
        responseType: 'json',
      });
      const workflowId = (listed.body as { workers: WorkerRow[] }).workers.find(({ id }) =>
        id.includes(HUNT_WORKER_ID_FRAGMENT)
      )?.workflowId;
      expect(typeof workflowId).toBe('string');

      const gate = await waitForFinishedSweepGate({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
        workflowId: workflowId as string,
      });
      expect(gate?.output).toBeDefined();

      const coverage = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
        headers: adminHeaders,
        responseType: 'json',
      });
      const body = coverage.body as HuntWorkerIndexCoverageResponse;
      expect(body).toMatchObject({
        source: 'last_sweep',
        checked_at: gate?.stepFinishedAt ?? gate?.stepStartedAt,
        service_account_id: prerequisites.serviceAccountId,
        unreadable_by_worker: [CUSTOM_PATTERN],
        missing_for_everyone: [],
      });

      const after = await apiClient.get(spaceUrl(ALERTZERO_WORKERS_URL, SPACE), {
        headers: adminHeaders,
        responseType: 'json',
      });
      const hunt = (after.body as { workers: WorkerRow[] }).workers.find(({ id }) =>
        id.includes(HUNT_WORKER_ID_FRAGMENT)
      );
      expect(hunt?.state).toBe('degraded');
      expect(hunt?.stateReason).toContain(body.account_label);
    });
  }
);
