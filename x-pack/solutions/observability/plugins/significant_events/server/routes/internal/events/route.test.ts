/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asRuleEventsClient } from '../../../lib/significant_events/events/rule_events_client.mock';
import { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createInvestigationsReader as createReaderMock,
  type FakeInvestigation,
} from '../../../lib/significant_events/events/investigations_reader.mock';
import { internalEventsRoutes } from './route';
import { MAX_DEACTIVATION_REASON_LENGTH } from '@kbn/significant-events-schema';

const mockCleanupStaleEvents = jest.fn();

jest.mock('../../../lib/significant_events/events/cleanup_stale_events', () => ({
  cleanupStaleEvents: (...args: unknown[]) => mockCleanupStaleEvents(...args),
}));

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const eventsSearchRoute = internalEventsRoutes['GET /internal/significant_events/events'];
const eventsFacetsRoute = internalEventsRoutes['GET /internal/significant_events/events/_facets'];
const lifecycleRoute =
  internalEventsRoutes['GET /internal/significant_events/events/{id}/lifecycle'];
const eventsUpdateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/update'];
const cleanupRoute = internalEventsRoutes['POST /internal/significant_events/events/_cleanup'];

const logger = loggingSystemMock.createLogger();

const createInvestigationsReader = (options: {
  investigations: FakeInvestigation[];
  total?: number;
  failList?: boolean;
}) => createReaderMock(options).reader;

const listHandlerParams = ({
  query = {},
  server,
  hits = [],
  countFacets,
}: {
  query?: Record<string, unknown>;
  server: unknown;
  hits?: unknown[];
  countFacets?: jest.Mock;
}) => {
  const findLatestByCurrentStatePaginated = jest
    .fn()
    .mockResolvedValue({ hits, page: 1, perPage: 25, total: hits.length });
  return {
    findLatestByCurrentStatePaginated,
    params: {
      params: { query },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated, countFacets }),
      }),
      server,
      logger,
    } as never,
  };
};

describe('POST /internal/significant_events/events/_cleanup', () => {
  it('runs cleanup with manage-scoped event and rule clients', async () => {
    mockCleanupStaleEvents.mockResolvedValue({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
    const eventClient = {};
    const rulesClient = {};

    const result = await cleanupRoute.handler({
      params: { body: { candidateRuleIds: ['rule-1'] } },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => eventClient,
        getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ rulesClient }),
      }),
      server: {},
      logger,
    } as never);

    expect(mockCleanupStaleEvents).toHaveBeenCalledWith({
      eventSearchClient: eventClient,
      rulesClient,
      candidateRuleIds: ['rule-1'],
    });
    expect(result).toEqual({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
  });
});

