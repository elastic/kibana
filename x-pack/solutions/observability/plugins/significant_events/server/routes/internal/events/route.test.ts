/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { internalEventsRoutes } from './route';

const mockCleanupStaleEvents = vi.fn();

vi.mock('../../../lib/significant_events/events/cleanup_stale_events', () => {
      const mocked = {
      cleanupStaleEvents: (...args: unknown[]) => mockCleanupStaleEvents(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../utils/assert_significant_events_access', () => {
      const mocked = {
      assertSignificantEventsAccess: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

const investigateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/investigate'];
const eventsSearchRoute = internalEventsRoutes['GET /internal/significant_events/events'];
const lifecycleRoute =
  internalEventsRoutes['GET /internal/significant_events/events/{id}/lifecycle'];
const eventsGetRoute = internalEventsRoutes['GET /internal/significant_events/events/{id}'];
const eventsUpdateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/update'];
const cleanupRoute = internalEventsRoutes['POST /internal/significant_events/events/_cleanup'];

type HandlerParams = Parameters<typeof investigateRoute.handler>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: vi.fn().mockResolvedValue(state),
});

describe('POST /internal/significant_events/events/_cleanup', () => {
  it('runs cleanup with manage-scoped event and rule clients', async () => {
    mockCleanupStaleEvents.mockResolvedValue({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
    const eventClient = {};
    const rulesClient = {};

    const result = await cleanupRoute.handler({
      params: { body: { candidateRuleIds: ['rule-1'] } },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => eventClient,
        getAlertEventsClient: vi.fn().mockResolvedValue(undefined),
        getSignificantEventsAlertingContext: vi.fn().mockResolvedValue({ rulesClient }),
      }),
      server: {},
    } as never);

    expect(mockCleanupStaleEvents).toHaveBeenCalledWith({
      eventClient,
      rulesClient,
      candidateRuleIds: ['rule-1'],
      alertEventsClient: undefined,
    });
    expect(result).toEqual({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
  });
});

describe('POST /internal/significant_events/events/{id}/investigate', () => {
  it('rejects with 409 while paused before loading the event', async () => {
    const findLatestByEventId = vi.fn();
    const handlerParams = {
      params: { path: { id: 'event-1' } },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({ findLatestByEventId }),
      }),
      server: { nightshiftInvestigations: {} },
      logger: { warn: vi.fn(), get: vi.fn().mockReturnValue({ warn: vi.fn() }) },
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as HandlerParams;

    await expect(investigateRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(findLatestByEventId).not.toHaveBeenCalled();
  });
});

describe('GET /internal/significant_events/events', () => {
  it('serializes the response-only lineage creation timestamp', async () => {
    const event = {
      '@timestamp': '2026-01-03T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      event_uuid: 'version-2',
      event_id: 'event-1',
      status: 'open' as const,
      stream_names: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const findLatestByCurrentStatePaginated = vi.fn().mockResolvedValue({
      hits: [event],
      page: 1,
      perPage: 25,
      total: 1,
    });

    const response = await eventsSearchRoute.handler({
      params: { query: {} },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
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
    const findLatestByCurrentStatePaginated = vi.fn().mockResolvedValue({
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
          stream: 'logs.test',
          search: 'noise',
          page: 2,
          perPage: 10,
        },
      },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
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
      stream: ['logs.test'],
      search: 'noise',
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
      stream_names: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const findLatestByCurrentStatePaginated = vi.fn().mockResolvedValue({
      hits: [event],
      page: 1,
      perPage: 25,
      total: 1,
    });

    const response = await eventsSearchRoute.handler({
      params: { query: {} },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
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
      stream_names: ['logs.test'],
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
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({
          findByEventId: vi.fn().mockResolvedValue({ hits: [firstVersion, latestVersion] }),
        }),
        getDetectionClient: () => ({ findByIds: vi.fn().mockResolvedValue({ hits: [] }) }),
      }),
      server: {},
    } as never);

    expect(response.events).toEqual([firstVersion, latestVersion]);
  });
});

describe('GET /internal/significant_events/events/{id}', () => {
  const baseEvent = {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_uuid: 'version-1',
    event_id: 'event-1',
    status: 'open' as const,
    stream_names: ['logs.test'],
    title: 'Test event',
    summary: 'Test summary',
    severity: '40-medium' as const,
    confidence: 0.8,
  };

  it('returns 404 when the event id is missing', async () => {
    await expect(
      eventsGetRoute.handler({
        params: { path: { id: 'missing' } },
        request: {},
        getScopedClients: vi.fn().mockResolvedValue({
          licensing: {},
          getEventSearchClient: () => ({
            findLatestByEventId: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        server: {},
      } as never)
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('returns the latest version in the event lineage', async () => {
    const older = { ...baseEvent };
    const latest = {
      ...baseEvent,
      event_uuid: 'version-2',
      previous_event_uuid: 'version-1',
      assessment_note: 'Known noise',
    };

    const response = await eventsGetRoute.handler({
      params: { path: { id: older.event_id } },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({
          findLatestByEventId: vi.fn().mockResolvedValue(latest),
        }),
      }),
      server: {},
    } as never);

    expect(response.event_uuid).toBe('version-2');
    expect(response.assessment_note).toBe('Known noise');
  });

  it('passes signals through to the response unchanged', async () => {
    const signals = [
      {
        type: 'detection' as const,
        stream_name: 'logs.test',
        verdict: 'false_positive',
        metadata: {
          rule_uuid: 'rule-uuid-1',
          rule_name: 'Test Rule',
          detection_id: 'det-1',
          change_point_type: 'dip',
        },
      },
    ];
    const eventWithSignals = { ...baseEvent, signals };

    const response = await eventsGetRoute.handler({
      params: { path: { id: baseEvent.event_id } },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getEventSearchClient: () => ({
          findLatestByEventId: vi.fn().mockResolvedValue(eventWithSignals),
        }),
      }),
      server: {},
    } as never);

    expect(response.signals).toEqual(signals);
  });
});

describe('POST /internal/significant_events/events/{id}/update — body schema', () => {
  const bodySchema = eventsUpdateRoute.params.shape.body;

  it('rejects dismissed status with no assessment_note', () => {
    const result = bodySchema.safeParse({ status: 'dismissed' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['assessment_note']);
    }
  });

  it('rejects dismissed status with a blank assessment_note', () => {
    const result = bodySchema.safeParse({ status: 'dismissed', assessment_note: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['assessment_note']);
    }
  });

  it('accepts dismissed status with a non-empty assessment_note', () => {
    const result = bodySchema.safeParse({
      status: 'dismissed',
      assessment_note: 'Known noise from nightly batch job',
    });
    expect(result.success).toBe(true);
  });

  it('accepts closed status without assessment_note', () => {
    const result = bodySchema.safeParse({ status: 'closed' });
    expect(result.success).toBe(true);
  });
});
