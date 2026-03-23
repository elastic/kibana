/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { expect } from '@kbn/scout-security/api';
import { apiTest, type EsClient } from '@kbn/scout-security';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { ingestDoc } from '../fixtures/helpers';
import {
  USER_TS_EXTRACTION_CASES,
  type UserTsExtractionCase,
} from '../fixtures/user_ts_extraction_cases';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { getEuidPainlessRuntimeMapping } from '../../../../common/domain/euid/painless';
import { getEuidFromObject } from '../../../../common/domain/euid/memory';
import {
  getDocument,
  applyWhenConditionTrueSetFields,
} from '../../../../common/domain/euid/commons';
import { applyFieldEvaluations } from '../../../../common/domain/euid/field_evaluations';
import { getEntityDefinitionWithoutId } from '../../../../common/domain/definitions/registry';
import {
  EntityType,
  isSingleFieldIdentity,
} from '../../../../common/domain/definitions/entity_schema';

const USER_ENTITY_TYPE = 'user' as const;

const userRuntimeSearchBody = {
  runtime_mappings: { entity_id: getEuidPainlessRuntimeMapping(USER_ENTITY_TYPE) },
  fields: ['entity_id'] as const,
};

async function runUserRuntimeSearch(esClient: EsClient, query: object, size = 10) {
  return esClient.search({
    index: UPDATES_INDEX,
    body: {
      ...userRuntimeSearchBody,
      query,
      size,
    },
  } as unknown as Parameters<EsClient['search']>[0]) as Promise<{
    hits: { hits: Array<{ _source?: unknown; fields?: Record<string, unknown> }> };
  }>;
}

function assertUserRuntimeMatchesMemory(hit: {
  _source?: unknown;
  fields?: Record<string, unknown>;
}) {
  const expected = getEuidFromObject(USER_ENTITY_TYPE, hit);
  const actual = (hit.fields?.entity_id as string[] | undefined)?.[0];
  expect(actual).toBe(expected);
}

async function ingestAndRunUserTsPainlessScenario(
  esClient: EsClient,
  scenario: UserTsExtractionCase
): Promise<{ _source?: unknown; fields?: Record<string, unknown> }> {
  if (scenario.ingestSource) {
    await ingestDoc(esClient, scenario.ingestSource);
  }

  const result = await runUserRuntimeSearch(esClient, scenario.query, 10);
  const hits = result.hits.hits;
  expect(hits).toHaveLength(1);

  const hit = hits[0];
  assertUserRuntimeMatchesMemory(hit);
  return hit;
}

/**
 * Mirrors user entity pre-aggregation field rules (field evaluations + whenConditionTrueSetFieldsPreAgg)
 * so we can assert entity.namespace / entity.confidence / entity.name align with extracted entities.
 * The Painless runtime field only emits the EUID string, not these fields.
 */
function deriveUserEntityPreAggMetadata(hit: { _source?: unknown }): {
  namespace?: string;
  confidence?: string;
  entityName?: string;
} {
  const doc = cloneDeep(getDocument(hit));
  const def = getEntityDefinitionWithoutId(USER_ENTITY_TYPE);
  const { identityField } = def;
  if ('fieldEvaluations' in identityField && identityField.fieldEvaluations?.length) {
    const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations);
    Object.assign(doc, evaluated);
  }
  if (def.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(doc, def.whenConditionTrueSetFieldsPreAgg);
  }
  if (def.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(doc, def.whenConditionTrueSetFieldsAfterStats);
  }
  return {
    namespace: doc['entity.namespace'] as string | undefined,
    confidence: doc['entity.confidence'] as string | undefined,
    entityName: doc['entity.name'] as string | undefined,
  };
}

function assertRuntimeEuidMatchesEntityTypeFormat(
  entityType: EntityType,
  euid: string | undefined
): void {
  if (euid === undefined) {
    return;
  }
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  if (isSingleFieldIdentity(identityField) && identityField.skipTypePrepend) {
    expect(euid).not.toMatch(/^(user|host|service|generic):/);
    expect(euid.length).toBeGreaterThan(0);
    return;
  }
  expect(euid).toMatch(new RegExp(`^${entityType}:`));
}

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
      `should match in-memory euid for every document using getEuidPainlessRuntimeMapping (${entityType})`,
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
          assertRuntimeEuidMatchesEntityTypeFormat(entityType, actualEuid);
        }
      }
    );
  }

  for (const scenario of USER_TS_EXTRACTION_CASES.filter(
    (c): c is UserTsExtractionCase & { expectedEuid: undefined } => c.expectedEuid === undefined
  )) {
    apiTest(
      `should align user.ts Painless entity_id with definitions for ${scenario.id}`,
      async ({ esClient }) => {
        const hit = await ingestAndRunUserTsPainlessScenario(esClient, scenario);
        expect(getEuidFromObject(USER_ENTITY_TYPE, hit)).toBeUndefined();
        expect((hit.fields?.entity_id as string[] | undefined)?.[0]).toBeUndefined();
      }
    );
  }

  for (const scenario of USER_TS_EXTRACTION_CASES.filter(
    (c): c is UserTsExtractionCase & { expectedEuid: string } => c.expectedEuid !== undefined
  )) {
    apiTest(
      `should align user.ts Painless entity_id with definitions for ${scenario.id}`,
      async ({ esClient }) => {
        const hit = await ingestAndRunUserTsPainlessScenario(esClient, scenario);
        const expectedEuid = scenario.expectedEuid;

        expect(getEuidFromObject(USER_ENTITY_TYPE, hit)).toBe(expectedEuid);
        expect((hit.fields?.entity_id as string[] | undefined)?.[0]).toBe(expectedEuid);
        expect(expectedEuid).toMatch(/^user:.+/);
        expect(expectedEuid).toContain('@');

        if (scenario.expectedMeta === undefined) {
          throw new Error(`USER_TS_EXTRACTION_CASES missing expectedMeta for id=${scenario.id}`);
        }
        expect(deriveUserEntityPreAggMetadata(hit)).toStrictEqual({
          namespace: scenario.expectedMeta.namespace,
          confidence: scenario.expectedMeta.confidence,
          entityName: scenario.expectedMeta.entityName,
        });
      }
    );
  }

  apiTest(
    'should omit user entity_id for excluded user.name; runtime matches in-memory euid (LOCAL_NAMESPACE_EXCLUDED_USER_NAMES, user.ts)',
    async ({ esClient }) => {
      await ingestDoc(esClient, {
        '@timestamp': '2026-01-20T12:05:25Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'root' },
        host: { id: 'painless-excluded-root-host', name: 'server' },
      });
      const result = await runUserRuntimeSearch(esClient, {
        bool: {
          must: [
            { term: { 'user.name': 'root' } },
            { term: { 'host.id': 'painless-excluded-root-host' } },
          ],
        },
      });
      const hits = result.hits.hits;
      expect(hits).toHaveLength(1);
      assertUserRuntimeMatchesMemory(hits[0]);
      expect(getEuidFromObject(USER_ENTITY_TYPE, hits[0])).toBeUndefined();
      expect((hits[0].fields?.entity_id as string[] | undefined)?.[0]).toBeUndefined();
    }
  );
});
