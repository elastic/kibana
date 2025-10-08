/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';

import type { ThresholdNormalized } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { GenericBulkCreateResponse } from '../factories/bulk_create_factory';
import { calculateThresholdSignalUuid } from './utils';
import { buildReasonMessageForThresholdAlert } from '../utils/reason_formatters';
import type { ThresholdCompositeBucket } from './types';
import type { SecurityRuleServices, SecuritySharedParams } from '../types';
import type { ThresholdRuleParams } from '../../rule_schema';
import type { DetectionAlertLatest } from '../../../../../common/api/detection_engine/model/alerts';
import { bulkCreate, wrapHits } from '../factories';

interface BulkCreateThresholdSignalsParams {
  sharedParams: SecuritySharedParams<ThresholdRuleParams>;
  buckets: ThresholdCompositeBucket[];
  services: SecurityRuleServices;
  startedAt: Date;
}

export const transformBucketIntoHit = (
  bucket: ThresholdCompositeBucket,
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
) => {
  // In case of absent threshold fields, `bucket.key` will be an empty string. Note that `Object.values('')` is `[]`,
  // so the below logic works in either case (whether `terms` or `composite`).
  return {
    _index: inputIndex,
    _id: calculateThresholdSignalUuid(
      ruleId,
      startedAt,
      threshold.field,
      Object.values(bucket.key).sort().join(',')
    ),
    _source: {
      [TIMESTAMP]: bucket.max_timestamp.value_as_string,
      ...bucket.key,
      threshold_result: {
        cardinality: threshold.cardinality?.length
          ? [
              {
                field: threshold.cardinality[0].field,
                value: bucket.cardinality_count?.value,
              },
            ]
          : undefined,
        count: bucket.doc_count,
        from: bucket.min_timestamp.value_as_string
          ? new Date(bucket.min_timestamp.value_as_string)
          : from,
        terms: Object.entries(bucket.key).map(([key, val]) => ({ field: key, value: val })),
      },
    },
  };
};

export const getTransformedHits = (
  buckets: ThresholdCompositeBucket[],
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
) =>
  buckets.map((bucket, i) => {
    return transformBucketIntoHit(bucket, inputIndex, startedAt, from, threshold, ruleId);
  });

export const bulkCreateThresholdSignals = async ({
  sharedParams,
  buckets,
  services,
  startedAt,
}: BulkCreateThresholdSignalsParams): Promise<GenericBulkCreateResponse<DetectionAlertLatest>> => {
  const ruleParams = sharedParams.completeRule.ruleParams;
  const ecsResults = getTransformedHits(
    buckets,
    sharedParams.inputIndex.join(','),
    startedAt,
    sharedParams.tuple.from.toDate(),
    ruleParams.threshold,
    ruleParams.ruleId
  );

  return bulkCreate({
    wrappedAlerts: wrapHits(sharedParams, ecsResults, buildReasonMessageForThresholdAlert),
    sharedParams,
    services,
  });
};
