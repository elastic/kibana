/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import expect from '@kbn/expect';
import { waitFor, routeWithNamespace } from '@kbn/detections-response-ftr-services';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';

const ENTITY_STORE_V2_LATEST_INDEX_PREFIX = '.entities.v2.latest.security_';
const ENTITY_STORE_V2_UPDATES_INDEX_PREFIX = '.entities.v2.updates.security_';

export const getEntityStoreV2LatestIndex = (namespace = 'default') =>
  `${ENTITY_STORE_V2_LATEST_INDEX_PREFIX}${namespace}`;

export const getEntityStoreV2UpdatesIndex = (namespace = 'default') =>
  `${ENTITY_STORE_V2_UPDATES_INDEX_PREFIX}${namespace}`;

/**
 * Documents in the LATEST index use flat dot-notation keys in _source
 * because they're ingested from ES|QL columnar format via ingestEntities.
 * E.g. `'entity.id': 'host:host-0'` rather than `{ entity: { id: 'host:host-0' } }`.
 */
export interface EntityStoreEntity {
  '@timestamp'?: string;
  'entity.id'?: string;
  'entity.name'?: string;
  'entity.type'?: string;
  'entity.EngineMetadata.Type'?: string;
  'entity.risk.calculated_score'?: number;
  'entity.risk.calculated_score_norm'?: number;
  'entity.risk.calculated_level'?: string;
  'host.name'?: string;
  'host.entity.id'?: string;
  'user.name'?: string;
  'user.entity.id'?: string;
  [key: string]: unknown;
}

export const getEntityId = (entity: EntityStoreEntity): string | undefined => entity['entity.id'];

export const getEntityRisk = (
  entity: EntityStoreEntity
): { calculated_score_norm?: number; calculated_level?: string } | undefined => {
  const scoreNorm = entity['entity.risk.calculated_score_norm'] as number | undefined;
  const level = entity['entity.risk.calculated_level'] as string | undefined;
  if (scoreNorm == null && level == null) return undefined;
  return { calculated_score_norm: scoreNorm, calculated_level: level };
};

export const readEntityStoreEntities = async (
  es: Client,
  namespace = 'default',
  size = 1000
): Promise<EntityStoreEntity[]> => {
  try {
    const results = await es.search({
      index: getEntityStoreV2LatestIndex(namespace),
      size,
    });
    return results.hits.hits.map((hit) => hit._source as EntityStoreEntity);
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return [];
    }
    throw e;
  }
};

export const getEntitiesById = async ({
  es,
  entityIds,
  namespace = 'default',
}: {
  es: Client;
  entityIds: string[];
  namespace?: string;
}): Promise<EntityStoreEntity[]> => {
  try {
    const results = await es.search({
      index: getEntityStoreV2LatestIndex(namespace),
      size: entityIds.length,
      query: {
        bool: {
          should: [
            { terms: { 'entity.id': entityIds } },
            { terms: { 'host.entity.id': entityIds } },
            { terms: { 'user.entity.id': entityIds } },
          ],
          minimum_should_match: 1,
        },
      },
    });
    return results.hits.hits.map((hit) => hit._source as EntityStoreEntity);
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return [];
    }
    throw e;
  }
};

export const waitForEntityStoreEntitiesToBePresent = async ({
  es,
  log,
  entityCount = 1,
  namespace = 'default',
}: {
  es: Client;
  log: ToolingLog;
  entityCount?: number;
  namespace?: string;
}): Promise<void> => {
  let lastSnapshot = '';
  await waitFor(
    async () => {
      const entities = await readEntityStoreEntities(es, namespace, entityCount + 10);
      const snapshot = JSON.stringify(entities);
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        log.debug(
          `waitForEntityStoreEntitiesToBePresent: found ${entities.length}/${entityCount} entities`
        );
      }
      return entities.length >= entityCount;
    },
    'waitForEntityStoreEntitiesToBePresent',
    log
  );
};

// Entity store score fields are mapped as float (IEEE 754 single-precision).
// Values written as double-precision in _source get truncated to float when
// read back via ES|QL during log extraction. Convert to float for comparison.
const toFloat32 = (v: number): number => Math.fround(v);

export const waitForEntityStoreFieldValues = async ({
  es,
  log,
  entityIds,
  fieldName,
  expectedValuesByEntityId,
  namespace = 'default',
}: {
  es: Client;
  log: ToolingLog;
  entityIds: string[];
  fieldName: string;
  expectedValuesByEntityId: Record<string, number>;
  namespace?: string;
}): Promise<void> => {
  const floatExpected = Object.fromEntries(
    Object.entries(expectedValuesByEntityId).map(([id, v]) => [id, toFloat32(v)])
  );
  let lastSnapshot = '';
  await waitFor(
    async () => {
      const entities = await getEntitiesById({ es, entityIds, namespace });
      const converged =
        entities.length >= entityIds.length &&
        entities.every((entity) => {
          const entityId = entity['entity.id'];
          if (typeof entityId !== 'string' || !(entityId in floatExpected)) return true;
          return (entity[fieldName] as number | undefined) === floatExpected[entityId];
        });
      const snapshot = JSON.stringify(
        entities.map((e) => ({ id: e['entity.id'], [fieldName]: e[fieldName] }))
      );
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        log.debug(`waitForEntityStoreFieldValues: converged=${converged}, entities: ${snapshot}`);
      }
      return converged;
    },
    'waitForEntityStoreFieldValues',
    log
  );
};

