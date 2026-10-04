/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { estypes } from '@elastic/elasticsearch';
import { cloneDeep, partition } from 'lodash';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';

import {
  computeIsESQLQueryAggregating,
  getIndexListFromEsqlQuery,
  getMvExpandFields,
} from '@kbn/securitysolution-utils';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { buildEsqlSearchRequest } from './build_esql_search_request';
import { performEsqlRequest } from './esql_request';
import { wrapEsqlAlerts } from './wrap_esql_alerts';
import { wrapSuppressedEsqlAlerts } from './wrap_suppressed_esql_alerts';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import {
  rowToDocument,
  mergeEsqlResultInSource,
  getMvExpandUsage,
  updateExcludedDocuments,
  initiateExcludedDocuments,
  getSourceDocument,
  getTransformedQuery,
  checkMissingIdFieldWarning,
} from './utils';
import { fetchSourceDocuments } from './fetch_source_documents';
import { buildNativeEsqlExceptionQuery, getFromClause } from './utils/build_esql_native_exceptions';
import type { PositionSchema } from './utils/build_esql_native_exceptions';
import { buildReasonMessageForEsqlAlert } from '../utils/reason_formatters';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import type { SecurityRuleServices, SecuritySharedParams, SignalSource } from '../types';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { getDataStreamNamespaceFilter } from '../utils/get_data_stream_namespace_filter';
import { checkErrorDetails } from '../utils/check_error_details';
import { logClusterShardFailuresEsql } from '../utils/log_cluster_shard_failures_esql';
import type { ExcludedDocument, EsqlState } from './types';

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

const MAX_EXCLUDED_DOCUMENTS = 100 * 1000;

