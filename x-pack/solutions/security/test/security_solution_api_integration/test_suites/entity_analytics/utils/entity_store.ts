/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/common.gen';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { waitFor } from '@kbn/detections-response-ftr-services';
import expect from '@kbn/expect';
import { ENTITY_LATEST, ENTITY_STORE_ROUTES, getEntitiesAlias } from '@kbn/entity-store/common';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from './data_view';

export const EntityStoreUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const log = getService('log');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const dataView = dataViewRouteHelpersFactory(supertest, namespace);

  log.debug(`EntityStoreUtils namespace: ${namespace}`);

  const namespacedPath = (path: string) =>
    namespace !== 'default' ? `/s/${namespace}${path}` : path;

  const getEntityStoreStatus = async () => {
    const res = await supertest
      .get(namespacedPath(ENTITY_STORE_ROUTES.public.STATUS))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .query({ include_components: false });
    expect(res.status).to.eql(200);
    return res.body as { status: string };
  };

  const cleanEngines = async () => {
    await supertest
      .post(namespacedPath('/internal/kibana/settings'))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': null } })
      .expect(200);

    // Use the supported uninstall API so maintainers are removed via
    // entityMaintainersClient.removeAll() and don't leak task state between tests.
    try {
      await supertest
        .post(namespacedPath(ENTITY_STORE_ROUTES.public.UNINSTALL))
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('elastic-api-version', '2023-10-31')
        .send({ entityTypes: ['user', 'host', 'service'] })
        .expect(200);
    } catch (e) {
      log.debug(`Entity store not installed, skipping uninstall during cleanup: ${e.message}`);
    }
  };

  const searchEntitiesV2 = async (
    filter: string,
    opts: { size?: number; source?: string[] } = {}
  ) => {
    const res = await supertest
      .get(namespacedPath('/api/security/entity_store/entities'))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .query({
        filter,
        ...(opts.size !== undefined ? { size: opts.size } : {}),
        ...(opts.source ? { source: opts.source } : {}),
      });
    if (res.status !== 200) {
      log.error(`Failed to search entities`);
      log.error(JSON.stringify(res.body));
    }
    expect(res.status).to.eql(200);
    return res;
  };

  const deleteEntityV2 = async (entityId: string) => {
    const res = await supertest
      .delete(namespacedPath('/api/security/entity_store/entities/'))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .send({ entityId });
    if (res.status !== 200) {
      log.error(`Failed to delete entity ${entityId}`);
      log.error(JSON.stringify(res.body));
    }
    expect(res.status).to.eql(200);
    return res;
  };

  const enableEntityStoreV2 = async (body: any = { entityTypes: ['user', 'host'] }) => {
    await supertest
      .post(namespacedPath('/internal/kibana/settings'))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': true } })
      .expect(200);

    const res = await supertest
      .post(namespacedPath(ENTITY_STORE_ROUTES.public.INSTALL))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .send(body);
    if (res.status !== 201 && res.status !== 200) {
      log.error(`Failed to install entity store v2`);
      log.error(JSON.stringify(res.body));
    }
    expect([200, 201]).to.contain(res.status);

    return res;
  };

  const installEntityStoreV2 = async (body: any = { entityTypes: ['user', 'host'] }) => {
    // Default to logs-* to avoid coupling extraction to ecs_compliant fixture state.
    const {
      dataViewPattern = 'logs-*',
      waitForEntities = true,
      entityTypes = ['user', 'host'],
      maintainerAutoStart = false,
      ...installBody
    } = body;
    const installRequestBody = { ...installBody, entityTypes };
    await dataView.create('security-solution', dataViewPattern);

    const res = await enableEntityStoreV2(installRequestBody);

    await retry.waitForWithTimeout(`Entity store to reach 'running' status`, 60_000, async () => {
      const { status } = await getEntityStoreStatus();
      if (status === 'running') {
        return true;
      }
      if (status === 'error') {
        throw new Error(`Entity store failed to install (status: error)`);
      }
      return false;
    });

    const fromDateISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toDateISO = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    for (const entityType of entityTypes) {
      const extractUrl = namespacedPath(
        `/internal/security/entity_store/${entityType}/force_log_extraction`
      );
      log.info(`Force extracting entities for type: ${entityType}`);
      const extractRes = await supertest
        .post(extractUrl)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('elastic-api-version', '2')
        .send({ fromDateISO, toDateISO });
      log.info(
        `Force extraction for ${entityType}: status=${extractRes.status}, body=${JSON.stringify(
          extractRes.body
        )}`
      );
      expect([200, 202]).to.contain(extractRes.status);
    }
    if (waitForEntities) {
      await waitForEntityStoreEntities({ es: getService('es'), log, count: 1, namespace });
    }

    const maintainersRes = await supertest
      .post(namespacedPath('/internal/security/entity_store/entity_maintainers/init'))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2')
      .send({ autoStart: maintainerAutoStart });

    expect([200, 201]).to.contain(maintainersRes.status);
    return res;
  };

  const forceUpdateEntityViaCrud = async ({
    entityType,
    body,
  }: {
    entityType: EntityType;
    body: Record<string, unknown>;
  }) => {
    const url = namespacedPath(`/api/security/entity_store/entities/${entityType}?force=true`);

    const response = await supertest
      .put(url)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .send(body);

    if (response.status !== 200) {
      log.error(`Failed to force-update entity via CRUD API for type "${entityType}"`);
      log.error(JSON.stringify(response.body));
    }
    expect(response.status).to.eql(200);
    return response;
  };

  const unlinkEntitiesViaResolutionApi = async ({ entityIds }: { entityIds: string[] }) => {
    const response = await supertest
      .post(namespacedPath(ENTITY_STORE_ROUTES.public.RESOLUTION_UNLINK))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .send({ entity_ids: entityIds });

    if (response.status !== 200) {
      log.error('Failed to unlink entities via resolution API');
      log.error(JSON.stringify(response.body));
    }
    expect(response.status).to.eql(200);
    return response;
  };

  const forceExtractEntities = async ({
    entityType,
    fromDateISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    toDateISO = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }: {
    entityType: EntityType;
    fromDateISO?: string;
    toDateISO?: string;
  }) => {
    const url = namespacedPath(
      `/internal/security/entity_store/${entityType}/force_log_extraction`
    );

    log.info(`Force extracting entities for type: ${entityType}`);
    const response = await supertest
      .post(url)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2')
      .send({ fromDateISO, toDateISO });

    log.info(
      `Force extraction for ${entityType}: status=${response.status}, body=${JSON.stringify(
        response.body
      )}`
    );
    expect([200, 202]).to.contain(response.status);
    return response;
  };

  return {
    cleanEngines,
    deleteEntityV2,
    searchEntitiesV2,
    enableEntityStoreV2,
    installEntityStoreV2,
    forceUpdateEntityViaCrud,
    unlinkEntitiesViaResolutionApi,
    forceExtractEntities,
  };
};

