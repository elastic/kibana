/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_LOOKBACK_DAYS,
  RUM_SESSIONS_TRANSFORM_PATTERN,
  RUM_SESSIONS_TRANSFORM_SYNC_DELAY,
} from '../../common/rum_sessions';
import { configureRumAnalytics, getRumAnalyticsStatus, resolveRumAnalytics } from './rum_sessions';

const forbidden = Object.assign(new Error('cluster:monitor/transform/stats/get unauthorized'), {
  statusCode: 403,
  meta: { statusCode: 403 },
});

const asClient = ({
  search = jest.fn().mockResolvedValue({ hits: { hits: [] } }),
}: {
  search?: jest.Mock;
} = {}): ElasticsearchClient =>
  ({
    transform: {
      getTransformStats: jest.fn().mockRejectedValue(forbidden),
      getTransform: jest.fn().mockRejectedValue(forbidden),
    },
    search,
  } as unknown as ElasticsearchClient);

describe('resolveRumAnalytics when transform monitor is forbidden', () => {
  beforeEach(() => {
    configureRumAnalytics({ syncDelay: '5m' });
  });

  it('still uses the dest index when transform stats are forbidden', async () => {
    const analytics = await resolveRumAnalytics(asClient());
    expect(analytics.status.installed).toBe(true);
    expect(analytics.status.watermark).toEqual(expect.any(String));
    expect(analytics.status.index).toBe(RUM_SESSIONS_INDEX);
    expect(analytics.status.transformId).toBe(RUM_SESSIONS_TRANSFORM_PATTERN);
    expect(analytics.useIndex).toBe(true);
  });

  it('falls back to raw when dest search is also forbidden', async () => {
    const analytics = await resolveRumAnalytics(
      asClient({ search: jest.fn().mockRejectedValue(forbidden) })
    );
    expect(analytics.status.installed).toBe(false);
    expect(analytics.useIndex).toBe(false);
    expect(analytics.mergeRaw).toBe(false);
  });
});

describe('getRumAnalyticsStatus', () => {
  const checkpoint = (millis: number) => ({
    checkpointing: { last: { time_upper_bound_millis: millis } },
  });

  it('reads the sessions transforms of the digitalExperience plugin, whatever their partitions', async () => {
    const getTransformStats = jest.fn().mockImplementation(({ transform_id: id }) =>
      Promise.resolve({
        transforms:
          id === RUM_SESSIONS_TRANSFORM_PATTERN
            ? [
                { state: 'started', ...checkpoint(Date.now() - 60_000) },
                { state: 'started', ...checkpoint(Date.now() - 120_000) },
              ]
            : [],
      })
    );
    const status = await getRumAnalyticsStatus(
      { transform: { getTransformStats }, search: jest.fn() } as unknown as ElasticsearchClient,
      { refresh: true }
    );
    expect(getTransformStats).toHaveBeenCalledWith(
      expect.objectContaining({ transform_id: RUM_SESSIONS_TRANSFORM_PATTERN })
    );
    expect(status).toEqual(
      expect.objectContaining({
        installed: true,
        state: 'started',
        syncDelay: RUM_SESSIONS_TRANSFORM_SYNC_DELAY,
        sourceLookbackDays: RUM_SESSIONS_LOOKBACK_DAYS,
        transformId: RUM_SESSIONS_TRANSFORM_PATTERN,
        index: RUM_SESSIONS_INDEX,
      })
    );
    // The oldest partition sets the watermark, so no session is read before every slice has it.
    expect(status.lagSeconds).toBeGreaterThanOrEqual(120);
  });

  it('is not installed when the digitalExperience plugin has not enabled sessions', async () => {
    const status = await getRumAnalyticsStatus(
      {
        transform: { getTransformStats: jest.fn().mockResolvedValue({ transforms: [] }) },
        search: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error('no index'), { statusCode: 404 })),
      } as unknown as ElasticsearchClient,
      { refresh: true }
    );
    expect(status.installed).toBe(false);
    expect(status.watermark).toBeNull();
  });
});
