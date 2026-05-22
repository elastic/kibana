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
  nextRunAt: string | null;
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

const isMaintainerStarted = (maintainer?: {
  taskStatus?: string;
  runs?: number;
}): maintainer is { taskStatus: string; runs: number } =>
  maintainer != null &&
  maintainer.taskStatus != null &&
  maintainer.taskStatus.toLowerCase() === 'started';

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
  // Phase 1: Wait until the maintainer task exists and is started.
  await retry.waitForWithTimeout(
    `Entity maintainer "${maintainerId}" to be started`,
    60_000,
    async () => {
      const response = await routes.getMaintainers(200, [maintainerId]);
      const maintainer = response.body.maintainers.find(
        (m: { id: string; taskStatus: string }) => m.id === maintainerId
      );
      return isMaintainerStarted(maintainer);
    }
  );

  // Phase 2: Wait for any pending TM auto-run to complete. After
  // startMaintainer (bulkEnable), TM may auto-run the task if runAt is in
  // the past. We detect this by waiting until nextRunAt is in the future,
  // which means any auto-run has completed and TM has set runAt to
  // now + interval. We also require runs to be stable (unchanged across
  // two consecutive polls) to handle the case where nextRunAt is already
  // in the future (no auto-run pending).
  let lastSeenRuns = -1;
  await retry.waitForWithTimeout(
    `Entity maintainer "${maintainerId}" to settle (no in-flight auto-run)`,
    60_000,
    async () => {
      const response = await routes.getMaintainers(200, [maintainerId]);
      const maintainer = response.body.maintainers.find(
        (m: { id: string; runs: number; nextRunAt?: string | null }) => m.id === maintainerId
      );
      if (!maintainer) return false;

      const nextRunAt = (maintainer as { nextRunAt?: string | null }).nextRunAt;
      const isNextRunInFuture = nextRunAt != null && new Date(nextRunAt).getTime() > Date.now();

      // If nextRunAt is in the future, TM won't auto-run. Confirm runs
      // are also stable to be safe.
      if (isNextRunInFuture) {
        const runs = maintainer.runs;
        if (runs === lastSeenRuns) return true;
        lastSeenRuns = runs;
        return false;
      }

      // nextRunAt is in the past — TM may be about to auto-run or is
      // currently running. Keep waiting.
      lastSeenRuns = -1;
      return false;
    }
  );

  // Capture baseline runs AFTER settling.
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

  // Phase 3: Trigger a new run and wait for it to complete.
  // Since Phase 2 ensured nextRunAt is in the future (i.e. TM won't
  // auto-run), calling runSoon is safe — there's no concurrent execution
  // to cause a version_conflict_engine_exception.
  const requiredNewRuns = minRuns;
  let manualRunTriggered = !triggerRun;

  await retry.waitForWithTimeout(
    `Entity maintainer "${maintainerId}" to complete at least ${requiredNewRuns} new run(s) (baseline: ${baselineRuns})`,
    timeoutMs,
    async () => {
      const response = await routes.getMaintainers(200, [maintainerId]);
      const maintainer = response.body.maintainers.find(
        (m: { id: string; runs: number }) => m.id === maintainerId
      );

      if (!maintainer) return false;
      if (maintainer.runs >= baselineRuns + requiredNewRuns) return true;

      if (!manualRunTriggered) {
        try {
          await routes.runMaintainer(maintainerId);
          manualRunTriggered = true;
        } catch {
          // Swallow — may race with a just-completed auto-run follow-up.
        }
      }

      return false;
    }
  );

  // Phase 4: Wait for runs to stabilise so any follow-up run triggered by
  // runSoon completes before we hand control back.
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
  // Also delete any regular index with the same name — a partially-failed
  // cleanup can orphan a backing index that blocks data stream re-creation
  // ("data stream [X] conflicts with index").
  await es.indices.delete({ index: alias }, { ignore: [404] }).catch(addError);
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
