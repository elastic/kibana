/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { performance } from 'perf_hooks';
import { isEmpty } from 'lodash';

import type { ShardFailure } from '@elastic/elasticsearch/lib/api/types';
import { buildEqlSearchRequest } from './build_eql_search_request';

import type { ExperimentalFeatures } from '../../../../../common';
import type {
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
  WrapSuppressedHits,
  SecuritySharedParams,
  SecurityRuleServices,
} from '../types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import { buildReasonMessageForEqlAlert } from '../utils/reason_formatters';
import type { EqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import {
  bulkCreateSuppressedAlertsInMemory,
  bulkCreateSuppressedSequencesInMemory,
} from '../utils/bulk_create_suppressed_alerts_in_memory';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { logEqlRequest } from '../utils/logged_requests';
import * as i18n from '../translations';
import { alertSuppressionTypeGuard } from '../utils/get_is_alert_suppression_active';
import { isEqlSequenceQuery } from '../../../../../common/detection_engine/utils';
import { logShardFailures } from '../utils/log_shard_failure';
import { checkErrorDetails } from '../utils/check_error_details';
import { wrapSequences } from './wrap_sequences';
import { bulkCreate, wrapHits } from '../factories';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

interface EqlExecutorParams {
  sharedParams: SecuritySharedParams<EqlRuleParams>;
  services: SecurityRuleServices;
  wrapSuppressedHits: WrapSuppressedHits;
  isAlertSuppressionActive: boolean;
  experimentalFeatures: ExperimentalFeatures;
  state?: Record<string, unknown>;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
}

export const eqlExecutor = async ({
  sharedParams,
  services,
  wrapSuppressedHits,
  isAlertSuppressionActive,
  experimentalFeatures,
  state,
  scheduleNotificationResponseActionsService,
}: EqlExecutorParams): Promise<{
  result: SearchAfterAndBulkCreateReturnType;
  loggedRequests?: RulePreviewLoggedRequest[];
}> => {
  const { completeRule, tuple, ruleExecutionLogger } = sharedParams;
  const ruleParams = completeRule.ruleParams;
  const isLoggedRequestsEnabled = state?.isLoggedRequestsEnabled ?? false;
  const loggedRequests: RulePreviewLoggedRequest[] = [];

  // eslint-disable-next-line complexity
  return withSecuritySpan('eqlExecutor', async () => {
    const result = createSearchAfterReturnType();

    const dataTiersFilters = await getDataTierFilter({
      uiSettingsClient: services.uiSettingsClient,
    });

    const isSequenceQuery = isEqlSequenceQuery(ruleParams.query);

    const request = buildEqlSearchRequest({
      sharedParams,
      query: ruleParams.query,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      size: ruleParams.maxSignals,
      filters: [...(ruleParams.filters || []), ...dataTiersFilters],
      eventCategoryOverride: ruleParams.eventCategoryOverride,
      timestampField: ruleParams.timestampField,
      tiebreakerField: ruleParams.tiebreakerField,
    });

    ruleExecutionLogger.debug(`EQL query request: ${JSON.stringify(request)}`);
    const exceptionsWarning = getUnprocessedExceptionsWarnings(sharedParams.unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }
    const eqlSignalSearchStart = performance.now();

    try {
      if (isLoggedRequestsEnabled) {
        loggedRequests.push({
          request: logEqlRequest(request),
          description: i18n.EQL_SEARCH_REQUEST_DESCRIPTION,
        });
      }

      const response = await services.scopedClusterClient.asCurrentUser.eql.search<SignalSource>(
        request
      );

      const eqlSignalSearchEnd = performance.now();
      const eqlSearchDuration = eqlSignalSearchEnd - eqlSignalSearchStart;
      result.searchAfterTimes = [makeFloatString(eqlSearchDuration)];

      if (isLoggedRequestsEnabled && loggedRequests[0]) {
        loggedRequests[0].duration = Math.round(eqlSearchDuration);
      }

      let newSignals: Array<WrappedAlert<DetectionAlertLatest>> | undefined;

      const shardFailures = response.shard_failures;
      if (!isEmpty(shardFailures)) {
        logShardFailures(
          isSequenceQuery,
          shardFailures as ShardFailure[],
          result,
          ruleExecutionLogger
        );
      }

      const { events, sequences } = response.hits;

      if (events) {
        if (
          isAlertSuppressionActive &&
          alertSuppressionTypeGuard(completeRule.ruleParams.alertSuppression)
        ) {
          await bulkCreateSuppressedAlertsInMemory({
            sharedParams,
            enrichedEvents: events,
            toReturn: result,
            services,
            buildReasonMessage: buildReasonMessageForEqlAlert,
            alertSuppression: completeRule.ruleParams.alertSuppression,
            wrapSuppressedHits,
          });
        } else {
          newSignals = wrapHits(sharedParams, events, buildReasonMessageForEqlAlert);
        }
      } else if (sequences) {
        if (
          isAlertSuppressionActive &&
          alertSuppressionTypeGuard(completeRule.ruleParams.alertSuppression)
        ) {
          await bulkCreateSuppressedSequencesInMemory({
            sharedParams,
            sequences,
            toReturn: result,
            services,
            buildReasonMessage: buildReasonMessageForEqlAlert,
            alertSuppression: completeRule.ruleParams.alertSuppression,
          });
        } else {
          newSignals = wrapSequences({
            sharedParams,
            sequences,
            buildReasonMessage: buildReasonMessageForEqlAlert,
          });
        }
      } else {
        throw new Error(
          'eql query response should have either `sequences` or `events` but had neither'
        );
      }

      if (newSignals?.length) {
        const createResult = await bulkCreate({
          wrappedAlerts: newSignals,
          sharedParams,
          services,
        });
        addToSearchAfterReturn({ current: result, next: createResult });
      }

      if (response.hits.total && response.hits.total.value >= ruleParams.maxSignals) {
        const maxSignalsWarning =
          isAlertSuppressionActive && events?.length
            ? getSuppressionMaxSignalsWarning()
            : getMaxSignalsWarning();

        result.warningMessages.push(maxSignalsWarning);
      }

      scheduleNotificationResponseActionsService({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });
      return { result, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
    } catch (error) {
      if (checkErrorDetails(error).isUserError) {
        result.userError = true;
      }
      result.errors.push(error.message);
      result.success = false;
      return { result, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
    }
  });
};