/**
 * Reads entities from the Entity Store V2 latest index.
 */
export const readEntityStoreEntities = async (
  es: Client,
  namespace: string = 'default'
): Promise<Array<{ entity: { id: string; risk?: Record<string, unknown> } }>> => {
  const index = getEntitiesAlias(ENTITY_LATEST, namespace);
  try {
    const results = await es.search({ index, size: 1000 });
    return results.hits.hits.map(
      (hit: any) => hit._source as { entity: { id: string; risk?: Record<string, unknown> } }
    );
  } catch (e: any) {
    if (e.meta?.statusCode === 404) {
      return [];
    }
    throw e;
  }
};

/**
 * Waits for at least `count` entities to be present in the Entity Store V2 latest index.
 */
export const waitForEntityStoreEntities = async ({
  es,
  log,
  count = 1,
  namespace = 'default',
}: {
  es: Client;
  log: ToolingLog;
  count?: number;
  namespace?: string;
}): Promise<void> => {
  await waitFor(
    async () => {
      const entities = await readEntityStoreEntities(es, namespace);
      return entities.length >= count;
    },
    'waitForEntityStoreEntities',
    log
  );
};

/**
 * Polls until a specific entity document appears in the Entity Store V2 latest index,
 * optionally requiring specific attribute values (criticality, watchlist membership).
 */
export const waitForEntityStoreDoc = async ({
  es,
  retry,
  entityId,
  timeoutMs = 60_000,
  requireCriticality,
  requiredWatchlistId,
  namespace = 'default',
}: {
  es: Client;
  retry: {
    waitForWithTimeout: (
      label: string,
      timeout: number,
      predicate: () => Promise<boolean>
    ) => Promise<void>;
  };
  entityId: string;
  timeoutMs?: number;
  requireCriticality?: 'high_impact' | 'absent';
  requiredWatchlistId?: string;
  namespace?: string;
}): Promise<void> => {
  const index = getEntitiesAlias(ENTITY_LATEST, namespace);
  await retry.waitForWithTimeout(
    `entity store doc present for ${entityId}`,
    timeoutMs,
    async () => {
      const response = await es.search({
        index,
        size: 1,
        query: { term: { 'entity.id': entityId } },
      });
      const hit = response.hits.hits[0]?._source as
        | {
            asset?: { criticality?: string };
            entity?: { attributes?: { watchlists?: string[] } };
          }
        | undefined;
      if (!hit) {
        return false;
      }

      if (requireCriticality === 'high_impact' && hit.asset?.criticality !== 'high_impact') {
        return false;
      }
      if (requireCriticality === 'absent' && hit.asset?.criticality != null) {
        return false;
      }
      if (
        requiredWatchlistId &&
        !(hit.entity?.attributes?.watchlists?.includes(requiredWatchlistId) ?? false)
      ) {
        return false;
      }
      return true;
    }
  );
};

/**
 * Asserts that risk scores have been dual-written to the Entity Store.
 * Checks that entities in the store have `entity.risk` fields populated.
 */
export const assertRiskScoresWrittenToEntityStore = async ({
  es,
  log,
  expectedEntityCount,
  namespace = 'default',
}: {
  es: Client;
  log: ToolingLog;
  expectedEntityCount: number;
  namespace?: string;
}): Promise<void> => {
  const entities = await readEntityStoreEntities(es, namespace);
  const entitiesWithRisk = entities.filter(
    (entity) => entity.entity?.risk && entity.entity.risk.calculated_score_norm !== undefined
  );
  log.info(
    `Entity store dual-write check: ${entitiesWithRisk.length}/${entities.length} entities have risk scores (expected ${expectedEntityCount})`
  );
  expect(entitiesWithRisk.length).to.eql(expectedEntityCount);
};
