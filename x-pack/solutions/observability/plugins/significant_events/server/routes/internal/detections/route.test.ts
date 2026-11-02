/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { internalDetectionsRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockGetLiveEntities = jest.fn();
jest.mock('../../../lib/significant_events/entities/get_live_entities', () => ({
  getLiveEntities: (...args: unknown[]) => mockGetLiveEntities(...args),
}));

const searchRoute = internalDetectionsRoutes['GET /internal/significant_events/detections'];
const detectionByIdRoute =
  internalDetectionsRoutes['GET /internal/significant_events/detections/{id}'];
const createRoute = internalDetectionsRoutes['POST /internal/significant_events/detections'];
const markProcessedRoute =
  internalDetectionsRoutes['POST /internal/significant_events/detections/_mark_processed'];
const markScannedRoute =
  internalDetectionsRoutes['POST /internal/significant_events/detections/_mark_scanned'];

const detection = {
  detection_id: 'rule-1-exec-1',
  rule_uuid: 'rule-1',
  change_point_type: 'spike',
  p_value: 0.01,
};

const queryLink = (ruleId: string, entityIds: string[]) => ({
  rule_id: ruleId,
  source_id: 'source-1',
  query: {
    id: `query-${ruleId}`,
    features: entityIds.map((id) => ({ id })),
  },
});

const createSearchResources = (links: ReturnType<typeof queryLink>[]) => {
  const findLatestPaginated = jest.fn().mockResolvedValue({
    hits: [],
    page: 1,
    perPage: 25,
    total: 0,
  });
  const getQueryLinks = jest.fn().mockResolvedValue(links);
  const sourcesClient = {
    list: jest.fn().mockResolvedValue({ sources: [{ id: 'source-1' }], total: 1 }),
    assertReadable: jest.fn().mockResolvedValue(undefined),
  };
  const resources = {
    request: {},
    server: {},
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      sourcesClient,
      getDetectionClient: jest.fn().mockResolvedValue({ findLatestPaginated }),
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getQueryLinks }),
    }),
  };
  return { resources, findLatestPaginated, getQueryLinks };
};

const createDetectionByIdResources = (hits: Array<typeof detection>) => {
  const findById = jest.fn().mockResolvedValue({ hits });
  const resources = {
    request: {},
    server: {},
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      getDetectionClient: jest.fn().mockResolvedValue({ findById }),
    }),
  };
  return { resources, findById };
};

describe('GET /internal/significant_events/detections', () => {
  beforeEach(() => {
    mockGetLiveEntities.mockReset();
  });

  it('searches with default options when the request has no query parameters', async () => {
    const { resources, findLatestPaginated } = createSearchResources([]);

    await searchRoute.handler({
      ...resources,
      params: {},
    } as unknown as Parameters<typeof searchRoute.handler>[0]);

    expect(findLatestPaginated).toHaveBeenCalledWith({});
  });

  it.each([
    ['empty entity ids', { entityIds: [] }],
    ['false Unassigned', { unassignedEntities: false }],
  ])('skips entity resolution for %s', async (_, query) => {
    const { resources, findLatestPaginated, getQueryLinks } = createSearchResources([]);

    await searchRoute.handler({
      ...resources,
      params: { query },
    } as unknown as Parameters<typeof searchRoute.handler>[0]);

    expect(getQueryLinks).not.toHaveBeenCalled();
    expect(findLatestPaginated).toHaveBeenCalledWith({});
  });

  it('bounds rule UUID filters from the request', () => {
    const querySchema = searchRoute.params.shape.query;
    const ruleUuid = (index: number) => `rule-${index}`;

    expect(
      querySchema.safeParse({
        rule_uuid: Array.from({ length: 1000 }, (_, index) => ruleUuid(index)),
      }).success
    ).toBe(true);
    expect(
      querySchema.safeParse({
        rule_uuid: Array.from({ length: 1001 }, (_, index) => ruleUuid(index)),
      }).success
    ).toBe(false);
  });

  it('passes the entity selection to the detection client as rule UUIDs', async () => {
    const { resources, findLatestPaginated } = createSearchResources([
      queryLink('rule-1', ['service-a']),
      queryLink('rule-2', ['service-b']),
    ]);

    await searchRoute.handler({
      ...resources,
      params: {
        query: { entityIds: ['service-a'], page: 2, perPage: 10 },
      },
    } as unknown as Parameters<typeof searchRoute.handler>[0]);

    expect(findLatestPaginated).toHaveBeenCalledWith({
      page: 2,
      perPage: 10,
      rule_uuid: ['rule-1'],
    });
  });

  it('returns an empty page without searching detections when no rules match', async () => {
    const { resources, findLatestPaginated } = createSearchResources([
      queryLink('rule-1', ['service-b']),
    ]);

    await expect(
      searchRoute.handler({
        ...resources,
        params: {
          query: { entityIds: ['service-a'], page: 3, perPage: 10 },
        },
      } as unknown as Parameters<typeof searchRoute.handler>[0])
    ).resolves.toEqual({ hits: [], page: 3, perPage: 10, total: 0 });
    expect(findLatestPaginated).not.toHaveBeenCalled();
  });

  it('ignores Unassigned when the live entity set is truncated', async () => {
    mockGetLiveEntities.mockResolvedValue({ entities: [{ id: 'service-a' }], truncated: true });
    const { resources, findLatestPaginated } = createSearchResources([
      queryLink('rule-1', ['service-a']),
      queryLink('rule-2', []),
    ]);

    await searchRoute.handler({
      ...resources,
      params: {
        query: { unassignedEntities: true },
      },
    } as unknown as Parameters<typeof searchRoute.handler>[0]);

    expect(findLatestPaginated).toHaveBeenCalledWith({
      rule_uuid: ['rule-1', 'rule-2'],
    });
  });

  it('rejects an entity selection that expands to too many rule UUIDs', async () => {
    const links = Array.from({ length: 1001 }, (_, index) =>
      queryLink(`rule-${index}`, ['service-a'])
    );
    const { resources, findLatestPaginated } = createSearchResources(links);

    await expect(
      searchRoute.handler({
        ...resources,
        params: {
          query: { entityIds: ['service-a'] },
        },
      } as unknown as Parameters<typeof searchRoute.handler>[0])
    ).rejects.toMatchObject({
      message: 'Entity filter matches more than 1000 rules. Narrow the entity selection.',
      output: { statusCode: 400 },
    });
    expect(findLatestPaginated).not.toHaveBeenCalled();
  });
});

