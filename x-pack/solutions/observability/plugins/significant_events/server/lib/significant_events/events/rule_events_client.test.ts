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
  source_ids: ['logs.checkout'],
  confidence: 0.8,
};

const ruleEventSource = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-01-02T00:00:00.000Z',
  group_hash: 'group-hash-1',
  space_id: 'default',
  type: 'alert',
  source: 'elastic.significant_events',
  severity: 'medium',
  alert: { status: 'active' },
  data: dataDoc,
  ...overrides,
});

interface EsqlRequest {
  query: string;
  params?: Array<Record<string, string>>;
}

const createClient = (queryImpl: (request: EsqlRequest) => Promise<ESQLSearchResponse>) => {
  const query = jest.fn(queryImpl);
  return {
    client: new RuleEventsClient({ esClient: { esql: { query } } as never, space: 'default' }),
    query,
  };
};

/** Returns the pipe commands and bound params of the page query (not the total count query). */
const getPageRequest = ({ mock }: ReturnType<typeof createClient>['query']) => {
  const [pageRequest] = mock.calls
    .map(([request]) => request)
    .filter((request) => !request.query.includes('STATS total'));
  return { commands: pageRequest.query.split(' | '), params: pageRequest.params };
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

    it('normalizes a scalar source_ids string to a 1-element array', async () => {
      const scalarDataDoc = { ...dataDoc, source_ids: 'logs.bridge.only' };
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(scalarDataDoc),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits[0].source_ids).toEqual(['logs.bridge.only']);
    });

    it('passes through an array source_ids unchanged', async () => {
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDoc),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits[0].source_ids).toEqual(dataDoc.source_ids);
    });

    it('decodes a missing source_ids field to an empty array, not undefined', async () => {
      const { source_ids: _omit, ...dataDocWithoutSourceIds } = dataDoc;
      const row: MockRow = {
        source: ruleEventSource(),
        dataJson: JSON.stringify(dataDocWithoutSourceIds),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatest({});

      expect(hits[0].source_ids).toEqual([]);
    });
  });

  describe('findLatestByCurrentStatePaginated', () => {
    it('filters status on alert.status (not top-level alert_status), translated from SIGNIFICANT_EVENTS_STATUS_MAP', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ status: ['open'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('`alert.status` IN ("active")');
      expect(q).not.toContain('alert_status');
    });

    it('decodes the persisted alert.status of each row rather than defaulting to open', async () => {
      const row: MockRow = {
        source: ruleEventSource({ alert: { status: 'inactive' } }),
        dataJson: JSON.stringify(dataDoc),
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const { client } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(1) : sourceResponse([row])
      );

      const { hits } = await client.findLatestByCurrentStatePaginated({});

      expect(hits[0].status).toBe('closed');
    });

    it('filters severity on top-level severity, translated from SIGNIFICANT_EVENTS_SEVERITY_MAP', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ severity: ['80-critical'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('severity IN ("critical")');
    });

    it('filters sourceIds via MV_INTERSECTS against FIELD_EXTRACT(data, "source_ids")', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ sourceIds: ['logs.a', 'logs.b'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('MV_INTERSECTS(FIELD_EXTRACT(data, "source_ids"), ["logs.a", "logs.b"])');
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

    it('filters ruleUuids via MV_INTERSECTS against FIELD_EXTRACT(data, "signals.metadata.rule_uuid")', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ ruleUuids: ['rule-A', 'rule-B'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "signals.metadata.rule_uuid"), ["rule-A", "rule-B"])'
      );
    });

    it('filters topologyFeatureIds via MV_INTERSECTS against causal_features.feature_id OR blast_radius.feature_id', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ topologyFeatureIds: ['feat-1'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "causal_features.feature_id"), ["feat-1"])'
      );
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "blast_radius.feature_id"), ["feat-1"])'
      );
    });

    it('filters search, time range and status against the latest revision of each series', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        search: 'checkout',
        status: ['closed'],
      });

      const { commands, params } = getPageRequest(query);
      expect(commands).toEqual([
        'FROM .rule-events METADATA _id, _source',
        'WHERE space_id == "default" AND type == "alert" AND source == "elastic.significant_events"',
        'INLINE STATS created_at = MIN(@timestamp) BY group_hash',
        // Latest revision per series.
        'INLINE STATS latest_ts = MAX(@timestamp) BY group_hash',
        'WHERE @timestamp == latest_ts',
        'INLINE STATS tiebreaker_id = MAX(_id) BY group_hash',
        'WHERE _id == tiebreaker_id',
        'WHERE TO_LOWER(FIELD_EXTRACT(data, "title")) LIKE "*checkout*" OR TO_LOWER(FIELD_EXTRACT(data, "summary")) LIKE "*checkout*" OR TO_LOWER(FIELD_EXTRACT(data, "symptom_hypothesis")) LIKE "*checkout*" OR TO_LOWER(FIELD_EXTRACT(data, "event_id")) == TO_LOWER("checkout")',
        // Created before the range ends, and still active or updated after it starts.
        'WHERE created_at <= TO_DATETIME(?overlapToIso)',
        'WHERE (`alert.status` IN ("active")) OR @timestamp >= TO_DATETIME(?overlapFromIso)',
        'WHERE `alert.status` IN ("inactive")',
        'EVAL data_json = JSON_EXTRACT(_source, "$.data")',
        'SORT @timestamp DESC, _id ASC',
        'LIMIT 25',
        'KEEP _source, data_json, created_at',
      ]);
      expect(params).toEqual([
        { overlapToIso: '2026-01-02T00:00:00.000Z' },
        { overlapFromIso: '2026-01-01T00:00:00.000Z' },
      ]);
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

  describe('findLatestPaginated', () => {
    it('delegates to findLatestByCurrentStatePaginated with no filters', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      const result = await client.findLatestPaginated();

      expect(result).toEqual({ hits: [], page: 1, perPage: 25, total: 0 });
      expect(query).toHaveBeenCalled();
    });
  });

  describe('findLatestActive', () => {
    it('filters alert.status to the active mapping, not the top-level status', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestActive({});

      const q = lastQuery(query);
      expect(q).toContain('`alert.status` IN ("active")');
      expect(q).not.toContain('status IN ("open")');
    });

    it('narrows by sourceIds via FIELD_EXTRACT(data, "source_ids")', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestActive({ sourceIds: ['logs.checkout'] });

      const q = lastQuery(query);
      expect(q).toContain('MV_INTERSECTS(FIELD_EXTRACT(data, "source_ids"), ["logs.checkout"])');
    });

    it('narrows by ruleUuids via FIELD_EXTRACT(data, "signals.metadata.rule_uuid")', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestActive({ ruleUuids: ['rule-A'] });

      const q = lastQuery(query);
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "signals.metadata.rule_uuid"), ["rule-A"])'
      );
    });

    it('decodes hits the same way as findLatest', async () => {
      const row: MockRow = { source: ruleEventSource(), dataJson: JSON.stringify(dataDoc) };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatestActive({});

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
