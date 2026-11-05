/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreWebVital } from '../../../common/core_web_vitals';
import { CORE_WEB_VITAL_THRESHOLDS } from '../../../common/core_web_vitals';
import type {
  DurationVital,
  ScoreVital,
  VitalRatings,
  WebVitals,
} from '../../../common/types/applications';
import type { PercentilesAggregation } from './aggregations';
import { getP75, p75Of } from './aggregations';

// Elasticsearch parses the bound as the field's type, so a float 0.1 is still up to 0.1.
const upTo = (field: string, threshold: number) => ({
  filter: { range: { [field]: { lte: threshold } } },
});

/** Sub-aggregations of one vital's documents: its p75 and the samples up to each rating threshold. */
export const vitalStatsAggs = (field: string, vital: CoreWebVital) => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  return {
    p75: p75Of(field),
    upToGood: upTo(field, good),
    upToNeedsImprovement: upTo(field, needsImprovement),
  };
};

/** A filter aggregation over one vital's documents, with `vitalStatsAggs` inside. */
export interface VitalAggregation {
  doc_count: number;
  p75: PercentilesAggregation;
  upToGood: { doc_count: number };
  upToNeedsImprovement: { doc_count: number };
}

const toRatings = ({
  doc_count: sampleCount,
  upToGood,
  upToNeedsImprovement,
}: VitalAggregation): VitalRatings | null => {
  if (sampleCount === 0) {
    return null;
  }
  const good = upToGood.doc_count / sampleCount;
  const upToNeedsImprovementShare = upToNeedsImprovement.doc_count / sampleCount;
  return {
    good,
    needsImprovement: upToNeedsImprovementShare - good,
    poor: 1 - upToNeedsImprovementShare,
  };
};

export const toDurationVital = (aggregation: VitalAggregation): DurationVital => ({
  p75Ms: getP75(aggregation.p75),
  sampleCount: aggregation.doc_count,
  ratings: toRatings(aggregation),
});

export const toScoreVital = (aggregation: VitalAggregation): ScoreVital => ({
  p75: getP75(aggregation.p75),
  sampleCount: aggregation.doc_count,
  ratings: toRatings(aggregation),
});

/** The vital aggregations of a bucket, one per Core Web Vital. */
export interface WebVitalAggregations {
  lcp: VitalAggregation;
  inp: VitalAggregation;
  cls: VitalAggregation;
  fcp: VitalAggregation;
  ttfb: VitalAggregation;
}

export const toWebVitals = ({ lcp, inp, cls, fcp, ttfb }: WebVitalAggregations): WebVitals => ({
  lcp: toDurationVital(lcp),
  inp: toDurationVital(inp),
  cls: toScoreVital(cls),
  fcp: toDurationVital(fcp),
  ttfb: toDurationVital(ttfb),
});