describe('GET /internal/significant_events/events', () => {
  it.each([
    { selected: undefined, liveIds: ['checkout'], negated: true, combined: false },
    { selected: 'database', liveIds: ['checkout'], negated: true, combined: true },
    { selected: 'database', liveIds: [], negated: false, combined: false },
  ])(
    'applies unassigned entity membership to lists and facets: %j',
    async ({ selected, liveIds, negated, combined }) => {
      const query = jest.fn().mockResolvedValue({ columns: [], values: [] });
      const eventClient = new RuleEventsClient({
        esClient: { esql: { query } } as never,
        space: 'default',
      });
      const getFeatures = jest.fn().mockResolvedValue({
        hits: liveIds.map((id) => ({
          id,
          source_id: 'source-1',
          properties: {},
          subtype: 'service',
        })),
      });
      const resources = {
        params: { query: { unassigned_entities: true, topology_feature_id: selected } },
        request: { spaceId: 'default' },
        server: {},
        logger,
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          sourcesClient: {
            list: jest.fn().mockResolvedValue({ sources: [{ id: 'source-1' }], total: 1 }),
            assertReadable: jest.fn().mockResolvedValue(undefined),
          },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures }),
          getEventSearchClient: jest.fn().mockResolvedValue(eventClient),
        }),
      };
      await eventsSearchRoute.handler(resources as never);
      await eventsFacetsRoute.handler(resources as never);
      expect(getFeatures).toHaveBeenCalledWith(['source-1'], { type: ['entity'], limit: 1000 });
      for (const [request] of query.mock.calls) {
        expect(request.query.includes('NOT (')).toBe(negated);
        expect(request.query.includes('MV_INTERSECTS')).toBe(negated);
        if (combined) {
          expect(request.query).toMatch(/MV_INTERSECTS.* OR .*NOT \(/);
          expect(request.query).toContain('database');
        }
        if (!liveIds.length) {
          expect(request.query).not.toContain('database');
        }
      }
    }
  );

  it('counts active events per deduplicated slug without losing a nullable topology field', async () => {
    const query = jest.fn().mockImplementation(async ({ query: statement }: { query: string }) =>
      statement.includes('STATS n')
        ? {
            columns: [
              { name: 'fid', type: 'keyword' },
              { name: 'n', type: 'long' },
            ],
            values: [['checkout', 3]],
          }
        : { columns: [{ name: 'total', type: 'long' }], values: [[4]] }
    );
    const client = new RuleEventsClient({
      esClient: { esql: { query } } as never,
      space: 'default',
    });
    expect(
      await client.countActiveEventsByEntity(
        { from: '2026-09-01T00:00:00.000Z', to: '2026-10-22T00:00:00.000Z' },
        ['checkout']
      )
    ).toEqual({
      entities: { checkout: 3 },
      unassigned: 4,
    });
    const statements = query.mock.calls.map(([request]) => request.query);
    const countStatement = statements.find((statement) => statement.includes('STATS n'));
    expect(countStatement).toContain(
      'MV_DEDUPE(CASE(ab IS NULL, st, st IS NULL, ab, MV_APPEND(ab, st)))'
    );
    expect(countStatement).toContain('FIELD_EXTRACT(data, "blast_radius.source")');
    expect(countStatement).toContain('FIELD_EXTRACT(data, "blast_radius.target")');
    expect(statements.find((statement) => statement.includes('STATS n'))).toContain(
      'MV_EXPAND fid'
    );
    expect(statements.find((statement) => statement.includes('STATS total'))).toContain('NOT (');
    for (const [request] of query.mock.calls) {
      expect(request.query).toContain('active');
    }
  });

  it('serializes the response-only lineage creation timestamp', async () => {
    const event = {
      '@timestamp': '2026-01-03T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      event_uuid: 'version-2',
      event_id: 'event-1',
      status: 'open' as const,
      source_ids: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({
      hits: [event],
      page: 1,
      perPage: 25,
      total: 1,
    });

    const response = await eventsSearchRoute.handler({
      params: { query: {} },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
      logger,
    } as never);

    expect(response).toEqual({
      hits: [{ ...event, investigation_state: 'not_started' }],
      page: 1,
      perPage: 25,
      total: 1,
    });
  });

  it('maps event_id to eventIds and still forwards time range and other filters', async () => {
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({
      hits: [],
      page: 1,
      perPage: 25,
      total: 0,
    });

    await eventsSearchRoute.handler({
      params: {
        query: {
          event_id: 'event-1',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-02T00:00:00.000Z',
          status: 'open',
          severity: '40-medium',
          source_id: 'logs.test',
          topology_feature_id: 'checkout-service',
          search: 'noise',
          investigation_state: 'in_progress',
          sort_field: 'severity',
          sort_order: 'asc',
          page: 2,
          perPage: 10,
        },
      },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {
        agenticInvestigations: createInvestigationsReader({ investigations: [] }),
      },
      logger,
    } as never);

    expect(findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      eventIds: ['event-1'],
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      status: ['open'],
      severity: ['40-medium'],
      sourceIds: ['logs.test'],
      topologyFeatureIds: ['checkout-service'],
      search: 'noise',
      investigation: { states: ['in_progress'], episodes: { inProgress: [], completed: [] } },
      sortField: 'severity',
      sortOrder: 'asc',
      page: 2,
      perPage: 10,
    });
  });

  it('passes through the RuleEventsClient-shaped result, plus the investigation state, when getEventSearchClient() resolves the flag-on (RuleEventsClient) path', async () => {
    const event = {
      '@timestamp': '2026-01-03T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      event_uuid: 'group-hash-1',
      event_id: 'event-1',
      status: 'open' as const,
      source_ids: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({
      hits: [event],
      page: 1,
      perPage: 25,
      total: 1,
    });

    const response = await eventsSearchRoute.handler({
      params: { query: {} },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
      logger,
    } as never);

    expect(findLatestByCurrentStatePaginated).toHaveBeenCalled();
    expect(response).toEqual({
      hits: [{ ...event, investigation_state: 'not_started' }],
      page: 1,
      perPage: 25,
      total: 1,
    });
  });
});

