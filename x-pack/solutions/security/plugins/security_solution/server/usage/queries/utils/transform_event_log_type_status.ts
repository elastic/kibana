/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EventLogTypeStatusAggs } from '../../types';
import type { SingleEventLogStatusMetric } from '../../detections/rules/types';
import { getInitialSingleEventLogUsage } from '../../detections/rules/get_initial_usage';
import { countTotals } from './count_totals';
import { transformSingleRuleMetric } from './transform_single_rule_metric';

export interface TransformEventLogTypeStatusOptions {
  logger: Logger;
  aggs: EventLogTypeStatusAggs | undefined;
}

/**
 * Given a raw Elasticsearch aggregation against the event log this will transform that
 * for telemetry. This expects the aggregation to be broken down by "ruleType" and "ruleStatus".
 * @param aggs The Elasticsearch aggregations broken down by "ruleType" and "ruleStatus"
 * @params logger The kibana logger
 * @returns The single metric from the aggregation broken down
 */
export const transformEventLogTypeStatus = ({
  aggs,
  logger,
}: TransformEventLogTypeStatusOptions): SingleEventLogStatusMetric => {
  // early return if the aggs are empty/null
  if (aggs == null) {
    logger.debug(
      'Was expecting aggregations to exist for "transformEventLogTypeStatus", returning empty metrics instead'
    );
    return getInitialSingleEventLogUsage();
  }

  // metrics
  const eqlMetrics = aggs.eventActionExecutionMetrics['siem.eqlRule'];
  const newTermsMetrics = aggs.eventActionExecutionMetrics['siem.newTermsRule'];
  const esqlMetrics = aggs.eventActionExecutionMetrics['siem.esqlRule'];
  const indicatorMetrics = aggs.eventActionExecutionMetrics['siem.indicatorRule'];
  const mlMetrics = aggs.eventActionExecutionMetrics['siem.mlRule'];
  const queryMetrics = aggs.eventActionExecutionMetrics['siem.queryRule'];
  const savedQueryMetrics = aggs.eventActionExecutionMetrics['siem.savedQueryRule'];
  const thresholdMetrics = aggs.eventActionExecutionMetrics['siem.thresholdRule'];

  // failure status
  const eqlFailure = aggs.eventActionStatusChange.failed['siem.eqlRule'];
  const newTermsFailure = aggs.eventActionStatusChange.failed['siem.newTermsRule'];
  const esqlFailure = aggs.eventActionStatusChange.failed['siem.esqlRule'];
  const indicatorFailure = aggs.eventActionStatusChange.failed['siem.indicatorRule'];
  const mlFailure = aggs.eventActionStatusChange.failed['siem.mlRule'];
  const queryFailure = aggs.eventActionStatusChange.failed['siem.queryRule'];
  const savedQueryFailure = aggs.eventActionStatusChange.failed['siem.savedQueryRule'];
  const thresholdFailure = aggs.eventActionStatusChange.failed['siem.thresholdRule'];

  // partial failure
  const eqlPartialFailure = aggs.eventActionStatusChange['partial failure']['siem.eqlRule'];
  const newTermsPartialFailure =
    aggs.eventActionStatusChange['partial failure']['siem.newTermsRule'];
  const esqlPartialFailure = aggs.eventActionStatusChange['partial failure']['siem.esqlRule'];
  const indicatorPartialFailure =
    aggs.eventActionStatusChange['partial failure']['siem.indicatorRule'];
  const mlPartialFailure = aggs.eventActionStatusChange['partial failure']['siem.mlRule'];
  const queryPartialFailure = aggs.eventActionStatusChange['partial failure']['siem.queryRule'];
  const savedQueryPartialFailure =
    aggs.eventActionStatusChange['partial failure']['siem.savedQueryRule'];
  const thresholdPartialFailure =
    aggs.eventActionStatusChange['partial failure']['siem.thresholdRule'];

  // success
  const eqlSuccess = aggs.eventActionStatusChange.succeeded['siem.eqlRule'];
  const newTermsSuccess = aggs.eventActionStatusChange.succeeded['siem.newTermsRule'];
  const esqlSuccess = aggs.eventActionStatusChange.succeeded['siem.esqlRule'];
  const indicatorSuccess = aggs.eventActionStatusChange.succeeded['siem.indicatorRule'];
  const mlSuccess = aggs.eventActionStatusChange.succeeded['siem.mlRule'];
  const querySuccess = aggs.eventActionStatusChange.succeeded['siem.queryRule'];
  const savedQuerySuccess = aggs.eventActionStatusChange.succeeded['siem.savedQueryRule'];
  const thresholdSuccess = aggs.eventActionStatusChange.succeeded['siem.thresholdRule'];

  return {
    eql: transformSingleRuleMetric({
      failed: eqlFailure,
      partialFailed: eqlPartialFailure,
      succeeded: eqlSuccess,
      singleMetric: eqlMetrics,
    }),
    new_terms: transformSingleRuleMetric({
      failed: newTermsFailure,
      partialFailed: newTermsPartialFailure,
      succeeded: newTermsSuccess,
      singleMetric: newTermsMetrics,
    }),
    esql: transformSingleRuleMetric({
      failed: esqlFailure,
      partialFailed: esqlPartialFailure,
      succeeded: esqlSuccess,
      singleMetric: esqlMetrics,
    }),
    threat_match: transformSingleRuleMetric({
      failed: indicatorFailure,
      partialFailed: indicatorPartialFailure,
      succeeded: indicatorSuccess,
      singleMetric: indicatorMetrics,
    }),
    machine_learning: transformSingleRuleMetric({
      failed: mlFailure,
      partialFailed: mlPartialFailure,
      succeeded: mlSuccess,
      singleMetric: mlMetrics,
    }),
    query: transformSingleRuleMetric({
      failed: queryFailure,
      partialFailed: queryPartialFailure,
      succeeded: querySuccess,
      singleMetric: queryMetrics,
    }),
    saved_query: transformSingleRuleMetric({
      failed: savedQueryFailure,
      partialFailed: savedQueryPartialFailure,
      succeeded: savedQuerySuccess,
      singleMetric: savedQueryMetrics,
    }),
    threshold: transformSingleRuleMetric({
      failed: thresholdFailure,
      partialFailed: thresholdPartialFailure,
      succeeded: thresholdSuccess,
      singleMetric: thresholdMetrics,
    }),
    total: {
      failures: countTotals([
        eqlFailure,
        newTermsFailure,
        esqlFailure,
        indicatorFailure,
        mlFailure,
        queryFailure,
        savedQueryFailure,
        thresholdFailure,
      ]),
      partial_failures: countTotals([
        eqlPartialFailure,
        newTermsPartialFailure,
        esqlPartialFailure,
        indicatorPartialFailure,
        mlPartialFailure,
        queryPartialFailure,
        savedQueryPartialFailure,
        thresholdPartialFailure,
      ]),
      succeeded: countTotals([
        eqlSuccess,
        newTermsSuccess,
        esqlSuccess,
        indicatorSuccess,
        mlSuccess,
        querySuccess,
        savedQuerySuccess,
        thresholdSuccess,
      ]),
    },
  };
};
