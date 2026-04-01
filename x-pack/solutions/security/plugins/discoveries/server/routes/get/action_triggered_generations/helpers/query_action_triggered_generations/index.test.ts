/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { queryActionTriggeredGenerations } from '.';

const mockSearch = jest.fn();

const esClient = {
  search: mockSearch,
} as unknown as ElasticsearchClient;

const eventLogIndex = '.kibana-event-log-test';
const spaceId = 'default';

const makeHit = ({
  action,
  connectorId,
  executionUuid,
  reference,
  timestamp,
}: {
  action: string;
  connectorId: string;
  executionUuid: string;
  reference?: string;
  timestamp: string;
}) => ({
  _source: {
    '@timestamp': timestamp,
    event: {
      action,
      category: ['action'],
      dataset: connectorId,
      provider: ATTACK_DISCOVERY_EVENT_PROVIDER,
      reference,
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: executionUuid,
          },
        },
      },
      space_ids: [spaceId],
    },
  },
});

describe('queryActionTriggeredGenerations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated results with correct transformation', async () => {
    const reference = JSON.stringify({
      sourceMetadata: {
        actionExecutionUuid: 'action-exec-1',
        ruleId: 'rule-1',
        ruleName: 'My Rule',
      },
    });

    mockSearch.mockResolvedValue({
      aggregations: {
        total_executions: { value: 1 },
      },
      hits: {
        hits: [
          makeHit({
            action: 'generation-succeeded',
            connectorId: 'connector-1',
            executionUuid: 'exec-uuid-1',
            reference,
            timestamp: '2026-03-10T12:00:00.000Z',
          }),
        ],
      },
    });

    const result = await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 0,
      size: 20,
      spaceId,
    });

    expect(result).toEqual({
      data: [
        {
          connector_id: 'connector-1',
          execution_uuid: 'exec-uuid-1',
          source_metadata: {
            action_execution_uuid: 'action-exec-1',
            rule_id: 'rule-1',
            rule_name: 'My Rule',
          },
          status: 'succeeded',
          timestamp: '2026-03-10T12:00:00.000Z',
        },
      ],
      total: 1,
    });
  });

  it('returns empty results when no action-triggered runs exist', async () => {
    mockSearch.mockResolvedValue({
      aggregations: {
        total_executions: { value: 0 },
      },
      hits: {
        hits: [],
      },
    });

    const result = await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 0,
      size: 20,
      spaceId,
    });

    expect(result).toEqual({ data: [], total: 0 });
  });

  it('sends the correct ES query with space filtering and event.category=action', async () => {
    mockSearch.mockResolvedValue({
      aggregations: { total_executions: { value: 0 } },
      hits: { hits: [] },
    });

    await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 5,
      size: 10,
      spaceId: 'custom-space',
    });

    expect(mockSearch).toHaveBeenCalledWith({
      aggs: {
        total_executions: {
          cardinality: {
            field: 'kibana.alert.rule.execution.uuid',
          },
        },
      },
      collapse: {
        field: 'kibana.alert.rule.execution.uuid',
      },
      from: 5,
      index: eventLogIndex,
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER } },
            { term: { 'event.category': 'action' } },
            { terms: { 'kibana.space_ids': ['custom-space'] } },
            {
              terms: {
                'event.action': ['generation-failed', 'generation-started', 'generation-succeeded'],
              },
            },
          ],
        },
      },
      size: 10,
      sort: [{ '@timestamp': { order: 'desc' } }],
    });
  });

  it('handles multiple results with different statuses', async () => {
    mockSearch.mockResolvedValue({
      aggregations: { total_executions: { value: 3 } },
      hits: {
        hits: [
          makeHit({
            action: 'generation-succeeded',
            connectorId: 'c1',
            executionUuid: 'e1',
            timestamp: '2026-03-10T14:00:00.000Z',
          }),
          makeHit({
            action: 'generation-failed',
            connectorId: 'c2',
            executionUuid: 'e2',
            timestamp: '2026-03-10T13:00:00.000Z',
          }),
          makeHit({
            action: 'generation-started',
            connectorId: 'c3',
            executionUuid: 'e3',
            timestamp: '2026-03-10T12:00:00.000Z',
          }),
        ],
      },
    });

    const result = await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 0,
      size: 20,
      spaceId,
    });

    expect(result.data).toHaveLength(3);
    expect(result.data[0].status).toBe('succeeded');
    expect(result.data[1].status).toBe('failed');
    expect(result.data[2].status).toBe('running');
    expect(result.total).toBe(3);
  });

  it('returns null source_metadata when event.reference is absent', async () => {
    mockSearch.mockResolvedValue({
      aggregations: { total_executions: { value: 1 } },
      hits: {
        hits: [
          makeHit({
            action: 'generation-succeeded',
            connectorId: 'c1',
            executionUuid: 'e1',
            timestamp: '2026-03-10T12:00:00.000Z',
          }),
        ],
      },
    });

    const result = await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 0,
      size: 20,
      spaceId,
    });

    expect(result.data[0].source_metadata).toBeNull();
  });

  it('handles hits with missing _source fields gracefully', async () => {
    mockSearch.mockResolvedValue({
      aggregations: { total_executions: { value: 1 } },
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': undefined,
              event: {},
              kibana: {},
            },
          },
        ],
      },
    });

    const result = await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 0,
      size: 20,
      spaceId,
    });

    expect(result.data[0]).toEqual({
      connector_id: '',
      execution_uuid: '',
      source_metadata: null,
      status: 'unknown',
      timestamp: '',
    });
  });

  it('returns total of 0 when aggregations are missing', async () => {
    mockSearch.mockResolvedValue({
      hits: { hits: [] },
    });

    const result = await queryActionTriggeredGenerations({
      esClient,
      eventLogIndex,
      from: 0,
      size: 20,
      spaceId,
    });

    expect(result).toEqual({ data: [], total: 0 });
  });

  describe('date range filtering', () => {
    it('adds a range clause on @timestamp when start and end are provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        end: 'now',
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
        start: 'now-24h',
      });

      const query = mockSearch.mock.calls[0][0].query;
      expect(query.bool.filter).toContainEqual({
        range: { '@timestamp': { gte: 'now-24h', lte: 'now' } },
      });
    });

    it('adds a range clause with only gte when only start is provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
        start: 'now-7d',
      });

      const query = mockSearch.mock.calls[0][0].query;
      expect(query.bool.filter).toContainEqual({
        range: { '@timestamp': { gte: 'now-7d' } },
      });
    });

    it('adds a range clause with only lte when only end is provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        end: 'now',
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
      });

      const query = mockSearch.mock.calls[0][0].query;
      expect(query.bool.filter).toContainEqual({
        range: { '@timestamp': { lte: 'now' } },
      });
    });

    it('does not add a range clause when neither start nor end is provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
      });

      const filterClauses = mockSearch.mock.calls[0][0].query.bool.filter;
      const rangeClauses = filterClauses.filter(
        (clause: Record<string, unknown>) => 'range' in clause
      );
      expect(rangeClauses).toHaveLength(0);
    });
  });

  describe('status filtering', () => {
    it('replaces the default GENERATION_ACTIONS terms filter with the mapped status actions', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
        status: ['running', 'failed'],
      });

      const filterClauses = mockSearch.mock.calls[0][0].query.bool.filter;
      const termsActionClause = filterClauses.find(
        (clause: Record<string, unknown>) =>
          'terms' in clause &&
          (clause as { terms: Record<string, unknown> }).terms['event.action'] != null
      );
      expect(termsActionClause).toEqual({
        terms: { 'event.action': ['generation-started', 'generation-failed'] },
      });
    });

    it('uses the default GENERATION_ACTIONS filter when status is not provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
      });

      const filterClauses = mockSearch.mock.calls[0][0].query.bool.filter;
      const termsActionClause = filterClauses.find(
        (clause: Record<string, unknown>) =>
          'terms' in clause &&
          (clause as { terms: Record<string, unknown> }).terms['event.action'] != null
      );
      expect(termsActionClause).toEqual({
        terms: {
          'event.action': ['generation-failed', 'generation-started', 'generation-succeeded'],
        },
      });
    });

    it('maps a single status value correctly', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
        status: ['succeeded'],
      });

      const filterClauses = mockSearch.mock.calls[0][0].query.bool.filter;
      const termsActionClause = filterClauses.find(
        (clause: Record<string, unknown>) =>
          'terms' in clause &&
          (clause as { terms: Record<string, unknown> }).terms['event.action'] != null
      );
      expect(termsActionClause).toEqual({
        terms: { 'event.action': ['generation-succeeded'] },
      });
    });
  });

  describe('search filtering', () => {
    it('adds a bool.should with wildcard queries when search is provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        search: 'my-rule',
        size: 20,
        spaceId,
      });

      const query = mockSearch.mock.calls[0][0].query;
      expect(query.bool.should).toEqual([
        { wildcard: { 'event.dataset': { case_insensitive: true, value: '*my-rule*' } } },
        { wildcard: { 'event.reference': { case_insensitive: true, value: '*my-rule*' } } },
      ]);
      expect(query.bool.minimum_should_match).toBe(1);
    });

    it('does not add should clauses when search is not provided', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        esClient,
        eventLogIndex,
        from: 0,
        size: 20,
        spaceId,
      });

      const query = mockSearch.mock.calls[0][0].query;
      expect(query.bool.should).toBeUndefined();
      expect(query.bool.minimum_should_match).toBeUndefined();
    });
  });

  describe('combined filters', () => {
    it('applies date range, status, and search filters together', async () => {
      mockSearch.mockResolvedValue({
        aggregations: { total_executions: { value: 0 } },
        hits: { hits: [] },
      });

      await queryActionTriggeredGenerations({
        end: 'now',
        esClient,
        eventLogIndex,
        from: 0,
        search: 'test',
        size: 20,
        spaceId,
        start: 'now-24h',
        status: ['failed'],
      });

      const query = mockSearch.mock.calls[0][0].query;

      expect(query.bool.filter).toContainEqual({
        range: { '@timestamp': { gte: 'now-24h', lte: 'now' } },
      });

      const termsActionClause = query.bool.filter.find(
        (clause: Record<string, unknown>) =>
          'terms' in clause &&
          (clause as { terms: Record<string, unknown> }).terms['event.action'] != null
      );
      expect(termsActionClause).toEqual({
        terms: { 'event.action': ['generation-failed'] },
      });

      expect(query.bool.should).toEqual([
        { wildcard: { 'event.dataset': { case_insensitive: true, value: '*test*' } } },
        { wildcard: { 'event.reference': { case_insensitive: true, value: '*test*' } } },
      ]);
      expect(query.bool.minimum_should_match).toBe(1);
    });
  });
});
