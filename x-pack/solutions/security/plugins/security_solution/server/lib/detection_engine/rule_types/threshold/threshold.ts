/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { firstValueFrom } from 'rxjs';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Filter } from '@kbn/es-query';
import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import { getFilter } from '../utils/get_filter';
import { bulkCreateThresholdSignals } from './bulk_create_threshold_signals';
import { findThresholdSignals } from './find_threshold_signals';
import { getThresholdBucketFilters } from './get_threshold_bucket_filters';
import { getThresholdSignalHistory } from './get_threshold_signal_history';
import { bulkCreateSuppressedThresholdAlerts } from './bulk_create_suppressed_threshold_alerts';

import type {
  BulkCreate,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  WrapHits,
  RunOpts,
  CreateRuleOptions,
} from '../types';
import type { ThresholdAlertState, ThresholdSignalHistory } from './types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  getUnprocessedExceptionsWarnings,
} from '../utils/utils';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildThresholdSignalHistory } from './build_signal_history';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { getSignalHistory, transformBulkCreatedItemsToHits } from './utils';
import type { ExperimentalFeatures } from '../../../../../common';

export const thresholdExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  ruleExecutionLogger,
  services,
  version,
  startedAt,
  state,
  bulkCreate,
  wrapHits,
  ruleDataClient,
  primaryTimestamp,
  secondaryTimestamp,
  aggregatableTimestampField,
  exceptionFilter,
  unprocessedExceptions,
  spaceId,
  runOpts,
  licensing,
  experimentalFeatures,
  scheduleNotificationResponseActionsService,
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<ThresholdRuleParams>;
  tuple: RuleRangeTuple;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  version: string;
  startedAt: Date;
  state: ThresholdAlertState;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  ruleDataClient: IRuleDataClient;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  aggregatableTimestampField: string;
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
  spaceId: string;
  runOpts: RunOpts<ThresholdRuleParams>;
  licensing: LicensingPluginSetup;
  experimentalFeatures: ExperimentalFeatures;
  scheduleNotificationResponseActionsService: CreateRuleOptions['scheduleNotificationResponseActionsService'];
}): Promise<SearchAfterAndBulkCreateReturnType & { state: ThresholdAlertState }> => {
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
        buckets,
        completeRule,
        services,
        inputIndexPattern: inputIndex,
        startedAt,
        from: tuple.from.toDate(),
        to: tuple.to.toDate(),
        ruleExecutionLogger,
        spaceId,
        runOpts,
        experimentalFeatures,
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
        buckets,
        completeRule,
        filter: esFilter,
        services,
        inputIndexPattern: inputIndex,
        signalsIndex: ruleParams.outputIndex,
        startedAt,
        from: tuple.from.toDate(),
        signalHistory: validSignalHistory,
        bulkCreate,
        wrapHits,
        ruleExecutionLogger,
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
