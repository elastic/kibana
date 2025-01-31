/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { performance } from 'perf_hooks';

import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter } from '@kbn/es-query';
import isEmpty from 'lodash/isEmpty';

import { buildEqlSearchRequest } from './build_eql_search_request';
import { createEnrichEventsFunction } from '../utils/enrichments';

import type { ExperimentalFeatures } from '../../../../../common';
import type {
  BulkCreate,
  WrapHits,
  WrapSequences,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
  CreateRuleOptions,
  WrapSuppressedHits,
} from '../types';
import type { SharedParams } from '../utils/utils';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import { buildReasonMessageForEqlAlert } from '../utils/reason_formatters';
import type { CompleteRule, EqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
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

interface EqlExecutorParams {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<EqlRuleParams>;
  tuple: RuleRangeTuple;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  sharedParams: SharedParams;
  wrapSequences: WrapSequences;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  isAlertSuppressionActive: boolean;
  experimentalFeatures: ExperimentalFeatures;
  state?: Record<string, unknown>;
  scheduleNotificationResponseActionsService: CreateRuleOptions['scheduleNotificationResponseActionsService'];
}

export const eqlExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  ruleExecutionLogger,
  services,
  version,
  bulkCreate,
  wrapHits,
  wrapSequences,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
  wrapSuppressedHits,
  sharedParams,
  alertTimestampOverride,
  alertWithSuppression,
  isAlertSuppressionActive,
  experimentalFeatures,
  state,
  scheduleNotificationResponseActionsService,
}: EqlExecutorParams): Promise<{
  result: SearchAfterAndBulkCreateReturnType;
  loggedRequests?: RulePreviewLoggedRequest[];
}> => {
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
      query: ruleParams.query,
      index: inputIndex,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      size: ruleParams.maxSignals,
      filters: [...(ruleParams.filters || []), ...dataTiersFilters],
      primaryTimestamp,
      secondaryTimestamp,
      runtimeMappings,
      eventCategoryOverride: ruleParams.eventCategoryOverride,
      timestampField: ruleParams.timestampField,
      tiebreakerField: ruleParams.tiebreakerField,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(`EQL query request: ${JSON.stringify(request)}`);
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
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

      let newSignals: Array<WrappedFieldsLatest<BaseFieldsLatest>> | undefined;

      // @ts-expect-error shard_failures exists in
      // elasticsearch response v9
      // needs to be spec needs to be backported
      // https://github.com/elastic/elasticsearch-specification/pull/3372#issuecomment-2621835599
      // TODO: remove ts-expect-error when ES lib version is updated
      const shardFailures = response.shard_failures;
      if (!isEmpty(shardFailures)) {
        logShardFailures(isSequenceQuery, shardFailures, result, ruleExecutionLogger);
      }

      const { events, sequences } = response.hits;

      if (events) {
        if (isAlertSuppressionActive) {
          await bulkCreateSuppressedAlertsInMemory({
            enrichedEvents: events,
            toReturn: result,
            wrapHits,
            bulkCreate,
            services,
            buildReasonMessage: buildReasonMessageForEqlAlert,
            ruleExecutionLogger,
            tuple,
            alertSuppression: completeRule.ruleParams.alertSuppression,
            wrapSuppressedHits,
            alertTimestampOverride,
            alertWithSuppression,
            experimentalFeatures,
          });
        } else {
          newSignals = wrapHits(events, buildReasonMessageForEqlAlert);
        }
      } else if (sequences) {
        if (
          isAlertSuppressionActive &&
          experimentalFeatures.alertSuppressionForSequenceEqlRuleEnabled &&
          alertSuppressionTypeGuard(completeRule.ruleParams.alertSuppression)
        ) {
          await bulkCreateSuppressedSequencesInMemory({
            sequences,
            toReturn: result,
            bulkCreate,
            services,
            buildReasonMessage: buildReasonMessageForEqlAlert,
            ruleExecutionLogger,
            tuple,
            alertSuppression: completeRule.ruleParams.alertSuppression,
            sharedParams,
            alertTimestampOverride,
            alertWithSuppression,
            experimentalFeatures,
          });
        } else {
          newSignals = wrapSequences(sequences, buildReasonMessageForEqlAlert);
        }
      } else {
        throw new Error(
          'eql query response should have either `sequences` or `events` but had neither'
        );
      }

      if (newSignals?.length) {
        const createResult = await bulkCreate(
          newSignals,
          undefined,
          createEnrichEventsFunction({
            services,
            logger: ruleExecutionLogger,
          })
        );
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
      if (
        typeof error.message === 'string' &&
        (error.message as string).includes('verification_exception')
      ) {
        // We report errors that are more related to user configuration of rules rather than system outages as "user errors"
        // so SLO dashboards can show less noise around system outages
        result.userError = true;
      }
      result.errors.push(error.message);
      result.success = false;
      return { result, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
    }
  });
};
