/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { estypes } from '@elastic/elasticsearch';
import { cloneDeep } from 'lodash';

import {
  computeIsESQLQueryAggregating,
  getIndexListFromEsqlQuery,
} from '@kbn/securitysolution-utils';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { buildEsqlSearchRequest } from './build_esql_search_request';
import { performEsqlRequest } from './esql_request';
import { wrapEsqlAlerts } from './wrap_esql_alerts';
import { wrapSuppressedEsqlAlerts } from './wrap_suppressed_esql_alerts';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import { rowToDocument, mergeEsqlResultInSource, getMvExpandUsage } from './utils';
import { fetchSourceDocuments } from './fetch_source_documents';
import { buildReasonMessageForEsqlAlert } from '../utils/reason_formatters';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import type { SecurityRuleServices, SecuritySharedParams, SignalSource } from '../types';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { checkErrorDetails } from '../utils/check_error_details';

import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import type { EsqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import {
  alertSuppressionTypeGuard,
  getIsAlertSuppressionActive,
} from '../utils/get_is_alert_suppression_active';
import { bulkCreate } from '../factories';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

export const esqlExecutor = async ({
  sharedParams,
  services,
  state,
  licensing,
  scheduleNotificationResponseActionsService,
  ruleExecutionTimeout,
}: {
  sharedParams: SecuritySharedParams<EsqlRuleParams>;
  services: SecurityRuleServices;
  state: Record<string, unknown>;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
  ruleExecutionTimeout?: string;
}) => {
  const {
    completeRule,
    tuple,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
    unprocessedExceptions,
    ruleExecutionLogger,
  } = sharedParams;
  const loggedRequests: RulePreviewLoggedRequest[] = [];
  const ruleParams = completeRule.ruleParams;
  /**
   * ES|QL returns results as a single page. max size of 10,000
   * while we try increase size of the request to catch all alerts that might been deduplicated
   * we don't want to overload ES/Kibana with large responses
   */
  const ESQL_PAGE_SIZE_CIRCUIT_BREAKER = tuple.maxSignals * 3;
  const isLoggedRequestsEnabled = state?.isLoggedRequestsEnabled ?? false;

  return withSecuritySpan('esqlExecutor', async () => {
    const result = createSearchAfterReturnType();
    let size = tuple.maxSignals;
    const dataTiersFilters = await getDataTierFilter({
      uiSettingsClient: services.uiSettingsClient,
    });

    try {
      while (
        result.createdSignalsCount <= tuple.maxSignals &&
        size <= ESQL_PAGE_SIZE_CIRCUIT_BREAKER
      ) {
        const esqlRequest = buildEsqlSearchRequest({
          query: ruleParams.query,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          size,
          filters: dataTiersFilters,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          ruleExecutionTimeout,
        });
        const esqlQueryString = { drop_null_columns: true };

        ruleExecutionLogger.debug(`ES|QL query request: ${JSON.stringify(esqlRequest)}`);
        const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
        if (exceptionsWarning) {
          result.warningMessages.push(exceptionsWarning);
        }

        const esqlSignalSearchStart = performance.now();

        const response = await performEsqlRequest({
          esClient: services.scopedClusterClient.asCurrentUser,
          requestBody: esqlRequest,
          requestQueryParams: esqlQueryString,
          shouldStopExecution: services.shouldStopExecution,
          ruleExecutionLogger,
          loggedRequests: isLoggedRequestsEnabled ? loggedRequests : undefined,
        });

        const esqlSearchDuration = performance.now() - esqlSignalSearchStart;
        result.searchAfterTimes.push(makeFloatString(esqlSearchDuration));

        ruleExecutionLogger.debug(`ES|QL query request took: ${esqlSearchDuration}ms`);

        const isRuleAggregating = computeIsESQLQueryAggregating(completeRule.ruleParams.query);

        const results = response.values
          // slicing already processed results in previous iterations
          .slice(size - tuple.maxSignals)
          .map((row) => rowToDocument(response.columns, row));
        const index = getIndexListFromEsqlQuery(completeRule.ruleParams.query);

        const sourceDocuments = await fetchSourceDocuments({
          esClient: services.scopedClusterClient.asCurrentUser,
          results,
          index,
          isRuleAggregating,
          loggedRequests: isLoggedRequestsEnabled ? loggedRequests : undefined,
        });

        const isAlertSuppressionActive = await getIsAlertSuppressionActive({
          alertSuppression: completeRule.ruleParams.alertSuppression,
          licensing,
        });

        const { expandedFieldsInResponse: expandedFields, hasMvExpand } = getMvExpandUsage(
          response.columns,
          completeRule.ruleParams.query
        );

        const syntheticHits: Array<estypes.SearchHit<SignalSource>> = results.map((document) => {
          const { _id, _version, _index, ...esqlResult } = document;

          const sourceDocument = _id ? sourceDocuments[_id] : undefined;
          // when mv_expand command present we must clone source, since the reference will be used multiple times
          const source = hasMvExpand ? cloneDeep(sourceDocument?._source) : sourceDocument?._source;

          return {
            _source: mergeEsqlResultInSource(source, esqlResult),
            fields: sourceDocument?.fields,
            _id: _id ?? '',
            _index: _index || sourceDocument?._index || '',
            _version: sourceDocument?._version,
          };
        });

        if (
          isAlertSuppressionActive &&
          alertSuppressionTypeGuard(completeRule.ruleParams.alertSuppression)
        ) {
          const wrapSuppressedHits = (events: Array<estypes.SearchHit<SignalSource>>) =>
            wrapSuppressedEsqlAlerts({
              sharedParams,
              events,
              isRuleAggregating,
              expandedFields,
            });

          const bulkCreateResult = await bulkCreateSuppressedAlertsInMemory({
            sharedParams,
            enrichedEvents: syntheticHits,
            toReturn: result,
            services,
            alertSuppression: completeRule.ruleParams.alertSuppression,
            wrapSuppressedHits,
            buildReasonMessage: buildReasonMessageForEsqlAlert,
            mergeSourceAndFields: true,
            // passing 1 here since ES|QL does not support pagination
            maxNumberOfAlertsMultiplier: 1,
          });

          ruleExecutionLogger.debug(
            `Created ${bulkCreateResult.createdItemsCount} alerts. Suppressed ${bulkCreateResult.suppressedItemsCount} alerts`
          );

          if (bulkCreateResult.alertsWereTruncated) {
            result.warningMessages.push(getSuppressionMaxSignalsWarning());
            break;
          }
        } else {
          const wrappedAlerts = wrapEsqlAlerts({
            sharedParams,
            events: syntheticHits,
            isRuleAggregating,
            expandedFields,
          });

          const bulkCreateResult = await bulkCreate({
            wrappedAlerts,
            services,
            sharedParams,
            maxAlerts: tuple.maxSignals - result.createdSignalsCount,
          });

          addToSearchAfterReturn({ current: result, next: bulkCreateResult });
          ruleExecutionLogger.debug(`Created ${bulkCreateResult.createdItemsCount} alerts`);

          if (bulkCreateResult.alertsWereTruncated) {
            result.warningMessages.push(getMaxSignalsWarning());
            break;
          }
        }

        scheduleNotificationResponseActionsService({
          signals: result.createdSignals,
          signalsCount: result.createdSignalsCount,
          responseActions: completeRule.ruleParams.responseActions,
        });

        // no more results will be found
        if (response.values.length < size) {
          ruleExecutionLogger.debug(
            `End of search: Found ${response.values.length} results with page size ${size}`
          );
          break;
        }
        // ES|QL does not support pagination so we need to increase size of response to be able to catch all events
        size += tuple.maxSignals;
      }
    } catch (error) {
      if (checkErrorDetails(error).isUserError) {
        result.userError = true;
      }
      result.errors.push(error.message);
      result.success = false;
    }

    return { ...result, state, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
  });
};
