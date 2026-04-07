/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type supertest from 'supertest';

const ENTITY_STORE_BASE_ROUTE = '/internal/security/entity_store';
const ENTITY_STORE_PUBLIC_BASE_ROUTE = '/api/security/entity_store';
const ENTITY_STORE_API_VERSION = '2';

const withHeaders = (req: supertest.Test) =>
  req
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', ENTITY_STORE_API_VERSION)
    .set('x-elastic-internal-origin', 'Kibana');

const withPublicHeaders = (req: supertest.Test) =>
  req
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .set('x-elastic-internal-origin', 'Kibana');

export const createEntityMaintainerHelpers = (agent: supertest.Agent) => {
  const getMaintainers = async (ids?: string[]) => {
    let req = agent.get(`${ENTITY_STORE_BASE_ROUTE}/entity_maintainers`);
    if (ids && ids.length > 0) {
      req = req.query({ ids });
    }
    const response = await withHeaders(req);
    return response.body as { maintainers: Array<{ id: string; runs: number }> };
  };

  const initMaintainers = async () => {
    await withHeaders(
      agent.post(`${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/init`).send()
    ).expect((res) => {
      if (res.status !== 200) {
        throw new Error(
          `initMaintainers failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });
  };

  const runMaintainer = async (id: string) => {
    await withHeaders(
      agent.post(`${ENTITY_STORE_BASE_ROUTE}/entity_maintainers/run/${id}`).send()
    ).expect((res) => {
      if (res.status !== 200 && res.status !== 500) {
        throw new Error(
          `runMaintainer failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });
  };

  const waitForMaintainerRun = async (
    id: string,
    { minRuns = 1, timeoutMs = 60_000, pollIntervalMs = 3_000 } = {}
  ) => {
    let baselineRuns = 0;
    try {
      const initial = await getMaintainers([id]);
      baselineRuns = initial.maintainers.find((m) => m.id === id)?.runs ?? 0;
    } catch {
      // maintainer may not exist yet
    }

    // Trigger a manual run so we don't wait for the scheduled interval
    try {
      await runMaintainer(id);
    } catch {
      // may fail if not ready; scheduled run will cover it
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await getMaintainers([id]);
      const maintainer = result.maintainers.find((m) => m.id === id);
      if (maintainer !== undefined && maintainer.runs >= baselineRuns + minRuns) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Timed out waiting for entity maintainer "${id}" to complete ${minRuns} new run(s) after ${timeoutMs}ms`
    );
  };

  const enableEntityStore = async () => {
    await withPublicHeaders(
      agent.post(`${ENTITY_STORE_PUBLIC_BASE_ROUTE}/install`).send({})
    ).expect((res) => {
      if (res.status !== 200 && res.status !== 201) {
        throw new Error(
          `enableEntityStore failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });
  };

  const installEntityStoreV2 = async ({
    dataViewPattern,
    entityTypes = ['user', 'host'],
    esClient,
  }: {
    dataViewPattern: string;
    entityTypes?: string[];
    esClient: Client;
  }) => {
    // 1. Create data view pointing to the logs index
    await withPublicHeaders(
      agent.post('/api/data_views/data_view').send({
        data_view: {
          title: dataViewPattern,
          timeFieldName: '@timestamp',
          name: 'security-solution',
          id: 'security-solution',
        },
      })
    ).expect((res) => {
      if (res.status !== 200 && res.status !== 409) {
        throw new Error(
          `createDataView failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });

    // 2. Install entity store with specified entity types
    await withPublicHeaders(
      agent.post(`${ENTITY_STORE_PUBLIC_BASE_ROUTE}/install`).send({ entityTypes })
    ).expect((res) => {
      if (res.status !== 200 && res.status !== 201) {
        throw new Error(
          `installEntityStore failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });

    // 3. Poll until all engines are started (up to 60s)
    const enginePollDeadline = Date.now() + 60_000;
    while (Date.now() < enginePollDeadline) {
      const res = await withHeaders(agent.get(`${ENTITY_STORE_BASE_ROUTE}/engines`));
      const engines: Array<{ type: string; status: string }> = res.body.engines ?? [];
      const allStarted = engines.length > 0 && engines.every((e) => e.status === 'started');
      if (allStarted) break;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }

    // 4. Force log extraction for each entity type so transforms pick up seeded docs
    const fromDateISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toDateISO = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    for (const entityType of entityTypes) {
      await withHeaders(
        agent
          .post(`${ENTITY_STORE_BASE_ROUTE}/${entityType}/force_log_extraction`)
          .send({ fromDateISO, toDateISO })
      ).expect((res) => {
        if (res.status !== 200 && res.status !== 202) {
          throw new Error(
            `force_log_extraction failed for ${entityType} with status ${
              res.status
            }. Body: ${JSON.stringify(res.body)}`
          );
        }
      });
    }

    // 5. Wait for at least one entity to appear in the latest entities index
    const latestIndex = `.entities.v1.latest.security_*_default`;
    const entityWaitDeadline = Date.now() + 120_000;
    while (Date.now() < entityWaitDeadline) {
      try {
        const countRes = await esClient.count({ index: latestIndex });
        if (countRes.count > 0) break;
      } catch {
        // index may not exist yet
      }
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }

    // 6. Initialize maintainers
    await initMaintainers();
  };

  const uninstallEntityStore = async () => {
    await withPublicHeaders(
      agent.post(`${ENTITY_STORE_PUBLIC_BASE_ROUTE}/uninstall`).send({})
    ).expect((res) => {
      if (res.status !== 200) {
        throw new Error(
          `uninstallEntityStore failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });
  };

  /**
   * Seeds user entities into the V2 entity store via the CRUD bulk update API
   * (PUT /api/security/entity_store/entities/bulk?force=true).
   * Using force=true makes bulkUpdateEntity upsert, so entities are created if missing.
   */
  const seedUserEntities = async (userNames: string[]): Promise<void> => {
    const entities = userNames.map((name) => ({
      type: 'user',
      doc: { user: { name } },
    }));

    await withPublicHeaders(
      agent
        .put(`${ENTITY_STORE_PUBLIC_BASE_ROUTE}/entities/bulk`)
        .query({ force: true })
        .send({ entities })
    ).expect((res) => {
      if (res.status !== 200) {
        throw new Error(
          `seedUserEntities failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
        );
      }
    });
  };

  return {
    initMaintainers,
    getMaintainers,
    runMaintainer,
    waitForMaintainerRun,
    enableEntityStore,
    installEntityStoreV2,
    uninstallEntityStore,
    seedUserEntities,
  };
};
