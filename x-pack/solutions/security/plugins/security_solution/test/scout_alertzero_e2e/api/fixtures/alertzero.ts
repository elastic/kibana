/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import {
  AD2_ALERTS_INDEX,
  AD2_SCENARIO_ALL_INDICES,
  buildAd2SeedPlan,
  getAd2ScenarioAlertIds,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import { ATTACK_SCENARIO_KEY } from '../../common/constants';
import { ok } from '../../common/kbn';
import type { AlertZeroApi } from '../../common/kbn';

const WORKERS_URL = '/internal/alertzero/workers';
const SERVICE_ACCOUNT_URL = '/internal/security/service_account';

export interface SeededScenario {
  readonly runMarker: string;
  readonly alertIds: readonly string[];
  readonly cleanup: () => Promise<void>;
}

/**
 * Indexes one AD2 attack chain (alerts + raw endpoint events) tagged with a marker owned by this
 * run, so cleanup removes only what this run wrote.
 */
export const seedAttackScenario = async (
  esClient: EsClient,
  api: AlertZeroApi,
  { scenarioKey = ATTACK_SCENARIO_KEY }: { scenarioKey?: string } = {}
): Promise<SeededScenario> => {
  const runMarker = `alertzero-e2e-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const plan = buildAd2SeedPlan({ scenarioKey, runMarker, baseTime: new Date() });

  // Creates the alerts index + mappings the seeded alerts are written into.
  ok(await api.public('POST', '/api/detection_engine/index'), 'create the detection alerts index');

  const bulk = async (
    docs: ReadonlyArray<{ id: string; index?: string; source: object }>,
    op: 'index' | 'create'
  ) => {
    if (docs.length === 0) {
      return;
    }
    const response = await esClient.bulk({
      refresh: 'wait_for',
      operations: docs.flatMap((doc) => [
        { [op]: { _index: doc.index ?? AD2_ALERTS_INDEX, _id: doc.id } },
        doc.source,
      ]),
    });
    if (response.errors) {
      throw new Error(`Seeding (${op}) failed: ${JSON.stringify(response.items.slice(0, 3))}`);
    }
  };
  await bulk(plan.alerts, 'index');
  // Raw endpoint events live in data streams, which only accept `create`.
  await bulk(plan.rawEvents, 'create');

  return {
    runMarker,
    alertIds: getAd2ScenarioAlertIds(scenarioKey, 'clean', runMarker),
    cleanup: async () => {
      for (const index of AD2_SCENARIO_ALL_INDICES) {
        await esClient
          .deleteByQuery({
            index,
            conflicts: 'proceed',
            refresh: true,
            query: { term: { 'labels.ad_portable_seed': runMarker } },
          })
          .catch((error: { statusCode?: number }) => {
            if (error.statusCode !== 404) {
              throw error;
            }
          });
      }
    },
  };
};

export interface WorkerRecord {
  id: string;
  enabled: boolean;
  workflowId?: string;
  settingsRevision?: number | null;
  settings: { autonomy: string; serviceAccountId?: string };
  blockingReasons?: string[];
}

export const listWorkers = async (api: AlertZeroApi): Promise<WorkerRecord[]> =>
  ok(await api.internal<{ workers: WorkerRecord[] }>('GET', WORKERS_URL), 'list workers').workers;

export const getWorker = async (api: AlertZeroApi, workerId: string): Promise<WorkerRecord> => {
  const worker = (await listWorkers(api)).find((candidate) => candidate.id === workerId);
  if (!worker) {
    throw new Error(`Worker ${workerId} is not in the catalog`);
  }
  return worker;
};

export const patchWorker = (api: AlertZeroApi, workerId: string, body: Record<string, unknown>) =>
  api.internal<{ worker: WorkerRecord }>(
    'PATCH',
    `${WORKERS_URL}/${encodeURIComponent(workerId)}`,
    {
      body,
    }
  );

export const updateWorker = async (
  api: AlertZeroApi,
  workerId: string,
  body: Record<string, unknown>
): Promise<WorkerRecord> =>
  ok(await patchWorker(api, workerId, body), `update worker ${workerId}`).worker;

export const createServiceAccount = async (api: AlertZeroApi): Promise<string> =>
  ok(
    await api.internal<{ id: string }>('POST', SERVICE_ACCOUNT_URL, {
      body: { name: `alertzero-e2e-${Date.now()}`, roles: ['superuser'] },
    }),
    'create service account'
  ).id;

export const deleteServiceAccount = async (api: AlertZeroApi, id: string): Promise<void> => {
  await api.internal('DELETE', `${SERVICE_ACCOUNT_URL}/${encodeURIComponent(id)}`);
};
