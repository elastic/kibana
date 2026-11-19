/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_SOURCE_FIXTURES,
  toEventSource,
} from '../../common/__fixtures__/analytics_event_sources';
import { quoteEsqlColumn, quoteEsqlSource } from './esql_identifiers';
import { generateSourceStarterQueries, getSourceStarterQueries } from './source_queries';
import type { AnalyticsEventSource, AnalyticsUseCaseId } from './types';
import { getAnalyticsUseCases } from './use_cases';

const USE_CASE_SETTINGS: ReadonlyArray<AnalyticsUseCaseId | undefined> = [
  undefined,
  'clickstream',
  'gaming',
  'transactions',
  'adtech',
  'iot',
  'customerFacing',
];

const fixture = (id: string): AnalyticsEventSource => {
  const found = EVENT_SOURCE_FIXTURES.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`No fixture named ${id}`);
  }
  return toEventSource(found);
};

const source = (overrides: Partial<AnalyticsEventSource> = {}): AnalyticsEventSource => ({
  name: 'app-events',
  kind: 'dataStream',
  dataKind: 'events',
  documentsCount: 10,
  timeField: '@timestamp',
  isSampleData: false,
  ...overrides,
});

describe('getSourceStarterQueries', () => {
  it('sorts, buckets and counts on the time field of the source', () => {
    const queries = getSourceStarterQueries(source({ timeField: 'event.created' }));

    expect(queries.map(({ id, esql }) => [id, esql])).toEqual([
      ['source_latest_events', 'FROM app-events\n| SORT event.created DESC\n| LIMIT 100'],
      [
        'source_events_over_time',
        'FROM app-events\n| STATS events = COUNT(*) BY hour = BUCKET(event.created, 1 hour)\n| SORT hour',
      ],
      ['source_event_count', 'FROM app-events\n| STATS events = COUNT(*)'],
    ]);
    expect(queries.map(({ question }) => question)).toEqual([
      'What do the latest events look like?',
      'How many events arrive over time?',
      'How many events are there?',
    ]);
  });

  it('offers only queries that need no time field when none was detected', () => {
    const queries = getSourceStarterQueries(source({ kind: 'index', timeField: null }));

    expect(queries.map(({ id, esql }) => [id, esql])).toEqual([
      ['source_latest_events', 'FROM app-events\n| LIMIT 100'],
      ['source_event_count', 'FROM app-events\n| STATS events = COUNT(*)'],
    ]);
  });

  it('quotes the names ES|QL cannot read bare', () => {
    const [latest] = getSourceStarterQueries(
      source({ name: 'events+2026', timeField: 'event-time' })
    );

    expect(latest.esql).toBe('FROM "events+2026"\n| SORT `event-time` DESC\n| LIMIT 100');
  });

  it.each([
    ['kibana_sample_data_clickstream', 'clickstream'],
    ['kibana_sample_data_ecommerce', 'transactions'],
  ])('returns the use case queries for %s', (name, useCaseId) => {
    const useCase = getAnalyticsUseCases().find(({ id }) => id === useCaseId);

    expect(useCase).toBeDefined();
    expect(getSourceStarterQueries(source({ name, isSampleData: true }))).toEqual(
      useCase?.starterQueries
    );
  });

  it('generates queries for sample data without a matching use case', () => {
    const queries = getSourceStarterQueries(
      source({ name: 'kibana_sample_data_flights', timeField: 'timestamp', isSampleData: true })
    );

    expect(queries[0].esql).toBe(
      'FROM kibana_sample_data_flights\n| SORT timestamp DESC\n| LIMIT 100'
    );
  });

  it('does not treat a user index named like sample data as sample data', () => {
    const queries = getSourceStarterQueries(source({ name: 'kibana_sample_data_clickstream' }));

    expect(queries.map(({ id }) => id)).toContain('source_event_count');
  });

  it('gives each query of a source a unique id', () => {
    const ids = getSourceStarterQueries(source()).map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getSourceStarterQueries with detected fields', () => {
  it.each(EVENT_SOURCE_FIXTURES.map((eventSource) => [eventSource.id, toEventSource(eventSource)]))(
    'offers three to five uniquely identified questions for %s, whatever the use case',
    (_, eventSource) => {
      for (const selectedUseCaseId of USE_CASE_SETTINGS) {
        const queries = getSourceStarterQueries(eventSource, selectedUseCaseId);
        const ids = queries.map(({ id }) => id);

        expect(queries.length).toBeGreaterThanOrEqual(3);
        expect(queries.length).toBeLessThanOrEqual(5);
        expect(new Set(ids).size).toBe(ids.length);
        for (const { esql, question } of queries) {
          expect(esql.startsWith(`FROM ${eventSource.name}\n| `)).toBe(true);
          expect(question).toMatch(/^[A-Z].*\?$/);
          expect(question).not.toMatch(/[{}]|undefined/);
        }
      }
    }
  );

  it('asks about amounts, outcomes and customers of payments', () => {
    const queries = getSourceStarterQueries(fixture('payments'));

    expect(queries.map(({ question }) => question)).toEqual([
      'Which merchant category has the highest total amount?',
      'How are events split by status?',
      'How does the total amount change from day to day?',
      'Which customers generate the most events?',
      'Which payment method has the most events and customers?',
    ]);
    expect(queries.map(({ id }) => id)).toEqual([
      'source_measure_by_dimension',
      'source_status_share',
      'source_measure_over_time',
      'source_most_active_actors',
      'source_events_by_dimension',
    ]);
    expect(queries[0].esql).toBe(
      [
        'FROM poc-tmp-payments',
        '| WHERE merchant_category IS NOT NULL AND amount IS NOT NULL',
        '| STATS total_amount = ROUND(SUM(amount), 2), average_amount = ROUND(AVG(amount), 2), events = COUNT(amount) BY merchant_category, currency',
        '| SORT total_amount DESC',
        '| LIMIT 10',
      ].join('\n')
    );
    expect(queries[1].esql).toBe(
      [
        'FROM poc-tmp-payments',
        '| WHERE status IS NOT NULL',
        '| STATS events = COUNT(*) BY status',
        '| INLINE STATS total_events = SUM(events)',
        '| EVAL share_pct = ROUND(events * 100.0 / total_events, 1)',
        '| KEEP status, events, share_pct',
        '| SORT events DESC',
        '| LIMIT 20',
      ].join('\n')
    );
  });

  it('asks about players, sessions and game modes of game telemetry', () => {
    const queries = getSourceStarterQueries(fixture('game-telemetry'));

    expect(queries.map(({ question }) => question)).toEqual([
      'How many players are active each day?',
      'How many sessions and players reach each event?',
      'Which game mode has the most events and players?',
      'Which players generate the most events?',
      'Which platform has the highest total amount?',
    ]);
    expect(queries[0].esql).toBe(
      [
        'FROM poc-tmp-game-telemetry',
        '| STATS active_players = COUNT_DISTINCT(player_id), sessions = COUNT_DISTINCT(session_id), events = COUNT(*) BY day = BUCKET(event_time, 1 day)',
        '| SORT day',
      ].join('\n')
    );
    expect(queries[1].esql).toBe(
      [
        'FROM poc-tmp-game-telemetry',
        '| STATS sessions = COUNT_DISTINCT(session_id), players = COUNT_DISTINCT(player_id), events = COUNT(*) BY event_type',
        '| SORT sessions DESC',
        '| LIMIT 20',
      ].join('\n')
    );
  });

  it('asks about readings and devices of sensors', () => {
    expect(getSourceStarterQueries(fixture('iot-sensors')).map(({ question }) => question)).toEqual(
      [
        'How does the average temperature change from hour to hour?',
        'Which site has the highest average temperature?',
        'Which devices generate the most events?',
        'How are events split by status?',
        'Which sensor type has the most events and devices?',
      ]
    );
  });

  it('reorders and rewords the questions for the selected use case', () => {
    const clickstream = fixture('ecs-clickstream');
    const questions = (selectedUseCaseId?: AnalyticsUseCaseId): string[] =>
      getSourceStarterQueries(clickstream, selectedUseCaseId).map(({ question }) => question);

    expect(questions()).toEqual([
      'How many sessions and users reach each event?',
      'How many users are active each day?',
      'Which campaign has the highest order total?',
      'Which country has the most events and users?',
      'How does the order total change from day to day?',
    ]);
    expect(questions('gaming')).toEqual([
      'How many players are active each day?',
      'How many sessions and players reach each event?',
      'Which country has the most events and players?',
      'Which players generate the most events?',
      'Which campaign has the highest order total?',
    ]);
    expect(questions('transactions')).toEqual([
      'Which country has the highest order total?',
      'How does the order total change from day to day?',
      'Which customers generate the most events?',
      'Which currency has the most events and customers?',
      'How many sessions and customers reach each event?',
    ]);
  });

  it('keeps amounts in different currencies apart', () => {
    const [, , byCampaign, , overTime] = getSourceStarterQueries(fixture('ecs-clickstream'));

    expect(byCampaign.esql).toContain('BY campaign.name, order.currency\n');
    expect(overTime.esql).toContain('BY day = BUCKET(@timestamp, 1 day), order.currency\n');
  });

  it('queries keyword sub-fields and numeric identifiers as detected', () => {
    const [funnel] = getSourceStarterQueries(fixture('product-analytics'));

    expect(funnel.esql).toBe(
      [
        'FROM poc-tmp-product-analytics',
        '| STATS sessions = COUNT_DISTINCT(session_id), users = COUNT_DISTINCT(user_id.keyword), events = COUNT(*) BY event.keyword',
        '| SORT sessions DESC',
        '| LIMIT 20',
      ].join('\n')
    );
  });

  it('quotes field names ES|QL cannot read bare', () => {
    const queries = getSourceStarterQueries(fixture('awkward-names'));

    expect(queries.map(({ esql }) => esql.split('\n')[1])).toEqual([
      '| STATS sessions = COUNT_DISTINCT(`session-id`), users = COUNT_DISTINCT(`user id`), events = COUNT(*) BY `event-type`',
      '| STATS active_users = COUNT_DISTINCT(`user id`), sessions = COUNT_DISTINCT(`session-id`), events = COUNT(*) BY day = BUCKET(`event-time`, 1 day)',
      '| WHERE `1st_country` IS NOT NULL AND `order amount (usd)` IS NOT NULL',
      '| WHERE `payment status` IS NOT NULL',
      '| WHERE `1st_country` IS NOT NULL',
    ]);
    expect(queries[2].esql).toContain(
      'STATS total_order_amount = ROUND(SUM(`order amount (usd)`), 2)'
    );
  });

  it('leaves out questions that need a time field when the source has none', () => {
    const queries = getSourceStarterQueries({ ...fixture('payments'), timeField: null });

    expect(queries.map(({ id }) => id)).toEqual([
      'source_measure_by_dimension',
      'source_status_share',
      'source_most_active_actors',
      'source_events_by_dimension',
      'source_funnel',
    ]);
    expect(queries.map(({ esql }) => esql).join('\n')).not.toMatch(/BUCKET|created_at/);
  });

  it('fills up with the generic questions when few fields were detected', () => {
    const queries = getSourceStarterQueries({
      ...fixture('unrecognisable'),
      fields: {
        action: { name: 'kind', label: 'kind' },
        actors: [],
        measures: [],
        dimensions: [],
      },
    });

    expect(queries.map(({ id, question }) => [id, question])).toEqual([
      ['source_top_actions', 'Which events happen most often?'],
      ['source_latest_events', 'What do the latest events look like?'],
      ['source_events_over_time', 'How many events arrive over time?'],
    ]);
    expect(queries[0].esql).toBe(
      'FROM poc-tmp-unrecognisable\n| STATS events = COUNT(*) BY kind\n| SORT events DESC\n| LIMIT 10'
    );
  });

  it('falls back to the generic questions when nothing was detected', () => {
    expect(
      getSourceStarterQueries(fixture('unrecognisable'), 'gaming').map(({ id }) => id)
    ).toEqual(['source_latest_events', 'source_events_over_time', 'source_event_count']);
  });

  it('generates behind one interface, which sample data bypasses', () => {
    const payments = fixture('payments');

    expect(generateSourceStarterQueries({ source: payments, selectedUseCaseId: 'iot' })).toEqual(
      getSourceStarterQueries(payments, 'iot')
    );
  });
});

describe('quoteEsqlSource', () => {
  it.each(['events', 'app-events', 'logs-app.events-default', 'events-*', '2026-events', 'a_b'])(
    'leaves %s bare',
    (name) => {
      expect(quoteEsqlSource(name)).toBe(name);
    }
  );

  it.each([
    ['events+2026', '"events+2026"'],
    ['my events', '"my events"'],
    ['remote:events', '"remote:events"'],
    ['events(1)', '"events(1)"'],
    ['-events', '"-events"'],
    ['événements', '"événements"'],
    ['a"b\\c', '"a\\"b\\\\c"'],
  ])('quotes %s', (name, quoted) => {
    expect(quoteEsqlSource(name)).toBe(quoted);
  });
});

describe('quoteEsqlColumn', () => {
  it.each(['@timestamp', 'order_date', 'event.created', '_ingested'])('leaves %s bare', (name) => {
    expect(quoteEsqlColumn(name)).toBe(name);
  });

  it.each([
    ['event-time', '`event-time`'],
    ['event time', '`event time`'],
    ['1st_seen', '`1st_seen`'],
    ['event.1st', '`event.1st`'],
    ['a`b', '`a``b`'],
  ])('quotes %s', (name, quoted) => {
    expect(quoteEsqlColumn(name)).toBe(quoted);
  });
});
