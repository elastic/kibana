/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @jest-environment node
 *
 * Tier 1 integration test for CPS routing in the entity relationship maintainers.
 *
 * Starts a local serverless ES instance with CPS enabled (enableCPS: true) and
 * verifies that the `createCpsAllClient` proxy:
 *   - injects `project_routing: '_alias:*'` without causing 400 errors on ES
 *   - composite aggregations (Step 1 query shape) return correct results
 *   - ES|QL STATS queries (Step 2 query shape) return correct results
 *   - non-existent index raises `index_not_found_exception` (engine recovery path)
 *   - non-intercepted client methods pass through unchanged
 *
 * Tier 2 (actual cross-project fan-out with linked projects) requires a real
 * multi-project Serverless deployment — coordinate with Or's PR elastic/kibana#268007.
 */

import type {
  TestServerlessESUtils,
  TestServerlessKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { systemIndicesSuperuser } from '@kbn/test';

import { createCpsAllClient } from '../../tasks/entity_maintainers/create_cps_all_client';

// Hidden index keeps the test from polluting visible index lists.
const TEST_INDEX = '.entity-maintainer-cps-routing-integration-test';

// Simulated integration log events:
//   alice  — log_on / success   → appears in both Step 1 and Step 2 results
//   bob    — log_on / success   → appears in both Step 1 and Step 2 results
//   mallory— log_on / failure   → filtered out by event.outcome == "success"
const TEST_DOCS = [
  {
    '@timestamp': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    'event.action': 'log_on',
    'event.outcome': 'success',
    'user.name': 'alice',
    'user.id': 'alice-001',
    'host.name': 'workstation-a',
    'host.id': 'host-001',
  },
  {
    '@timestamp': new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    'event.action': 'log_on',
    'event.outcome': 'success',
    'user.name': 'bob',
    'user.id': 'bob-002',
    'host.name': 'workstation-b',
    'host.id': 'host-002',
  },
  {
    '@timestamp': new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    'event.action': 'log_on',
    'event.outcome': 'failure',
    'user.name': 'mallory',
    'user.id': 'mallory-003',
    'host.name': 'workstation-a',
    'host.id': 'host-001',
  },
];

const EXPECTED_SUCCESS_USERS = ['alice', 'bob'];

describe('createCpsAllClient — serverless CPS routing (Tier 1)', () => {
  let serverlessES: TestServerlessESUtils;
  let serverlessKibana: TestServerlessKibanaUtils;
  let rawClient: ElasticsearchClient;
  let cpsClient: ElasticsearchClient;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServerlessInstances({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
      enableCPS: true,
      projectType: 'security',
      kibanaUrl: 'http://localhost:5601/',
      kibana: {
        settings: {
          elasticsearch: {
            username: systemIndicesSuperuser.username,
            password: systemIndicesSuperuser.password,
          },
        },
      },
    });

    serverlessES = await startES();
    serverlessKibana = await startKibana();

    rawClient = serverlessKibana.coreStart.elasticsearch.client.asInternalUser;
    cpsClient = createCpsAllClient(rawClient);

    await rawClient.indices.create({
      index: TEST_INDEX,
      settings: { hidden: true },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'event.action': { type: 'keyword' },
          'event.outcome': { type: 'keyword' },
          'user.name': { type: 'keyword' },
          'user.id': { type: 'keyword' },
          'host.name': { type: 'keyword' },
          'host.id': { type: 'keyword' },
        },
      },
    });

    for (const doc of TEST_DOCS) {
      await rawClient.index({ index: TEST_INDEX, document: doc });
    }

    await rawClient.indices.refresh({ index: TEST_INDEX });
  });

  afterEach(async () => {
    await rawClient?.indices.refresh({ index: TEST_INDEX }).catch(() => {});
  });

  afterAll(async () => {
    await rawClient?.indices.delete({ index: TEST_INDEX }).catch(() => {});
    await serverlessKibana?.stop();
    await serverlessES?.stop();
  });

  // ---------------------------------------------------------------------------
  // Step 1: composite aggregation
  // ---------------------------------------------------------------------------

  describe('Step 1 — composite aggregation with _alias:* routing', () => {
    it('accepts project_routing and returns correct buckets for existing events', async () => {
      const result = await cpsClient.search({
        index: TEST_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-30d', lt: 'now' } } },
              { term: { 'event.action': 'log_on' } },
              { term: { 'event.outcome': 'success' } },
            ],
          },
        },
        aggs: {
          users: {
            composite: {
              size: 100,
              sources: [{ 'user.name': { terms: { field: 'user.name', missing_bucket: true } } }],
            },
          },
        },
      } as Parameters<ElasticsearchClient['search']>[0]);

      const aggs = result.aggregations as {
        users: { buckets: Array<{ key: Record<string, string> }> };
      };
      const buckets = aggs?.users?.buckets ?? [];

      expect(buckets.length).toBe(EXPECTED_SUCCESS_USERS.length);
      const names = buckets.map((b) => b.key['user.name']).sort();
      expect(names).toEqual(EXPECTED_SUCCESS_USERS);
    });

    it('returns empty buckets for a non-matching filter', async () => {
      const result = await cpsClient.search({
        index: TEST_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [{ term: { 'event.action': 'nonexistent_action' } }],
          },
        },
        aggs: {
          users: {
            composite: {
              size: 100,
              sources: [{ 'user.name': { terms: { field: 'user.name', missing_bucket: true } } }],
            },
          },
        },
      } as Parameters<ElasticsearchClient['search']>[0]);

      const aggs = result.aggregations as {
        users: { buckets: Array<unknown> };
      };
      expect(aggs?.users?.buckets ?? []).toHaveLength(0);
    });

    it('throws index_not_found_exception for a missing index (engine recovery path)', async () => {
      await expect(
        cpsClient.search({
          index: 'logs-nonexistent-integration-default',
          size: 0,
          aggs: {
            users: {
              composite: {
                size: 100,
                sources: [{ 'user.name': { terms: { field: 'user.name' } } }],
              },
            },
          },
        } as Parameters<ElasticsearchClient['search']>[0])
      ).rejects.toMatchObject({
        body: { error: { type: 'index_not_found_exception' } },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Step 2: ES|QL STATS query
  // ---------------------------------------------------------------------------

  describe('Step 2 — ES|QL STATS query with _alias:* routing', () => {
    it('accepts project_routing and returns correct rows', async () => {
      const result = await cpsClient.esql.query({
        query: [
          'SET unmapped_fields="nullify";',
          `FROM ${TEST_INDEX}`,
          '| WHERE `event.action` == "log_on" AND `event.outcome` == "success"',
          '| STATS event_count = COUNT(*) BY `user.name`',
          '| LIMIT 100',
        ].join('\n'),
        filter: {
          bool: { filter: [{ range: { '@timestamp': { gte: 'now-30d', lt: 'now' } } }] },
        },
      } as Parameters<ElasticsearchClient['esql']['query']>[0]);

      const typed = result as unknown as {
        columns: Array<{ name: string; type: string }>;
        values: unknown[][];
      };

      expect(Array.isArray(typed.columns)).toBe(true);
      expect(Array.isArray(typed.values)).toBe(true);

      const userNameColIdx = typed.columns.findIndex((c) => c.name === 'user.name');
      expect(userNameColIdx).toBeGreaterThanOrEqual(0);

      const returnedUsers = typed.values.map((row) => row[userNameColIdx] as string).sort();
      expect(returnedUsers).toEqual(EXPECTED_SUCCESS_USERS);
    });

    it('returns empty values for a non-matching filter', async () => {
      const result = await cpsClient.esql.query({
        query: [
          'SET unmapped_fields="nullify";',
          `FROM ${TEST_INDEX}`,
          '| WHERE `event.action` == "nonexistent_action"',
          '| STATS event_count = COUNT(*) BY `user.name`',
          '| LIMIT 100',
        ].join('\n'),
      } as Parameters<ElasticsearchClient['esql']['query']>[0]);

      const typed = result as unknown as { values: unknown[][] };
      expect(typed.values).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Non-intercepted methods
  // ---------------------------------------------------------------------------

  describe('non-intercepted methods', () => {
    it('indices.exists passes through to the underlying client', async () => {
      const exists = await (cpsClient as any).indices.exists({ index: TEST_INDEX });
      expect(exists).toBe(true);
    });

    it('indices.exists returns false for a non-existent index', async () => {
      const exists = await (cpsClient as any).indices.exists({
        index: 'does-not-exist-cps-test',
      });
      expect(exists).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Parity: CPS client vs raw client (on origin-only data)
  // ---------------------------------------------------------------------------

  describe('origin-parity — CPS client returns same results as raw client', () => {
    it('composite agg results are identical with and without CPS proxy', async () => {
      const query = {
        index: TEST_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-30d', lt: 'now' } } },
              { term: { 'event.outcome': 'success' } },
            ],
          },
        },
        aggs: {
          users: {
            composite: {
              size: 100,
              sources: [{ 'user.name': { terms: { field: 'user.name', missing_bucket: true } } }],
            },
          },
        },
      } as Parameters<ElasticsearchClient['search']>[0];

      const rawResult = await rawClient.search(query);
      const cpsResult = await cpsClient.search(query);

      const rawBuckets = (
        rawResult.aggregations as { users: { buckets: Array<{ key: Record<string, string> }> } }
      ).users.buckets;
      const cpsBuckets = (
        cpsResult.aggregations as { users: { buckets: Array<{ key: Record<string, string> }> } }
      ).users.buckets;

      expect(cpsBuckets.length).toBe(rawBuckets.length);
      expect(cpsBuckets.map((b) => b.key['user.name']).sort()).toEqual(
        rawBuckets.map((b) => b.key['user.name']).sort()
      );
    });
  });
});
