/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { NEW_TERMS_FIELD_CARDINALITY_EVENT } from '../../../../telemetry/event_based/events';
import type { NewTermsRuleParams } from '../../../rule_schema';

/**
 * Running totals for the New Terms field cardinality telemetry, accumulated across the pages of the
 * recent-terms composite aggregation. Aggregate metrics only, no field names or values.
 */
export interface NewTermsFieldCardinalityAccumulator {
  /** Distinct grouping-key combinations counted this run (rule run window). */
  distinctFieldCombinations: number;
  /** Longest combined character length of the grouping-field values across one combination. */
  maxCombinationValueLength: number;
  /** Running sum of combined value lengths, used to derive the average. */
  combinationValueLengthSum: number;
  /** Whether the rule paged through all terms this run (false = stopped early at maxSignals). */
  completedFullScan: boolean;
  /** Set if accounting ever failed; the event is then skipped rather than reporting partial data. */
  hasError: boolean;
}

export const createNewTermsFieldCardinalityAccumulator =
  (): NewTermsFieldCardinalityAccumulator => ({
    distinctFieldCombinations: 0,
    maxCombinationValueLength: 0,
    combinationValueLengthSum: 0,
    completedFullScan: false,
    hasError: false,
  });

/**
 * Best-effort accounting over one page of composite buckets already held in memory: counts distinct
 * combinations and measures the combined length of their grouping-field values.
 */
export const accumulateNewTermsFieldCardinality = (
  accumulator: NewTermsFieldCardinalityAccumulator,
  buckets: estypes.AggregationsCompositeBucket[],
  logger?: Logger
): void => {
  if (accumulator.hasError) {
    return;
  }
  try {
    accumulator.distinctFieldCombinations += buckets.length;
    for (const bucket of buckets) {
      const values = isObject(bucket.key) ? Object.values(bucket.key) : [bucket.key];
      let combinationValueLength = 0;
      for (const value of values) {
        combinationValueLength += String(value ?? '').length;
      }
      accumulator.combinationValueLengthSum += combinationValueLength;
      if (combinationValueLength > accumulator.maxCombinationValueLength) {
        accumulator.maxCombinationValueLength = combinationValueLength;
      }
    }
  } catch (error) {
    accumulator.hasError = true;
    logger?.debug(`Failed to accumulate New Terms field cardinality telemetry: ${error}`);
  }
};

/**
 * Reports metrics about the fields a New Terms rule groups by, per execution, to size how many
 * distinct combinations and how long the grouped values are for real rules. This drives whether they
 * fit a native ES|QL INLINE STATS migration. Reports only aggregate metrics and whether the rule is
 * an Elastic prebuilt rule, never the rule id, name, field names or values.
 */
export const sendNewTermsFieldCardinalityTelemetryEvent = ({
  analytics,
  ruleParams,
  accumulator,
}: {
  analytics: AnalyticsServiceSetup;
  ruleParams: NewTermsRuleParams;
  accumulator: NewTermsFieldCardinalityAccumulator;
}): void => {
  if (accumulator.hasError) {
    return;
  }
  const { distinctFieldCombinations, maxCombinationValueLength, combinationValueLengthSum } =
    accumulator;

  analytics.reportEvent(NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType, {
    isElasticRule: ruleParams.immutable,
    newTermsFieldsCount: (ruleParams.newTermsFields ?? []).length,
    distinctFieldCombinations,
    maxCombinationValueLength,
    avgCombinationValueLength:
      distinctFieldCombinations > 0
        ? Math.round(combinationValueLengthSum / distinctFieldCombinations)
        : 0,
    completedFullScan: accumulator.completedFullScan,
  });
};
