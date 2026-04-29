/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuppressionMaxSignalsWarning } from './utils';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
} from '../types';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertSuppression: AlertSuppressionCamel;
}

import type { SearchAfterAndBulkCreateFactoryParams } from './search_after_bulk_create_factory';
import { searchAfterAndBulkCreateFactory } from './search_after_bulk_create_factory';
import { bulkCreateSuppressedAlertsInMemory } from './bulk_create_suppressed_alerts_in_memory';

/**
 * search_after through documents and re-index using bulk endpoint
 * and suppress alerts
 */
export const searchAfterAndBulkCreateSuppressedAlerts = async (
  params: SearchAfterAndBulkCreateSuppressedAlertsParams
): Promise<SearchAfterAndBulkCreateReturnType> => {
  const { sharedParams, services, buildReasonMessage, alertSuppression, wrapSuppressedHits } =
    params;

  const bulkCreateExecutor: SearchAfterAndBulkCreateFactoryParams['bulkCreateExecutor'] = async ({
    enrichedEvents,
    toReturn,
  }) => {
    return bulkCreateSuppressedAlertsInMemory({
      sharedParams,
      services,
      buildReasonMessage,
      alertSuppression,
      wrapSuppressedHits,
      enrichedEvents,
      toReturn,
    });
  };

  return searchAfterAndBulkCreateFactory({
    ...params,
    bulkCreateExecutor,
    getWarningMessage: getSuppressionMaxSignalsWarning,
  });
};
