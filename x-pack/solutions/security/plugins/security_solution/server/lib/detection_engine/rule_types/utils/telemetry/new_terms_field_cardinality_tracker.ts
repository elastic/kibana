/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject, sum } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { NEW_TERMS_FIELD_CARDINALITY_EVENT } from '../../../../telemetry/event_based/events';
import type { NewTermsRuleParams } from '../../../rule_schema';

/**
 * Accumulates New Terms field-cardinality telemetry across the pages of the recent-terms composite
 * aggregation and emits a single event per execution. Aggregate metrics only, no field names or
 * values. State is owned here; the executor only feeds it buckets and tells it how the run ended.
 */
export interface NewTermsFieldCardinalityTracker {
  /** Account for one page of composite buckets already held in memory. */
  accumulate(buckets: estypes.AggregationsCompositeBucket[]): void;
  /** Call when the rule paged through all terms (composite returned no after_key). */
  markReachedEndOfStream(): void;
  /** Emit the event for this execution. No-op during preview, on empty runs, or after an error. */
  send(): void;
}

const valueLength = (value: unknown): number =>
  typeof value === 'string' ? value.length : String(value ?? '').length;

/**
 * Reports, per execution, how many distinct grouping-key combinations a New Terms rule scans and how
 * long those values are, to size a native ES|QL INLINE STATS migration. No extra queries: it walks
 * buckets the rule already fetched.
 */
export const createNewTermsFieldCardinalityTracker = ({
  analytics,
  logger,
  ruleParams,
}: {
  analytics?: AnalyticsServiceSetup;
  logger: Logger;
  ruleParams: NewTermsRuleParams;
}): NewTermsFieldCardinalityTracker => {
  let distinctFieldCombinations = 0;
  let maxCombinationValueLength = 0;
  let combinationValueLengthSum = 0;
  let reachedEndOfStream = false;
  // Telemetry collection must never crash or interfere with the rule run. If accounting or reporting
  // it is an explicit signal that telemetry issues are non-fatal to execution.
  let errored = false;

  return {
    accumulate(buckets) {
      if (errored) {
        return;
      }
      try {
        distinctFieldCombinations += buckets.length;
        for (const bucket of buckets) {
          const values = isObject(bucket.key) ? Object.values(bucket.key) : [bucket.key];
          const combinationValueLength = sum(values.map(valueLength));
          combinationValueLengthSum += combinationValueLength;
          maxCombinationValueLength = Math.max(maxCombinationValueLength, combinationValueLength);
        }
      } catch (error) {
        errored = true;
        logger.debug(`Failed to accumulate New Terms field cardinality telemetry: ${error}`);
      }
    },

    markReachedEndOfStream() {
      reachedEndOfStream = true;
    },

    send() {
      // Preview runs pass no analytics; empty runs (no recent terms in the window) carry no signal
      // and would otherwise flood the stream with zeros given short New Terms intervals.
      if (errored || !analytics || distinctFieldCombinations === 0) {
        return;
      }
      try {
        analytics.reportEvent(NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType, {
          isElasticRule: ruleParams.immutable,
          newTermsFieldsCount: ruleParams.newTermsFields.length,
          distinctFieldCombinations,
          maxCombinationValueLength,
          combinationValueLengthSum,
          interruptedByMaxSignals: !reachedEndOfStream,
        });
      } catch (error) {
        logger.debug(`Failed to send New Terms field cardinality telemetry event: ${error}`);
      }
    },
  };
};
