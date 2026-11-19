/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import {
  EVENT_SOURCE_FIXTURES,
  toEventSource,
} from '../../common/__fixtures__/analytics_event_sources';
import { SAMPLE_DATASET_INDEX } from './constants';
import {
  getAnalyticsSourceGroups,
  getAnalyticsSources,
  getFeaturedAnalyticsEntries,
} from './sources';
import { buildSourceDashboardParams, buildStarterDashboardParams } from './starter_dashboard';
import type { AnalyticsEventSource, AnalyticsUseCaseId } from './types';
import { getAnalyticsUseCases } from './use_cases';

const unique = (values: readonly string[]): boolean => new Set(values).size === values.length;

describe('analytics use cases', () => {
  const useCases = getAnalyticsUseCases();

  it('offers six use cases with unique ids', () => {
    expect(useCases).toHaveLength(6);
    expect(unique(useCases.map(({ id }) => id))).toBe(true);
  });

  it.each(useCases)('$id has three uniquely identified queries over its index', (useCase) => {
    expect(useCase.starterQueries).toHaveLength(3);
    for (const { esql, question } of useCase.starterQueries) {
      expect(esql.startsWith(`FROM ${useCase.indexPattern}\n`)).toBe(true);
      expect(question).not.toBe('');
    }
  });

  it('gives every starter query a unique id', () => {
    const ids = useCases.flatMap(({ starterQueries }) => starterQueries.map(({ id }) => id));

    expect(unique(ids)).toBe(true);
  });

  it('runs the sample-backed use cases against the sample data indices', () => {
    const sampleBacked = useCases.filter(({ sampleDataset }) => sampleDataset !== undefined);

    expect(
      sampleBacked.map(({ id, sampleDataset, indexPattern }) => [id, sampleDataset, indexPattern])
    ).toEqual([
      ['clickstream', 'clickstream', 'kibana_sample_data_clickstream'],
      ['transactions', 'ecommerce', SAMPLE_DATASET_INDEX.ecommerce],
    ]);
  });
});

describe('analytics sources', () => {
  const groups = getAnalyticsSourceGroups();
  const sources = getAnalyticsSources();

  it('gives sources and groups unique ids', () => {
    expect(unique(sources.map(({ id }) => id))).toBe(true);
    expect(unique(groups.map(({ id }) => id))).toBe(true);
  });

  it.each(groups)('$id has at least one source', ({ id }) => {
    expect(sources.some(({ group }) => group === id)).toBe(true);
  });

  it('offers no database sources and keeps the custom integration under "Send data"', () => {
    expect(groups.map(({ id }) => id)).toEqual([
      'sendEvents',
      'search',
      'streaming',
      'objectStorage',
    ]);
    expect(groups[0].title).toBe('Send data');
    expect(sources.filter(({ id }) => ['postgresql', 'mysql', 'mongodb'].includes(id))).toEqual([]);
    expect(sources.find(({ id }) => id === 'customIntegration')).toEqual(
      expect.objectContaining({ group: 'sendEvents', target: { type: 'integrationCreate' } })
    );
  });

  it('lists streams first and leaves search content out for the events audience', () => {
    const eventGroupIds = getAnalyticsSourceGroups('events').map(({ id }) => id);

    expect(eventGroupIds).toEqual(['streaming', 'sendEvents', 'objectStorage']);
    expect(
      eventGroupIds.flatMap((groupId) =>
        sources.filter(({ group }) => group === groupId).map(({ id }) => id)
      )
    ).toEqual([
      'kafka',
      'kinesis',
      'pubsub',
      'eventHubs',
      'messageQueues',
      'httpEndpoint',
      'api',
      'fileUpload',
      'customIntegration',
      'sampleDataDirectory',
      's3',
      'gcs',
      'azureBlob',
      'dataFederation',
    ]);
  });

  it('offers content connectors nowhere and keeps the other search content sources', () => {
    expect(sources.filter(({ group }) => group === 'search').map(({ id }) => id)).toEqual([
      'webCrawler',
      'apiTutorial',
      'createIndex',
    ]);
    expect(
      sources.filter(({ id, title }) => /connector/i.test(id) || /connector/i.test(title))
    ).toEqual([]);
  });

  it('keeps every way in that the classic home and getting started offered', () => {
    expect(sources.map(({ target }) => target.type)).toEqual(
      expect.arrayContaining([
        'console',
        'fileUpload',
        'externalUrl',
        'sampleDataDirectory',
        'createIndex',
        'apiTutorial',
      ])
    );
    expect(sources.find(({ id }) => id === 'webCrawler')?.target).toEqual({
      type: 'externalUrl',
      url: 'https://github.com/elastic/crawler',
    });
  });

  it('places every source in a known group', () => {
    const groupIds = groups.map(({ id }) => id);

    expect(sources.filter(({ group }) => !groupIds.includes(group))).toEqual([]);
  });
});

