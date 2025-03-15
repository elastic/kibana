/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { buildReasonMessageForThresholdAlert } from '../utils/reason_formatters';
import type { ThresholdBucket } from './types';
import type { SecuritySharedParams } from '../types';
import type { ThresholdRuleParams } from '../../rule_schema';
import type { BaseFieldsLatest } from '../../../../../common/api/detection_engine/model/alerts';
import { bulkCreateWithSuppression } from '../utils/bulk_create_with_suppression';
import type { GenericBulkCreateResponse } from '../utils/bulk_create_with_suppression';
import { wrapSuppressedThresholdALerts } from './wrap_suppressed_threshold_alerts';
import { transformBulkCreatedItemsToHits } from './utils';
import type { ExperimentalFeatures } from '../../../../../common';

interface BulkCreateSuppressedThresholdAlertsParams {
  sharedParams: SecuritySharedParams<ThresholdRuleParams>;
  buckets: ThresholdBucket[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  startedAt: Date;
  from: Date;
  to: Date;
  experimentalFeatures: ExperimentalFeatures;
}

/**
 * wraps threshold alerts and creates them using bulkCreateWithSuppression utility
 * returns {@link GenericBulkCreateResponse}
 * and unsuppressed alerts, needed to create correct threshold history
 */
export const bulkCreateSuppressedThresholdAlerts = async ({
  sharedParams,
  buckets,
  services,
  startedAt,
  from,
  to,
  experimentalFeatures,
}: BulkCreateSuppressedThresholdAlertsParams): Promise<{
  bulkCreateResult: GenericBulkCreateResponse<BaseFieldsLatest & SuppressionFieldsLatest>;
  unsuppressedAlerts: Array<SearchHit<unknown>>;
}> => {
  const {
    completeRule,
    mergeStrategy,
    inputIndex,
    alertTimestampOverride,
    ruleExecutionLogger,
    publicBaseUrl,
    intendedTimestamp,
  } = sharedParams;
  const ruleParams = completeRule.ruleParams;
  const suppressionDuration = completeRule.ruleParams.alertSuppression?.duration;
  if (!suppressionDuration) {
    throw Error('Suppression duration can not be empty');
  }

  const suppressionWindow = `now-${suppressionDuration.value}${suppressionDuration.unit}`;

  const wrappedAlerts = wrapSuppressedThresholdALerts({
    buckets,
    spaceId: sharedParams.spaceId,
    completeRule,
    mergeStrategy,
    indicesToQuery: inputIndex,
    buildReasonMessage: buildReasonMessageForThresholdAlert,
    alertTimestampOverride,
    ruleExecutionLogger,
    publicBaseUrl,
    inputIndex: inputIndex.join(','),
    startedAt,
    from,
    to,
    suppressionWindow,
    threshold: ruleParams.threshold,
    intendedTimestamp,
  });

  const bulkCreateResult = await bulkCreateWithSuppression({
    sharedParams,
    wrappedDocs: wrappedAlerts,
    services,
    suppressionWindow,
    experimentalFeatures,
  });

  return {
    bulkCreateResult,
    // if there errors we going to use created items only
    unsuppressedAlerts: bulkCreateResult.errors.length
      ? transformBulkCreatedItemsToHits(bulkCreateResult.createdItems)
      : wrappedAlerts,
  };
};
