/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { sortBy } from 'lodash';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';

import type { ThresholdCompositeBucket } from './types';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import { transformBucketIntoHit } from './bulk_create_threshold_signals';
import type { SecuritySharedParams } from '../types';
import type { ThresholdRuleParams } from '../../rule_schema';

/**
 * wraps suppressed threshold alerts
 * first, transforms aggregation threshold buckets to hits
 * creates instanceId hash, which is used to search suppressed on time interval alerts
 * populates alert's suppression fields
 */
export const wrapSuppressedThresholdALerts = ({
  sharedParams,
  buckets,
  buildReasonMessage,
  startedAt,
}: {
  sharedParams: SecuritySharedParams<ThresholdRuleParams>;
  buckets: ThresholdCompositeBucket[];
  buildReasonMessage: BuildReasonMessage;
  startedAt: Date;
}): Array<WrappedAlert<DetectionAlertLatest & SuppressionFieldsLatest>> => {
  const { completeRule, spaceId } = sharedParams;
  return buckets.map((bucket) => {
    const hit = transformBucketIntoHit(
      bucket,
      sharedParams.inputIndex.join(','),
      startedAt,
      sharedParams.tuple.from.toDate(),
      completeRule.ruleParams.threshold,
      completeRule.ruleParams.ruleId
    );

    const suppressedValues = sortBy(Object.entries(bucket.key).map(([_, value]) => value));

    const id = objectHash([hit._index, hit._id, `${spaceId}:${completeRule.alertId}`]);

    const instanceId = objectHash([suppressedValues, completeRule.alertId, spaceId]);

    const baseAlert: DetectionAlertLatest = transformHitToAlert({
      sharedParams,
      doc: hit,
      applyOverrides: true,
      buildReasonMessage,
      alertUuid: id,
    });

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_SUPPRESSION_TERMS]: Object.entries(bucket.key).map(([field, value]) => ({
          field,
          value,
        })),
        [ALERT_SUPPRESSION_START]: bucket.min_timestamp.value
          ? new Date(bucket.min_timestamp.value)
          : new Date(baseAlert[TIMESTAMP]),
        [ALERT_SUPPRESSION_END]: bucket.max_timestamp.value
          ? new Date(bucket.max_timestamp.value)
          : new Date(baseAlert[TIMESTAMP]),
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    };
  });
};
