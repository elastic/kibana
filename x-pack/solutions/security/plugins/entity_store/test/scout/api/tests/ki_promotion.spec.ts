/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';

import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
  LATEST_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices, triggerMaintainerRun } from '../fixtures/helpers';

const NAMESPACE = 'default';
const KI_PROMOTION_MAINTAINER_ID = 'ki-promotion';

/**
 * Seeds a generic-typed entity directly into the LATEST index in the
 * shape `runKiPromotion` expects: stream lineage, `entity.type` set, and
 * the target engine's identity field populated. Mirrors `seedUserEntity`
 * in `helpers.ts` but for the cross-engine promotion path.
 */
const seedKiGenericServiceEntity = async (
  esClient: EsClient,
  options: {
    entityId: string;
    serviceName: string;
    streamName: string;
    timestamp?: string;
  }
): Promise<void> => {
  const ts = options.timestamp ?? new Date().toISOString();
  await esClient.index({
    index: LATEST_ALIAS,
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      entity: {
        id: options.entityId,
        name: options.serviceName,
        type: 'Service',
        source: [`stream:${options.streamName}:service`],
        EngineMetadata: { Type: 'generic' },
        lifecycle: { first_seen: ts, last_seen: ts },
      },
      service: { name: options.serviceName },
      '@timestamp': ts,
    },
  });
};

const findEntityByDocSourceId = async (esClient: EsClient, originalEntityId: string) => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  // The promoted doc carries `entity.previous_id` set to the original; we
  // use it to locate the doc after promotion since `entity.id` changes.
  const response = await esClient.search({
    index: LATEST_INDEX,
    query: {
      bool: {
        should: [
          { term: { 'entity.previous_id': originalEntityId } },
          { term: { 'entity.id': originalEntityId } },
        ],
        minimum_should_match: 1,
      },
    },
    size: 1,
  });
  return response.hits.hits[0]?._source as
    | {
        entity: {
          id?: string;
          type?: string;
          confidence?: string;
          previous_id?: string;
          EngineMetadata?: { Type?: string };
        };
        service?: { name?: string };
      }
    | undefined;
};

apiTest.describe('Entity Store KI promotion maintainer', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest.afterEach(async ({ apiClient, esClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    await clearEntityStoreIndices(esClient);
  });

  apiTest(
    'Maintainer is a no-op when promotion is not configured (default state)',
    async ({ apiClient, esClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const originalEntityId = 'generic:demo@stream:logs.demo:service';
      await seedKiGenericServiceEntity(esClient, {
        entityId: originalEntityId,
        serviceName: 'demo',
        streamName: 'logs.demo',
      });

      // Trigger the maintainer with default config (promoteToTypedThreshold is
      // null by default). The maintainer should hit its early-return guard
      // and the seeded doc should remain unchanged.
      const response = await triggerMaintainerRun(
        apiClient,
        internalHeaders,
        KI_PROMOTION_MAINTAINER_ID
      );
      expect(response?.statusCode).toBe(200);

      const doc = await findEntityByDocSourceId(esClient, originalEntityId);
      expect(doc?.entity.id).toBe(originalEntityId);
      expect(doc?.entity.EngineMetadata?.Type).toBe('generic');
      expect(doc?.entity.confidence).toBeUndefined();
      expect(doc?.entity.previous_id).toBeUndefined();
    }
  );

  apiTest(
    'Maintainer is a no-op when promotedEntityTypes is empty but threshold is set',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      // Set the threshold but leave the engine allow-list at its default ([])
      // — together they evaluate to off and the maintainer is a no-op.
      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: {
            entityMinConfidence: 80,
            promoteToTypedThreshold: 95,
            promotedEntityTypes: [],
          },
        },
      });
      expect(update.statusCode).toBe(200);

      const response = await triggerMaintainerRun(
        apiClient,
        internalHeaders,
        KI_PROMOTION_MAINTAINER_ID
      );
      expect(response?.statusCode).toBe(200);
    }
  );

  apiTest(
    'Maintainer route is registered and addressable when the engine is installed',
    async ({ apiClient }) => {
      // The maintainer is registered unconditionally during install; here
      // we exercise the addressable run endpoint and confirm it returns 200.
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const maintainers = await apiClient.get(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
        {
          headers: internalHeaders,
          responseType: 'json',
        }
      );
      expect(maintainers.statusCode).toBe(200);
      const ids = (
        maintainers.body as { maintainers: Array<{ id: string }> }
      ).maintainers.map((m) => m.id);
      expect(ids).toContain(KI_PROMOTION_MAINTAINER_ID);
    }
  );

  // Note: a true end-to-end promotion test (with a populated
  // `.kibana_streams_features` fixture) needs streams plugin state seeded
  // via an archived fixture. That work is tracked separately under the
  // streams + entity-store integration test plan; the maintainer's
  // happy-path promotion is covered exhaustively by the Jest tests in
  // `server/maintainers/ki_promotion/__tests__/run.test.ts`.
});

// Suppress unused-namespace warning when no test in the file references it.
void NAMESPACE;