describe('GET /internal/significant_events/detections/{id}', () => {
  it('returns the newest matching detection', async () => {
    const olderDetection = { ...detection, '@timestamp': '2026-10-22T10:00:00.000Z' };
    const newestDetection = { ...detection, '@timestamp': '2026-10-22T11:00:00.000Z' };
    const { resources, findById } = createDetectionByIdResources([olderDetection, newestDetection]);

    await expect(
      detectionByIdRoute.handler({
        ...resources,
        params: { path: { id: detection.detection_id } },
      } as unknown as Parameters<typeof detectionByIdRoute.handler>[0])
    ).resolves.toBe(newestDetection);
    expect(findById).toHaveBeenCalledWith(detection.detection_id);
  });

  it('returns 404 when the detection does not exist', async () => {
    const { resources } = createDetectionByIdResources([]);

    await expect(
      detectionByIdRoute.handler({
        ...resources,
        params: { path: { id: 'missing-detection' } },
      } as unknown as Parameters<typeof detectionByIdRoute.handler>[0])
    ).rejects.toMatchObject({
      message: 'Detection "missing-detection" not found.',
      output: { statusCode: 404 },
    });
  });
});

describe('detection write routes', () => {
  it('require the Nightshift manage privilege', () => {
    for (const route of [createRoute, markProcessedRoute, markScannedRoute]) {
      expect(route.security.authz).toEqual({
        requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
      });
    }
  });
});

describe('POST /internal/significant_events/detections', () => {
  const bodySchema = createRoute.params.shape.body;

  it('accepts a change_point_type outside the documented set', () => {
    expect(
      bodySchema.safeParse({
        detections: [{ ...detection, change_point_type: 'indeterminable' }],
      }).success
    ).toBe(true);
  });

  it('strips caller-supplied timestamp and space fields', () => {
    const { detections } = bodySchema.parse({
      detections: [
        {
          ...detection,
          '@timestamp': '2020-01-01T00:00:00.000Z',
          kibana: { space_ids: ['other-space'] },
        },
      ],
    });
    expect(detections).toEqual([detection]);
  });

  it('rejects an empty or oversized batch', () => {
    expect(bodySchema.safeParse({ detections: [] }).success).toBe(false);
    expect(
      bodySchema.safeParse({ detections: Array.from({ length: 1001 }, () => detection) }).success
    ).toBe(false);
  });
});

