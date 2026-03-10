/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { INTEGRATION_CONFIGS } from '../../../../server/lib/entity_analytics/entity_store/maintainers/accesses/integrations';
import { MAINTAINER_ID } from '../../../../server/lib/entity_analytics/entity_store/maintainers/accesses/constants';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  MAINTAINER_ROUTES,
  LATEST_INDEX,
  FF_ENABLE_ENTITY_STORE_V2,
} from '../fixtures/constants';
import {
  INTEGRATION_TEST_CONFIGS,
  bulkIngestEvents,
  ensureDataStream,
  cleanupDataStream,
  getExpectedRelationships,
} from '../fixtures/helpers';

/**
 * Integration tests for the `accesses_frequently_and_infrequently` entity
 * maintainer. For each configured integration a 16,000-document dataset of
 * synthetic authentication events is ingested, the maintainer is triggered,
 * and the resulting entity relationships are verified.
 */

/** Normalise a field that may be a single string or an array into a string[]. */
function toArray(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? (value as string[]) : [value as string];
}

/** Resolve a dot-separated path from a nested _source object. */
function getField(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

interface MaintainerEntry {
  id: string;
  runs: number;
  customState: Record<string, unknown> | null;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

async function waitForMaintainerSuccess(
  apiClient: {
    get: (url: string, options?: Record<string, unknown>) => Promise<{ body: unknown }>;
  },
  headers: Record<string, string>,
  maintainerId: string
): Promise<MaintainerEntry> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await apiClient.get(MAINTAINER_ROUTES.GET, {
      headers,
      responseType: 'json',
    });
    const body = res.body as { maintainers: MaintainerEntry[] };
    const entry = body.maintainers.find((m) => m.id === maintainerId);

    if (entry && entry.lastSuccessTimestamp) {
      return entry;
    }

    if (entry && entry.lastErrorTimestamp && !entry.lastSuccessTimestamp) {
      throw new Error(
        `Maintainer "${maintainerId}" failed. State: ${JSON.stringify(entry.customState)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Maintainer "${maintainerId}" did not complete within ${POLL_TIMEOUT_MS}ms`);
}

for (const integration of INTEGRATION_CONFIGS) {
  const testConfig = INTEGRATION_TEST_CONFIGS[integration.id];
  if (!testConfig) {
    throw new Error(
      `Missing IntegrationTestConfig for "${integration.id}". ` +
        'Add an entry to INTEGRATION_TEST_CONFIGS in helpers.ts.'
    );
  }

  apiTest.describe(`Accesses Maintainer [${integration.name}]`, { tag: ENTITY_STORE_TAGS }, () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient, esClient, esArchiver }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...COMMON_HEADERS,
      };

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      // Clean up any leftover entity store from a previous run
      await apiClient
        .post(ENTITY_STORE_ROUTES.UNINSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        })
        .catch(() => {});

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(installResponse.statusCode).toBe(201);

      const initResponse = await apiClient.post(MAINTAINER_ROUTES.INIT, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(initResponse.statusCode).toBe(200);
      await ensureDataStream(esClient, testConfig);

      // Load a seed document via esArchiver to auto-create the data stream.
      // In serverless, manually creating the data stream and bulk-ingesting
      // leads to persistent `no_shard_available_action_exception` errors.
      // Letting ES auto-create it through esArchiver avoids this.
      await esArchiver.loadIfNeeded(
        'x-pack/solutions/security/plugins/security_solution/test/scout/api/es_archives/elastic_defend_events'
      );

      const ingestedCount = await bulkIngestEvents(esClient, testConfig);
      expect(ingestedCount).toBe(16000);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await apiClient
        .post(ENTITY_STORE_ROUTES.UNINSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        })
        .catch(() => {});

      await cleanupDataStream(esClient, testConfig);
    });

    apiTest('Should compute access relationships from events', async ({ apiClient, esClient }) => {
      apiTest.setTimeout(120_000);

      const runResponse = await apiClient.post(MAINTAINER_ROUTES.RUN(MAINTAINER_ID), {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(runResponse.statusCode).toBe(200);

      const maintainerEntry = await waitForMaintainerSuccess(
        apiClient,
        defaultHeaders,
        MAINTAINER_ID
      );

      expect(maintainerEntry.customState).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const state = maintainerEntry.customState!;
      expect(state.totalBuckets).toBe(6);
      expect(state.totalAccessRecords).toBe(16);
      expect(state.totalUpserted).toBe(16);

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            fromDateISO: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            toDateISO: new Date().toISOString(),
          },
        }
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body.success).toBe(true);

      await esClient.indices.refresh({ index: LATEST_INDEX });

      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: {
              wildcard: { 'entity.id': 'user:test-user-*' },
            },
          },
        },
        size: 100,
      });

      expect(entities.hits.hits).toHaveLength(16);

      const expectedRelationships = getExpectedRelationships();

      for (const hit of entities.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        const entityId = getField(source, 'entity.id') as string;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const expected = expectedRelationships.get(entityId)!;
        expect(expected).toBeDefined();

        const actualFrequent = toArray(
          getField(source, 'entity.relationships.accesses_frequently')
        ).sort();
        const actualInfrequent = toArray(
          getField(source, 'entity.relationships.accesses_infrequently')
        ).sort();

        expect(actualFrequent).toStrictEqual(expected.accesses_frequently.sort());
        expect(actualInfrequent).toStrictEqual(expected.accesses_infrequently.sort());
      }
    });

    apiTest(
      'Should assign accesses_frequently when access count exceeds threshold',
      async ({ esClient }) => {
        const entities = await esClient.search({
          index: LATEST_INDEX,
          query: {
            bool: {
              filter: {
                wildcard: { 'entity.id': 'user:test-user-003@*' },
              },
            },
          },
          sort: [{ 'entity.id': 'asc' }],
          size: 10,
        });

        expect(entities.hits.hits).toHaveLength(2);

        for (const hit of entities.hits.hits) {
          const source = hit._source as Record<string, unknown>;

          expect(
            toArray(getField(source, 'entity.relationships.accesses_frequently'))
          ).toHaveLength(1);
          expect(
            toArray(getField(source, 'entity.relationships.accesses_infrequently'))
          ).toHaveLength(0);
        }
      }
    );

    apiTest(
      'Should assign accesses_infrequently when access count is at or below threshold',
      async ({ esClient }) => {
        const entities = await esClient.search({
          index: LATEST_INDEX,
          query: {
            bool: {
              filter: {
                term: { 'entity.id': 'user:test-user-001@test-host-002' },
              },
            },
          },
          size: 1,
        });

        expect(entities.hits.hits).toHaveLength(1);

        const source = entities.hits.hits[0]._source as Record<string, unknown>;

        expect(toArray(getField(source, 'entity.relationships.accesses_frequently'))).toHaveLength(
          0
        );
        expect(
          toArray(getField(source, 'entity.relationships.accesses_infrequently'))
        ).toStrictEqual(['test-host-002']);
      }
    );

    apiTest(
      'Should assign both accesses_frequently and accesses_infrequently for user-006',
      async ({ esClient }) => {
        const entities = await esClient.search({
          index: LATEST_INDEX,
          query: {
            bool: {
              filter: {
                wildcard: { 'entity.id': 'user:test-user-006@*' },
              },
            },
          },
          sort: [{ 'entity.id': 'asc' }],
          size: 10,
        });

        expect(entities.hits.hits).toHaveLength(6);

        const frequentHosts: string[] = [];
        const infrequentHosts: string[] = [];

        for (const hit of entities.hits.hits) {
          const source = hit._source as Record<string, unknown>;
          const freq = toArray(getField(source, 'entity.relationships.accesses_frequently'));
          const infreq = toArray(getField(source, 'entity.relationships.accesses_infrequently'));
          frequentHosts.push(...freq);
          infrequentHosts.push(...infreq);
        }

        expect(frequentHosts.sort()).toStrictEqual([
          'test-host-006',
          'test-host-007',
          'test-host-008',
        ]);
        expect(infrequentHosts.sort()).toStrictEqual([
          'test-host-009',
          'test-host-010',
          'test-host-011',
        ]);
      }
    );
  });
}
