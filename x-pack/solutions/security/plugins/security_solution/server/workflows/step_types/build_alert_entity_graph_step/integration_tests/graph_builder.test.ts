/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { buildRelatedAlertsGraph } from '../graph_builder';
import type { EsSearchClient } from '../types';

const TEST_INDEX = 'test-alerts';

const iso = (ms: number): string => new Date(ms).toISOString();

/** Wraps the raw `@elastic/elasticsearch` Client as our minimal `EsSearchClient` interface. */
const wrapClient = (client: Client): EsSearchClient => ({
  search: async <TSource>(request: Record<string, unknown>) => {
    const response = await client.search<TSource>(request);
    return {
      hits: {
        hits: response.hits.hits.map((h) => ({
          _id: h._id,
          _index: h._index,
          _source: h._source ?? undefined,
          sort: h.sort,
        })),
      },
    };
  },
});

describe('buildRelatedAlertsGraph — integration', () => {
  let esServer: EsTestCluster;
  let rawClient: Client;
  let esClient: EsSearchClient;

  // Baseline timestamp: 2026-06-01T12:00:00Z
  const T0 = Date.UTC(2026, 5, 1, 12, 0, 0);

  beforeAll(async () => {
    jest.setTimeout(120_000);

    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    rawClient = esServer.getClient();
    esClient = wrapClient(rawClient);
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    // Clean up the test index before each test.
    await rawClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true }).catch(() => {});
  });

  /**
   * Helper: indexes a batch of alert documents with explicit `_id` values,
   * creates the index with a minimal mapping, and waits for refresh.
   */
  const indexAlerts = async (
    alerts: Array<{
      _id: string;
      '@timestamp': string;
      [key: string]: unknown;
    }>
  ) => {
    // Create the index with a mapping that supports our sort fields.
    await rawClient.indices.create({
      index: TEST_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'kibana.alert.uuid': { type: 'keyword' },
          'kibana.alert.rule.name': { type: 'keyword' },
          'kibana.alert.severity': { type: 'keyword' },
          host: {
            properties: {
              name: { type: 'keyword' },
            },
          },
          user: {
            properties: {
              name: { type: 'keyword' },
            },
          },
          source: {
            properties: {
              ip: { type: 'keyword' },
            },
          },
          destination: {
            properties: {
              ip: { type: 'keyword' },
            },
          },
          process: {
            properties: {
              entity_id: { type: 'keyword' },
            },
          },
        },
      },
    });

    const body = alerts.flatMap((alert) => {
      const { _id, ...doc } = alert;
      return [{ index: { _index: TEST_INDEX, _id } }, { 'kibana.alert.uuid': _id, ...doc }];
    });

    await rawClient.bulk({ body, refresh: 'wait_for' });
  };

  it('discovers related alerts via shared host.name and builds correct edges', async () => {
    //  Seed (A) --host.name=h1--> B --host.name=h1--> C
    await indexAlerts([
      { _id: 'A', '@timestamp': iso(T0), host: { name: 'h1' }, user: { name: 'u1' } },
      {
        _id: 'B',
        '@timestamp': iso(T0 + 10 * 60_000),
        host: { name: 'h1' },
        user: { name: 'u1' },
      },
      {
        _id: 'C',
        '@timestamp': iso(T0 + 20 * 60_000),
        host: { name: 'h1' },
        user: { name: 'u2' },
      },
      // D shares nothing with A — should NOT appear.
      {
        _id: 'D',
        '@timestamp': iso(T0 + 30 * 60_000),
        host: { name: 'h-unrelated' },
      },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['host.name', 'user.name'],
      seedWindowMs: 60 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 3,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 1, 'user.name': 1 },
      minEntityScore: 1,
      includeSeed: true,
    });

    // Nodes: A (seed), B (host.name=h1), C (host.name=h1). D excluded.
    const nodeIds = result.nodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual(['A', 'B', 'C']);

    // D should not appear anywhere.
    expect(nodeIds).not.toContain('D');

    // Edges should connect related alerts.
    expect(result.edges.length).toBeGreaterThanOrEqual(1);

    // Every edge should reference only nodes in the graph.
    const nodeSet = new Set(nodeIds);
    for (const edge of result.edges) {
      expect(nodeSet.has(edge.from)).toBe(true);
      expect(nodeSet.has(edge.to)).toBe(true);
      expect(edge.score).toBeGreaterThan(0);
    }

    // Stats should reflect the traversal.
    expect(result.stats?.nodes).toBe(3);
    expect(result.stats?.queries).toBeGreaterThanOrEqual(2); // seed fetch + at least 1 search
    expect(result.stats?.depth_reached).toBeGreaterThanOrEqual(1);
  });

  it('discovers alert entity chains across expansion rounds', async () => {
    // Alert 1: host 1, user 1  (seed)
    // Alert 2: host 1, user 2  (discovered via host.name in depth 1)
    // Alert 3: host 2, user 2  (discovered via user.name in depth 2)
    //
    // We place alert 3 outside the seed window but inside the expanded window, to ensure
    // the chain relies on the traversal's window expansion.
    await indexAlerts([
      { _id: 'ALERT_1', '@timestamp': iso(T0), host: { name: 'host-1' }, user: { name: 'user-1' } },
      {
        _id: 'ALERT_2',
        '@timestamp': iso(T0 + 5 * 60_000), // within seed window
        host: { name: 'host-1' },
        user: { name: 'user-2' },
      },
      {
        _id: 'ALERT_3',
        '@timestamp': iso(T0 + 45 * 60_000), // outside seed window, inside expanded window
        host: { name: 'host-2' },
        user: { name: 'user-2' },
      },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'ALERT_1', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['host.name', 'user.name'],
      seedWindowMs: 10 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 3,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 1, 'user.name': 1 },
      minEntityScore: 1,
      includeSeed: true,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['ALERT_1', 'ALERT_2', 'ALERT_3']);

    // Chain edges: 1 -> 2 via host, 2 -> 3 via user
    expect(result.edges).toEqual(
      expect.arrayContaining([
        { from: 'ALERT_1', to: 'ALERT_2', score: 1, label_scores: { host: 1 } },
        { from: 'ALERT_2', to: 'ALERT_3', score: 1, label_scores: { user: 1 } },
      ])
    );

    // Should take at least 2 expansion rounds to discover ALERT_3.
    expect(result.stats?.depth_reached).toBeGreaterThanOrEqual(2);
  });

  it('respects minEntityScore threshold to exclude weakly-linked alerts', async () => {
    await indexAlerts([
      {
        _id: 'SEED',
        '@timestamp': iso(T0),
        host: { name: 'h1' },
        user: { name: 'u1' },
        process: { entity_id: 'p1' },
      },
      // STRONG: shares host + user (score 2+2 = 4, meets threshold)
      {
        _id: 'STRONG',
        '@timestamp': iso(T0 + 5 * 60_000),
        host: { name: 'h1' },
        user: { name: 'u1' },
      },
      // WEAK: shares only host (score 2, below threshold of 4)
      {
        _id: 'WEAK',
        '@timestamp': iso(T0 + 10 * 60_000),
        host: { name: 'h1' },
      },
      // PROCESS: shares only process.entity_id (score 5, meets threshold)
      {
        _id: 'PROCESS',
        '@timestamp': iso(T0 + 15 * 60_000),
        process: { entity_id: 'p1' },
      },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'SEED', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['host.name', 'user.name', 'process.entity_id'],
      seedWindowMs: 60 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 2, 'user.name': 2, 'process.entity_id': 5 },
      minEntityScore: 4,
      includeSeed: false,
    });

    const nodeIds = result.nodes.map((n) => n.id).sort();

    // STRONG (4) and PROCESS (5) meet threshold; WEAK (2) does not.
    expect(nodeIds).toEqual(['PROCESS', 'STRONG']);
    expect(nodeIds).not.toContain('WEAK');
  });

  it('excludes seed from output when includeSeed is false', async () => {
    await indexAlerts([
      { _id: 'S', '@timestamp': iso(T0), host: { name: 'h1' } },
      { _id: 'R', '@timestamp': iso(T0 + 5 * 60_000), host: { name: 'h1' } },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'S', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['host.name'],
      seedWindowMs: 60 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 1 },
      minEntityScore: 1,
      includeSeed: false,
    });

    expect(result.nodes.map((n) => n.id)).toEqual(['R']);
    expect(result.alerts.every((a) => a.alert_id !== 'S')).toBe(true);
  });

  it('ignores configured entity values during scoring', async () => {
    await indexAlerts([
      { _id: 'S', '@timestamp': iso(T0), user: { name: 'root' }, host: { name: 'h1' } },
      // Shares user=root (ignored) and host=h1 (kept).
      {
        _id: 'R',
        '@timestamp': iso(T0 + 5 * 60_000),
        user: { name: 'root' },
        host: { name: 'h1' },
      },
      // Shares only user=root (ignored) — no valid link.
      {
        _id: 'X',
        '@timestamp': iso(T0 + 10 * 60_000),
        user: { name: 'root' },
        host: { name: 'h-other' },
      },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'S', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['user.name', 'host.name'],
      seedWindowMs: 60 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [{ field: 'user.name', values: ['root'] }],
      entityFieldScores: { 'user.name': 1, 'host.name': 1 },
      minEntityScore: 1,
      includeSeed: false,
    });

    // R links via host.name=h1; X only shares the ignored user.name=root.
    expect(result.nodes.map((n) => n.id)).toEqual(['R']);
  });

  it('links alerts via aliased entity fields (source.ip <-> destination.ip)', async () => {
    await indexAlerts([
      { _id: 'S', '@timestamp': iso(T0), source: { ip: '10.0.0.1' } },
      // Shares the seed's source.ip value as destination.ip.
      {
        _id: 'LATERAL',
        '@timestamp': iso(T0 + 5 * 60_000),
        destination: { ip: '10.0.0.1' },
      },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'S', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['source.ip', 'destination.ip'],
      entityFieldAliases: {
        'source.ip': [{ field: 'destination.ip', score: 3 }],
      },
      seedWindowMs: 60 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'source.ip': 1, 'destination.ip': 1 },
      minEntityScore: 3,
      includeSeed: true,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['LATERAL', 'S']);
    expect(result.edges).toEqual(
      expect.arrayContaining([expect.objectContaining({ from: 'S', to: 'LATERAL', score: 3 })])
    );
  });

  it('returns empty graph when seed has no entity values', async () => {
    await indexAlerts([
      // Seed has a timestamp but no entity fields.
      { _id: 'EMPTY', '@timestamp': iso(T0) },
    ]);

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'EMPTY', alertIndex: TEST_INDEX },
      searchIndex: TEST_INDEX,
      entityFields: ['host.name', 'user.name'],
      seedWindowMs: 60 * 60_000,
      expandWindowMs: 60 * 60_000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: {},
      minEntityScore: 1,
      includeSeed: true,
    });

    // Only the seed itself (no related alerts, no edges).
    expect(result.nodes).toEqual([{ id: 'EMPTY' }]);
    expect(result.edges).toEqual([]);
    expect(result.stats?.depth_reached).toBe(0);
  });
});
