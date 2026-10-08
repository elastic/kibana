/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { QueryLink } from '@kbn/significant-events-schema';
import {
  buildBreachQuery,
  buildPresenceQuery,
  probeMemberOutcome,
  type ProbeWindow,
} from './member_breach_probe';

const WINDOW: ProbeWindow = { from: '2026-10-08T10:00:00.000Z', to: '2026-10-08T10:15:00.000Z' };

const makeLink = (overrides: Partial<QueryLink['query']> = {}): QueryLink => ({
  stream_name: 'logs',
  rule_backed: true,
  rule_id: 'rule-1',
  query: {
    id: 'q1',
    title: 'q1',
    description: '',
    type: 'match',
    esql: { query: 'FROM logs, logs.* METADATA _id, _source | WHERE MATCH(body.text, "refused")' },
    ...overrides,
  },
});

const rows = (count: number) => ({ columns: [], values: Array.from({ length: count }, () => []) });

describe('buildBreachQuery', () => {
  it('caps the stored query to one row on its own line, so a trailing comment cannot swallow it', () => {
    expect(buildBreachQuery('FROM logs | WHERE a == 1 // note')).toBe(
      'FROM logs | WHERE a == 1 // note\n| LIMIT 1'
    );
  });

  it('returns undefined when the query does not start with FROM', () => {
    expect(buildBreachQuery('ROW a = 1')).toBeUndefined();
  });
});

describe('buildPresenceQuery', () => {
  it.each([
    ['FROM logs | WHERE a == 1', 'FROM logs | LIMIT 1'],
    ['FROM logs, logs.* | WHERE a == 1', 'FROM logs, logs.* | LIMIT 1'],
    ['FROM logs METADATA _id, _source | WHERE a == 1', 'FROM logs | LIMIT 1'],
    ['FROM logs, logs.*\n  METADATA _id\n| WHERE a == 1', 'FROM logs, logs.* | LIMIT 1'],
    ['FROM $.view | WHERE a == 1', 'FROM $.view | LIMIT 1'],
    ['FROM logs', 'FROM logs | LIMIT 1'],
  ])('%j -> %j', (esql, expected) => {
    expect(buildPresenceQuery(esql)).toBe(expected);
  });

  it('does not mistake a source name containing "metadata" for the METADATA option', () => {
    expect(buildPresenceQuery('FROM metadata-logs | WHERE a == 1')).toBe(
      'FROM metadata-logs | LIMIT 1'
    );
  });

  it('returns undefined when the query does not start with FROM', () => {
    expect(buildPresenceQuery('ROW a = 1')).toBeUndefined();
  });
});

describe('probeMemberOutcome', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const probe = (link: QueryLink | undefined) =>
    probeMemberOutcome({ esClient, link, window: WINDOW, logger });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is breaching as soon as the stored query matches, without running the presence query', async () => {
    esClient.esql.query.mockResolvedValueOnce(rows(1) as never);

    await expect(probe(makeLink())).resolves.toBe('breaching');
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('is clean when the query matches nothing but the source still has data', async () => {
    esClient.esql.query.mockResolvedValueOnce(rows(0) as never);
    esClient.esql.query.mockResolvedValueOnce(rows(1) as never);

    await expect(probe(makeLink())).resolves.toBe('clean');
  });

  it('is no_data when the query matches nothing and the source is empty (a telemetry gap)', async () => {
    esClient.esql.query.mockResolvedValueOnce(rows(0) as never);
    esClient.esql.query.mockResolvedValueOnce(rows(0) as never);

    await expect(probe(makeLink())).resolves.toBe('no_data');
  });

  it('scopes both queries to the window with a @timestamp range filter', async () => {
    esClient.esql.query.mockResolvedValueOnce(rows(0) as never);
    esClient.esql.query.mockResolvedValueOnce(rows(1) as never);

    await probe(makeLink());

    for (const [request] of esClient.esql.query.mock.calls) {
      expect(request).toEqual(
        expect.objectContaining({
          filter: { range: { '@timestamp': { gte: WINDOW.from, lt: WINDOW.to } } },
        })
      );
    }
  });

  it('is no_data when the breach query errors', async () => {
    esClient.esql.query.mockRejectedValueOnce(new Error('index_not_found_exception'));

    await expect(probe(makeLink())).resolves.toBe('no_data');
  });

  it('is no_data when the presence query errors', async () => {
    esClient.esql.query.mockResolvedValueOnce(rows(0) as never);
    esClient.esql.query.mockRejectedValueOnce(new Error('boom'));

    await expect(probe(makeLink())).resolves.toBe('no_data');
  });

  it('is no_data with no stored query for the rule, without querying', async () => {
    await expect(probe(undefined)).resolves.toBe('no_data');
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('is no_data for a stats-type query, which has no breach definition yet', async () => {
    await expect(probe(makeLink({ type: 'stats' }))).resolves.toBe('no_data');
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('is no_data for a query that does not start with FROM, without querying', async () => {
    await expect(probe(makeLink({ esql: { query: 'ROW a = 1' } }))).resolves.toBe('no_data');
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });
});
