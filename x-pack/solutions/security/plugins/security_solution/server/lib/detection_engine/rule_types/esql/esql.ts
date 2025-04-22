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
import type { EsqlTable } from './esql_request';
import { wrapEsqlAlerts } from './wrap_esql_alerts';
import { wrapSuppressedEsqlAlerts } from './wrap_suppressed_esql_alerts';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import { rowToDocument, mergeEsqlResultInSource, getMvExpandUsage } from './utils';
import { fetchSourceDocuments } from './fetch_source_documents';
import type { FetchedDocument } from './fetch_source_documents';
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
  const isLoggedRequestsEnabled = state?.isLoggedRequestsEnabled ?? false;

  return withSecuritySpan('esqlExecutor', async () => {
    const result = createSearchAfterReturnType();
    const dataTiersFilters = await getDataTierFilter({
      uiSettingsClient: services.uiSettingsClient,
    });

    /**
     * ES|QL returns results as a single page, max size of 10,000
     * To mitigate this, we will use the maxSignals as a page size
     * Wll keep track of the earlier found document ids and will exclude them in subsequent requests
     * to avoid duplicates.
     * This is a workaround until pagination is supported in ES|QL
     * Since aggregating queries do not produce event ids, we will not exclude them.
     * All alerts for aggregating queries are unique anyway
     */
    const excludedDocumentIds: string[] = [];
    let iteration = 0;
    try {
      while (result.createdSignalsCount <= tuple.maxSignals) {
        const esqlRequest = buildEsqlSearchRequest({
          query: ruleParams.query,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          size: tuple.maxSignals,
          filters: dataTiersFilters,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          excludedDocumentIds,
          ruleExecutionTimeout,
        });
        const esqlQueryString = { drop_null_columns: true };
        const hasLoggedRequestsReachedLimit = iteration >= 2;

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

        ruleExecutionLogger.debug(
          `ES|QL query request for ${iteration} iteration took: ${esqlSearchDuration}ms`
        );

        const isRuleAggregating = computeIsESQLQueryAggregating(completeRule.ruleParams.query);

        const results = response.values.map((row) => rowToDocument(response.columns, row));
        const index = getIndexListFromEsqlQuery(completeRule.ruleParams.query);

        const sourceDocuments = await fetchSourceDocuments({
          esClient: services.scopedClusterClient.asCurrentUser,
          results,
          index,
          isRuleAggregating,
          loggedRequests: isLoggedRequestsEnabled ? loggedRequests : undefined,
          hasLoggedRequestsReachedLimit,
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
        if (response.values.length < tuple.maxSignals + 1) {
          ruleExecutionLogger.debug(
            `End of search: Found ${response.values.length} results with page size ${tuple.maxSignals}`
          );
          break;
        }

        updatedExcludedIds(
          excludedDocumentIds,
          hasMvExpand,
          sourceDocuments,
          response,
          isRuleAggregating
        );
        iteration++;
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

const updatedExcludedIds = (
  excludedDocumentIds: string[],
  hasMvExpand: boolean,
  sourceDocuments: Record<string, FetchedDocument>,
  results: EsqlTable,
  isRuleAggregating: boolean
): string[] => {
  // aggregating queries do not have event _id, so we will not exclude any documents
  if (isRuleAggregating) {
    return excludedDocumentIds;
  }
  const documentIds = Object.keys(sourceDocuments);

  if (!hasMvExpand || documentIds.length === 1) {
    excludedDocumentIds.push(...documentIds);
    return excludedDocumentIds;
  }

  const idColumnIndex = results.columns.findIndex((column) => column.name === '_id');
  const lastId = results.values[results.values.length - 1][idColumnIndex];

  excludedDocumentIds.push(...documentIds.filter((id) => id !== lastId));

  return excludedDocumentIds;
};
