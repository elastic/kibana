/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { RuleEventsClient } from './rule_events_client';

interface MockRow {
  source: Record<string, unknown>;
  dataJson: string;
  createdAt?: string;
}

const sourceResponse = (rows: MockRow[]): ESQLSearchResponse =>
  ({
    columns: [
      { name: '_source', type: 'object' },
      { name: 'data_json', type: 'keyword' },
      ...(rows[0]?.createdAt !== undefined ? [{ name: 'created_at', type: 'date' }] : []),
    ],
    values: rows.map((row) => [
      row.source,
      row.dataJson,
      ...(row.createdAt !== undefined ? [row.createdAt] : []),
    ]),
  } as unknown as ESQLSearchResponse);

const countResponse = (total: number): ESQLSearchResponse =>
  ({
    columns: [{ name: 'total', type: 'long' }],
    values: [[total]],
  } as unknown as ESQLSearchResponse);

const dataDoc = {
  event_id: 'agent-event-1',
  title: 'Checkout errors',
  summary: 'Checkout is failing',
  stream_names: ['logs.checkout'],
  confidence: 0.8,
};

const ruleEventSource = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-01-02T00:00:00.000Z',
  group_hash: 'group-hash-1',
  space_id: 'default',
  type: 'alert',
  source: 'elastic.significant_events',
  severity: 'medium',
  episode: { status: 'active' },
  data: dataDoc,
  ...overrides,
});

const createClient = (queryImpl: (request: { query: string }) => Promise<ESQLSearchResponse>) => {
  const query = jest.fn(queryImpl);
  return {
    client: new RuleEventsClient({ esClient: { esql: { query } } as never, space: 'default' }),
    query,
  };
};

const lastQuery = (query: jest.Mock, predicate: (q: string) => boolean = () => true): string => {
  const call = query.mock.calls
    .map((call_) => (call_[0] as { query: string }).query)
    .find((q) => predicate(q));
  if (!call) throw new Error('No matching query call found');
  return call;
};

