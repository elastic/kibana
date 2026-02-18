/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint require-atomic-updates: ["error", { "allowProperties": true }] */

import type { KibanaRequest } from '@kbn/core/server';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { MachineLearningRuleParams } from '../../rule_schema';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { filterEventsAgainstList } from '../utils/large_list_filters/filter_events_against_list';
import { findMlSignals } from './find_ml_signals';
import type { SecurityRuleServices, SecuritySharedParams, WrapSuppressedHits } from '../types';
import {
  addToSearchAfterReturn,
  createErrorsFromShard,
  createSearchAfterReturnType,
  getMaxSignalsWarning,
  mergeReturns,
} from '../utils/utils';
import type { SetupPlugins } from '../../../../plugin';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { AnomalyResults } from '../../../machine_learning';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import { buildReasonMessageForMlAlert } from '../utils/reason_formatters';
import { alertSuppressionTypeGuard } from '../utils/get_is_alert_suppression_active';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

interface MachineLearningRuleExecutorParams {
  sharedParams: SecuritySharedParams<MachineLearningRuleParams>;
  ml: SetupPlugins['ml'];
  services: SecurityRuleServices;
  wrapSuppressedHits: WrapSuppressedHits;
  isAlertSuppressionActive: boolean;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
  isLoggedRequestsEnabled?: boolean;
}

export const mlExecutor = async ({
  sharedParams,
  ml,
  services,
  isAlertSuppressionActive,
  wrapSuppressedHits,
  scheduleNotificationResponseActionsService,
  isLoggedRequestsEnabled = false,
}: MachineLearningRuleExecutorParams) => {
  const {
    completeRule,
    ruleExecutionLogger,
    tuple,
    exceptionFilter,
    listClient,
    unprocessedExceptions,
  } = sharedParams;
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

    if (
      anomalyCount &&
      isAlertSuppressionActive &&
      alertSuppressionTypeGuard(completeRule.ruleParams.alertSuppression)
    ) {
      await bulkCreateSuppressedAlertsInMemory({
        sharedParams,
        enrichedEvents: filteredAnomalyHits,
        toReturn: result,
        services,
        buildReasonMessage: buildReasonMessageForMlAlert,
        alertSuppression: completeRule.ruleParams.alertSuppression,
        wrapSuppressedHits,
      });
    } else {
      const createResult = await bulkCreateMlSignals({
        sharedParams,
        anomalyHits: filteredAnomalyHits,
        services,
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