describe('detection marker routes', () => {
  it('bound the number of detections marked processed per request', () => {
    const bodySchema = markProcessedRoute.params.shape.body;
    expect(bodySchema.safeParse({ detection_ids: ['d-1'], processed_by: 'exec-1' }).success).toBe(
      true
    );
    expect(
      bodySchema.safeParse({
        detection_ids: Array.from({ length: 1001 }, (_, index) => `d-${index}`),
        processed_by: 'exec-1',
      }).success
    ).toBe(false);
  });

  it('accepts the classifier outcome on a processed marker and drops unknown keys from it', () => {
    const bodySchema = markProcessedRoute.params.shape.body;
    const parsed = bodySchema.safeParse({
      detection_ids: ['d-1'],
      processed_by: 'exec-1',
      skip: {
        reason: 'still_breaching',
        event_id: 'event-1',
        probe_status: 'ok',
        baseline: { decision: 'background', value: 150, samples: 60, median: 122.5 },
        decision: 'skip',
        rule_uuid: 'rule-1',
      },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.skip).toEqual({
      reason: 'still_breaching',
      event_id: 'event-1',
      probe_status: 'ok',
      baseline: { decision: 'background', value: 150, samples: 60, median: 122.5 },
    });
  });

  it('refuses a processed marker whose skip reason is not a skip reason', () => {
    const bodySchema = markProcessedRoute.params.shape.body;
    expect(
      bodySchema.safeParse({
        detection_ids: ['d-1'],
        processed_by: 'exec-1',
        skip: { reason: 'state_changed', event_id: 'event-1' },
      }).success
    ).toBe(false);
  });

  it.each([undefined, ''])('refuses a skip whose event_id is %p', (eventId) => {
    const bodySchema = markProcessedRoute.params.shape.body;
    expect(
      bodySchema.safeParse({
        detection_ids: ['d-1'],
        processed_by: 'exec-1',
        skip: { reason: 'still_breaching', event_id: eventId },
      }).success
    ).toBe(false);
  });

  it('bound the number of rules marked scanned per request', () => {
    const bodySchema = markScannedRoute.params.shape.body;
    expect(bodySchema.safeParse({ rule_uuids: ['rule-1'], scanned_by: 'exec-1' }).success).toBe(
      true
    );
    expect(bodySchema.safeParse({ rule_uuids: [], scanned_by: 'exec-1' }).success).toBe(false);
  });
});

describe('while Significant Events is paused', () => {
  // Handler resources the routes use; only the maintenance state and the write client matter.
  const createResources = (state: string) => {
    const bulkCreate = jest.fn().mockResolvedValue(undefined);
    const resources = {
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getDetectionClient: jest.fn().mockResolvedValue({ bulkCreate }),
      }),
      maintenanceService: { getState: jest.fn().mockResolvedValue(state) },
    };
    return { resources, bulkCreate };
  };

  const writes = [
    {
      name: 'create detections',
      invoke: (state: string) => {
        const { resources, bulkCreate } = createResources(state);
        const params = { ...resources, params: { body: { detections: [detection] } } };
        const result = createRoute.handler(
          params as unknown as Parameters<typeof createRoute.handler>[0]
        );
        return { result, bulkCreate };
      },
    },
    {
      name: 'mark detections processed',
      invoke: (state: string) => {
        const { resources, bulkCreate } = createResources(state);
        const params = {
          ...resources,
          params: { body: { detection_ids: ['d-1'], processed_by: 'exec-1' } },
        };
        const result = markProcessedRoute.handler(
          params as unknown as Parameters<typeof markProcessedRoute.handler>[0]
        );
        return { result, bulkCreate };
      },
    },
    {
      name: 'mark rules scanned',
      invoke: (state: string) => {
        const { resources, bulkCreate } = createResources(state);
        const params = {
          ...resources,
          params: { body: { rule_uuids: ['rule-1'], scanned_by: 'exec-1' } },
        };
        const result = markScannedRoute.handler(
          params as unknown as Parameters<typeof markScannedRoute.handler>[0]
        );
        return { result, bulkCreate };
      },
    },
  ];

  it.each(writes)('rejects with 409 and writes nothing to $name', async ({ invoke }) => {
    const { result, bulkCreate } = invoke('paused');

    await expect(result).rejects.toMatchObject({ output: { statusCode: 409 } });
    expect(bulkCreate).not.toHaveBeenCalled();
  });

  it.each(writes)('writes to $name when it is not paused', async ({ invoke }) => {
    const { result, bulkCreate } = invoke('enabled');

    await expect(result).resolves.toEqual({ count: 1 });
    expect(bulkCreate).toHaveBeenCalledTimes(1);
  });
});