describe('GET /internal/significant_events/events/{id}/lifecycle', () => {
  it('returns lineage events with query-computed created_at', async () => {
    const createdAt = '2025-12-31T19:00:00.000Z';
    const firstVersion = {
      '@timestamp': '2026-01-01T00:00:00+05:00',
      created_at: createdAt,
      event_uuid: 'version-1',
      event_id: 'event-1',
      status: 'open' as const,
      source_ids: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const latestVersion = {
      ...firstVersion,
      '@timestamp': '2025-12-31T20:00:00Z',
      event_uuid: 'version-2',
      previous_event_uuid: firstVersion.event_uuid,
      status: 'closed' as const,
    };

    const response = await lifecycleRoute.handler({
      params: { path: { id: latestVersion.event_id } },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({
          findByEventId: jest.fn().mockResolvedValue({ hits: [firstVersion, latestVersion] }),
          findEventDeactivations: jest.fn().mockResolvedValue([]),
        }),
        getDetectionClient: () => ({
          findByIds: jest.fn().mockResolvedValue({ hits: [] }),
          findSkippedForEvent: jest.fn().mockResolvedValue({ hits: [], truncated: false }),
        }),
      }),
      server: {},
      logger,
    } as never);

    expect(response.events).toEqual([firstVersion, latestVersion]);
  });
});

