/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { asRuleEventsClient } from '../../../lib/significant_events/events/rule_events_client.mock';
import { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import { internalEventsRoutes } from './route';

const mockCleanupStaleEvents = jest.fn();

jest.mock('../../../lib/significant_events/events/cleanup_stale_events', () => ({
  cleanupStaleEvents: (...args: unknown[]) => mockCleanupStaleEvents(...args),
}));

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const investigateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/investigate'];
const eventsSearchRoute = internalEventsRoutes['GET /internal/significant_events/events'];
const eventsFacetsRoute = internalEventsRoutes['GET /internal/significant_events/events/_facets'];
const lifecycleRoute =
  internalEventsRoutes['GET /internal/significant_events/events/{id}/lifecycle'];
const eventsUpdateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/update'];
const cleanupRoute = internalEventsRoutes['POST /internal/significant_events/events/_cleanup'];

type HandlerParams = Parameters<typeof investigateRoute.handler>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

describe('POST /internal/significant_events/events/_cleanup', () => {
  it('runs cleanup with manage-scoped event and rule clients', async () => {
    mockCleanupStaleEvents.mockResolvedValue({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
    const eventClient = {};
    const rulesClient = {};

    const result = await cleanupRoute.handler({
      params: { body: { candidateRuleIds: ['rule-1'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => eventClient,
        getAlertEventsClient: jest.fn().mockResolvedValue(undefined),
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ rulesClient }),
      }),
      server: {},
    } as never);

    expect(mockCleanupStaleEvents).toHaveBeenCalledWith({
      eventSearchClient: eventClient,
      rulesClient,
      candidateRuleIds: ['rule-1'],
    });
    expect(result).toEqual({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
  });
});

describe('POST /internal/significant_events/events/{id}/investigate', () => {
  it.each(['completed', 'failed'] as const)(
    'replaces a %s investigation with a running follow-up',
    async (outcome) => {
      const event = {
        '@timestamp': '2026-01-01T00:00:00.000Z',
        event_uuid: 'version-1',
        event_id: 'event-1',
        status: 'active' as const,
        source_ids: ['logs.test'],
        title: 'Test event',
        summary: 'Test summary',
        severity: 'medium' as const,
        confidence: 0.8,
        investigations: [
          {
            workflow_execution_id: 'inv-1',
            started_at: '2026-01-01T00:00:00.000Z',
            completed_at: '2026-01-01T00:01:00.000Z',
            outcome,
          },
        ],
      };
      const createAlertEvent = jest.fn().mockResolvedValue(undefined);
      const start = jest.fn().mockResolvedValue({ investigation_id: 'inv-1' });
      const beforeStart = Date.now();

      const result = await investigateRoute.handler({
        params: { path: { id: 'event-1' } },
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          getEventSearchClient: () => ({ findLatestByEventId: jest.fn().mockResolvedValue(event) }),
          getAlertEventsClient: () => ({ createAlertEvent }),
        }),
        server: { nightshiftInvestigations: { getInvestigationsClient: () => ({ start }) } },
        logger: { info: jest.fn(), warn: jest.fn() },
        maintenanceService: makeMaintenanceService(),
      } as never);

      expect(result).toEqual({ executionId: 'inv-1' });
      expect(createAlertEvent).toHaveBeenCalledTimes(1);
      const investigations = createAlertEvent.mock.calls[0][0].data.investigations;
      expect(investigations).toEqual([
        { workflow_execution_id: 'inv-1', started_at: expect.any(String) },
      ]);
      expect(Date.parse(investigations[0].started_at)).toBeGreaterThanOrEqual(beforeStart);
      expect(Date.parse(investigations[0].started_at)).toBeLessThanOrEqual(Date.now());
    }
  );

  it('rejects with 409 while paused before loading the event', async () => {
    const findLatestByEventId = jest.fn();
    const handlerParams = {
      params: { path: { id: 'event-1' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByEventId }),
      }),
      server: { nightshiftInvestigations: {} },
      logger: { warn: jest.fn(), get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as HandlerParams;

    await expect(investigateRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(findLatestByEventId).not.toHaveBeenCalled();
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
        request: {},
        server: {},
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

  it('counts active events per deduplicated slug without losing either nullable feature field', async () => {
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
    expect(statements.find((statement) => statement.includes('STATS n'))).toContain(
      'MV_DEDUPE(CASE(a IS NULL, b, b IS NULL, a, MV_APPEND(a, b)))'
    );
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
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
    } as never);

    expect(response).toEqual({
      hits: [event],
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
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
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
      investigationStates: ['in_progress'],
      sortField: 'severity',
      sortOrder: 'asc',
      page: 2,
      perPage: 10,
    });
  });

  it('passes through the RuleEventsClient-shaped result unchanged when getEventSearchClient() resolves the flag-on (RuleEventsClient) path', async () => {
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
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
    } as never);

    expect(findLatestByCurrentStatePaginated).toHaveBeenCalled();
    expect(response).toEqual({
      hits: [event],
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
      request: {},
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
      request: {},
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
      request: {},
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

describe('POST /internal/significant_events/events/{id}/update', () => {
  const run = ({
    findLatestByEventId,
    createAlertEvent = jest.fn().mockResolvedValue(undefined),
    emitTrigger,
    body = { status: 'inactive' as const },
  }: {
    findLatestByEventId: jest.Mock;
    createAlertEvent?: jest.Mock;
    emitTrigger?: jest.Mock;
    body?: { status: 'active' | 'inactive'; assessment_note?: string };
  }) =>
    eventsUpdateRoute.handler({
      params: { path: { id: 'event-1' }, body },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () =>
          asRuleEventsClient(
            { findLatestByEventId },
            { getAlertEventsClient: async () => ({ createAlertEvent } as never), emitTrigger }
          ),
      }),
      server: {},
    } as never);

  const stored = {
    event_id: 'event-1',
    status: 'active',
    '@timestamp': '2026-01-01T00:00:00.000Z',
  };

  it('appends the next version, notifies, and returns the new status', async () => {
    const createAlertEvent = jest.fn().mockResolvedValue(undefined);
    const emitTrigger = jest.fn();

    const result = await run({
      findLatestByEventId: jest.fn().mockResolvedValue(stored),
      createAlertEvent,
      emitTrigger,
      body: { status: 'inactive', assessment_note: ' not an incident ' },
    });

    expect(result).toEqual({ updated: 1, ignored: 0, status: 'inactive' });
    expect(createAlertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'event-1',
        alert_status: 'inactive',
        data: expect.objectContaining({ assessment_note: 'not an incident' }),
      })
    );
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

  it('rejects recovering, which only the lifecycle state machine writes', () => {
    expect(bodySchema.safeParse({ status: 'recovering' }).success).toBe(false);
  });
});
