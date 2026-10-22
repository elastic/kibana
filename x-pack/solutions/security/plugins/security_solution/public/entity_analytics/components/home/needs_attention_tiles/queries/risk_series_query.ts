/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { getRiskScoreIndex } from '../../entities_grid/queries/esql';
import {
  BOUNDARY_WINDOW_HOURS,
  RISK_MOVER_MIN_SCORE_CHANGE,
  buildRiskScoreAndLevelEvals,
  groupMarkerEval,
} from './risk_history';
import { getSeriesWindow } from './tile_series_window';

/*
 * The risk tiles compare an entity's risk at a moment with its risk one range earlier. The current
 * count reads "now" from the entity doc, which only has the current value, so the dot of an earlier
 * moment reads both ends from the risk score history, like the previous-period delta queries
 * (risk_previous_period.ts). Dot `k` is the tile as it stood `k` steps ago: the value at
 * `NOW() - k steps` against the value one range before that.
 *
 * Only the moments the dots need are read: for each of them the last value in the two hours
 * before it (the window of risk_history.ts, as whole hours back from NOW()). Scoring runs hourly,
 * so each window holds at least one run.
 *
 * Both tiles read the same docs over the same windows, so one query emits the dots of both: each
 * doc is given its score and its level, and one pass over the index serves the two tiles.
 *
 * Each doc is given the moment (`slot`) whose window it falls in, then `LAST` runs once per entity
 * and slot, and a filtered `MAX` turns the slots into columns. A `LAST` with a `WHERE` filter on
 * the aggregate is not used: on a 20,000-entity store it returned different counts on every run
 * (12,258 to 16,672 entities for one slot, against 19,838 with the filter before the STATS).
 */

/** Returns the result column of dot `k` (0 = newest) of the Risk movers tile. */
export const riskMoversSeriesColumn = (k: number): string => `risk_movers_${k}`;

/** Returns the result column of dot `k` (0 = newest) of the Newly high/critical tile. */
export const newlyHighCriticalSeriesColumn = (k: number): string => `newly_high_critical_${k}`;

const HOURS_BACK_COLUMN = 'hours_back';
const SLOT_COLUMN = 'slot';
const SCORE_AT = (slot: number): string => `score_at_${slot}`;
const LEVEL_AT = (slot: number): string => `level_at_${slot}`;
const MOVER_FLAG = (k: number): string => `mover_flag_${k}`;
const NEWLY_HIGH_FLAG = (k: number): string => `newly_high_flag_${k}`;

/** Hours back from NOW() of the moment of grid slot `slot`: slot 0 is now. */
const slotHoursBack = (timeRange: TimeRange, slot: number): number =>
  slot * getSeriesWindow(timeRange).stepHours;

/**
 * Builds the one query for the sparkline dots of the two risk tiles, all as columns of one row.
 *
 * Risk movers dot `k` counts the entities whose score rose by the minimum rise or more over the range ending `k`
 * steps ago, as the tile does; an entity without a score at the start of that range is not counted.
 * Newly high/critical dot `k` counts the entities that are High or Critical at the end of that range
 * and were not at its start (lower, or without a level), as the tile does.
 */
export const buildRiskTilesSeriesQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const { stepHours, dots } = getSeriesWindow(timeRange);
  const slots = 2 * dots;
  const oldestSlotHoursBack = slotHoursBack(timeRange, slots - 1);
  const slotIndexes = Array.from({ length: slots }, (_, slot) => slot);
  const dotIndexes = Array.from({ length: dots }, (_, k) => k);

  const valueColumns = slotIndexes.flatMap((slot) => [
    `${SCORE_AT(slot)} = MAX(slot_score) WHERE ${SLOT_COLUMN} == ${slot}`,
    `${LEVEL_AT(slot)} = MAX(slot_level) WHERE ${SLOT_COLUMN} == ${slot}`,
  ]);
  const flags = dotIndexes.flatMap((k) => [
    `${MOVER_FLAG(k)} = CASE(${SCORE_AT(k)} - ${SCORE_AT(
      k + dots
    )} >= ${RISK_MOVER_MIN_SCORE_CHANGE}, 1, null)`,
    `${NEWLY_HIGH_FLAG(k)} = CASE(${LEVEL_AT(k)} >= 3 AND (${LEVEL_AT(
      k + dots
    )} IS NULL OR ${LEVEL_AT(k)} > ${LEVEL_AT(k + dots)}), 1, null)`,
  ]);
  const anyFlag = dotIndexes
    .flatMap((k) => [`${MOVER_FLAG(k)} IS NOT NULL`, `${NEWLY_HIGH_FLAG(k)} IS NOT NULL`])
    .join(' OR ');
  const maxFlags = dotIndexes.flatMap((k) => [
    `${MOVER_FLAG(k)} = MAX(${MOVER_FLAG(k)})`,
    `${NEWLY_HIGH_FLAG(k)} = MAX(${NEWLY_HIGH_FLAG(k)})`,
  ]);
  const counts = dotIndexes.flatMap((k) => [
    `${riskMoversSeriesColumn(k)} = COUNT(${MOVER_FLAG(k)})`,
    `${newlyHighCriticalSeriesColumn(k)} = COUNT(${NEWLY_HIGH_FLAG(k)})`,
  ]);
  // Keep only the docs in the two hours before a moment a dot needs, as plain @timestamp ranges, so
  // that Elasticsearch reads only those instead of every doc since the oldest moment.
  const slotWindows = slotIndexes
    .map((slot) => {
      const hoursBack = slotHoursBack(timeRange, slot);
      return `(@timestamp > NOW() - ${
        hoursBack + BOUNDARY_WINDOW_HOURS
      }h AND @timestamp <= NOW() - ${hoursBack}h)`;
    })
    .join(' OR ');

  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${getRiskScoreIndex(spaceId)}`,
    `| WHERE @timestamp >= NOW() - ${oldestSlotHoursBack + BOUNDARY_WINDOW_HOURS}h`,
    `| WHERE ${slotWindows}`,
    `| EVAL ${HOURS_BACK_COLUMN} = DATE_DIFF("hour", @timestamp, NOW())`,
    ...buildRiskScoreAndLevelEvals(''),
    groupMarkerEval(''),
    // The moments whose window holds the doc: more than one when the windows overlap (a 1 hour step).
    `| EVAL ${SLOT_COLUMN} = MV_DEDUPE(MV_APPEND(${HOURS_BACK_COLUMN} / ${stepHours}, (${HOURS_BACK_COLUMN} - 1) / ${stepHours}))`,
    `| MV_EXPAND ${SLOT_COLUMN}`,
    `| WHERE ${SLOT_COLUMN} >= 0 AND ${HOURS_BACK_COLUMN} <= ${SLOT_COLUMN} * ${stepHours} + ${
      BOUNDARY_WINDOW_HOURS - 1
    }`,
    // The last value of each score type, then the group's if the entity has one, else its own (LAST
    // does not skip nulls, so the type is a grouping key; see pickGroupValueFirst in risk_history.ts).
    `| STATS slot_score = LAST(risk_score, @timestamp), slot_level = LAST(level_num, @timestamp) BY entity_euid, ${SLOT_COLUMN}, is_group`,
    `| EVAL group_score = CASE(is_group == 1, slot_score, null), own_score = CASE(is_group == 0, slot_score, null), group_level = CASE(is_group == 1, slot_level, null), own_level = CASE(is_group == 0, slot_level, null)`,
    `| STATS group_score = MAX(group_score), own_score = MAX(own_score), group_level = MAX(group_level), own_level = MAX(own_level) BY entity_euid, ${SLOT_COLUMN}`,
    `| EVAL slot_score = COALESCE(group_score, own_score), slot_level = COALESCE(group_level, own_level)`,
    `| STATS`,
    `    ${valueColumns.join(',\n    ')}`,
    `    BY entity_euid`,
    `| EVAL ${flags.join(',\n       ')}`,
    // An entity that counts in no dot of either tile cannot change a count, so only the others are joined.
    `| WHERE ${anyFlag}`,
    `| RENAME entity_euid AS \`entity.id\``,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    // Aliases are left out: the group is judged by its main entity, whose history holds the group's score.
    `| WHERE entity.name IS NOT NULL AND \`entity.relationships.resolution.resolved_to\` IS NULL`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    // One row per resolved entity, flagged in the dots where any of its ids counts; then an exact COUNT.
    `| STATS`,
    `    ${maxFlags.join(',\n    ')}`,
    `    BY effective_id`,
    `| STATS`,
    `    ${counts.join(',\n    ')}`,
  ].join('\n');
};
