/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  clearEntityStoreIndices,
  forceLogExtraction,
  ingestDoc,
  searchDocById,
} from '../fixtures/helpers';

/**
 * Exercises the KI-discovered index source feature (idea 01 re-scope):
 * - the read-only `discovered_sources` visibility route, and
 * - the `useDiscoveredIndexSource` flag plumbing + data-view-replacement path.
 *
 * NOTE: asserting that a specific KI-discovered index pattern becomes the
 * extraction `FROM` requires seeding `schema`-class Knowledge Indicators on a
 * real Streams stream (KI is manually triggered upstream and depends on the
 * Streams inference pipeline). That end-to-end seeding is a follow-up; here we
 * verify the contract deterministically: the visibility route shape, the flag
 * toggling through config, and that the updates stream remains a hard-union
 * source under the replacement path.
 */
apiTest.describe('Entity Store KI-discovered index source', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  const setFlag = async (
    apiClient: Parameters<Parameters<typeof apiTest>[2]>[0]['apiClient'],
    enabled: boolean
  ) => {
    const response = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        logExtraction: {
          useDiscoveredIndexSource: enabled,
          discoveredIndexSourceMinConfidence: 0,
        },
      },
    });
    expect(response.statusCode).toBe(200);
  };

  const setConfidenceFlag = async (
    apiClient: Parameters<Parameters<typeof apiTest>[2]>[0]['apiClient'],
    enabled: boolean
  ) => {
    const response = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        logExtraction: {
          useDiscoveredConfidenceClassification: enabled,
          discoveredIndexSourceMinConfidence: 0,
        },
      },
    });
    expect(response.statusCode).toBe(200);
  };

  apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

    // Data view backing the legacy source path (only used when the flag is off).
    const dataViewResponse = await apiClient.post('/api/data_views/data_view', {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        override: true,
        data_view: {
          id: 'security-solution-default',
          name: 'security-solution-default',
          title: 'logs-*',
          timeFieldName: '@timestamp',
        },
      },
    });
    expect(dataViewResponse.statusCode).toBe(200);

    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(201);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    await setFlag(apiClient, false);
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    await clearEntityStoreIndices(esClient);
  });

  apiTest(
    'discovered_sources route returns the per-type shape and reflects the flag',
    async ({ apiClient }) => {
      await setFlag(apiClient, false);
      const off = await apiClient.get(ENTITY_STORE_ROUTES.internal.DISCOVERED_SOURCES, {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(off.statusCode).toBe(200);
      expect(off.body.enabled).toBe(false);
      // All four engine keys are always present, even with no schema features.
      expect(Object.keys(off.body.sources).sort()).toStrictEqual([
        'generic',
        'host',
        'service',
        'user',
      ]);
      expect(Array.isArray(off.body.provenance)).toBe(true);

      await setFlag(apiClient, true);
      const on = await apiClient.get(ENTITY_STORE_ROUTES.internal.DISCOVERED_SOURCES, {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(on.statusCode).toBe(200);
      expect(on.body.enabled).toBe(true);
      expect(on.body.minConfidence).toBe(0);
      // KI confidence-classification provenance is always present in the shape.
      expect(typeof on.body.confidenceClassificationEnabled).toBe('boolean');
      expect(Array.isArray(on.body.identityClassification)).toBe(true);
    }
  );

  apiTest(
    'discovered_sources route reflects the confidence-classification flag',
    async ({ apiClient }) => {
      await setConfidenceFlag(apiClient, true);
      const on = await apiClient.get(ENTITY_STORE_ROUTES.internal.DISCOVERED_SOURCES, {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(on.statusCode).toBe(200);
      expect(on.body.confidenceClassificationEnabled).toBe(true);
      expect(Array.isArray(on.body.identityClassification)).toBe(true);

      await setConfidenceFlag(apiClient, false);
      const off = await apiClient.get(ENTITY_STORE_ROUTES.internal.DISCOVERED_SOURCES, {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(off.statusCode).toBe(200);
      expect(off.body.confidenceClassificationEnabled).toBe(false);
    }
  );

  apiTest(
    'with the flag enabled, extraction still sources the updates stream (hard union preserved)',
    async ({ apiClient, esClient }) => {
      await setFlag(apiClient, true);

      await ingestDoc(esClient, {
        '@timestamp': '2026-05-10T10:00:00Z',
        event: { module: 'okta' },
        host: { id: 'ki-src-host-1', name: 'ki-src-server-01' },
      });

      const extraction = await forceLogExtraction(
        apiClient,
        internalHeaders,
        'host',
        '2026-05-10T09:00:00Z',
        '2026-05-10T11:00:00Z'
      );
      expect(extraction.statusCode).toBe(200);
      expect(extraction.body).toMatchObject({ success: true });
      expect((extraction.body as { count: number }).count).toBeGreaterThanOrEqual(1);

      const hit = await searchDocById(esClient, 'host:ki-src-host-1');
      expect(hit.hits.hits).toHaveLength(1);
    }
  );
});
