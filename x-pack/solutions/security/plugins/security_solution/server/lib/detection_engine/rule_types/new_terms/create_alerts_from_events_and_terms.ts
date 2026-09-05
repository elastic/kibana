/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { NewTermsRuleParams } from '../../rule_schema';
import type { SecurityExecutorOptions } from '../types';
import { ALERT_CHUNK_MULTIPLIER } from './utils';
import type { createSearchAfterReturnType } from '../utils/utils';
import {
  addToSearchAfterReturn,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';
import { bulkCreateSuppressedNewTermsAlertsInMemory } from './bulk_create_suppressed_alerts_in_memory';
import type { EventsAndTerms } from './types';
import { bulkCreate } from '../factories';
import type { GenericBulkCreateResponse } from '../utils/bulk_create_with_suppression';
import { alertSuppressionTypeGuard } from '../utils/get_is_alert_suppression_active';
import type { NewTermsAlertLatest } from '../../../../../common/api/detection_engine/model/alerts';

type NewTermsExecutorOptions = SecurityExecutorOptions<
  NewTermsRuleParams,
  { isLoggedRequestsEnabled?: boolean }
>;

interface CreateAlertsFromEventsAndTermsParams {
  eventsAndTerms: EventsAndTerms[];
  sharedParams: NewTermsExecutorOptions['sharedParams'];
  params: NewTermsRuleParams;
  services: NewTermsExecutorOptions['services'];
  result: ReturnType<typeof createSearchAfterReturnType>;
  isAlertSuppressionActive: boolean;
}

/**
 * Shared alert-creation step for both New Terms approaches (ES|QL and aggregation). Given the
 * events + their new terms, it chunks them, creates alerts (suppressed or plain), pushes the
 * max-signals warning when alerts are truncated, and returns whether truncation happened so the
 * caller can stop paging.
 */
export const createAlertsFromEventsAndTerms = async ({
  eventsAndTerms,
  sharedParams,
  params,
  services,
  result,
  isAlertSuppressionActive,
}: CreateAlertsFromEventsAndTermsParams): Promise<{ alertsWereTruncated: boolean }> => {
  const eventAndTermsChunks = chunk(eventsAndTerms, ALERT_CHUNK_MULTIPLIER * params.maxSignals);
  let bulkCreateResult: Omit<
    GenericBulkCreateResponse<NewTermsAlertLatest>,
    'suppressedItemsCount'
  > = {
    errors: [],
    success: true,
    enrichmentDuration: '0',
    bulkCreateDuration: '0',
    createdItemsCount: 0,
    createdItems: [],
    alertsWereTruncated: false,
  };

  for (let i = 0; i < eventAndTermsChunks.length; i++) {
    const eventAndTermsChunk = eventAndTermsChunks[i];

    if (isAlertSuppressionActive && alertSuppressionTypeGuard(params.alertSuppression)) {
      bulkCreateResult = await bulkCreateSuppressedNewTermsAlertsInMemory({
        sharedParams,
        eventsAndTerms: eventAndTermsChunk,
        toReturn: result,
        services,
        alertSuppression: params.alertSuppression,
      });
    } else {
      const wrappedAlerts = wrapNewTermsAlerts({
        sharedParams,
        eventsAndTerms: eventAndTermsChunk,
      });

      bulkCreateResult = await bulkCreate({
        wrappedAlerts,
        services,
        sharedParams,
        maxAlerts: params.maxSignals - result.createdSignalsCount,
      });

      addToSearchAfterReturn({ current: result, next: bulkCreateResult });
    }

    if (bulkCreateResult.alertsWereTruncated) {
      result.warningMessages.push(
        isAlertSuppressionActive ? getSuppressionMaxSignalsWarning() : getMaxSignalsWarning()
      );
      break;
    }
  }

  return { alertsWereTruncated: bulkCreateResult.alertsWereTruncated };
};