export const deleteAllEntityStoreEntities = async (
  log: ToolingLog,
  es: Client,
  namespace = 'default'
): Promise<void> => {
  const indices = [getEntityStoreV2LatestIndex(namespace), getEntityStoreV2UpdatesIndex(namespace)];
  for (const index of indices) {
    try {
      await es.deleteByQuery({
        index,
        query: { match_all: {} },
        ignore_unavailable: true,
        refresh: true,
      });
    } catch (e) {
      if (e.meta?.statusCode !== 404) {
        throw e;
      }
    }
  }
};

const cleanupEntityStoreV2Indices = async (es: Client, namespace = 'default'): Promise<void> => {
  const indices = [getEntityStoreV2LatestIndex(namespace), getEntityStoreV2UpdatesIndex(namespace)];
  for (const index of indices) {
    try {
      await es.indices.deleteDataStream({ name: index });
    } catch (e) {
      // not a data stream or doesn't exist
    }
    try {
      await es.indices.delete({ index, allow_no_indices: true });
    } catch (e) {
      // doesn't exist
    }
  }
};

const forceLogExtractionUrl = (entityType: string) =>
  ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION.replace('{entityType}', entityType);

export const entityStoreV2RouteHelpersFactory = (
  supertest: SuperTest.Agent,
  es: Client,
  namespace = 'default'
) => {
  const ns = namespace === 'default' ? undefined : namespace;
  return {
    install: async (expectStatusCode: number = 201) => {
      const response = await supertest
        .post(routeWithNamespace(ENTITY_STORE_ROUTES.INSTALL, ns))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({});
      if (response.status !== expectStatusCode && response.status !== 200) {
        throw new Error(
          `Expected entity store install status ${expectStatusCode}, got ${response.status}: ${response.text}`
        );
      }
      return response;
    },

    /**
     * Uninstalls the entity store via the API. When `cleanIndices` is true, also
     * forcefully removes any orphaned ES indices/data streams that may linger
     * after a crashed test run where the API-level uninstall can't reach them.
     */
    uninstall: async ({ cleanIndices = false }: { cleanIndices?: boolean } = {}) => {
      const response = await supertest
        .post(routeWithNamespace(ENTITY_STORE_ROUTES.UNINSTALL, ns))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({});
      if (cleanIndices) {
        await cleanupEntityStoreV2Indices(es, namespace);
      }
      return response;
    },

    forceLogExtraction: async (entityTypes: string[] = ['host', 'user']) => {
      const now = new Date();
      const fromDateISO = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const toDateISO = now.toISOString();
      const responses = await Promise.all(
        entityTypes.map((entityType) =>
          supertest
            .post(routeWithNamespace(forceLogExtractionUrl(entityType), ns))
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({ fromDateISO, toDateISO })
        )
      );
      return responses;
    },
  };
};

type EntityStoreV2RouteHelpers = ReturnType<typeof entityStoreV2RouteHelpersFactory>;

export const setupEntityStoreV2 = async ({
  entityStoreRoutes,
  enableEntityStore,
}: {
  entityStoreRoutes: EntityStoreV2RouteHelpers;
  enableEntityStore: () => Promise<void>;
}): Promise<void> => {
  await enableEntityStore();
  await entityStoreRoutes.uninstall({ cleanIndices: true });
  await entityStoreRoutes.install();
};

export const teardownEntityStoreV2 = async ({
  entityStoreRoutes,
  disableEntityStore,
}: {
  entityStoreRoutes: EntityStoreV2RouteHelpers;
  disableEntityStore: () => Promise<void>;
}): Promise<void> => {
  await entityStoreRoutes.uninstall();
  await disableEntityStore();
};

export const assertRiskScoresPropagatedToEntityStore = async ({
  es,
  log,
  entityStoreRoutes,
  expectedValuesByEntityId,
  entityTypes = ['host', 'user', 'service'],
  expectedEntityCount,
  namespace = 'default',
}: {
  es: Client;
  log: ToolingLog;
  entityStoreRoutes: EntityStoreV2RouteHelpers;
  expectedValuesByEntityId: Record<string, number>;
  entityTypes?: string[];
  expectedEntityCount?: number;
  namespace?: string;
}): Promise<EntityStoreEntity[]> => {
  const entityIds = Object.keys(expectedValuesByEntityId);

  await entityStoreRoutes.forceLogExtraction(entityTypes);
  await waitForEntityStoreFieldValues({
    es,
    log,
    entityIds,
    namespace,
    fieldName: 'entity.risk.calculated_score_norm',
    expectedValuesByEntityId,
  });

  const entities = await getEntitiesById({ es, entityIds, namespace });
  if (expectedEntityCount != null) {
    expect(entities.length).to.eql(expectedEntityCount);
  }

  return entities;
};
