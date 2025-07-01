/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { estypes } from '@elastic/elasticsearch';
import {
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_START,
  ALERT_INSTANCE_ID,
} from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../../common/api/detection_engine/model/alerts';
import type { SecuritySharedParams, SignalSource } from '../../types';
import { transformHitToAlert } from '../../factories/utils/transform_hit_to_alert';
import type { BuildReasonMessage } from '../../utils/reason_formatters';

export interface SuppressionBucket {
  event: estypes.SearchHit<SignalSource>;
  count: number;
  start: Date;
  end: Date;
  terms: Array<{ field: string; value: string | number | null }>;
}

export const createSuppressedAlertInstanceId = ({
  terms,
  ruleId,
  spaceId,
}: {
  terms: Array<{ field: string; value: string | number | null }>;
  ruleId: string;
  spaceId: string;
}): string => {
  return objectHash([terms, ruleId, spaceId]);
};

export const wrapSuppressedAlerts = ({
  sharedParams,
  suppressionBuckets,
  buildReasonMessage,
}: {
  sharedParams: SecuritySharedParams;
  suppressionBuckets: SuppressionBucket[];
  buildReasonMessage: BuildReasonMessage;
}): Array<WrappedAlert<DetectionAlertLatest & SuppressionFieldsLatest>> => {
  const { completeRule, spaceId } = sharedParams;
  return suppressionBuckets.map((bucket) => {
    const id = objectHash([
      bucket.event._index,
      bucket.event._id,
      String(bucket.event._version),
      `${spaceId}:${completeRule.alertId}`,
      bucket.terms,
      bucket.start,
      bucket.end,
    ]);
    const instanceId = createSuppressedAlertInstanceId({
      terms: bucket.terms,
      ruleId: completeRule.alertId,
      spaceId,
    });
    const baseAlert: DetectionAlertLatest = transformHitToAlert({
      sharedParams,
      doc: bucket.event,
      applyOverrides: true,
      buildReasonMessage,
      alertUuid: id,
    });

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_SUPPRESSION_TERMS]: bucket.terms,
        [ALERT_SUPPRESSION_START]: bucket.start,
        [ALERT_SUPPRESSION_END]: bucket.end,
        [ALERT_SUPPRESSION_DOCS_COUNT]: bucket.count - 1,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    };
  });
};