describe('GET /internal/significant_events/events/{id}/lifecycle, deactivations', () => {
  const version = (
    hour: number,
    status: 'active' | 'inactive',
    assessmentNote: string,
    episodeId = 'episode-1'
  ) => ({
    event_id: 'event-1',
    '@timestamp': `2026-01-01T0${hour}:00:00.000Z`,
    status,
    episode_id: episodeId,
    assessment_note: assessmentNote,
  });
  const deactivation = (at: string, reason: string, episodeId = 'episode-1') => ({
    '@timestamp': at,
    episode_id: episodeId,
    reason,
  });
  const versions = [
    version(0, 'active', 'Original'),
    version(1, 'inactive', 'Copied'),
    version(2, 'active', 'Reopened', 'episode-2'),
  ];

  const getLifecycleEvents = async ({
    deactivations,
    includeSkipped = false,
    hits = versions,
  }: {
    deactivations: Array<ReturnType<typeof deactivation>>;
    includeSkipped?: boolean;
    hits?: Array<Record<string, unknown>>;
  }) => {
    const response = await lifecycleRoute.handler({
      params: {
        path: { id: 'event-1' },
        ...(includeSkipped ? { query: { include_skipped: 'true' as const } } : {}),
      },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({
          findByEventId: jest.fn().mockResolvedValue({ hits }),
          findEventDeactivations: jest.fn().mockResolvedValue(deactivations),
        }),
        getDetectionClient: () => ({
          findByIds: jest.fn().mockResolvedValue({ hits: [] }),
          findSkippedForEvent: jest.fn().mockResolvedValue({ hits: [], truncated: false }),
        }),
      }),
      server: {},
      logger,
    } as never);
    return response.events;
  };

  it.each([false, true])(
    'carries the operator reason as the note of the deactivated version (include_skipped: %s)',
    async (includeSkipped) => {
      const events = await getLifecycleEvents({
        // Stamped just after the version it produced: the two are written separately.
        deactivations: [deactivation('2026-01-01T01:00:00.200Z', 'Known noise')],
        includeSkipped,
      });

      expect(events).toEqual([
        versions[0],
        { ...versions[1], assessment_note: 'Known noise' },
        versions[2],
      ]);
    }
  );

  it('keeps the copied note when the operator gave no reason', async () => {
    const events = await getLifecycleEvents({
      deactivations: [deactivation('2026-01-01T00:59:59.900Z', '')],
    });

    expect(events).toEqual(versions);
  });

  it('gives each deactivation of a reopened episode to its own version', async () => {
    const hits = [
      version(0, 'active', 'Original'),
      version(1, 'inactive', 'Copied'),
      version(2, 'active', 'Reopened'),
      version(3, 'inactive', 'Copied again'),
    ];

    const events = await getLifecycleEvents({
      hits,
      deactivations: [
        deactivation('2026-01-01T00:59:59.900Z', 'First reason'),
        deactivation('2026-01-01T02:59:59.900Z', 'Second reason'),
      ],
    });

    expect(events.map(({ assessment_note: note }) => note)).toEqual([
      'Original',
      'First reason',
      'Reopened',
      'Second reason',
    ]);
  });

  it('still matches when the engine writes another inactive version before the action is stamped', async () => {
    const hits = [
      version(0, 'active', 'Original'),
      version(1, 'inactive', 'Copied'),
      { ...version(1, 'inactive', 'Engine update'), '@timestamp': '2026-01-01T01:00:00.050Z' },
    ];

    const events = await getLifecycleEvents({
      hits,
      deactivations: [deactivation('2026-01-01T01:00:00.100Z', 'Known noise')],
    });

    expect(events.map(({ assessment_note: note }) => note)).toEqual([
      'Original',
      'Known noise',
      'Engine update',
    ]);
  });

  it('does not give an operator reason to a version the engine made inactive', async () => {
    const hits = [
      version(0, 'active', 'Original'),
      version(1, 'inactive', 'Recovered'),
      version(2, 'active', 'Reopened by an operator'),
      version(3, 'inactive', 'Copied'),
    ];

    const events = await getLifecycleEvents({
      hits,
      deactivations: [deactivation('2026-01-01T02:59:59.900Z', 'Known noise')],
    });

    expect(events.map(({ assessment_note: note }) => note)).toEqual([
      'Original',
      'Recovered',
      'Reopened by an operator',
      'Known noise',
    ]);
  });

  it('replaces only the note of the version that became inactive in the deactivated episode', async () => {
    const noEpisode = {
      event_id: 'event-1',
      '@timestamp': '2026-01-01T05:00:00.000Z',
      status: 'inactive',
    };
    const stillInactive = { ...version(4, 'inactive', 'Still inactive') };
    const hits = [versions[0], versions[1], stillInactive, noEpisode];

    const events = await getLifecycleEvents({
      hits,
      deactivations: [
        deactivation('2026-01-01T00:59:59.900Z', 'Known noise'),
        deactivation('2026-01-01T00:59:59.900Z', 'Ignored', 'unknown-episode'),
      ],
    });

    expect(events).toEqual([
      versions[0],
      { ...versions[1], assessment_note: 'Known noise' },
      stillInactive,
      noEpisode,
    ]);
  });
});

