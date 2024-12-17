/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RuleRunType } from '../../../../../../../../../common/api/detection_engine/rule_monitoring';

type AlertCounts = estypes.AggregationsMultiBucketAggregateBase & {
  buckets: {
    activeAlerts: estypes.AggregationsSingleBucketAggregateBase;
    newAlerts: estypes.AggregationsSingleBucketAggregateBase;
    recoveredAlerts: estypes.AggregationsSingleBucketAggregateBase;
  };
};

type ActionExecution = estypes.AggregationsTermsAggregateBase<{
  key: string;
  doc_count: number;
}> & {
  buckets: Array<{ key: string; doc_count: number }>;
};

export type ExecutionUuidAggBucket = estypes.AggregationsStringTermsBucketKeys & {
  timeoutMessage: estypes.AggregationsMultiBucketBase;
  ruleExecution: {
    executeStartTime: estypes.AggregationsMinAggregate;
    executionDuration: estypes.AggregationsMaxAggregate;
    scheduleDelay: estypes.AggregationsMaxAggregate;
    esSearchDuration: estypes.AggregationsMaxAggregate;
    totalSearchDuration: estypes.AggregationsMaxAggregate;
    numTriggeredActions: estypes.AggregationsMaxAggregate;
    outcomeAndMessage: estypes.AggregationsTopHitsAggregate;
    backfill: estypes.AggregationsTopHitsAggregate;
  };
  alertCounts: AlertCounts;
  actionExecution: {
    actionOutcomes: ActionExecution;
  };
  securityStatus: {
    message: estypes.AggregationsTopHitsAggregate;
    status: estypes.AggregationsTopHitsAggregate;
  };
  securityMetrics: {
    searchDuration: estypes.AggregationsMinAggregate;
    indexDuration: estypes.AggregationsMinAggregate;
    gapDuration: estypes.AggregationsMinAggregate;
  };
};

export type ExecutionUuidAggResult<TBucket = ExecutionUuidAggBucket> =
  estypes.AggregationsAggregateBase & {
    buckets: TBucket[];
  };

export interface ExecutionEventAggregationOptions {
  maxExecutions: number;
  page: number;
  perPage: number;
  sort: estypes.Sort;
  runTypeFilters: RuleRunType[];
}