describe('getFeaturedAnalyticsEntries', () => {
  const featured = getFeaturedAnalyticsEntries();

  it('features two sources for any data, then the event sources as a list', () => {
    expect(
      featured.map((entry) => (entry.kind === 'source' ? entry.source.id : entry.list.id))
    ).toEqual(['api', 'fileUpload', 'eventStream']);
    expect(featured.map(({ kind }) => kind)).toEqual(['source', 'source', 'sourceList']);
  });

  it('features sources from the catalog as they are', () => {
    for (const entry of featured) {
      if (entry.kind === 'source') {
        expect(getAnalyticsSources()).toContainEqual(entry.source);
      }
    }
  });

  it('names no single product on the event stream list, which is for the events audience', () => {
    expect(featured[2]).toEqual({
      kind: 'sourceList',
      list: expect.objectContaining({
        title: 'Set up an event stream',
        description: 'Connect Kafka, Kinesis, Pub/Sub or another stream of events.',
        audience: 'events',
      }),
    });
    expect(getAnalyticsSources().map(({ id }) => id)).not.toContain('eventStream');
  });
});

describe('buildStarterDashboardParams', () => {
  it.each(getAnalyticsUseCases())('builds valid Lens panels for $id', (useCase) => {
    const {
      panels = [],
      title,
      viewMode,
      time_range: timeRange,
    } = buildStarterDashboardParams(useCase);

    expect(title).toContain(useCase.title);
    expect(viewMode).toBe('edit');
    expect(timeRange).toEqual({ from: 'now-7d', to: 'now' });
    expect(panels).toHaveLength(useCase.id === 'clickstream' ? 6 : 3);
    for (const panel of panels) {
      expect(panel).toMatchObject({ type: 'vis' });
      expect(
        'config' in panel && lensApiConfigSchema.safeParse(panel.config).error
      ).toBeUndefined();
      expect(JSON.stringify(panel)).toContain(`FROM ${useCase.indexPattern} `);
    }
  });

  it('builds the clickstream panels on users, the funnel, campaigns and revenue', () => {
    const clickstream = getAnalyticsUseCases().find(({ id }) => id === 'clickstream');
    const { panels = [] } = clickstream ? buildStarterDashboardParams(clickstream) : {};
    const configs = panels.map((panel) => ('config' in panel ? JSON.stringify(panel.config) : ''));

    expect(configs.map((config) => JSON.parse(config).title)).toEqual([
      'Active users',
      'Revenue (USD)',
      'Events over time by action',
      'Purchase funnel: sessions reaching each step',
      'Sessions that end in a purchase, by campaign (%)',
      'Revenue over time by product category (USD)',
    ]);
    for (const config of configs) {
      expect(config).toContain('WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend');
    }
    expect(configs[3]).toContain('COUNT_DISTINCT(session.id) BY event.action | SORT sessions DESC');
  });

  it('lays the clickstream panels out without gaps or overlaps', () => {
    const clickstream = getAnalyticsUseCases().find(({ id }) => id === 'clickstream');
    const { panels = [] } = clickstream ? buildStarterDashboardParams(clickstream) : {};
    const cells = panels.flatMap(({ grid }) =>
      'w' in grid
        ? Array.from(
            { length: grid.w * grid.h },
            (_, cell) => `${grid.x + (cell % grid.w)}:${grid.y + Math.floor(cell / grid.w)}`
          )
        : []
    );

    expect(new Set(cells).size).toBe(cells.length);
    expect(cells).toHaveLength(48 * 34);
  });

  it('filters the transactions panels on the order date', () => {
    const transactions = getAnalyticsUseCases().find(({ id }) => id === 'transactions');

    expect(transactions && JSON.stringify(buildStarterDashboardParams(transactions))).toContain(
      'WHERE order_date >= ?_tstart AND order_date <= ?_tend'
    );
  });
});

