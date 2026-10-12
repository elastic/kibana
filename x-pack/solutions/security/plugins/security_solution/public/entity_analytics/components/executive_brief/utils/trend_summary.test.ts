/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  NeedsAttentionCardId,
  NeedsAttentionTileSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { buildTrendSummary, formatTrendSummary } from './trend_summary';

const tile = (
  id: NeedsAttentionCardId,
  count: number,
  previousCount?: number,
  status: NeedsAttentionTileSnapshot['status'] = 'ok'
): NeedsAttentionTileSnapshot => ({
  id,
  status,
  count,
  previousCount,
  sample: [],
  sampleTruncated: false,
});

describe('buildTrendSummary', () => {
  it('formats increases and decreases with arrows and words', () => {
    const summary = buildTrendSummary(
      [tile('entitiesWithAlerts', 14, 8), tile('riskMovers', 2, 5)],
      '7d'
    );
    expect(summary?.changes.map(({ text }) => text)).toEqual([
      '▲ 6 more entities with alerts (8 → 14)',
      '▼ 3 fewer entities with rising risk (5 → 2)',
    ]);
  });

  it('orders by absolute delta, ties by tile order', () => {
    const summary = buildTrendSummary(
      [tile('entitiesWithAnomalies', 3, 1), tile('riskMovers', 5, 10), tile('newEntity', 4, 2)],
      '7d'
    );
    expect(summary?.changes.map(({ id }) => id)).toEqual([
      'riskMovers',
      'entitiesWithAnomalies',
      'newEntity',
    ]);
  });

  it('skips non-ok tiles, tiles without a previous count and zero deltas', () => {
    expect(
      buildTrendSummary(
        [
          tile('entitiesWithAlerts', 9, 1, 'error'),
          tile('riskMovers', 9),
          tile('newEntity', 4, 4),
          tile('watchlisted', 3, 1),
        ],
        '7d'
      )?.changes.map(({ id }) => id)
    ).toEqual(['watchlisted']);
  });

  it('returns undefined when there is nothing to report', () => {
    expect(buildTrendSummary([tile('newEntity', 4, 4)], '7d')).toBeUndefined();
    expect(buildTrendSummary(undefined, '7d')).toBeUndefined();
  });

  it('labels the previous range', () => {
    const tiles = [tile('newEntity', 2, 1)];
    expect(buildTrendSummary(tiles, '24h')?.prefix).toBe('vs previous 24 hours');
    expect(buildTrendSummary(tiles, '7d')?.prefix).toBe('vs previous 7 days');
    expect(buildTrendSummary(tiles, '30d')?.prefix).toBe('vs previous 30 days');
  });

  it('caps at three changes', () => {
    const summary = buildTrendSummary(
      [
        tile('entitiesWithAlerts', 10, 1),
        tile('riskMovers', 9, 1),
        tile('newlyHighCritical', 8, 1),
        tile('entitiesWithAnomalies', 7, 1),
      ],
      '7d'
    );
    expect(summary?.changes).toHaveLength(3);
  });

  it('formats a single line for exports', () => {
    const summary = buildTrendSummary([tile('newEntity', 2, 1), tile('riskMovers', 1, 3)], '30d');
    expect(summary && formatTrendSummary(summary)).toBe(
      'vs previous 30 days: ▼ 2 fewer entities with rising risk (3 → 1) · ▲ 1 more new entity (1 → 2)'
    );
  });
});

describe('buildTrendSummary wording', () => {
  it('uses the singular label for a change of one', () => {
    const summary = buildTrendSummary(
      [
        {
          id: 'newlyHighCritical',
          status: 'ok',
          count: 1,
          previousCount: 0,
          sample: [],
          sampleTruncated: false,
        },
      ],
      '7d'
    );
    expect(summary?.changes[0].text).toBe('▲ 1 more newly high/critical entity (0 → 1)');
  });
});