// POC: when a rule's name contains this marker, scalar detection exceptions are
// compiled into the ES|QL query (a `WHERE NOT (...)` stage, early or late) instead of
// applied as a DSL pre-filter. Name-based so the same rule can be A/B compared
// against the V1 path.
const POC_NATIVE_ESQL_EXCEPTIONS_NAME_MARKER = 'POC EXCEPTIONS';

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
  state: EsqlState;
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
    allExceptionItems,
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
    const dataStreamNamespaceFilters = await getDataStreamNamespaceFilter({
      uiSettingsClient: services.uiSettingsClient,
    });
    const isRuleAggregating = computeIsESQLQueryAggregating(ruleParams.query);
    const hasMvExpand = getMvExpandFields(ruleParams.query).length > 0;
    // since pagination is not supported in ES|QL, we will use tuple.maxSignals + 1 to determine if search results are exhausted
    const size = tuple.maxSignals + 1;

    const { query: transformedQuery, injectionFailureReason } = await getTransformedQuery({
      originalQuery: ruleParams.query,
      ruleExecutionLogger,
      isAggregating: isRuleAggregating,
    });

    // POC: native ES|QL exceptions. Scalar exception items are compiled into the
    // query: items whose fields are all in the source indices run as a `WHERE` right
    // after FROM (event-level), items on computed columns as a `WHERE` at the end
    // (alert-level). Value-list (`list`) items stay on the existing DSL
    // implementation, so the two mechanisms never apply the same item twice.
    const useNativeEsqlExceptions =
      (completeRule.ruleConfig.name ?? '').includes(POC_NATIVE_ESQL_EXCEPTIONS_NAME_MARKER) &&
      (allExceptionItems?.length ?? 0) > 0;

    let queryToRun = transformedQuery;
    let effectiveExceptionFilter = exceptionFilter;
    let effectiveUnprocessedExceptions = unprocessedExceptions;

    if (useNativeEsqlExceptions && allExceptionItems) {
      const [listItems, nativeItems] = partition(allExceptionItems, (item) =>
        (item.entries as EntriesArray).some((entry) => entry.type === 'list')
      );

      // Resolve the columns available at each position with `LIMIT 0` probes (name +
      // type, no rows): the source columns (right after FROM) decide which items run
      // early against the source, the output columns (after the pipeline) which run
      // late against the alert. The output probe includes computed / aggregated
      // columns and reflects KEEP/DROP, which field_caps on the source cannot.
      const probeSchema = async (probeQuery: string): Promise<PositionSchema> => {
        const probe = await services.scopedClusterClient.asCurrentUser.esql.query({
          query: `${probeQuery}\n| LIMIT 0`,
        });
        const columns = new Set<string>();
        const columnTypes: Record<string, string | undefined> = {};
        for (const col of probe.columns ?? []) {
          columns.add(col.name);
          columnTypes[col.name] = col.type;
        }
        return { columns, columnTypes };
      };

      let source: PositionSchema | undefined;
      let output: PositionSchema | undefined;
      if (nativeItems.length > 0) {
        const fromClause = getFromClause(transformedQuery);
        try {
          if (fromClause == null) {
            throw new Error('query does not start with a FROM command');
          }
          [source, output] = await Promise.all([
            probeSchema(fromClause),
            probeSchema(transformedQuery),
          ]);
        } catch (e) {
          ruleExecutionLogger.warn(
            `POC native ES|QL exceptions: schema probe failed, falling back to the DSL exception filter: ${e?.message}`
          );
        }
      }

      const probeFailed = nativeItems.length > 0 && (source == null || output == null);

      if (!probeFailed) {
        // Value-list items go to the DSL filter; scalar items are compiled in-query.
        // Rebuild the DSL filter (and its unprocessed-exceptions warning) from the
        // value-list items only. The items are already expiry-filtered upstream, so
        // the `startedAt` passed here only re-confirms that.
        if (listItems.length > 0) {
          const { filter, unprocessedExceptions: listUnprocessed } = await buildExceptionFilter({
            lists: listItems,
            excludeExceptions: true,
            chunkSize: 10,
            alias: null,
            listClient: sharedParams.listClient,
            startedAt: tuple.to.toDate(),
          });
          effectiveExceptionFilter = filter;
          effectiveUnprocessedExceptions = listUnprocessed;
        } else {
          effectiveExceptionFilter = undefined;
          effectiveUnprocessedExceptions = [];
        }

        if (nativeItems.length > 0 && source != null && output != null) {
          const { query: queryWithExceptions, skipped } = buildNativeEsqlExceptionQuery({
            query: transformedQuery,
            items: nativeItems,
            source,
            output,
          });
          if (skipped.length) {
            const details = skipped.map((s) => `${s.itemId} (${s.reason})`).join('; ');
            result.warningMessages.push(
              `${skipped.length} exception item(s) could not be applied to this ES|QL rule: ${details}`
            );
            ruleExecutionLogger.warn(`POC native ES|QL exceptions: skipped ${details}`);
          }
          const appliedCount = nativeItems.length - skipped.length;
          if (appliedCount > 0) {
            queryToRun = queryWithExceptions;
            ruleExecutionLogger.info(
              `POC native ES|QL exceptions: applied ${appliedCount} scalar exception item(s) in-query.\nQuery:\n${queryToRun}`
            );
          }
        }
      }
    }

    const excludedDocuments: Record<string, ExcludedDocument[]> = initiateExcludedDocuments({
      state,
      isRuleAggregating,
      tuple,
      hasMvExpand,
      query: ruleParams.query,
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
    let iteration = 0;
    let totalEventsFound = 0;
    try {
      while (result.createdSignalsCount <= tuple.maxSignals) {
        const totalExcludedDocumentsLength = Object.values(excludedDocuments).reduce(
          (acc, docs) => acc + docs.length,
          0
        );
        if (totalExcludedDocumentsLength > MAX_EXCLUDED_DOCUMENTS) {
          result.warningMessages.push(
            `Excluded documents exceeded the limit of ${MAX_EXCLUDED_DOCUMENTS}, some alerts might not have been created. Consider reducing the lookback time for the rule.`
          );
          break;
        }

        const esqlRequest = buildEsqlSearchRequest({
          query: queryToRun,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          size,
          filters: [...dataTiersFilters, ...dataStreamNamespaceFilters],
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter: effectiveExceptionFilter,
          excludedDocuments,
          ruleExecutionTimeout,
        });

        const esqlQueryString = {
          drop_null_columns: true,
          // allow_partial_results is true by default, but we need to set it to false for aggregating queries
          allow_partial_results: !isRuleAggregating,
        };
        const hasLoggedRequestsReachedLimit = iteration >= 2;

        ruleExecutionLogger.trace(`ES|QL query to execute\n${JSON.stringify(esqlRequest)}`);
        // Warn about exceptions that are not applied (large value lists). In native
        // mode this set covers only the value-list items still on the DSL path.
        const exceptionsWarning = getUnprocessedExceptionsWarnings(effectiveUnprocessedExceptions);
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

        logClusterShardFailuresEsql({ response, result });

        if (!isRuleAggregating && iteration === 0) {
          const missingIdWarning = checkMissingIdFieldWarning({
            response,
            injectionFailureReason,
          });
          if (missingIdWarning) {
            result.warningMessages.push(missingIdWarning);
          }
        }

        const esqlSearchDuration = performance.now() - esqlSignalSearchStart;
        result.searchAfterTimes.push(makeFloatString(esqlSearchDuration));

        ruleExecutionLogger.trace(
          `ES|QL query iteration\nIteration: ${iteration}. Search took: ${esqlSearchDuration}ms.`
        );

        const results = response.values.map((row) => rowToDocument(response.columns, row));
        totalEventsFound += results.length;
        const index = getIndexListFromEsqlQuery(completeRule.ruleParams.query);

        const sourceDocuments = await fetchSourceDocuments({
          esClient: services.scopedClusterClient.asCurrentUser,
          results,
          index,
          isRuleAggregating,
          loggedRequests: isLoggedRequestsEnabled ? loggedRequests : undefined,
          hasLoggedRequestsReachedLimit,
          runtimeMappings: sharedParams.runtimeMappings,
          excludedDocuments,
          filters: [...dataTiersFilters, ...dataStreamNamespaceFilters],
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          primaryTimestamp,
          secondaryTimestamp,
        });

        const isAlertSuppressionActive = await getIsAlertSuppressionActive({
          alertSuppression: completeRule.ruleParams.alertSuppression,
          licensing,
        });

        const { expandedFieldsInResponse: expandedFields } = getMvExpandUsage(
          response.columns,
          completeRule.ruleParams.query
        );

        const syntheticHits: Array<estypes.SearchHit<SignalSource>> = results.map((document) => {
          const { _id, _version, _index, ...esqlResult } = document;

          const sourceDocument = getSourceDocument(sourceDocuments, _id, _index);
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

        // Collect rule execution metrics
        result.alertsCandidateCount = syntheticHits.length;

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
            `Alerts bulk creation completed. Alerts created: ${bulkCreateResult.createdItemsCount}, Alerts suppressed: ${bulkCreateResult.suppressedItemsCount}.`
          );

          updateExcludedDocuments({
            excludedDocuments,
            sourceDocuments,
            results,
            isRuleAggregating,
            aggregatableTimestampField: sharedParams.aggregatableTimestampField,
            searchExhausted: results.length < size,
          });

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
          ruleExecutionLogger.debug(
            `Alerts bulk creation completed. Alerts created: ${bulkCreateResult.createdItemsCount}.`
          );

          updateExcludedDocuments({
            excludedDocuments,
            sourceDocuments,
            results,
            isRuleAggregating,
            aggregatableTimestampField: sharedParams.aggregatableTimestampField,
            searchExhausted: results.length < size,
          });

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
          ruleExecutionLogger.trace(
            `End of search. Found ${response.values.length} results\nPage size ${size}.`
          );
          break;
        }

        iteration++;
      }
    } catch (error) {
      if (checkErrorDetails(error).isUserError) {
        result.userError = true;
      }
      result.errors.push(error.message);
      result.success = false;
    }

    result.totalEventsFound = totalEventsFound;

    return {
      ...result,
      state: {
        ...state,
        excludedDocuments,
        lastQuery: hasMvExpand ? ruleParams.query : undefined, // lastQuery is only relevant for mv_expand queries
      },
      ...(isLoggedRequestsEnabled ? { loggedRequests } : {}),
    };
  });
};