describe('GET /internal/significant_events/events/{id}/lifecycle, skipped detections', () => {
  const detectionSignal = (ruleUuid: string, detectionId: string) => ({
    type: 'detection' as const,
    source_id: 'logs.test',
    description: 'description',
    verdict: 'confirms' as const,
    metadata: {
      rule_uuid: ruleUuid,
      detection_id: detectionId,
      rule_name: `Rule ${ruleUuid}`,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });
  const event = {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_uuid: 'version-1',
    event_id: 'event-1',
    status: 'open' as const,
    source_ids: ['logs.test'],
    title: 'Test event',
    summary: 'Test summary',
    severity: '40-medium' as const,
    confidence: 0.8,
    signals: [detectionSignal('rule-1', 'detection-1')],
  };
  const stored = (detectionId: string, overrides: Record<string, unknown> = {}) => ({
    detection_id: detectionId,
    rule_uuid: 'rule-1',
    rule_name: 'Rule 1',
    source_id: 'logs.test',
    change_point_type: 'spike',
    '@timestamp': '2026-01-01T01:00:00.000Z',
    processed: true,
    ...overrides,
  });

  const run = async ({
    embedded,
    skipped,
    truncated = false,
    includeSkipped = true,
  }: {
    embedded: Array<Record<string, unknown>>;
    skipped: Array<Record<string, unknown>>;
    truncated?: boolean;
    includeSkipped?: boolean;
  }) => {
    const findSkippedForEvent = jest.fn().mockResolvedValue({ hits: skipped, truncated });
    const response = await lifecycleRoute.handler({
      params: {
        path: { id: event.event_id },
        ...(includeSkipped ? { query: { include_skipped: 'true' as const } } : {}),
      },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({
          findByEventId: jest.fn().mockResolvedValue({ hits: [event] }),
          findEventDeactivations: jest.fn().mockResolvedValue([]),
        }),
        getDetectionClient: () => ({
          findByIds: jest.fn().mockResolvedValue({ hits: embedded }),
          findSkippedForEvent,
        }),
      }),
      server: {},
      logger,
    } as never);
    return { response, findSkippedForEvent };
  };

  const skip = {
    reason: 'still_breaching',
    event_id: event.event_id,
    probe_status: 'ok',
    checked_at: '2026-01-01T01:00:05.000Z',
  };

  it('leaves the skipped detections out, without looking them up, unless asked for', async () => {
    const { response, findSkippedForEvent } = await run({
      embedded: [stored('detection-1')],
      skipped: [stored('detection-2', { skip })],
      truncated: true,
      includeSkipped: false,
    });

    expect(findSkippedForEvent).not.toHaveBeenCalled();
    expect(response.detections.map(({ detection_id: id }) => id)).toEqual(['detection-1']);
    expect(response).not.toHaveProperty('skipped_truncated');
  });

  it('adds the detections the classifier skipped on the strength of this event, with why', async () => {
    const { response, findSkippedForEvent } = await run({
      embedded: [stored('detection-1')],
      skipped: [stored('detection-2', { skip })],
    });

    expect(findSkippedForEvent).toHaveBeenCalledWith(event.event_id);
    expect(response.detections.map(({ detection_id: id }) => id)).toEqual([
      'detection-1',
      'detection-2',
    ]);
    expect(response.detections[1]).toMatchObject({ rule_uuid: 'rule-1', skip });
    expect(response.detections[0]).not.toHaveProperty('skip');
    expect(response).not.toHaveProperty('skipped_truncated');
  });

  it('does not list a detection twice', async () => {
    const { response } = await run({
      embedded: [stored('detection-1')],
      skipped: [stored('detection-1', { skip }), stored('detection-4', { skip })],
    });

    expect(response.detections.map(({ detection_id: id }) => id)).toEqual([
      'detection-1',
      'detection-4',
    ]);
  });

  it('says when the event has more skipped detections than it returns', async () => {
    const { response } = await run({
      embedded: [],
      skipped: [stored('detection-2', { skip })],
      truncated: true,
    });

    expect(response.skipped_truncated).toBe(true);
  });
});

