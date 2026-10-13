/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { getRiskScoreIndex } from '../../entities_grid/queries/esql';
import { BOUNDARY_WINDOW_HOURS, buildRiskLevelEvals, buildRiskScoreEvals } from './risk_history';
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
const SCORE_AT = (slot: number): string => `value_at_${slot}`;
const FLAG_OF = (k: number): string => `flag_${k}`;

/** Hours back from NOW() of the moment of grid slot `slot`: slot 0 is now. */
const slotHoursBack = (timeRange: TimeRange, slot: number): number =>
  slot * getSeriesWindow(timeRange).stepHours;

interface RiskSeriesDefinition {
  /** The stages that give each risk doc its entity id and its value (`risk_score` or `level_num`). */
  evals: string[];
  valueColumn: string;
  /** Returns the ES|QL condition under which an entity counts in a dot, from its two values. */
  qualifies: (current: string, boundary: string) => string;
  resultColumn: (k: number) => string;
}

const buildRiskSeriesQuery = (
  { evals, valueColumn, qualifies, resultColumn }: RiskSeriesDefinition,
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange,
  entityFilterClauses: string[]
): string => {
  const { stepHours, dots } = getSeriesWindow(timeRange);
  const slots = 2 * dots;
  const oldestSlotHoursBack = slotHoursBack(timeRange, slots - 1);

  const valueColumns = Array.from(
    { length: slots },
    (_, slot) => `${SCORE_AT(slot)} = MAX(slot_value) WHERE ${SLOT_COLUMN} == ${slot}`
  );
  const flags = Array.from(
    { length: dots },
    (_, k) => `${FLAG_OF(k)} = CASE(${qualifies(SCORE_AT(k), SCORE_AT(k + dots))}, 1, null)`
  );
  const anyFlag = Array.from({ length: dots }, (_, k) => `${FLAG_OF(k)} IS NOT NULL`).join(' OR ');
  const maxFlags = Array.from({ length: dots }, (_, k) => `${FLAG_OF(k)} = MAX(${FLAG_OF(k)})`);
  const counts = Array.from(
    { length: dots },
    (_, k) => `${resultColumn(k)} = COUNT(${FLAG_OF(k)})`
  );

  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${getRiskScoreIndex(spaceId)}`,
    `| WHERE @timestamp >= NOW() - ${oldestSlotHoursBack + BOUNDARY_WINDOW_HOURS}h`,
    `| EVAL ${HOURS_BACK_COLUMN} = DATE_DIFF("hour", @timestamp, NOW())`,
    // Keep only the docs in the two hours before a moment a dot needs.
    `| WHERE ${HOURS_BACK_COLUMN} % ${stepHours} < ${BOUNDARY_WINDOW_HOURS}`,
    ...evals,
    // The moments whose window holds the doc: more than one when the windows overlap (a 1 hour step).
    `| EVAL ${SLOT_COLUMN} = MV_DEDUPE(MV_APPEND(${HOURS_BACK_COLUMN} / ${stepHours}, (${HOURS_BACK_COLUMN} - 1) / ${stepHours}))`,
    `| MV_EXPAND ${SLOT_COLUMN}`,
    `| WHERE ${SLOT_COLUMN} >= 0 AND ${HOURS_BACK_COLUMN} <= ${SLOT_COLUMN} * ${stepHours} + ${
      BOUNDARY_WINDOW_HOURS - 1
    }`,
    `| STATS slot_value = LAST(${valueColumn}, @timestamp) BY entity_euid, ${SLOT_COLUMN}`,
    `| STATS`,
    `    ${valueColumns.join(',\n    ')}`,
    `    BY entity_euid`,
    `| EVAL ${flags.join(',\n       ')}`,
    // An entity that counts in no dot cannot change a count, so only the others are joined.
    `| WHERE ${anyFlag}`,
    `| RENAME entity_euid AS \`entity.id\``,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    `| WHERE entity.name IS NOT NULL`,
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

/**
 * Builds the query for the sparkline dots of the Risk movers tile, all as columns of one row. Dot
 * `k` counts the entities whose score rose by 10 or more over the range ending `k` steps ago, as
 * the tile does; an entity without a score at the start of that range is not counted.
 */
export const buildRiskMoversSeriesQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string =>
  buildRiskSeriesQuery(
    {
      evals: buildRiskScoreEvals(''),
      valueColumn: 'risk_score',
      qualifies: (current, boundary) => `${current} - ${boundary} >= 10`,
      resultColumn: riskMoversSeriesColumn,
    },
    spaceId,
    entitiesIndexName,
    timeRange,
    entityFilterClauses
  );

/**
 * Builds the query for the sparkline dots of the Newly high/critical tile, all as columns of one
 * row. Dot `k` counts the entities that are High or Critical at the end of the range ending `k`
 * steps ago and were not at its start (lower, or without a level), as the tile does.
 */
export const buildNewlyHighCriticalSeriesQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string =>
  buildRiskSeriesQuery(
    {
      evals: buildRiskLevelEvals(''),
      valueColumn: 'level_num',
      qualifies: (current, boundary) =>
        `${current} >= 3 AND (${boundary} IS NULL OR ${current} > ${boundary})`,
      resultColumn: newlyHighCriticalSeriesColumn,
    },
    spaceId,
    entitiesIndexName,
    timeRange,
    entityFilterClauses
  );
