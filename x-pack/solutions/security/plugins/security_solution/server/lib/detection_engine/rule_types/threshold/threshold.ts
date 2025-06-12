/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { firstValueFrom } from 'rxjs';

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import type { ThresholdRuleParams } from '../../rule_schema';
import { getFilter } from '../utils/get_filter';
import { bulkCreateThresholdSignals } from './bulk_create_threshold_signals';
import { findThresholdSignals } from './find_threshold_signals';
import { getThresholdBucketFilters } from './get_threshold_bucket_filters';
import { getThresholdSignalHistory } from './get_threshold_signal_history';
import { bulkCreateSuppressedThresholdAlerts } from './bulk_create_suppressed_threshold_alerts';

import type {
  SearchAfterAndBulkCreateReturnType,
  SecuritySharedParams,
  SecurityRuleServices,
} from '../types';
import type { ThresholdAlertState, ThresholdSignalHistory } from './types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  getUnprocessedExceptionsWarnings,
} from '../utils/utils';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildThresholdSignalHistory } from './build_signal_history';
import { getSignalHistory, transformBulkCreatedItemsToHits } from './utils';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

export const thresholdExecutor = async ({
  sharedParams,
  services,
  startedAt,
  state,
  licensing,
  scheduleNotificationResponseActionsService,
}: {
  sharedParams: SecuritySharedParams<ThresholdRuleParams>;
  services: SecurityRuleServices;
  startedAt: Date;
  state: ThresholdAlertState;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
}): Promise<SearchAfterAndBulkCreateReturnType & { state: ThresholdAlertState }> => {
  const {
    completeRule,
    unprocessedExceptions,
    tuple,
    spaceId,
    aggregatableTimestampField,
    ruleDataClient,
    inputIndex,
    exceptionFilter,
    ruleExecutionLogger,
    primaryTimestamp,
    secondaryTimestamp,
    runtimeMappings,
  } = sharedParams;
  const result = createSearchAfterReturnType();
  const ruleParams = completeRule.ruleParams;
  const isLoggedRequestsEnabled = Boolean(state?.isLoggedRequestsEnabled);

  return withSecuritySpan('thresholdExecutor', async () => {
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }

    const license = await firstValueFrom(licensing.license$);
    const hasPlatinumLicense = license.hasAtLeast('platinum');

    // Get state or build initial state (on upgrade)
    const { signalHistory, searchErrors: previousSearchErrors } = state.initialized
      ? { signalHistory: state.signalHistory, searchErrors: [] }
      : await getThresholdSignalHistory({
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          frameworkRuleId: completeRule.alertId,
          bucketByFields: ruleParams.threshold.field,
          spaceId,
          ruleDataClient,
          esClient: services.scopedClusterClient.asCurrentUser,
        });

    const validSignalHistory = getSignalHistory(state, signalHistory, tuple);
    // Eliminate dupes
    const bucketFilters = await getThresholdBucketFilters({
      signalHistory: validSignalHistory,
      aggregatableTimestampField,
    });

    // Combine dupe filter with other filters
    const esFilter = await getFilter({
      type: ruleParams.type,
      filters: ruleParams.filters ? ruleParams.filters.concat(bucketFilters) : bucketFilters,
      language: ruleParams.language,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      services,
      index: inputIndex,
      exceptionFilter,
      loadFields: true,
    });

    // Look for new events over threshold
    const { buckets, searchErrors, searchDurations, warnings, loggedRequests } =
      await findThresholdSignals({
        inputIndexPattern: inputIndex,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        maxSignals: tuple.maxSignals,
        services,
        ruleExecutionLogger,
        filter: esFilter,
        threshold: ruleParams.threshold,
        runtimeMappings,
        primaryTimestamp,
        secondaryTimestamp,
        aggregatableTimestampField,
        isLoggedRequestsEnabled,
      });

    const alertSuppression = completeRule.ruleParams.alertSuppression;

    let newSignalHistory: ThresholdSignalHistory;

    if (alertSuppression?.duration && hasPlatinumLicense) {
      const suppressedResults = await bulkCreateSuppressedThresholdAlerts({
        sharedParams,
        buckets,
        services,
        startedAt,
      });
      const createResult = suppressedResults.bulkCreateResult;

      newSignalHistory = buildThresholdSignalHistory({
        alerts: suppressedResults.unsuppressedAlerts,
      });
      addToSearchAfterReturn({
        current: result,
        next: { ...createResult, success: createResult.success && isEmpty(searchErrors) },
      });
    } else {
      const createResult = await bulkCreateThresholdSignals({
        sharedParams,
        buckets,
        services,
        startedAt,
      });

      newSignalHistory = buildThresholdSignalHistory({
        alerts: transformBulkCreatedItemsToHits(createResult.createdItems),
      });

      addToSearchAfterReturn({
        current: result,
        next: { ...createResult, success: createResult.success && isEmpty(searchErrors) },
      });
    }

    result.errors.push(...previousSearchErrors);
    result.errors.push(...searchErrors);
    result.warningMessages.push(...warnings);
    result.searchAfterTimes = searchDurations;
    scheduleNotificationResponseActionsService({
      signals: result.createdSignals,
      signalsCount: result.createdSignalsCount,
      responseActions: completeRule.ruleParams.responseActions,
    });
    return {
      ...result,
      state: {
        ...state,
        initialized: true,
        signalHistory: {
          ...validSignalHistory,
          ...newSignalHistory,
        },
      },
      ...(isLoggedRequestsEnabled ? { loggedRequests } : {}),
    };
  });
};
