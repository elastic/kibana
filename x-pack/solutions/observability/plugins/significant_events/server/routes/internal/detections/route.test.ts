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
