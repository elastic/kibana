/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import type { TilePeriod } from './tile_period';
import { SERIES_BUCKET_COLUMN } from './tile_series_window';

const TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const DOUBLE_TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '48 hours',
  '7d': '14 days',
  '30d': '60 days',
};

/**
 * Keeps the first seen times (read from `field`) in the selected range, or in the range right
 * before it.
 */
export const firstSeenCondition = (
  field: string,
  timeRange: TimeRange,
  period: TilePeriod
): string =>
  period === 'current'
    ? `${field} >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]}`
    : `${field} >= NOW() - ${DOUBLE_TIME_RANGE_TO_ESQL[timeRange]} AND ${field} < NOW() - ${TIME_RANGE_TO_ESQL[timeRange]}`;

const FIRST_SEEN = 'entity.lifecycle.first_seen';
const RESOLVED_TO = '`entity.relationships.resolution.resolved_to`';
const GROUP_SCORE_FIELD = '`entity.relationships.resolution.risk.calculated_score`';
/** The group's first seen: the earliest of its members. */
export const GROUP_FIRST_SEEN_COLUMN = 'group_first_seen';

interface NewEntityTileHeadOptions {
  entitiesIndexName: string;
  /** The oldest first seen that can be in a new group, as an ES|QL expression: the window start. */
  lowerBound: string;
  /** Builds the ES|QL condition on a first seen time (a field or a column) for the window covered. */
  firstSeenWindow: (field: string) => string;
  entityFilterClauses: string[];
  /** Set for the sparkline series: numbers each group by when it was first seen. */
  bucketExpression?: string;
}

/**
 * The stages the New entity count and its sparkline series share. Each row of the result is one
 * resolved group, judged by the group's own values:
 *
 * - It is new when its EARLIEST member was first seen inside the window, so a new alias of an old
 *   entity does not make it new, and an old alias of a new entity does not either.
 * - It has a risk score above 0 when the group's score does, else the entity's own.
 * - The row is the main entity of the group, so the ids sent to the table are main entity ids.
 *
 * It reads two things and merges them by the group id, with no join: the main entities (and single
 * entities) first seen since the window start, with their score, name and the entity filters; and
 * every alias, whatever its age, which are few. A main entity first seen before the window start
 * makes the group old: it has no main entity row, so its group first seen is null and the window
 * condition drops it.
 *
 * The count and the series both start here, so they cannot drift apart.
 */
export const buildNewEntityTileHead = ({
  entitiesIndexName,
  lowerBound,
  firstSeenWindow,
  entityFilterClauses,
  bucketExpression,
}: NewEntityTileHeadOptions): string[] => [
  `SET unmapped_fields="nullify";`,
  'FROM (',
  `  FROM ${entitiesIndexName}`,
  // The score condition only keeps the reads down: the rule itself is judged on the group below.
  `  | WHERE ${RESOLVED_TO} IS NULL AND ${FIRST_SEEN} >= ${lowerBound} AND (entity.risk.calculated_score > 0 OR ${GROUP_SCORE_FIELD} > 0)`,
  // Discard entities that have no name (unrecognised identifiers).
  '  | WHERE entity.name IS NOT NULL',
  ...entityFilterClauses.map((clause) => `  ${clause}`),
  `  | EVAL group_score = COALESCE(${GROUP_SCORE_FIELD}, entity.risk.calculated_score)`,
  `  | KEEP entity.id, ${FIRST_SEEN}, group_score`,
  '), (',
  `  FROM ${entitiesIndexName}`,
  `  | WHERE ${RESOLVED_TO} IS NOT NULL`,
  `  | EVAL entity.id = ${RESOLVED_TO}, alias_first_seen = ${FIRST_SEEN}`,
  '  | KEEP entity.id, alias_first_seen',
  ')',
  `| STATS main_first_seen = MIN(${FIRST_SEEN}), alias_first_seen = MIN(alias_first_seen), group_score = MAX(group_score) BY entity.id`,
  `| EVAL ${GROUP_FIRST_SEEN_COLUMN} = CASE(alias_first_seen < main_first_seen, alias_first_seen, main_first_seen)`,
  `| WHERE ${firstSeenWindow(GROUP_FIRST_SEEN_COLUMN)} AND group_score > 0`,
  '| EVAL effective_id = entity.id',
  ...(bucketExpression ? [`| EVAL ${SERIES_BUCKET_COLUMN} = ${bucketExpression}`] : []),
];

/**
 * Builds the ES|QL query behind the New entity tile: the resolved groups first seen within the
 * selected range (by their earliest member) that have a risk score above 0, one row per group.
 * `period` 'previous' moves the first_seen window back by one range, for the period-over-period delta.
 */
export const buildNewEntityCountQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '7d',
  entityFilterClauses: string[] = [],
  period: TilePeriod = 'current'
): string =>
  [
    ...buildNewEntityTileHead({
      entitiesIndexName,
      lowerBound: `NOW() - ${
        period === 'current' ? TIME_RANGE_TO_ESQL[timeRange] : DOUBLE_TIME_RANGE_TO_ESQL[timeRange]
      }`,
      firstSeenWindow: (field) => firstSeenCondition(field, timeRange, period),
      entityFilterClauses,
    }),
    // Each row is one group, so a plain COUNT is exact; COUNT_DISTINCT would only estimate, and is
    // approximate above about 3,000. The previous period only needs the count, not the entity ids.
    ...(period === 'previous'
      ? ['| STATS value = COUNT(effective_id)']
      : ['| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)']),
  ].join('\n');
