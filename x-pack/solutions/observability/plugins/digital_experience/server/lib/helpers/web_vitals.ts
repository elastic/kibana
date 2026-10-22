/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreWebVital } from '../../../common/core_web_vitals';
import { CORE_WEB_VITAL_THRESHOLDS } from '../../../common/core_web_vitals';
import type { DurationVital, ScoreVital, VitalRatings } from '../../../common/types/applications';
import type { PercentilesAggregation } from './aggregations';
import { getP75, p75Of } from './aggregations';

/** Sub-aggregations of one vital's documents: its p75 and the share up to each rating threshold. */
export const vitalStatsAggs = (field: string, vital: CoreWebVital) => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  return {
    p75: p75Of(field),
    ranks: { percentile_ranks: { field, values: [good, needsImprovement], keyed: false } },
  };
};

/** A filter aggregation over one vital's documents, with `vitalStatsAggs` inside. */
export interface VitalAggregation {
  doc_count: number;
  p75: PercentilesAggregation;
  ranks: PercentilesAggregation;
}

// Percentile ranks are estimates, so a share is kept between 0 and 1.
const toShare = (percent: number) => Math.min(Math.max(percent / 100, 0), 1);

const toRatings = (
  { doc_count: sampleCount, ranks }: VitalAggregation,
  vital: CoreWebVital
): VitalRatings | null => {
  if (sampleCount === 0) {
    return null;
  }
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  const rankAt = (threshold: number) =>
    toShare(ranks.values.find(({ key }) => key === threshold)?.value ?? 0);
  const goodShare = rankAt(good);
  const upToNeedsImprovement = Math.max(rankAt(needsImprovement), goodShare);
  return {
    good: goodShare,
    needsImprovement: upToNeedsImprovement - goodShare,
    poor: 1 - upToNeedsImprovement,
  };
};

export const toDurationVital = (
  aggregation: VitalAggregation,
  vital: CoreWebVital
): DurationVital => ({
  p75Ms: getP75(aggregation.p75),
  sampleCount: aggregation.doc_count,
  ratings: toRatings(aggregation, vital),
});

export const toScoreVital = (aggregation: VitalAggregation, vital: CoreWebVital): ScoreVital => ({
  p75: getP75(aggregation.p75),
  sampleCount: aggregation.doc_count,
  ratings: toRatings(aggregation, vital),
});