describe('buildSourceDashboardParams', () => {
  const source: AnalyticsEventSource = {
    name: 'app-events',
    kind: 'dataStream',
    dataKind: 'events',
    documentsCount: 42,
    timeField: 'event.created',
    isSampleData: false,
  };

  const expectValidLensPanels = (
    panels: NonNullable<ReturnType<typeof buildSourceDashboardParams>['panels']>
  ): void => {
    for (const panel of panels) {
      expect(panel).toMatchObject({ type: 'vis' });
      expect(
        'config' in panel && lensApiConfigSchema.safeParse(panel.config).error
      ).toBeUndefined();
    }
  };

  it('builds an event count and events over time on the source time field', () => {
    const {
      panels = [],
      title,
      viewMode,
      time_range: timeRange,
    } = buildSourceDashboardParams(source);

    expect(title).toBe('app-events overview');
    expect(viewMode).toBe('edit');
    expect(timeRange).toEqual({ from: 'now-7d', to: 'now' });
    expect(panels).toHaveLength(2);
    expectValidLensPanels(panels);
    expect(JSON.stringify(panels[0])).toContain(
      'FROM app-events | WHERE event.created >= ?_tstart AND event.created <= ?_tend | STATS events = COUNT(*)'
    );
    expect(JSON.stringify(panels[1])).toContain(
      'BUCKET(event.created, 75, ?_tstart, ?_tend) | SORT bucket | EVAL bucket = DATE_FORMAT('
    );
  });

  it('builds only an unfiltered event count when the source has no time field', () => {
    const { panels = [] } = buildSourceDashboardParams({ ...source, timeField: null });

    expect(panels).toHaveLength(1);
    expectValidLensPanels(panels);
    expect(JSON.stringify(panels[0])).toContain('"FROM app-events | STATS events = COUNT(*)"');
  });

  it('quotes source and field names that ES|QL cannot read bare', () => {
    const { panels = [] } = buildSourceDashboardParams({
      ...source,
      name: 'my events',
      timeField: 'event-time',
    });

    expectValidLensPanels(panels);
    expect(JSON.stringify(panels[0])).toContain(
      'FROM \\"my events\\" | WHERE `event-time` >= ?_tstart'
    );
  });

  it.each([
    ['kibana_sample_data_clickstream', 'clickstream'],
    ['kibana_sample_data_ecommerce', 'transactions'],
  ])('reuses the use case dashboard for %s', (name, useCaseId) => {
    const useCase = getAnalyticsUseCases().find(({ id }) => id === useCaseId);

    expect(useCase).toBeDefined();
    expect(buildSourceDashboardParams({ ...source, name, isSampleData: true })).toEqual(
      useCase && buildStarterDashboardParams(useCase)
    );
  });

  describe('with detected fields', () => {
    const USE_CASE_SETTINGS: ReadonlyArray<AnalyticsUseCaseId | undefined> = [
      undefined,
      'clickstream',
      'gaming',
      'transactions',
      'adtech',
      'iot',
      'customerFacing',
    ];
    const detectedSources = EVENT_SOURCE_FIXTURES.filter(({ fields }) => fields !== undefined).map(
      toEventSource
    );
    const variants = detectedSources.flatMap((eventSource) =>
      [eventSource, { ...eventSource, timeField: null }].flatMap((variant) =>
        USE_CASE_SETTINGS.map((useCaseId) => ({
          name: `${variant.name}, ${variant.timeField ?? 'no time field'}, ${useCaseId ?? 'none'}`,
          eventSource: variant,
          useCaseId,
        }))
      )
    );
    const getTitles = (
      eventSource: AnalyticsEventSource,
      useCaseId?: AnalyticsUseCaseId
    ): string[] =>
      (buildSourceDashboardParams(eventSource, useCaseId).panels ?? []).map((panel) => {
        const { title = '' }: { title?: string } = JSON.parse(
          JSON.stringify('config' in panel ? panel.config : {})
        );
        return title;
      });

    it.each(variants)('builds valid Lens panels for $name', ({ eventSource, useCaseId }) => {
      const { panels = [], title } = buildSourceDashboardParams(eventSource, useCaseId);

      expect(title).toBe(`${eventSource.name} overview`);
      expectValidLensPanels(panels);
      expect(panels.length).toBeLessThanOrEqual(6);
      expect(panels.length).toBeGreaterThanOrEqual(eventSource.timeField === null ? 3 : 4);
      for (const panel of panels) {
        const config = JSON.stringify(panel);

        expect(config).toContain(`FROM ${eventSource.name} `);
        expect(config.includes('?_tstart')).toBe(eventSource.timeField !== null);
      }
    });

    it.each(variants)('lays the panels out without gaps or overlaps for $name', (variant) => {
      const { panels = [] } = buildSourceDashboardParams(variant.eventSource, variant.useCaseId);
      const cells = panels.flatMap(({ grid }) =>
        'w' in grid
          ? Array.from(
              { length: grid.w * grid.h },
              (_, cell) => `${grid.x + (cell % grid.w)}:${grid.y + Math.floor(cell / grid.w)}`
            )
          : []
      );
      const rows = Math.max(...panels.map(({ grid }) => ('h' in grid ? grid.y + grid.h : 0)));

      expect(new Set(cells).size).toBe(cells.length);
      expect(cells).toHaveLength(48 * rows);
    });

    it.each(variants)(
      'draws every time series of $name as bars over labelled buckets',
      ({ eventSource, useCaseId }) => {
        // On a time axis Lens shows "No results found" when all events share one bucket.
        const { panels = [] } = buildSourceDashboardParams(eventSource, useCaseId);
        const layers = panels.flatMap((panel) => {
          const config: {
            layers?: Array<{ type: string; x: { column: string }; data_source: { query: string } }>;
          } = JSON.parse(JSON.stringify('config' in panel ? panel.config : {}));
          return config.layers ?? [];
        });
        const timeSeries = layers.filter(({ data_source: { query } }) => query.includes('BUCKET('));

        expect(timeSeries.length > 0).toBe(eventSource.timeField !== null);
        for (const { type, x, data_source: dataSource } of timeSeries) {
          expect(['bar', 'bar_stacked']).toContain(type);
          expect(x.column).toBe('bucket');
          expect(dataSource.query).toMatch(
            / \| SORT bucket \| EVAL bucket = DATE_FORMAT\("MMM d, HH:mm", bucket\)$/
          );
        }
      }
    );

    it('charts amounts, outcomes and customers of payments', () => {
      const payments = detectedSources.find(({ name }) => name === 'poc-tmp-payments');

      expect(payments && getTitles(payments)).toEqual([
        'Events',
        'Active customers',
        'Different events',
        'Total amount over time',
        'Events over time by status',
        'Total amount by merchant category',
      ]);
    });

    it('charts players, sessions and game modes of game telemetry', () => {
      const game = detectedSources.find(({ name }) => name === 'poc-tmp-game-telemetry');
      const { panels = [] } = game ? buildSourceDashboardParams(game) : {};

      expect(game && getTitles(game)).toEqual([
        'Events',
        'Active players',
        'Total amount',
        'Active players over time',
        'Sessions reaching each event',
        'Events by game mode',
      ]);
      expect(JSON.stringify(panels[4])).toContain(
        'FROM poc-tmp-game-telemetry | WHERE event_time >= ?_tstart AND event_time <= ?_tend | WHERE event_type IS NOT NULL | STATS sessions = COUNT_DISTINCT(session_id) BY event_type | SORT sessions DESC | LIMIT 10'
      );
    });

    it('puts the charts the selected use case cares about first', () => {
      const clickstream = detectedSources.find(({ name }) => name === 'poc-tmp-ecs-clickstream');

      expect(clickstream && getTitles(clickstream).slice(3)).toEqual([
        'Events over time by event action',
        'Sessions reaching each event',
        'Sum of order total by campaign',
      ]);
      expect(clickstream && getTitles(clickstream, 'transactions').slice(3)).toEqual([
        'Sum of order total over time',
        'Sum of order total by country',
        'Events by currency',
      ]);
    });

    it('splits amounts by currency instead of adding currencies up', () => {
      const payments = detectedSources.find(({ name }) => name === 'poc-tmp-payments');
      const { panels = [] } = payments ? buildSourceDashboardParams(payments) : {};

      expect(JSON.stringify(panels[3])).toContain(
        'STATS total_amount = ROUND(SUM(amount), 2) BY bucket = BUCKET(created_at, 30, ?_tstart, ?_tend), currency'
      );
      expect(JSON.stringify(panels[3])).toContain('"breakdown_by":{"column":"currency"}');
      expect(JSON.stringify(panels)).not.toContain('"title":"Total amount"');
    });

    it('quotes field names in queries and names result columns bare', () => {
      const awkward = detectedSources.find(({ name }) => name === 'poc-tmp-awkward-names');
      const { panels = [] } = awkward ? buildSourceDashboardParams(awkward) : {};
      const config = JSON.stringify(panels);

      expect(config).toContain('COUNT_DISTINCT(`session-id`) BY `event-type`');
      expect(config).toContain('"x":{"column":"event-type"}');
      expect(config).toContain('BUCKET(`event-time`, 30, ?_tstart, ?_tend), `event-type`');
    });
  });

  it('builds a generated dashboard for sample data without a matching use case', () => {
    const { panels = [], title } = buildSourceDashboardParams({
      ...source,
      name: 'kibana_sample_data_flights',
      timeField: 'timestamp',
      isSampleData: true,
    });

    expect(title).toBe('kibana_sample_data_flights overview');
    expect(panels).toHaveLength(2);
  });
});
