/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from './time_range';
import { TRAILING_WINDOW } from './tile_trailing_window';

/** Hours before a dot's boundary in which a score still counts as the boundary score (the tile's 2h buffer). */
export const BOUNDARY_SLICE_HOURS = 2;

/** Returns the result column of dot `k` (0 = newest) for the Risk movers tile. */
export const trailingRiskMoversColumn = (k: number): string => `risk_movers_${k}`;

/** Returns how many hours back the series query reads, so the oldest dot has its boundary score. */
export const riskMoversTrailingFetchHours = (timeRange: TimeRange): number => {
  const { stepHours, dots } = TRAILING_WINDOW[timeRange];
  return (2 * dots - 1) * stepHours + BOUNDARY_SLICE_HOURS;
};

/** Seconds are packed above the score: `packed = secondsAgo * 2^30 + score * 2^23` (see below). */
const SCORE_SHIFT = 8388608; // 2^23
const TIME_SHIFT = 1073741824; // 2^30
/** The tile's threshold (a rise of 10 points) in the packed score unit (10 * 2^23). */
const MOVER_THRESHOLD_PACKED = 10 * SCORE_SHIFT;

/**
 * Builds one query that returns every sparkline dot of the Risk movers tile as columns of a single
 * row, where dot `k` is what the tile would have shown `k` steps ago.
 *
 * For dot `k` an entity's current score is its latest score in the selected time range ending
 * `k` steps back, and its boundary score is its latest score in the 2h buffer before the start of
 * that range, exactly as the tile's own query picks them. The entity counts when the score rose
 * by at least 10. The tile's join, entity filters and resolution dedupe are applied as it does.
 *
 * Picking "the latest score in a window" with `LAST(score, @timestamp) WHERE ...` is not
 * reliable: on the Elasticsearch builds checked it drops values and gives different results from
 * run to run. So each score is packed behind its age in seconds (`secondsAgo * 2^30 + score * 2^23`,
 * exact for float scores of 1 or more and below 2^53 for the longest range) and a filtered `MIN`
 * picks the newest one: the smallest age wins, and the packed value carries its score. The score
 * is unpacked inside the final condition, so the rise is compared on the same values as the tile.
 */
export const buildRiskMoversTrailingSeriesQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const { dots, stepHours } = TRAILING_WINDOW[timeRange];
  const rangeHours = dots * stepHours;

  const perEntity = Array.from({ length: dots }, (_, k) => {
    const from = k * stepHours;
    const boundary = from + rangeHours;
    return [
      `cur_${k} = MIN(packed) WHERE hours_ago >= ${from} AND hours_ago <= ${boundary - 1}`,
      `bnd_${k} = MIN(packed) WHERE hours_ago >= ${boundary} AND hours_ago <= ${
        boundary + BOUNDARY_SLICE_HOURS - 1
      }`,
    ];
  }).flat();

  const unpacked = (column: string) =>
    `(${column} - FLOOR(${column} / ${TIME_SHIFT}.0) * ${TIME_SHIFT}.0)`;
  const perDot = Array.from(
    { length: dots },
    (_, k) =>
      `${trailingRiskMoversColumn(
        k
      )} = COUNT_DISTINCT(effective_id) WHERE cur_${k} IS NOT NULL AND bnd_${k} IS NOT NULL AND ${unpacked(
        `cur_${k}`
      )} - ${unpacked(`bnd_${k}`)} >= ${MOVER_THRESHOLD_PACKED}.0`
  );

  return [
    `SET unmapped_fields="nullify";`,
    `FROM risk-score.risk-score-${spaceId}`,
    `| WHERE @timestamp >= NOW() - ${riskMoversTrailingFetchHours(timeRange)}h`,
    `| EVAL entity_euid = COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`,
    `| EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `| WHERE entity_euid IS NOT NULL`,
    `| EVAL hours_ago = DATE_DIFF("hour", @timestamp, NOW()), seconds_ago = DATE_DIFF("second", @timestamp, NOW())`,
    `| EVAL packed = seconds_ago * ${TIME_SHIFT}.0 + ROUND(risk_score * ${SCORE_SHIFT}.0)`,
    `| STATS`,
    `    ${perEntity.join(',\n    ')}`,
    `    BY entity_euid`,
    `| RENAME entity_euid AS \`entity.id\``,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    `| WHERE entity.name IS NOT NULL`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS`,
    `    ${perDot.join(',\n    ')}`,
  ].join('\n');
};
