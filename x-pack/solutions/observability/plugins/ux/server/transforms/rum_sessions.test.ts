/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RUM_SESSIONS_INDEX, RUM_SESSIONS_TRANSFORM_ID } from '../../common/rum_sessions';
import { configureRumSessionsTransform, resolveRumAnalytics } from './rum_sessions';

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
    configureRumSessionsTransform({ syncDelay: '5m', sourceLookbackDays: 90 });
  });

  it('still uses the dest index when transform stats are forbidden', async () => {
    const analytics = await resolveRumAnalytics(asClient());
    expect(analytics.status.installed).toBe(true);
    expect(analytics.status.watermark).toEqual(expect.any(String));
    expect(analytics.status.index).toBe(RUM_SESSIONS_INDEX);
    expect(analytics.status.transformId).toBe(RUM_SESSIONS_TRANSFORM_ID);
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
