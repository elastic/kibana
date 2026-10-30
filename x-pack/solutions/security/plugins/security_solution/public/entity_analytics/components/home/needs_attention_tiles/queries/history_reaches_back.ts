/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import {
  ML_ANOMALY_INDICES,
  buildAnomalyJobFilter,
  getAlertsIndex,
} from '../../entities_grid/queries/esql';
import { buildPreviousPeriodStart } from './tile_period';

/*
 * A delta compares the selected range with the one before it, so it needs data from before
 * `NOW() - 2 x range`. For a deployment younger than that the previous period is empty for lack of
 * history, and the delta a false rise. Each source gets one cheap query that returns a single boolean
 * column, `reaches_back`: is its oldest doc older than the start of the previous period. The risk
 * tiles have their own check, in `risk_previous_period.ts`.
 *
 * A check asks whether the source reaches back, not whether its old docs would have counted for the
 * tile: no severity, score or other predicate of the tile is applied. A previous period full of docs
 * that do not qualify is a count of 0, which is a valid comparison.
 */

/** The column every history check returns. */
export const REACHES_BACK_COLUMN = 'reaches_back';

const reachesBack = (oldest: string, timeRange: TimeRange): string[] => [
  `| STATS oldest = MIN(${oldest})`,
  `| EVAL ${REACHES_BACK_COLUMN} = COALESCE(oldest <= ${buildPreviousPeriodStart(
    timeRange
  )}, false)`,
  `| KEEP ${REACHES_BACK_COLUMN}`,
];

/** Builds the history check of the alert based tiles: the oldest alert of the space. */
export const buildAlertsHistoryReachesBackQuery = (spaceId: string, timeRange: TimeRange): string =>
  [`FROM ${getAlertsIndex(spaceId)}`, ...reachesBack('@timestamp', timeRange)].join('\n');

/**
 * Builds the history check of the Entities with anomalies tile: the oldest final record of the
 * installed jobs, whatever its score (the tile's score threshold is left out on purpose).
 */
export const buildAnomaliesHistoryReachesBackQuery = (
  timeRange: TimeRange,
  jobIds: string[]
): string =>
  [
    `FROM ${ML_ANOMALY_INDICES}`,
    `| WHERE result_type == "record" AND is_interim == false AND ${buildAnomalyJobFilter(jobIds)}`,
    ...reachesBack('@timestamp', timeRange),
  ].join('\n');

/** Builds the history check of the New entity tile: how long ago the oldest entity was first seen. */
export const buildNewEntityHistoryReachesBackQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange
): string =>
  [`FROM ${entitiesIndexName}`, ...reachesBack('entity.lifecycle.first_seen', timeRange)].join(
    '\n'
  );
