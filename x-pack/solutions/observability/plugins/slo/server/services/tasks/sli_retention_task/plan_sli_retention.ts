/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLI_MAX_LOOKBACK_DAYS } from '../../../../common/config';
import { SLO_RESOURCES_VERSION_MAJOR } from '../../../../common/constants';
import { startOfNextUtcMonth } from '../../sli_routing_state';

const DAY_MS = 24 * 60 * 60 * 1000;
// No transform backfill writes to an index older than this.
const EMPTY_INDEX_MIN_AGE_MS = SLI_MAX_LOOKBACK_DAYS * DAY_MS;

// Matches the SLI indices of SLI_DESTINATION_INDEX_PATTERN, capturing their resources version.
const SLI_INDEX_REGEX_SOURCE = `^\\.slo-observability\\.sli-v(${SLO_RESOURCES_VERSION_MAJOR}(?:\\.\\d+)?)`;
const DATED_INDEX_REGEX = new RegExp(`${SLI_INDEX_REGEX_SOURCE}\\.(\\d{4})-(\\d{2})-(\\d{2})$`);
const BASE_INDEX_REGEX = new RegExp(`${SLI_INDEX_REGEX_SOURCE}$`);

interface SliIndex {
  index: string;
  docsCount: number | undefined;
}

interface SliRetentionPlan {
  agedOut: string[];
  emptyDated: string[];
  emptyOldBase: string[];
}

interface PlanParams {
  indices: SliIndex[];
  // Destination indices of the SLO transforms, undefined when unknown (old base indices are then kept).
  transformDestIndices: Set<string> | undefined;
  now: Date;
  retentionMs: number;
  currentVersion: number;
}

// The rounding of an index cannot be told from its name: a day-01 index may hold a whole month,
// any other index a day or a week. Returns the conservative end of the period it may hold.
const getPeriodEnd = (index: string): number | undefined => {
  const match = DATED_INDEX_REGEX.exec(index);
  if (!match) {
    return undefined;
  }

  const year = Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const start = Date.UTC(year, month - 1, day);
  const startDate = new Date(start);
  if (startDate.getUTCMonth() !== month - 1 || startDate.getUTCDate() !== day) {
    return undefined;
  }

  return day === 1 ? startOfNextUtcMonth(startDate) : start + 7 * DAY_MS;
};

/** Selects the SLI indices to delete: dated indices older than the retention period, old empty dated indices, and empty base indices of previous versions. */
export const planSliRetention = ({
  indices,
  transformDestIndices,
  now,
  retentionMs,
  currentVersion,
}: PlanParams): SliRetentionPlan => {
  const plan: SliRetentionPlan = { agedOut: [], emptyDated: [], emptyOldBase: [] };
  const retentionCutoff = now.getTime() - retentionMs;
  const emptyCutoff = now.getTime() - EMPTY_INDEX_MIN_AGE_MS;

  for (const { index, docsCount } of indices) {
    const periodEnd = getPeriodEnd(index);
    if (periodEnd !== undefined) {
      if (periodEnd < retentionCutoff) {
        plan.agedOut.push(index);
      } else if (docsCount === 0 && periodEnd < emptyCutoff) {
        plan.emptyDated.push(index);
      }
      continue;
    }

    const baseVersion = BASE_INDEX_REGEX.exec(index)?.[1];
    if (
      baseVersion !== undefined &&
      Number(baseVersion) < currentVersion &&
      docsCount === 0 &&
      transformDestIndices !== undefined &&
      !transformDestIndices.has(index)
    ) {
      plan.emptyOldBase.push(index);
    }
  }

  return plan;
};
