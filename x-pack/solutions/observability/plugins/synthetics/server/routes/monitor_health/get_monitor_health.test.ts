/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { MAX_MONITOR_BATCH_SIZE, MAX_MONITOR_FANOUT_SIZE } from '../zod_query';
import { getMonitorsHealthRoute } from './get_monitor_health';

describe('getMonitorsHealthRoute', () => {
  const bodySchema = (getMonitorsHealthRoute().validate as { body: z.ZodType }).body;

  it(`rejects more than ${MAX_MONITOR_FANOUT_SIZE} monitor ids`, () => {
    const monitorIds = Array.from(
      { length: MAX_MONITOR_FANOUT_SIZE + 1 },
      (_, i) => `monitor-id-${i}`
    );
    expect(() => bodySchema.parse({ monitorIds })).toThrow(
      new RegExp(`too big|maximum|<=${MAX_MONITOR_FANOUT_SIZE}`, 'i')
    );
  });

  it('accepts a non-empty monitorIds array within the cap', () => {
    expect(() => bodySchema.parse({ monitorIds: ['monitor-id-1'] })).not.toThrow();
  });

  it('rejects unknown keys', () => {
    expect(bodySchema.safeParse({ monitorIds: ['monitor-id-1'], extra: true }).success).toBe(false);
  });

  it(`rejects more than ${MAX_MONITOR_BATCH_SIZE} location ids`, () => {
    const locationIds = Array.from({ length: MAX_MONITOR_BATCH_SIZE + 1 }, (_, i) => `loc-${i}`);
    expect(bodySchema.safeParse({ locationIds }).success).toBe(false);
  });

  describe('handler', () => {
    const buildContext = (body: Record<string, string[]>) => {
      const monitorIntegrationHealthApi = {
        getHealth: jest.fn().mockResolvedValue('by-monitor'),
        getHealthForLocations: jest.fn().mockResolvedValue('by-location'),
      };
      const response = { badRequest: jest.fn().mockReturnValue('bad-request') };
      const context = {
        request: { body },
        response,
        monitorIntegrationHealthApi,
      } as unknown as Parameters<ReturnType<typeof getMonitorsHealthRoute>['handler']>[0];
      return { context, monitorIntegrationHealthApi, response };
    };

    it('looks up health by monitor ids', async () => {
      const { context, monitorIntegrationHealthApi } = buildContext({ monitorIds: ['m-1'] });
      expect(await getMonitorsHealthRoute().handler(context)).toBe('by-monitor');
      expect(monitorIntegrationHealthApi.getHealth).toHaveBeenCalledWith(['m-1']);
    });

    it('looks up health by location ids', async () => {
      const { context, monitorIntegrationHealthApi } = buildContext({ locationIds: ['loc-1'] });
      expect(await getMonitorsHealthRoute().handler(context)).toBe('by-location');
      expect(monitorIntegrationHealthApi.getHealthForLocations).toHaveBeenCalledWith(['loc-1']);
    });

    it.each([[{}], [{ monitorIds: ['m-1'], locationIds: ['loc-1'] }]])(
      'rejects %j',
      async (body) => {
        const { context, response } = buildContext(body);
        expect(await getMonitorsHealthRoute().handler(context)).toBe('bad-request');
        expect(response.badRequest).toHaveBeenCalled();
      }
    );
  });
});
