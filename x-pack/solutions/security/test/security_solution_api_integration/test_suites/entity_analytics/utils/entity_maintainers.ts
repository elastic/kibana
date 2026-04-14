/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';

const ENTITY_STORE_INTERNAL_API_VERSION = '2';

const withHeaders = (req: SuperTest.Test) =>
  req
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', ENTITY_STORE_INTERNAL_API_VERSION)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana');

export interface EntityMaintainerResponse {
  id: string;
  taskStatus: string;
  interval: string;
  description: string | null;
  customState: Record<string, unknown> | null;
  runs: number;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}

interface RetryServiceLike {
  waitForWithTimeout: (
    label: string,
    timeout: number,
    predicate: () => Promise<boolean>
  ) => Promise<void>;
}

const isMaintainerAlreadyRunningError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('currently running') || message.includes('failed to run task');
};

export const entityMaintainerRouteHelpersFactory = (
  supertest: SuperTest.Agent,
  namespace?: string
) => {
  const getMaintainers = async (expectStatusCode: number = 200, ids?: string[]) => {
    let req = supertest.get(
      routeWithNamespace(ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET, namespace)
    );
    if (ids && ids.length > 0) {
      req = req.query({ ids });
    }
    const response = await withHeaders(req).expect(expectStatusCode);
    return response as SuperTest.Response & {
      body: { maintainers: EntityMaintainerResponse[] };
    };
  };

  return {
    getMaintainers,

    initMaintainers: async ({
      expectStatusCode = 200,
      autoStart,
    }: {
      expectStatusCode?: number;
      autoStart?: boolean;
    } = {}) => {
      const response = await withHeaders(
        supertest.post(
          routeWithNamespace(ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT, namespace)
        )
      )
        .send(autoStart === undefined ? {} : { autoStart })
        .expect((res) => {
          if (res.status !== expectStatusCode) {
            throw new Error(
              `initMaintainers failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
            );
          }
        });
      return response;
    },

    runMaintainer: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN.replace('{id}', id);
      const response = await withHeaders(supertest.post(routeWithNamespace(route, namespace)))
        .send()
        .expect(expectStatusCode);
      return response;
    },

    runMaintainerSync: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN.replace('{id}', id);
      const response = await withHeaders(
        supertest.post(routeWithNamespace(route, namespace)).query({ sync: 'true' })
      )
        .timeout(10 * 60 * 1000)
        .send()
        .expect(expectStatusCode);
      return response;
    },

    startMaintainer: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_START.replace('{id}', id);
      const response = await withHeaders(supertest.put(routeWithNamespace(route, namespace)))
        .send()
        .expect(expectStatusCode);
      return response;
    },

    stopMaintainer: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_STOP.replace('{id}', id);
      const response = await withHeaders(supertest.put(routeWithNamespace(route, namespace)))
        .send()
        .expect(expectStatusCode);
      return response;
    },

    getRiskScoreMaintainer: async (): Promise<EntityMaintainerResponse | null> => {
      const response = await getMaintainers(200, ['risk-score']);
      const maintainers: EntityMaintainerResponse[] = response.body.maintainers ?? [];
      return maintainers.find((m) => m.id === 'risk-score') ?? null;
    },
  };
};

export const waitForMaintainerRun = async ({
  retry,
  routes,
  minRuns = 1,
  maintainerId = 'risk-score',
  timeoutMs = 60_000,
  triggerRun = true,
}: {
  retry: RetryServiceLike;
  routes: Pick<
    ReturnType<typeof entityMaintainerRouteHelpersFactory>,
    'getMaintainers' | 'runMaintainer'
  >;
  minRuns?: number;
  maintainerId?: string;
  timeoutMs?: number;
  triggerRun?: boolean;
}): Promise<void> => {
  // Wait for the runs count to stabilise across two consecutive polls so the
  // task is idle before we capture the baseline and trigger a new run.
  // This prevents race conditions where runSoon silently swallows a 409 conflict
  // if the task is already running.
  let lastSeenRuns = -1;
  await retry.waitForWithTimeout(
    `Entity maintainer "${maintainerId}" to settle before run`,
    30_000,
    async () => {
      const response = await routes.getMaintainers(200, [maintainerId]);
      const maintainer = response.body.maintainers.find(
        (m: { id: string; runs: number }) => m.id === maintainerId
      );
      const runs = maintainer?.runs ?? 0;
      if (runs === lastSeenRuns) return true;
      lastSeenRuns = runs;
      return false;
    }
  );

  // Capture current runs count so we wait for an actual NEW run,
  // not a stale count from a previous test.
  let baselineRuns = 0;
  try {
    const baseline = await routes.getMaintainers(200, [maintainerId]);
    const existing = baseline.body.maintainers.find(
      (m: { id: string; runs: number }) => m.id === maintainerId
    );
    baselineRuns = existing?.runs ?? 0;
  } catch {
    // Maintainer may not exist yet
  }

  let requiredNewRuns = minRuns;
  let manualRunTriggered = !triggerRun;
  let alreadyRunningHandled = false;

  await retry.waitForWithTimeout(
    `Entity maintainer "${maintainerId}" to complete at least ${requiredNewRuns} new run(s) (baseline: ${baselineRuns})`,
    timeoutMs,
    async () => {
      // Keep trying to trigger a manual run until the task accepts it.
      // After stop/start a previous run may still be in-flight; when we
      // see "already running" we need one extra completion but must keep
      // retrying so we can trigger the additional run once the current
      // one finishes.
      if (!manualRunTriggered) {
        try {
          await routes.runMaintainer(maintainerId);
          manualRunTriggered = true;
        } catch (error) {
          if (isMaintainerAlreadyRunningError(error)) {
            if (!alreadyRunningHandled) {
              requiredNewRuns += 1;
              alreadyRunningHandled = true;
            }
          }
        }
      }

      const response = await routes.getMaintainers(200, [maintainerId]);
      const maintainer = response.body.maintainers.find(
        (m: { id: string; runs: number }) => m.id === maintainerId
      );

      return maintainer !== undefined && maintainer.runs >= baselineRuns + requiredNewRuns;
    }
  );

  // runSoon (called above via runMaintainer) can cause the task manager to
  // schedule an immediate follow-up run once the current one finishes.  If
  // the caller stops the maintainer while that follow-up is still saving its
  // state, a version_conflict_engine_exception wedges the task permanently.
  // Wait for the runs count to stabilise across two consecutive polls so the
  // task is idle before we hand control back.
  lastSeenRuns = -1;
  await retry.waitForWithTimeout(
    `Entity maintainer "${maintainerId}" to settle after run`,
    30_000,
    async () => {
      const response = await routes.getMaintainers(200, [maintainerId]);
      const maintainer = response.body.maintainers.find(
        (m: { id: string; runs: number }) => m.id === maintainerId
      );
      const runs = maintainer?.runs ?? 0;
      if (runs === lastSeenRuns) return true;
      lastSeenRuns = runs;
      return false;
    }
  );
};

export const cleanUpRiskScoreMaintainer = async ({
  es,
  log,
  namespace = 'default',
}: {
  es: Client;
  log: ToolingLog;
  namespace?: string;
}) => {
  const errors: Error[] = [];
  const addError = (e: Error) => errors.push(e);

  // Remove the Task Manager task document so the runs counter resets to 0
  // and setup() will re-run on next install. This is the most reliable way
  // to ensure clean state regardless of whether the uninstall API succeeded.
  const taskDocId = `task:risk-score:${namespace}`;
  await es
    .delete({ index: '.kibana_task_manager', id: taskDocId, refresh: true }, { ignore: [404] })
    .catch(addError);

  const alias = `risk-score.risk-score-${namespace}`;
  const template = `.risk-score.risk-score-${namespace}-index-template`;

  await es.indices.deleteDataStream({ name: alias }, { ignore: [404] }).catch(addError);
  await es.indices.deleteIndexTemplate({ name: template }, { ignore: [404] }).catch(addError);
  await es.cluster
    .deleteComponentTemplate({ name: `.risk-score-mappings-${namespace}` }, { ignore: [404] })
    .catch(addError);
  await es.ingest
    .deletePipeline(
      { id: `entity_analytics_create_eventIngest_from_timestamp-pipeline-${namespace}` },
      { ignore: [404] }
    )
    .catch(addError);

  if (errors.length > 0) {
    log.error(
      `Errors cleaning up risk score maintainer: ${errors.map((e) => e.message).join(', ')}`
    );
  }
};
