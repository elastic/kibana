/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TimeRange } from './time_range';
import { TRAILING_WINDOW } from './tile_trailing_window';
import { parseTrailingDots } from './tile_trailing_dots';
import {
  BOUNDARY_SLICE_HOURS,
  riskMoversTrailingFetchHours,
} from './tile_risk_movers_trailing_series_query';

/** Returns the result column of dot `k` (0 = newest) for the Newly high/critical tile. */
export const trailingNewlyHighCriticalColumn = (k: number): string => `newly_high_critical_${k}`;

/** Returns the column that counts the entities that have a boundary score for dot `k`. */
export const trailingBoundaryRowsColumn = (k: number): string => `boundary_rows_${k}`;

/** The level is packed behind the age in seconds: `packed = secondsAgo * 8 + level` (levels are 0 to 4). */
const LEVEL_SLOTS = 8;

/**
 * Builds one query that returns every sparkline dot of the Newly high/critical tile as columns of
 * a single row, where dot `k` is what the tile would have shown `k` steps ago.
 *
 * It follows the tile's query: an entity's level is its latest level in the selected time range
 * ending `k` steps back (current) and its latest level in the 2h buffer before the start of that
 * range (boundary), and it counts when it is High or Critical now and was not at the boundary,
 * or has no boundary score.
 *
 * "The latest level in a window" is picked with a filtered `MIN` over the level packed behind its
 * age in seconds (`secondsAgo * 8 + level`): the smallest age wins and carries its level. A
 * filtered `LAST(level, @timestamp) WHERE ...` is not used because it drops values and differs
 * from run to run on the Elasticsearch builds checked.
 *
 * Because a missing boundary score counts as "newly", a dot whose boundary lies before the oldest
 * score in the index would count every High or Critical entity. `boundary_rows_k` tells how many
 * entities have a boundary score for dot `k`; `parseNewlyHighCriticalDots` drops the dots where
 * that is 0.
 */
export const buildNewlyHighCriticalTrailingSeriesQuery = (
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

  const perDot = Array.from({ length: dots }, (_, k) => [
    `${trailingNewlyHighCriticalColumn(
      k
    )} = COUNT_DISTINCT(effective_id) WHERE cur_${k} % ${LEVEL_SLOTS} >= 3 AND (bnd_${k} IS NULL OR bnd_${k} % ${LEVEL_SLOTS} < 3)`,
    `${trailingBoundaryRowsColumn(k)} = COUNT(bnd_${k})`,
  ]).flat();

  return [
    `SET unmapped_fields="nullify";`,
    `FROM risk-score.risk-score-${spaceId}`,
    `| WHERE @timestamp >= NOW() - ${riskMoversTrailingFetchHours(timeRange)}h`,
    `| EVAL entity_euid = COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`,
    `| EVAL risk_level = COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)`,
    `| WHERE entity_euid IS NOT NULL`,
    `| EVAL level_num = CASE(risk_level == "Critical", 4, risk_level == "High", 3, risk_level == "Moderate", 2, risk_level == "Low", 1, 0)`,
    `| EVAL hours_ago = DATE_DIFF("hour", @timestamp, NOW()), seconds_ago = DATE_DIFF("second", @timestamp, NOW())`,
    `| EVAL packed = seconds_ago * ${LEVEL_SLOTS} + level_num`,
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

/**
 * Reads the single result row into oldest-first dots and leaves out every dot that has no boundary
 * score for any entity: its history does not reach back that far, so its value would only be an
 * artefact of the "no boundary score counts as newly" rule.
 */
export const parseNewlyHighCriticalDots = (
  raw: ESQLSearchResponse,
  timeRange: TimeRange
): number[] => {
  const values = parseTrailingDots(raw, timeRange, trailingNewlyHighCriticalColumn);
  const boundaryRows = parseTrailingDots(raw, timeRange, trailingBoundaryRowsColumn);
  return values.filter((_, i) => boundaryRows[i] > 0);
};
