/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint require-atomic-updates: ["error", { "allowProperties": true }] */

import type { KibanaRequest } from '@kbn/core/server';
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import type { Filter } from '@kbn/es-query';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import type { CompleteRule, MachineLearningRuleParams } from '../../rule_schema';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { filterEventsAgainstList } from '../utils/large_list_filters/filter_events_against_list';
import { findMlSignals } from './find_ml_signals';
import type {
  BulkCreate,
  CreateRuleOptions,
  RuleRangeTuple,
  WrapHits,
  WrapSuppressedHits,
} from '../types';
import {
  addToSearchAfterReturn,
  createErrorsFromShard,
  createSearchAfterReturnType,
  getMaxSignalsWarning,
  mergeReturns,
} from '../utils/utils';
import type { SetupPlugins } from '../../../../plugin';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import type { AnomalyResults } from '../../../machine_learning';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import { buildReasonMessageForMlAlert } from '../utils/reason_formatters';

interface MachineLearningRuleExecutorParams {
  completeRule: CompleteRule<MachineLearningRuleParams>;
  tuple: RuleRangeTuple;
  ml: SetupPlugins['ml'];
  listClient: ListClient;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  isAlertSuppressionActive: boolean;
  experimentalFeatures: ExperimentalFeatures;
  scheduleNotificationResponseActionsService: CreateRuleOptions['scheduleNotificationResponseActionsService'];
  isLoggedRequestsEnabled?: boolean;
}

export const mlExecutor = async ({
  completeRule,
  tuple,
  ml,
  listClient,
  services,
  ruleExecutionLogger,
  bulkCreate,
  wrapHits,
  exceptionFilter,
  unprocessedExceptions,
  isAlertSuppressionActive,
  wrapSuppressedHits,
  alertTimestampOverride,
  alertWithSuppression,
  experimentalFeatures,
  scheduleNotificationResponseActionsService,
  isLoggedRequestsEnabled = false,
}: MachineLearningRuleExecutorParams) => {
  const result = createSearchAfterReturnType();
  const ruleParams = completeRule.ruleParams;
  const loggedRequests: RulePreviewLoggedRequest[] = [];

  return withSecuritySpan('mlExecutor', async () => {
    if (ml == null) {
      throw new Error('ML plugin unavailable during rule execution');
    }

    // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
    // currently unused by the jobsSummary function.
    const fakeRequest = {} as KibanaRequest;
    const summaryJobs = await ml
      .jobServiceProvider(fakeRequest, services.savedObjectsClient)
      .jobsSummary(ruleParams.machineLearningJobId);
    const jobSummaries = summaryJobs.filter((job) =>
      ruleParams.machineLearningJobId.includes(job.id)
    );

    if (
      jobSummaries.length < 1 ||
      jobSummaries.some((job) => !isJobStarted(job.jobState, job.datafeedState))
    ) {
      const warningMessage = [
        'Machine learning job(s) are not started:',
        ...jobSummaries.map((job) =>
          [
            `job id: "${job.id}"`,
            `job name: "${job?.customSettings?.security_app_display_name ?? job.id}"`,
            `job status: "${job.jobState}"`,
            `datafeed status: "${job.datafeedState}"`,
          ].join(', ')
        ),
      ].join(' ');

      result.warningMessages.push(warningMessage);
      ruleExecutionLogger.warn(warningMessage);
      result.warning = true;
    }

    let anomalyResults: AnomalyResults;
    try {
      const searchResults = await findMlSignals({
        ml,
        // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
        // currently unused by the mlAnomalySearch function.
        request: {} as unknown as KibanaRequest,
        savedObjectsClient: services.savedObjectsClient,
        jobIds: ruleParams.machineLearningJobId,
        anomalyThreshold: ruleParams.anomalyThreshold,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        maxSignals: tuple.maxSignals,
        exceptionFilter,
        isLoggedRequestsEnabled,
      });
      anomalyResults = searchResults.anomalyResults;
      loggedRequests.push(...(searchResults.loggedRequests ?? []));
    } catch (error) {
      if (typeof error.message === 'string' && (error.message as string).endsWith('missing')) {
        result.userError = true;
      }
      result.errors.push(error.message);
      result.success = false;
      return { result };
    }

    // TODO we add the max_signals warning _before_ filtering the anomalies against the exceptions list. Is that correct?
    if (
      anomalyResults.hits.total &&
      typeof anomalyResults.hits.total !== 'number' &&
      anomalyResults.hits.total.value > tuple.maxSignals
    ) {
      result.warningMessages.push(getMaxSignalsWarning());
    }

    const [filteredAnomalyHits, _] = await filterEventsAgainstList({
      listClient,
      ruleExecutionLogger,
      exceptionsList: unprocessedExceptions,
      events: anomalyResults.hits.hits,
    });

    const anomalyCount = filteredAnomalyHits.length;
    if (anomalyCount) {
      ruleExecutionLogger.debug(`Found ${anomalyCount} signals from ML anomalies`);
    }

    if (anomalyCount && isAlertSuppressionActive) {
      await bulkCreateSuppressedAlertsInMemory({
        enrichedEvents: filteredAnomalyHits,
        toReturn: result,
        wrapHits,
        bulkCreate,
        services,
        buildReasonMessage: buildReasonMessageForMlAlert,
        ruleExecutionLogger,
        tuple,
        alertSuppression: completeRule.ruleParams.alertSuppression,
        wrapSuppressedHits,
        alertTimestampOverride,
        alertWithSuppression,
        experimentalFeatures,
      });
    } else {
      const createResult = await bulkCreateMlSignals({
        anomalyHits: filteredAnomalyHits,
        completeRule,
        services,
        ruleExecutionLogger,
        id: completeRule.alertId,
        signalsIndex: ruleParams.outputIndex,
        bulkCreate,
        wrapHits,
      });
      addToSearchAfterReturn({ current: result, next: createResult });
    }

    const shardFailures = anomalyResults._shards.failures ?? [];
    const searchErrors = createErrorsFromShard({
      errors: shardFailures,
    });
    scheduleNotificationResponseActionsService({
      signals: result.createdSignals,
      signalsCount: result.createdSignalsCount,
      responseActions: completeRule.ruleParams.responseActions,
    });
    return {
      result: mergeReturns([
        result,
        createSearchAfterReturnType({
          success: anomalyResults._shards.failed === 0,
          errors: searchErrors,
        }),
      ]),
      ...(isLoggedRequestsEnabled ? { loggedRequests } : {}),
    };
  });
};
