/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shapePriorWindowStats } from './use_posture_trend';

// Builds a per-type top_metrics aggregation bucket the way Elasticsearch
// returns it for the prior-window query (latest score/level per entity).
const bucket = (
  type: 'user' | 'host' | 'service',
  key: string,
  score: number | null,
  level: string | null
) => ({
  key,
  latest_score: { top: [{ metrics: { [`${type}.risk.calculated_score_norm`]: score } }] },
  latest_level: { top: [{ metrics: { [`${type}.risk.calculated_level`]: level } }] },
});

describe('shapePriorWindowStats', () => {
  it('returns undefined when there are no aggregations', () => {
    expect(shapePriorWindowStats(undefined)).toBeUndefined();
  });

  it('reshapes per-type latest-per-entity buckets into per-(type, level) stats', () => {
    const shaped = shapePriorWindowStats({
      host: {
        buckets: [
          bucket('host', 'host:a', 80, 'High'),
          bucket('host', 'host:b', 82, 'High'),
          bucket('host', 'host:c', 50, 'Moderate'),
        ],
      },
      user: {
        buckets: [bucket('user', 'user:x', 30, 'Low'), bucket('user', 'user:y', 95, 'Critical')],
      },
      service: { buckets: [] },
    });

    expect(shaped).toBeDefined();
    // High hosts collapse into one row with the averaged risk and summed count.
    expect(shaped?.byLevel).toContainEqual({
      type: 'host',
      level: 'High',
      count: 2,
      avgRisk: 81,
    });
    expect(shaped?.byLevel).toContainEqual({
      type: 'host',
      level: 'Moderate',
      count: 1,
      avgRisk: 50,
    });
    expect(shaped?.byLevel).toContainEqual({
      type: 'user',
      level: 'Critical',
      count: 1,
      avgRisk: 95,
    });
    expect(shaped?.totalEntities).toBe(5);
    expect(shaped?.criticalCount).toBe(1);
    expect(shaped?.highCount).toBe(2);
    // byType is intentionally empty: the trend only needs the per-level shape.
    expect(shaped?.byType).toEqual([]);
  });

  it('skips buckets with an unrecognized risk level', () => {
    const shaped = shapePriorWindowStats({
      host: {
        buckets: [bucket('host', 'host:a', 80, 'High'), bucket('host', 'host:b', 60, 'Bogus')],
      },
      user: { buckets: [] },
      service: { buckets: [] },
    });

    expect(shaped?.byLevel).toEqual([{ type: 'host', level: 'High', count: 1, avgRisk: 80 }]);
    expect(shaped?.totalEntities).toBe(1);
  });

  it('returns undefined when the window scored no entities (no baseline to compare)', () => {
    // Buckets exist but carry no numeric score → not a comparable baseline.
    const shaped = shapePriorWindowStats({
      host: { buckets: [bucket('host', 'host:a', null, 'High')] },
      user: { buckets: [] },
      service: { buckets: [] },
    });

    expect(shaped).toBeUndefined();
  });

  it('returns undefined for a completely empty window (missing index / engine never ran)', () => {
    expect(
      shapePriorWindowStats({
        host: { buckets: [] },
        user: { buckets: [] },
        service: { buckets: [] },
      })
    ).toBeUndefined();
  });
});