describe('events investigation state', () => {
  const eventWithEpisode = (episodeId?: string) => ({
    '@timestamp': '2026-01-03T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    event_uuid: `uuid-${episodeId}`,
    event_id: `event-${episodeId}`,
    status: 'active' as const,
    source_ids: ['logs.test'],
    title: 'Test event',
    summary: 'Test summary',
    severity: 'medium' as const,
    confidence: 0.8,
    ...(episodeId ? { episode_id: episodeId } : {}),
  });

  it('gives each hit the state of the investigation of its alert, resolved on its own', async () => {
    const { params } = listHandlerParams({
      hits: [eventWithEpisode('ep-run'), eventWithEpisode('ep-done'), eventWithEpisode('ep-none')],
      server: {
        agenticInvestigations: createInvestigationsReader({
          investigations: [
            { id: 'inv-run', alertIds: ['ep-run'], inProgress: true },
            { id: 'inv-done', alertIds: ['ep-done'], open: false },
          ],
        }),
      },
    });

    const response = await eventsSearchRoute.handler(params);

    expect(
      response.hits.map(({ investigation_state: state, investigation_id: id }) => [state, id])
    ).toEqual([
      ['in_progress', 'inv-run'],
      ['completed', 'inv-done'],
      ['not_started', undefined],
    ]);
    expect(response.investigation_window_truncated).toBeUndefined();
  });

  describe('with the investigation filter', () => {
    it('filters on the episodes of the newest investigations and gives the rows the same state', async () => {
      const { params, findLatestByCurrentStatePaginated } = listHandlerParams({
        query: { investigation_state: 'in_progress' },
        hits: [eventWithEpisode('ep-run'), eventWithEpisode('ep-other')],
        server: {
          agenticInvestigations: createInvestigationsReader({
            investigations: [
              { id: 'inv-run', alertIds: ['ep-run'], inProgress: true },
              { id: 'inv-done', alertIds: ['ep-done'], open: false },
            ],
          }),
        },
      });

      const response = await eventsSearchRoute.handler(params);

      expect(findLatestByCurrentStatePaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          investigation: {
            states: ['in_progress'],
            episodes: { inProgress: ['ep-run'], completed: ['ep-done'] },
          },
        })
      );
      expect(response.hits.map(({ investigation_state: state }) => state)).toEqual([
        'in_progress',
        'not_started',
      ]);
    });

    it('says when the window of investigations was full', async () => {
      const { params } = listHandlerParams({
        query: { investigation_state: 'completed' },
        server: {
          agenticInvestigations: createInvestigationsReader({
            investigations: [{ id: 'inv', alertIds: ['ep-1'], open: false }],
            total: 5_000,
          }),
        },
      });

      const response = await eventsSearchRoute.handler(params);

      expect(response.investigation_window_truncated).toBe(true);
    });

    it.each([
      { name: 'the plugin is unavailable', server: {} },
      {
        name: 'the list is refused',
        server: {
          agenticInvestigations: createInvestigationsReader({ investigations: [], failList: true }),
        },
      },
    ])('answers 503, not an unfiltered list, when $name', async ({ server }) => {
      const { params, findLatestByCurrentStatePaginated } = listHandlerParams({
        query: { investigation_state: 'completed' },
        server,
      });

      await expect(eventsSearchRoute.handler(params)).rejects.toMatchObject({
        output: { statusCode: 503 },
      });
      expect(findLatestByCurrentStatePaginated).not.toHaveBeenCalled();
    });
  });

  describe('facets', () => {
    it('counts the investigation state from the episodes of the newest investigations', async () => {
      const countFacets = jest
        .fn()
        .mockResolvedValue({ severity: {}, status: {}, investigation: {} });
      const { params } = listHandlerParams({
        countFacets,
        server: {
          agenticInvestigations: createInvestigationsReader({
            investigations: [{ id: 'inv-run', alertIds: ['ep-run'], inProgress: true }],
            total: 3_000,
          }),
        },
      });

      const response = await eventsFacetsRoute.handler(params);

      const { investigationEpisodes } = countFacets.mock.calls[0][0];
      await expect(investigationEpisodes).resolves.toEqual({
        inProgress: ['ep-run'],
        completed: [],
      });
      expect(response.investigation_window_truncated).toBe(true);
    });

    it('leaves the investigation counts out when the state cannot be read and no filter is set', async () => {
      const countFacets = jest.fn().mockResolvedValue({ severity: {}, status: {} });
      const { params } = listHandlerParams({ countFacets, server: {} });

      const response = await eventsFacetsRoute.handler(params);

      const { investigationEpisodes } = countFacets.mock.calls[0][0];
      await expect(investigationEpisodes).resolves.toBeUndefined();
      expect(response.investigation).toBeUndefined();
    });

    it('answers 503 when the investigation filter is set and the state cannot be read', async () => {
      const countFacets = jest.fn();
      const { params } = listHandlerParams({
        query: { investigation_state: 'completed' },
        countFacets,
        server: {},
      });

      await expect(eventsFacetsRoute.handler(params)).rejects.toMatchObject({
        output: { statusCode: 503 },
      });
      expect(countFacets).not.toHaveBeenCalled();
    });
  });
});

