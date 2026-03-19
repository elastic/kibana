/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '@kbn/scout-security';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { getEuidPainlessRuntimeMapping } from '../../../../common/domain/euid/painless';
import { getEuidFromObject } from '../../../../common/domain/euid/memory';
import { EntityType } from '../../../../common/domain/definitions/entity_schema';

apiTest.describe('Painless runtime field translation', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const response = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(201);

    await esArchiver.loadIfNeeded(
      'x-pack/solutions/security/plugins/entity_store/test/scout/api/es_archives/updates'
    );
  });

  apiTest.afterAll(async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });

  for (const entityType of Object.values(EntityType.options)) {
    apiTest(
      `${entityType}: runtime field from getEuidPainlessRuntimeMapping matches expected euid for all documents`,
      async ({ esClient }) => {
        const result = await esClient.search({
          index: UPDATES_INDEX,
          body: {
            query: { match_all: {} },
            runtime_mappings: {
              entity_id: getEuidPainlessRuntimeMapping(entityType),
            },
            size: 1000,
            fields: ['entity_id'],
          },
        } as Parameters<typeof esClient.search>[1]);

        const hits = result.hits.hits;
        expect(hits.length).toBeGreaterThan(0);

        for (const hit of hits) {
          const expectedEuid = getEuidFromObject(entityType, hit);
          const actualEuid = (hit.fields?.entity_id as string[] | undefined)?.[0];

          expect(actualEuid).toBe(expectedEuid);
        }
      }
    );
  }

  apiTest(
    'user: Painless correctly handles IDP, non-IDP, and illegal documents',
    async ({ esClient }) => {
      const entityType = 'user';
      const baseBody = {
        runtime_mappings: { entity_id: getEuidPainlessRuntimeMapping(entityType) },
        size: 10,
        fields: ['entity_id'],
      };

      const runSearch = (query: object) =>
        esClient.search({
          index: UPDATES_INDEX,
          body: { ...baseBody, query },
        } as Parameters<typeof esClient.search>[1]);

      const getEuidFromHit = (hit: { _source?: unknown; fields?: Record<string, unknown> }) => {
        const expected = getEuidFromObject(entityType, hit);
        const actual = (hit.fields?.entity_id as string[] | undefined)?.[0];
        return { expected, actual };
      };

      const idpResult = await runSearch({
        bool: {
          must: [{ term: { 'event.kind': 'asset' } }, { exists: { field: 'user.email' } }],
        },
      });
      const idpHits = idpResult.hits.hits;
      expect(idpHits.length).toBeGreaterThan(0);
      for (const hit of idpHits) {
        const { expected, actual } = getEuidFromHit(hit);
        expect(expected).toBeDefined();
        expect(actual).toBe(expected);
      }

      const nonIdpResult = await runSearch({
        bool: {
          must: [
            { term: { 'user.name': 'alice.local' } },
            { term: { 'host.id': 'host-nonidp-001' } },
          ],
        },
      });
      const nonIdpHits = nonIdpResult.hits.hits;
      expect(nonIdpHits).toHaveLength(1);
      const { expected: nonIdpExpected, actual: nonIdpActual } = getEuidFromHit(nonIdpHits[0]);
      expect(nonIdpExpected).toBe('user:alice.local@host-nonidp-001@local');
      expect(nonIdpActual).toBe(nonIdpExpected);

      const illegalResult = await runSearch({
        term: { 'user.email': 'invalid-idp-illegal@test.com' },
      });
      const illegalHits = illegalResult.hits.hits;
      expect(illegalHits).toHaveLength(1);
      const { expected: illegalExpected, actual: illegalActual } = getEuidFromHit(illegalHits[0]);
      expect(illegalExpected).toBeUndefined();
      expect(illegalActual).toBeUndefined();
    }
  );
});
