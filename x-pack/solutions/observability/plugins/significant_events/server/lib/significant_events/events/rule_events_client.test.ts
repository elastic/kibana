/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  EVENT_CREATED_TRIGGER_ID,
  EVENT_STATUS_CHANGED_TRIGGER_ID,
} from '../../../../common/workflows/triggers';
import { StatusChange } from './lifecycle/lifecycle_controller';
import { asRuleEventsClient } from './rule_events_client.mock';
import { RuleEventsClient } from './rule_events_client';
import { operatorFallbackAssessmentNote } from '@kbn/significant-events-schema';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';

interface MockRow {
  source: Record<string, unknown>;
  dataJson: string;
  createdAt?: string;
  operatorClosed?: boolean;
}

const sourceResponse = (rows: MockRow[]): ESQLSearchResponse =>
  ({
    columns: [
      { name: '_source', type: 'object' },
      { name: 'data_json', type: 'keyword' },
      ...(rows[0]?.createdAt !== undefined ? [{ name: 'created_at', type: 'date' }] : []),
      ...(rows[0]?.operatorClosed !== undefined
        ? [{ name: 'operator_closed', type: 'boolean' }]
        : []),
    ],
    values: rows.map((row) => [
      row.source,
      row.dataJson,
      ...(row.createdAt !== undefined ? [row.createdAt] : []),
      ...(row.operatorClosed !== undefined ? [row.operatorClosed] : []),
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

const createStatusEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'agent-event-1',
  status: 'active',
  source_ids: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: 'medium',
  confidence: 0.8,
  ...overrides,
});

const makeStatusAlertEventsClient = (
  overrides: Partial<jest.Mocked<AlertEventsClientApi>> = {}
): jest.Mocked<AlertEventsClientApi> =>
  ({
    createAlertEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<AlertEventsClientApi>);

const createStatusSearchClient = (
  latest: SignificantEvent | undefined,
  alertEventsClient: jest.Mocked<AlertEventsClientApi>
) =>
  asRuleEventsClient(
    { findLatestByEventId: jest.fn().mockResolvedValue(latest) },
    { getAlertEventsClient: async () => alertEventsClient }
  );

const DEACTIVATE_STATUS: StatusChange = StatusChange.byOperator('inactive');

const lastStatusWritten = (client: jest.Mocked<AlertEventsClientApi>) =>
  client.createAlertEvent.mock.calls[0][0] as {
    alert_status: string;
    data: Record<string, unknown>;
  };

describe('RuleEventsClient', () => {
  describe('updateEventStatus', () => {
    it('appends a version carrying the decided status', async () => {
      const existing = createStatusEvent({ status: 'active' });
      const alertEventsClient = makeStatusAlertEventsClient();

      const result = await createStatusSearchClient(existing, alertEventsClient).updateEventStatus({
        eventId: existing.event_id,
        change: DEACTIVATE_STATUS,
      });

      expect(result).toEqual({ updated: 1, ignored: 0, status: 'inactive' });
      expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
      expect(lastStatusWritten(alertEventsClient)).toMatchObject({ alert_status: 'inactive' });
    });

    it('records the given note, and falls back to the operator note when it is omitted or blank', async () => {
      const existing = createStatusEvent({ assessment_note: 'Operator dismissed as noise.' });
      const written = async (assessmentNote?: string) => {
        const alertEventsClient = makeStatusAlertEventsClient();
        await createStatusSearchClient(existing, alertEventsClient).updateEventStatus({
          eventId: existing.event_id,
          change: DEACTIVATE_STATUS,
          assessmentNote,
        });
        return lastStatusWritten(alertEventsClient).data;
      };

      expect(await written('  Closed by cleanup.  ')).toMatchObject({
        assessment_note: 'Closed by cleanup.',
      });
      expect(await written('   ')).toMatchObject({
        assessment_note: operatorFallbackAssessmentNote('inactive'),
      });
      expect(await written()).toMatchObject({
        assessment_note: operatorFallbackAssessmentNote('inactive'),
      });
    });

    it.each<'active' | 'inactive'>(['active', 'inactive'])(
      'uses the operator fallback note stating the %s status when no note is given',
      async (status) => {
        const existing = createStatusEvent({ status: status === 'active' ? 'inactive' : 'active' });
        const alertEventsClient = makeStatusAlertEventsClient();

        await createStatusSearchClient(existing, alertEventsClient).updateEventStatus({
          eventId: existing.event_id,
          change: StatusChange.byOperator(status),
        });

        expect(lastStatusWritten(alertEventsClient).data).toMatchObject({
          assessment_note: operatorFallbackAssessmentNote(status),
        });
      }
    );

    it.each<[string, StatusChange, string]>([
      ['an operator status', DEACTIVATE_STATUS, 'inactive'],
      ['a deleted rule', StatusChange.ruleDeleted(), 'inactive'],
      ['an assessment', StatusChange.assessed('breached'), 'active'],
    ])('reports the status %s asks for when the event is not found', async (_l, change, status) => {
      const alertEventsClient = makeStatusAlertEventsClient();

      const result = await createStatusSearchClient(undefined, alertEventsClient).updateEventStatus(
        {
          eventId: 'missing-event',
          change,
        }
      );

      expect(result).toEqual({ updated: 0, ignored: 1, status, reason: 'not_found' });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('skips with the lifecycle reason when the status is unchanged', async () => {
      const existing = createStatusEvent({ status: 'inactive' });
      const alertEventsClient = makeStatusAlertEventsClient();

      const result = await createStatusSearchClient(existing, alertEventsClient).updateEventStatus({
        eventId: existing.event_id,
        change: DEACTIVATE_STATUS,
      });

      expect(result).toEqual({
        updated: 0,
        ignored: 1,
        status: 'inactive',
        reason: 'already_in_state',
      });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('drops the write when another writer appended after the read', async () => {
      const existing = createStatusEvent({ status: 'active' });
      const newer = createStatusEvent({ '@timestamp': '2099-01-01T00:00:00.000Z' });
      const alertEventsClient = makeStatusAlertEventsClient();
      const eventSearchClient = asRuleEventsClient(
        {
          findLatestByEventId: jest
            .fn()
            .mockResolvedValueOnce(existing)
            .mockResolvedValueOnce(newer),
        },
        { getAlertEventsClient: async () => alertEventsClient }
      );

      const result = await eventSearchClient.updateEventStatus({
        eventId: existing.event_id,
        change: DEACTIVATE_STATUS,
      });

      expect(result).toEqual({ updated: 0, ignored: 1, status: 'active', reason: 'superseded' });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('writes only when the latest version is the one the caller read', async () => {
      const existing = createStatusEvent({ status: 'active' });
      const stale = makeStatusAlertEventsClient();

      const superseded = await createStatusSearchClient(existing, stale).updateEventStatus({
        eventId: existing.event_id,
        change: DEACTIVATE_STATUS,
        expectedTimestamp: '2000-01-01T00:00:00.000Z',
      });
      expect(superseded).toEqual({
        updated: 0,
        ignored: 1,
        status: 'active',
        reason: 'superseded',
      });
      expect(stale.createAlertEvent).not.toHaveBeenCalled();

      const current = await createStatusSearchClient(
        existing,
        makeStatusAlertEventsClient()
      ).updateEventStatus({
        eventId: existing.event_id,
        change: DEACTIVATE_STATUS,
        expectedTimestamp: existing['@timestamp'],
      });
      expect(current.updated).toBe(1);
    });

    it('skips when an assessment only confirms the current status', async () => {
      const existing = createStatusEvent({ status: 'active' });
      const alertEventsClient = makeStatusAlertEventsClient();

      const result = await createStatusSearchClient(existing, alertEventsClient).updateEventStatus({
        eventId: existing.event_id,
        change: StatusChange.assessed('breached'),
      });

      expect(result).toEqual({
        updated: 0,
        ignored: 1,
        status: 'active',
        reason: 'already_in_state',
      });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });
  });

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
          status: 'active',
          severity: 'medium',
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

      await client.findLatestByCurrentStatePaginated({ status: ['active'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain('COALESCE(`alert.status`, "active") IN ("active")');
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

      expect(hits[0].status).toBe('inactive');
    });

    it('decodes a persisted recovering status instead of coercing it to active', async () => {
      const row: MockRow = {
        source: ruleEventSource({ alert: { status: 'recovering' } }),
        dataJson: JSON.stringify(dataDoc),
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const { client } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(1) : sourceResponse([row])
      );

      const { hits } = await client.findLatestByCurrentStatePaginated({});

      expect(hits[0].status).toBe('recovering');
    });

    it('filters severity on top-level severity, translated from SIGNIFICANT_EVENTS_SEVERITY_MAP', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ severity: ['critical'] });

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
        status: ['inactive'],
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
        'WHERE (COALESCE(`alert.status`, "active") IN ("active", "recovering")) OR @timestamp >= TO_DATETIME(?overlapFromIso)',
        'WHERE COALESCE(`alert.status`, "active") IN ("inactive")',
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
            status: 'active',
            severity: 'medium',
            created_at: createdAt,
          },
        ],
        page: 1,
        perPage: 25,
        total: 1,
      });
    });
  });

  describe('episode id on listed events', () => {
    it('returns the series current episode so an operator action can address it', async () => {
      const row: MockRow = {
        source: ruleEventSource({ alert: { id: 'episode-7', status: 'active' } }),
        dataJson: JSON.stringify(dataDoc),
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const { client } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(1) : sourceResponse([row])
      );

      const { hits } = await client.findLatestByCurrentStatePaginated({});

      expect(hits[0]).toMatchObject({ episode_id: 'episode-7' });
    });
  });

  describe('list sorting and investigation filter', () => {
    it('sorts by severity rank, then newest first', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ sortField: 'severity', sortOrder: 'desc' });

      const { commands } = getPageRequest(query);
      expect(commands).toContainEqual(
        'EVAL sort_rank = CASE(severity == "critical", 4, severity == "high", 3, severity == "low", 1, 2)'
      );
      expect(commands).toContainEqual('SORT sort_rank DESC, created_at DESC, _id ASC');
    });

    it('sorts missing alert statuses as active', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ sortField: 'status', sortOrder: 'desc' });

      const { commands } = getPageRequest(query);
      expect(commands).toContainEqual(
        'EVAL sort_rank = CASE(COALESCE(`alert.status`, "active") == "inactive", 1, COALESCE(`alert.status`, "active") == "recovering", 2, 3)'
      );
    });

    it('filters on the investigation state derived from the investigations entries', async () => {
      const { client, query } = createClient(async (request) =>
        request.query.includes('STATS total') ? countResponse(0) : sourceResponse([])
      );

      await client.findLatestByCurrentStatePaginated({ investigationStates: ['in_progress'] });

      const q = lastQuery(query, (query_) => !query_.includes('STATS total'));
      expect(q).toContain(
        'EVAL investigation_state = CASE(COALESCE(MV_COUNT(FIELD_EXTRACT(data, "investigations.workflow_execution_id")), 0) == 0, "not_started", COALESCE(MV_COUNT(FIELD_EXTRACT(data, "investigations.completed_at")), 0) < COALESCE(MV_COUNT(FIELD_EXTRACT(data, "investigations.workflow_execution_id")), 0), "in_progress", "completed")'
      );
      expect(q).toContain('WHERE investigation_state IN ("in_progress")');
    });
  });

  describe('countFacets', () => {
    it('counts each dimension without its own filter and fills missing options with zero', async () => {
      const { client, query } = createClient(async (request) => {
        if (request.query.includes('BY severity')) {
          return {
            columns: [
              { name: 'count', type: 'long' },
              { name: 'severity', type: 'keyword' },
            ],
            values: [[3, 'high']],
          } as unknown as ESQLSearchResponse;
        }
        return { columns: [], values: [] } as unknown as ESQLSearchResponse;
      });

      const facets = await client.countFacets({
        severity: ['critical'],
        status: ['active'],
        investigationStates: ['completed'],
      });

      expect(facets.severity).toEqual({ critical: 0, high: 3, medium: 0, low: 0 });
      expect(facets.status).toEqual({ active: 0, recovering: 0, inactive: 0 });
      const queries = query.mock.calls.map(([request]) => request.query);
      const severityQuery = queries.find((q) => q.includes('BY severity'));
      const statusQuery = queries.find((q) => q.includes('BY event_status'));
      const investigationQuery = queries.find((q) => q.includes('BY investigation_state'));
      expect(severityQuery).not.toContain('severity IN');
      expect(severityQuery).toContain('COALESCE(`alert.status`, "active") IN ("active")');
      expect(statusQuery).not.toContain('`alert.status` IN');
      expect(investigationQuery).not.toContain('investigation_state IN');
      expect(investigationQuery).toContain('severity IN ("critical")');
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

  describe('findLatestLive', () => {
    it('filters alert.status to the live statuses (active and recovering), not the top-level status', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestLive({});

      const q = lastQuery(query);
      expect(q).toContain('COALESCE(`alert.status`, "active") IN ("active", "recovering")');
      expect(q).not.toContain('status IN ("open")');
    });

    it('narrows by sourceIds via FIELD_EXTRACT(data, "source_ids")', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestLive({ sourceIds: ['logs.checkout'] });

      const q = lastQuery(query);
      expect(q).toContain('MV_INTERSECTS(FIELD_EXTRACT(data, "source_ids"), ["logs.checkout"])');
    });

    it('narrows by ruleUuids via FIELD_EXTRACT(data, "signals.metadata.rule_uuid")', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestLive({ ruleUuids: ['rule-A'] });

      const q = lastQuery(query);
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "signals.metadata.rule_uuid"), ["rule-A"])'
      );
    });

    it('decodes hits the same way as findLatest', async () => {
      const row: MockRow = { source: ruleEventSource(), dataJson: JSON.stringify(dataDoc) };
      const { client } = createClient(async () => sourceResponse([row]));

      const { hits } = await client.findLatestLive({});

      expect(hits).toEqual([
        {
          ...dataDoc,
          '@timestamp': '2026-01-02T00:00:00.000Z',
          status: 'active',
          severity: 'medium',
        },
      ]);
    });
  });

  describe('findLatestInactiveByIdentity', () => {
    const identity = {
      sourceIds: ['logs.checkout'],
      ruleUuids: ['rule-A'],
      inactiveSince: '2026-10-26T12:00:00.000Z',
    };

    it('reads only closed series, after picking the latest version of each series', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestInactiveByIdentity(identity);

      const q = lastQuery(query);
      expect(q).toContain('COALESCE(`alert.status`, "active") == "inactive"');
      expect(q.indexOf('WHERE @timestamp == latest_ts')).toBeLessThan(
        q.indexOf('WHERE @timestamp >= TO_DATETIME(')
      );
    });

    it('requires both the sources and the rules to intersect', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLatestInactiveByIdentity(identity);

      const q = lastQuery(query);
      expect(q).toContain('MV_INTERSECTS(FIELD_EXTRACT(data, "source_ids"), ["logs.checkout"])');
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "signals.metadata.rule_uuid"), ["rule-A"])'
      );
    });

    it.each([
      ['sources', { sourceIds: [] }],
      ['rules', { ruleUuids: [] }],
    ])('reads nothing, and runs no query, when there are no %s to match', async (_name, empty) => {
      const { client, query } = createClient(async () => sourceResponse([]));

      const { hits } = await client.findLatestInactiveByIdentity({ ...identity, ...empty });

      expect(hits).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });

    it('returns the group_hash and episode each closed series is on, for deactivation lookups', async () => {
      const row: MockRow = {
        source: ruleEventSource({ alert: { id: 'episode-1', status: 'inactive' } }),
        dataJson: JSON.stringify(dataDoc),
      };
      const { client } = createClient(async () => sourceResponse([row]));

      const { heads } = await client.findLatestInactiveByIdentity(identity);

      expect(heads).toEqual([
        { eventId: expect.any(String), groupHash: 'group-hash-1', episodeId: 'episode-1' },
      ]);
    });
  });

  describe('findOperatorDeactivations', () => {
    type ActionType = 'deactivate' | 'activate';
    interface ActionDoc {
      at: string;
      groupHash?: string;
      episodeId?: string;
      type?: ActionType;
      actor?: string;
      reason?: string | null;
    }
    const actionColumns = [
      '@timestamp',
      'group_hash',
      'alert_id',
      'action_type',
      'actor.type',
      'reason',
    ];
    const actionsResponse = (docs: ActionDoc[]): ESQLSearchResponse =>
      ({
        columns: actionColumns.map((name) => ({ name, type: 'keyword' })),
        values: docs.map(
          ({
            at,
            groupHash = 'series-1',
            episodeId = 'episode-1',
            type = 'deactivate',
            actor = 'user',
            reason = 'noise',
          }) => [at, groupHash, episodeId, type, actor, reason]
        ),
      } as unknown as ESQLSearchResponse);

    const heads = [{ groupHash: 'series-1', episodeId: 'episode-1' }];
    const setup = (docs: ActionDoc[] | Error) => {
      const query = jest.fn(async (_request: EsqlRequest) => {
        if (docs instanceof Error) throw docs;
        return actionsResponse(docs);
      });
      const logger = { warn: jest.fn(), error: jest.fn() };
      const client = new RuleEventsClient({
        esClient: { esql: { query } } as never,
        space: 'default',
        logger: logger as never,
      });
      return { client, query, logger };
    };

    it('reads a user deactivate of the episode the series is on', async () => {
      const { client } = setup([{ at: '2026-10-28T10:00:00.000Z', reason: 'known noise' }]);

      const { deactivations, failed } = await client.findOperatorDeactivations({ heads });

      expect(failed).toBe(false);
      expect(deactivations.get('series-1')).toEqual({
        groupHash: 'series-1',
        episodeId: 'episode-1',
        reason: 'known noise',
        deactivatedAt: '2026-10-28T10:00:00.000Z',
      });
    });

    it('scopes the read to the space, the series and the lifecycle actions only', async () => {
      const { client, query } = setup([]);

      await client.findOperatorDeactivations({ heads });

      const text = lastQuery(query);
      expect(text).toContain('.alert-actions');
      expect(text).toContain('space_id == "default"');
      expect(text).toContain('group_hash IN ("series-1")');
      expect(text).toContain('action_type IN ("deactivate", "activate")');
    });

    it('reads with the internal client when one is given', async () => {
      const internalQuery = jest.fn(async () => actionsResponse([]));
      const { query } = setup([]);
      const client = new RuleEventsClient({
        esClient: { esql: { query } } as never,
        internalEsClient: { esql: { query: internalQuery } } as never,
        space: 'default',
      });

      await client.findOperatorDeactivations({ heads });

      expect(internalQuery).toHaveBeenCalledTimes(1);
      expect(query).not.toHaveBeenCalled();
    });

    it('does not read a deactivation of an older episode once the series is on a new one', async () => {
      const { client } = setup([{ at: '2026-10-28T10:00:00.000Z', episodeId: 'episode-0' }]);

      expect((await client.findOperatorDeactivations({ heads })).deactivations.size).toBe(0);
    });

    it('does not read an engine deactivate as an operator deactivation', async () => {
      const { client } = setup([{ at: '2026-10-28T10:00:00.000Z', actor: 'internal' }]);

      expect((await client.findOperatorDeactivations({ heads })).deactivations.size).toBe(0);
    });

    it('lets a later activate cancel the deactivation, and a later deactivate restore it', async () => {
      const cancelled = setup([
        { at: '2026-10-28T10:00:00.000Z', type: 'deactivate' },
        { at: '2026-10-28T11:00:00.000Z', type: 'activate' },
      ]);
      const restored = setup([
        { at: '2026-10-28T11:00:00.000Z', type: 'deactivate', reason: 'second' },
        { at: '2026-10-28T10:00:00.000Z', type: 'activate' },
      ]);

      expect((await cancelled.client.findOperatorDeactivations({ heads })).deactivations.size).toBe(
        0
      );
      expect(
        (await restored.client.findOperatorDeactivations({ heads })).deactivations.get('series-1')
          ?.reason
      ).toBe('second');
    });

    it('reports a failed read as failed, with a tagged error, instead of throwing', async () => {
      const { client, logger } = setup(new Error('index_not_found_exception'));

      expect(await client.findOperatorDeactivations({ heads })).toEqual({
        deactivations: new Map(),
        failed: true,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('deactivation_check_failed')
      );
    });

    it('reads the standard no-reason note as a deactivation without a reason', async () => {
      const { client } = setup([
        {
          at: '2026-10-28T10:00:00.000Z',
          reason: operatorFallbackAssessmentNote('inactive'),
        },
      ]);

      const { deactivations } = await client.findOperatorDeactivations({ heads });
      expect(deactivations.get('series-1')?.reason).toBe('');
    });
  });

  describe('findEventDeactivations', () => {
    const groupResponse = (hashes: string[]): ESQLSearchResponse =>
      ({
        columns: [{ name: 'group_hash', type: 'keyword' }],
        values: hashes.map((hash) => [hash]),
      } as unknown as ESQLSearchResponse);
    const actionResponse = (
      rows: Array<[string, string | null, string | null]>
    ): ESQLSearchResponse =>
      ({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'alert_id', type: 'keyword' },
          { name: 'reason', type: 'text' },
        ],
        values: rows,
      } as unknown as ESQLSearchResponse);
    const setup = (actions: ESQLSearchResponse, hashes: string[] = ['group-1']) => {
      const logger = { error: jest.fn() };
      const query = jest.fn(async (request: EsqlRequest) =>
        request.query.includes('.alert-actions') ? actions : groupResponse(hashes)
      );
      const client = new RuleEventsClient({
        esClient: { esql: { query } } as never,
        space: 'default',
        logger: logger as never,
      });
      return { client, query, logger };
    };

    it('returns the operator deactivations of the event with episode, time and reason', async () => {
      const { client } = setup(
        actionResponse([
          ['2026-10-28T12:48:35.184Z', 'episode-1', '  Known noise  '],
          ['2026-10-28T15:00:00.000Z', 'episode-2', null],
        ])
      );

      expect(await client.findEventDeactivations('event-1')).toEqual([
        {
          '@timestamp': '2026-10-28T12:48:35.184Z',
          episode_id: 'episode-1',
          reason: 'Known noise',
        },
        { '@timestamp': '2026-10-28T15:00:00.000Z', episode_id: 'episode-2', reason: '' },
      ]);
    });

    it('reads only user deactivations of the event series in the space', async () => {
      const { client, query } = setup(actionResponse([]));

      await client.findEventDeactivations('event-1');

      const text = lastQuery(query, (q) => q.includes('.alert-actions'));
      expect(text).toContain('space_id == "default"');
      expect(text).toContain('group_hash == "group-1"');
      expect(text).toContain('action_type == "deactivate" AND actor.type == "user"');
    });
  });

  describe('findLiveMemberships', () => {
    const detectionSignal = ({
      ruleUuid,
      verdict,
      esqlQuery,
    }: {
      ruleUuid: string;
      verdict: string;
      esqlQuery?: string;
    }) => ({
      type: 'detection',
      source_id: 'logs.checkout',
      description: 'Observed rows',
      verdict,
      metadata: { rule_uuid: ruleUuid },
      ...(esqlQuery ? { evidence: { esql_query: esqlQuery, result: 'found' } } : {}),
    });

    const seriesRow = ({
      eventId,
      status = 'active',
      signals,
    }: {
      eventId: string;
      status?: string;
      signals: unknown[];
    }): MockRow => ({
      source: ruleEventSource({ alert: { status } }),
      dataJson: JSON.stringify({ ...dataDoc, event_id: eventId, signals }),
    });

    it('returns an empty map without querying when no rules are requested', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      const members = await client.findLiveMemberships({
        ruleUuids: [],
        from: '2000-01-01T00:00:00.000Z',
      });

      expect(members.size).toBe(0);
      expect(query).not.toHaveBeenCalled();
    });

    it('narrows to live series that contain the requested rules', async () => {
      const { client, query } = createClient(async () => sourceResponse([]));

      await client.findLiveMemberships({
        ruleUuids: ['rule-A'],
        from: '2026-10-01T00:00:00.000Z',
      });

      const q = lastQuery(query);
      // Bounded on the latest version, after created_at is computed over the whole lineage.
      expect(q.indexOf('INLINE STATS created_at')).toBeLessThan(
        q.indexOf('@timestamp >= TO_DATETIME(?fromIso)')
      );
      expect(q).toContain('SORT @timestamp DESC');
      expect(q).toContain(
        'MV_INTERSECTS(FIELD_EXTRACT(data, "signals.metadata.rule_uuid"), ["rule-A"])'
      );
    });

    it('pairs each requested rule with its series status, verdict and stored query', async () => {
      const rows = [
        seriesRow({
          eventId: 'event-1',
          signals: [
            detectionSignal({ ruleUuid: 'rule-A', verdict: 'confirms', esqlQuery: 'FROM $.a' }),
            detectionSignal({ ruleUuid: 'rule-other', verdict: 'refutes', esqlQuery: 'FROM $.o' }),
          ],
        }),
      ];
      const { client } = createClient(async () => sourceResponse(rows));

      const members = await client.findLiveMemberships({
        ruleUuids: ['rule-A'],
        from: '2000-01-01T00:00:00.000Z',
      });

      expect([...members.keys()]).toEqual(['rule-A']);
      expect(members.get('rule-A')).toEqual([
        {
          eventId: 'event-1',
          status: 'active',
          verdict: 'confirms',
          esqlQuery: 'FROM $.a',
          evidenceFound: true,
          createdAt: undefined,
          sourceIds: ['logs.checkout'],
          eventTitle: 'Checkout errors',
        },
      ]);
    });

    it("reads when the member's verdict was reached from its signal", async () => {
      const rows = [
        seriesRow({
          eventId: 'event-1',
          signals: [
            {
              ...detectionSignal({ ruleUuid: 'rule-A', verdict: 'confirms' }),
              collected_at: '2026-10-19T10:00:00.000Z',
            },
          ],
        }),
      ];
      const { client } = createClient(async () => sourceResponse(rows));

      const live = await client.findLiveMemberships({
        ruleUuids: ['rule-A'],
        from: '2000-01-01T00:00:00.000Z',
      });

      expect(live.get('rule-A')?.[0].verifiedAt).toBe('2026-10-19T10:00:00.000Z');
    });

    it('returns one entry per live series when a rule is a member of several', async () => {
      const rows = [
        seriesRow({
          eventId: 'event-1',
          signals: [detectionSignal({ ruleUuid: 'rule-A', verdict: 'confirms', esqlQuery: 'q' })],
        }),
        seriesRow({
          eventId: 'event-2',
          status: 'recovering',
          signals: [detectionSignal({ ruleUuid: 'rule-A', verdict: 'refutes', esqlQuery: 'q' })],
        }),
      ];
      const { client } = createClient(async () => sourceResponse(rows));

      const members = await client.findLiveMemberships({
        ruleUuids: ['rule-A'],
        from: '2000-01-01T00:00:00.000Z',
      });

      expect(
        members.get('rule-A')?.map(({ eventId, status, verdict }) => [eventId, status, verdict])
      ).toEqual([
        ['event-1', 'active', 'confirms'],
        ['event-2', 'recovering', 'refutes'],
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

    it('returns the last row group_hash as the next cursor', async () => {
      const dataJson = JSON.stringify(dataDoc);
      const { client } = createClient(async () =>
        sourceResponse([
          {
            source: ruleEventSource({ group_hash: 'hash-1' }),
            dataJson,
            createdAt: '2026-01-02T00:00:00.000Z',
          },
          {
            source: ruleEventSource({ group_hash: 'hash-2' }),
            dataJson,
            createdAt: '2026-01-02T00:00:00.000Z',
          },
        ])
      );

      const result = await client.findLatestByCurrentStateBatch({ batchSize: 2 });

      expect(result.hits).toHaveLength(2);
      expect(result.lastGroupHash).toBe('hash-2');
    });

    it('returns an undefined cursor for an empty batch', async () => {
      const { client } = createClient(async () => sourceResponse([]));

      const result = await client.findLatestByCurrentStateBatch({ batchSize: 10 });

      expect(result.lastGroupHash).toBeUndefined();
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

  describe('createEvent and updateEvent', () => {
    const version = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
      ...(dataDoc as SignificantEvent),
      '@timestamp': '2026-01-01T00:00:00.000Z',
      event_id: 'agent-event-1',
      status: 'active',
      severity: 'medium',
      ...overrides,
    });
    const makeWriter = () =>
      ({ createAlertEvent: jest.fn().mockResolvedValue(undefined) } as jest.Mocked<
        Pick<AlertEventsClientApi, 'createAlertEvent'>
      >);
    const clientWith = ({
      head,
      writer,
      emitTrigger,
    }: {
      head?: SignificantEvent;
      writer: Pick<AlertEventsClientApi, 'createAlertEvent'>;
      emitTrigger?: TriggerEmitter;
    }) =>
      asRuleEventsClient(
        { findLatestByEventId: jest.fn().mockResolvedValue(head) },
        { getAlertEventsClient: async () => writer as AlertEventsClientApi, emitTrigger }
      );

    it('createEvent writes the version without reading the head, and notifies its creation', async () => {
      const writer = makeWriter();
      const emitTrigger = jest.fn();
      const client = clientWith({ writer, emitTrigger });

      await client.createEvent({ event: version() });

      expect(writer.createAlertEvent).toHaveBeenCalledWith(
        expect.objectContaining({ fingerprint: 'agent-event-1' })
      );
      expect(client.findLatestByEventId).not.toHaveBeenCalled();
      expect(emitTrigger).toHaveBeenCalledWith(
        EVENT_CREATED_TRIGGER_ID,
        expect.objectContaining({ event_id: 'agent-event-1' })
      );
    });

    it('updateEvent writes while the prior version is still the latest', async () => {
      const prior = version();
      const writer = makeWriter();

      const result = await clientWith({ head: prior, writer }).updateEvent({
        event: version({ '@timestamp': '2026-01-02T00:00:00.000Z', status: 'inactive' }),
        prior,
      });

      expect(result).toEqual({ updated: true });
      expect(writer.createAlertEvent).toHaveBeenCalledWith(
        expect.objectContaining({ fingerprint: 'agent-event-1', alert_status: 'inactive' })
      );
    });

    it('updateEvent drops a version another writer superseded, writing and notifying nothing', async () => {
      const prior = version();
      const head = version({ '@timestamp': '2099-01-01T00:00:00.000Z' });
      const writer = makeWriter();
      const emitTrigger = jest.fn();

      const result = await clientWith({ head, writer, emitTrigger }).updateEvent({
        event: version({ status: 'inactive' }),
        prior,
      });

      expect(result).toEqual({ updated: false, head });
      expect(writer.createAlertEvent).not.toHaveBeenCalled();
      expect(emitTrigger).not.toHaveBeenCalled();
    });

    it('updateEvent writes nothing when the head cannot be read back', async () => {
      const writer = makeWriter();

      const result = await clientWith({ writer }).updateEvent({
        event: version({ status: 'inactive' }),
        prior: version(),
      });

      expect(result).toEqual({ updated: false, head: undefined });
      expect(writer.createAlertEvent).not.toHaveBeenCalled();
    });

    it('updateEvent notifies a status change', async () => {
      const prior = version({ status: 'active' });
      const emitTrigger = jest.fn();

      await clientWith({ head: prior, writer: makeWriter(), emitTrigger }).updateEvent({
        event: version({ '@timestamp': '2026-01-02T00:00:00.000Z', status: 'inactive' }),
        prior,
      });

      expect(emitTrigger).toHaveBeenCalledWith(
        EVENT_STATUS_CHANGED_TRIGGER_ID,
        expect.objectContaining({ event_id: 'agent-event-1', previous_status: 'active' })
      );
    });

    it.each(['createEvent', 'updateEvent'] as const)(
      '%s propagates the error and notifies nothing when the write rejects',
      async (method) => {
        const prior = version();
        const emitTrigger = jest.fn();
        const writer = {
          createAlertEvent: jest.fn().mockRejectedValue(new Error('index unavailable')),
        };
        const client = clientWith({ head: prior, writer, emitTrigger });

        await expect(
          method === 'createEvent'
            ? client.createEvent({ event: version() })
            : client.updateEvent({ event: version(), prior })
        ).rejects.toThrow('index unavailable');
        expect(emitTrigger).not.toHaveBeenCalled();
      }
    );

    it('refuses to write when the client was created without a writer', async () => {
      const client = asRuleEventsClient({ findLatestByEventId: jest.fn() });

      await expect(client.createEvent({ event: version() })).rejects.toThrow('without a writer');
    });
  });
});