describe('POST /internal/significant_events/events/{id}/update', () => {
  const run = ({
    findLatestByEventId,
    createEpisodeAction = jest.fn().mockResolvedValue(undefined),
    createAlertEvent = jest.fn().mockResolvedValue(undefined),
    emitTrigger,
    body = { status: 'inactive' as const },
    request = { spaceId: 'default' },
  }: {
    findLatestByEventId: jest.Mock;
    createEpisodeAction?: jest.Mock;
    createAlertEvent?: jest.Mock;
    emitTrigger?: jest.Mock;
    body?: { status: 'active' | 'inactive'; assessment_note?: string };
    request?: object;
  }) =>
    eventsUpdateRoute.handler({
      params: { path: { id: 'event-1' }, body },
      request,
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () =>
          asRuleEventsClient(
            { findLatestByEventId },
            {
              getAlertEventsClient: async () => ({ createAlertEvent } as never),
              getAlertActionsClient: async () => ({ createEpisodeAction } as never),
              emitTrigger,
            }
          ),
      }),
      server: {},
      logger,
    } as never);

  const stored = {
    event_id: 'event-1',
    status: 'active',
    episode_id: 'episode-1',
    '@timestamp': '2026-01-01T00:00:00.000Z',
  };

  it('creates the alert action for the stored episode, notifies, and returns the new status', async () => {
    const createEpisodeAction = jest.fn().mockResolvedValue(undefined);
    const createAlertEvent = jest.fn().mockResolvedValue(undefined);
    const emitTrigger = jest.fn();

    const result = await run({
      findLatestByEventId: jest.fn().mockResolvedValue(stored),
      createEpisodeAction,
      createAlertEvent,
      emitTrigger,
      body: { status: 'inactive', assessment_note: ' not an incident ' },
    });

    expect(result).toEqual({ updated: 1, ignored: 0, status: 'inactive' });
    expect(createEpisodeAction).toHaveBeenCalledWith({
      episodeId: 'episode-1',
      action: { action_type: 'deactivate', reason: 'not an incident' },
    });
    expect(createAlertEvent).not.toHaveBeenCalled();
    expect(emitTrigger).toHaveBeenCalledTimes(1);
  });
});

describe('POST /internal/significant_events/events/{id}/update — body schema', () => {
  const bodySchema = eventsUpdateRoute.params.shape.body;

  it('accepts inactive status without assessment_note', () => {
    const result = bodySchema.safeParse({ status: 'inactive' });
    expect(result.success).toBe(true);
  });

  it('accepts inactive status with a non-empty assessment_note', () => {
    const result = bodySchema.safeParse({
      status: 'inactive',
      assessment_note: 'Known noise from nightly batch job',
    });
    expect(result.success).toBe(true);
  });

  it('accepts active status without assessment_note', () => {
    const result = bodySchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
  });

  it('bounds assessment_note at the length an alert action reason allows, on the raw string', () => {
    expect(
      bodySchema.safeParse({
        status: 'inactive',
        assessment_note: 'x'.repeat(MAX_DEACTIVATION_REASON_LENGTH),
      }).success
    ).toBe(true);
    expect(
      bodySchema.safeParse({
        status: 'inactive',
        assessment_note: 'x'.repeat(MAX_DEACTIVATION_REASON_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects recovering, which only the lifecycle state machine writes', () => {
    expect(bodySchema.safeParse({ status: 'recovering' }).success).toBe(false);
  });
});