describe('RuleEventsClient', () => {
  describe('findLatest', () => {
    it('targets RULE_EVENTS_INDEX, scopes by space_id, and groups by group_hash', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatest({});

      const q = lastQuery(query);
      expect(q).toContain('FROM .rule-events');
      expect(q).toContain('space_id == "default"');
      expect(q).toContain('group_hash');
      expect(q).not.toContain('kibana.space_ids');
    });

    it('decodes the SignificantEvent payload from data_json plus top-level fields', async () => {
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDoc),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits).toEqual([
        {
          ...dataDoc,
          '@timestamp': '2026-01-02T00:00:00.000Z',
          event_uuid: 'group-hash-1',
          status: 'open',
          severity: '40-medium',
        },
      ]);
    });

    it('normalizes a scalar stream_names string to a 1-element array', async () => {
      const scalarDataDoc = { ...dataDoc, stream_names: 'logs.bridge.only' };
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(scalarDataDoc),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits[0].stream_names).toEqual(['logs.bridge.only']);
    });

    it('passes through an array stream_names unchanged', async () => {
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDoc),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits[0].stream_names).toEqual(dataDoc.stream_names);
    });

    it('decodes a missing stream_names field to an empty array, not undefined', async () => {
      const { stream_names: _omit, ...dataDocWithoutStreamNames } = dataDoc;
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDocWithoutStreamNames),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits[0].stream_names).toEqual([]);
    });
  });

  describe('findLatestByCurrentStatePaginated', () => {
    it('filters status on episode.status (not top-level alert_status), translated from SIGNIFICANT_EVENTS_STATUS_MAP', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ status: ['open'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('`episode.status` IN ("active")');
      expect(q).not.toContain('alert_status');
    });

    it('filters severity on top-level severity, translated from SIGNIFICANT_EVENTS_SEVERITY_MAP', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ severity: ['80-critical'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('severity IN ("critical")');
    });

    it('filters stream via MV_INTERSECTS against FIELD_EXTRACT(data, "stream_names")', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ stream: ['logs.a', 'logs.b'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "stream_names"), ["logs.a", "logs.b"])'
      );
    });

    it('filters eventIds via the FIELD_EXTRACT(data, "event_id") IN (...) predicate', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({
        eventIds: ['agent-event-1', 'agent-event-2'],
      });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('FIELD_EXTRACT(data, "event_id") IN ("agent-event-1", "agent-event-2")');
    });

    it('orders stages: created_at -> time range -> free-text -> latest-per-group -> status', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({
        from: '2026-01-01T00:00:00.000Z',
        search: 'checkout',
        status: ['open'],
      });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      const createdAtIdx = q.indexOf('INLINE STATS created_at');
      const timeRangeIdx = q.indexOf('@timestamp >= TO_DATETIME');
      const freeTextIdx = q.indexOf('FIELD_EXTRACT');
      const latestPerGroupIdx = q.indexOf('INLINE STATS latest_ts');
      const statusIdx = q.indexOf('`episode.status` IN');

      expect(createdAtIdx).toBeGreaterThanOrEqual(0);
      expect(timeRangeIdx).toBeGreaterThan(createdAtIdx);
      expect(freeTextIdx).toBeGreaterThan(timeRangeIdx);
      expect(latestPerGroupIdx).toBeGreaterThan(freeTextIdx);
      expect(statusIdx).toBeGreaterThan(latestPerGroupIdx);
    });

    it('returns hits decorated with the lineage creation timestamp', async () => {
      const createdAt = '2026-01-01T00:00:00.000Z';
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDoc),
        createdAt,
      };
      const { client } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(1) : sourceResponse([row])
      );

      const result = await client.findLatestByCurrentStatePaginated({});

      expect(result).toEqual({
        hits: [
          {
            ...dataDoc,
            '@timestamp': '2026-01-02T00:00:00.000Z',
            event_uuid: 'group-hash-1',
            status: 'open',
            severity: '40-medium',
            created_at: createdAt,
          },
        ],
        page: 1,
        perPage: 25,
        total: 1,
      });
    });
  });

  describe('findLatestByCurrentStateBatch', () => {
    it('applies a group_hash keyset when afterGroupHash is present', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestByCurrentStateBatch({ batchSize: 10, afterGroupHash: 'hash-5' });

      const q = lastQuery(query);
      expect(q).toContain('group_hash > "hash-5"');
    });

    it('omits the keyset WHERE clause when afterGroupHash is undefined', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestByCurrentStateBatch({ batchSize: 10 });

      const q = lastQuery(query);
      expect(q).not.toContain('group_hash >');
    });
  });

  describe('findByEventId', () => {
    it('filters via FIELD_EXTRACT(data, "event_id") and decodes the result', async () => {
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDoc),
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const { client, query } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findByEventId('agent-event-1');

      const q = lastQuery(query);
      expect(q).toContain('FIELD_EXTRACT(data, "event_id") == "agent-event-1"');
      expect(hits).toHaveLength(1);
      expect(hits[0].event_id).toBe('agent-event-1');
      expect(hits[0].created_at).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('findLatestByEventIds', () => {
    it('returns an empty map without querying when given no ids', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      const result = await client.findLatestByEventIds([]);

      expect(result.size).toBe(0);
      expect(query).not.toHaveBeenCalled();
    });

    it('builds a FIELD_EXTRACT IN filter and keys the map by event_id', async () => {
      const row: MockRow = { source: ruleEventSource(), dataJson: JSON.stringify(dataDoc) };
      const { client, query } = createClient(async () => sourceResponse([row]));

      const result = await client.findLatestByEventIds(['agent-event-1', 'agent-event-2']);

      const q = lastQuery(query);
      expect(q).toContain('FIELD_EXTRACT(data, "event_id") IN ("agent-event-1", "agent-event-2")');
      expect(result.get('agent-event-1')?.title).toBe('Checkout errors');
    });
  });
});
