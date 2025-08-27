/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { buildReasonMessageForThresholdAlert } from '../utils/reason_formatters';
import type { ThresholdCompositeBucket } from './types';
import type { SecurityRuleServices, SecuritySharedParams } from '../types';
import type { ThresholdRuleParams } from '../../rule_schema';
import type { DetectionAlertLatest } from '../../../../../common/api/detection_engine/model/alerts';
import { bulkCreateWithSuppression } from '../utils/bulk_create_with_suppression';
import type { GenericBulkCreateResponse } from '../utils/bulk_create_with_suppression';
import { wrapSuppressedThresholdALerts } from './wrap_suppressed_threshold_alerts';
import { transformBulkCreatedItemsToHits } from './utils';

interface BulkCreateSuppressedThresholdAlertsParams {
  sharedParams: SecuritySharedParams<ThresholdRuleParams>;
  buckets: ThresholdCompositeBucket[];
  services: SecurityRuleServices;
  startedAt: Date;
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
}: BulkCreateSuppressedThresholdAlertsParams): Promise<{
  bulkCreateResult: GenericBulkCreateResponse<DetectionAlertLatest & SuppressionFieldsLatest>;
  unsuppressedAlerts: Array<SearchHit<unknown>>;
}> => {
  const suppressionDuration = sharedParams.completeRule.ruleParams.alertSuppression?.duration;
  if (!suppressionDuration) {
    throw Error('Suppression duration can not be empty');
  }

  const suppressionWindow = `now-${suppressionDuration.value}${suppressionDuration.unit}`;

  const wrappedAlerts = wrapSuppressedThresholdALerts({
    sharedParams,
    buckets,
    buildReasonMessage: buildReasonMessageForThresholdAlert,
    startedAt,
  });

  const bulkCreateResult = await bulkCreateWithSuppression({
    sharedParams,
    wrappedDocs: wrappedAlerts,
    services,
    suppressionWindow,
  });

  return {
    bulkCreateResult,
    // if there errors we going to use created items only
    unsuppressedAlerts: bulkCreateResult.errors.length
      ? transformBulkCreatedItemsToHits(bulkCreateResult.createdItems)
      : wrappedAlerts,
  };
};
