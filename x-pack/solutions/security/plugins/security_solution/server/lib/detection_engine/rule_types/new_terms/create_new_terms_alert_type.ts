/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { estypes } from '@elastic/elasticsearch';
import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { NewTermsRuleParams } from '../../rule_schema';
import type { SecurityAlertType, SignalSource } from '../types';
import { validateIndexPatterns } from '../utils';
import { parseDateString, validateHistoryWindowStart } from './utils';
import {
  createSearchAfterReturnType,
  getUnprocessedExceptionsWarnings,
  addToSearchAfterReturn,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import { getFilter } from '../utils/get_filter';
import { buildEsqlSearchRequest } from '../esql/build_esql_search_request';
import { performEsqlRequest } from '../esql/esql_request';
import { buildEventsSearchQuery } from '../utils/build_events_query';
import { wrapNewTermsAlerts, type EventsAndTerms } from './wrap_new_terms_alerts';
import { bulkCreateSuppressedNewTermsAlertsInMemory } from './bulk_create_suppressed_alerts_in_memory';
import { bulkCreate, type GenericBulkCreateResponse } from '../factories';
import {
  getIsAlertSuppressionActive,
  alertSuppressionTypeGuard,
} from '../utils/get_is_alert_suppression_active';
import type { NewTermsAlertLatest } from '../../../../../common/api/detection_engine/model/alerts';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';

export const createNewTermsAlertType = (): SecurityAlertType<
  NewTermsRuleParams,
  { isLoggedRequestsEnabled?: boolean }
> => {
  return {
    id: NEW_TERMS_RULE_TYPE_ID,
    name: 'New Terms Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const validated = NewTermsRuleParams.parse(object);
          validateHistoryWindowStart({
            historyWindowStart: validated.historyWindowStart,
            from: validated.from,
          });
          return validated;
        },
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);
          return mutatedRuleParams;
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: NewTermsRuleParams },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: SERVER_APP_ID,
    solution: 'security',
    // eslint-disable-next-line complexity
    async executor(execOptions) {
      const { sharedParams, services, params, state } = execOptions;

      const {
        ruleExecutionLogger,
        completeRule,
        tuple,
        aggregatableTimestampField,
        primaryTimestamp,
        secondaryTimestamp,
        inputIndex,
        exceptionFilter,
        unprocessedExceptions,
        scheduleNotificationResponseActionsService,
        runtimeMappings,
      } = sharedParams;

      const result = createSearchAfterReturnType();

      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      // Validate history window
      validateHistoryWindowStart({
        historyWindowStart: params.historyWindowStart,
        from: params.from,
      });

      // Parse history window start date
      const parsedHistoryWindowStart = parseDateString({
        date: params.historyWindowStart,
        forceNow: tuple.to.toDate(),
        name: 'historyWindowStart',
      });

      const filterArgs = {
        filters: params.filters,
        index: inputIndex,
        language: params.language,
        savedId: undefined,
        services,
        type: params.type,
        query: params.query,
        exceptionFilter,
        loadFields: true,
      };
      const esFilter = await getFilter(filterArgs);

      const isLoggedRequestsEnabled = Boolean(state?.isLoggedRequestsEnabled);
      const loggedRequests: RulePreviewLoggedRequest[] = [];
      const isAlertSuppressionActive = await getIsAlertSuppressionActive({
        alertSuppression: params.alertSuppression,
        licensing: sharedParams.licensing,
      });

      const newTermsFields = params.newTermsFields;
      const byFields = newTermsFields.join(', ');
      const timestampField = aggregatableTimestampField;

      // Build null filters - exclude documents where new terms fields are null
      const nullFilters = newTermsFields.map((field) => `\`${field}\` IS NOT NULL`).join(' AND ');

      // Build MV_EXPAND commands for each new terms field
      const mvExpandCommands = newTermsFields.map((field) => `| MV_EXPAND \`${field}\``).join(' ');

      // Handle timestamp override with EVAL command
      const timestampOverrideCommand =
        aggregatableTimestampField === 'kibana.combined_timestamp'
          ? `| EVAL ${aggregatableTimestampField} = CASE(${primaryTimestamp} IS NOT NULL, ${primaryTimestamp}, ${secondaryTimestamp})`
          : '';

      // ============================================
      // STEP 1: ES|QL QUERY TO GET BUCKETS
      // ============================================
      // This replaces Phase 1 (composite aggregation) and Phase 2 (terms aggregation)
      // Query structure matches the example pattern:
      // FROM -> WHERE null filters -> MV_EXPAND -> STATS -> WHERE first_seen filter
      const indexPattern = inputIndex ?? [];
      const esqlQuery = [
        `FROM ${indexPattern.join(', ')}`,
        timestampOverrideCommand,
        `| WHERE ${nullFilters}`,
        mvExpandCommands,
        `| STATS first_seen = MIN(\`${timestampField}\`) BY ${byFields}`,
        `| WHERE first_seen >= "${tuple.from.toISOString()}"`,
      ]
        .filter(Boolean)
        .join(' ');

      ruleExecutionLogger.debug(`New Terms ES|QL query: ${esqlQuery}`);

      // Execute ES|QL query to get buckets
      const esqlRequest = buildEsqlSearchRequest({
        query: esqlQuery,
        from: parsedHistoryWindowStart.toISOString(),
        to: tuple.to.toISOString(),
        size: 10000, // ES|QL limit
        filters: esFilter ? [esFilter] : [],
        primaryTimestamp,
        secondaryTimestamp,
        exceptionFilter,
        excludedDocuments: {},
        ruleExecutionTimeout: undefined,
      });

      const esqlResponse = await performEsqlRequest({
        esClient: services.scopedClusterClient.asCurrentUser,
        requestBody: esqlRequest,
        requestQueryParams: {
          drop_null_columns: true,
        },
        ruleExecutionLogger,
        shouldStopExecution: services.shouldStopExecution,
        loggedRequests: isLoggedRequestsEnabled ? loggedRequests : undefined,
      });

      // Parse ES|QL results to extract bucket keys
      // ES|QL returns columns and values array
      const columnNames = esqlResponse.columns.map((col) => col.name);
      const newTermsFieldIndices = newTermsFields.map((field) => columnNames.indexOf(field));
      const buckets: Array<Record<string, string | number>> = [];

      for (const row of esqlResponse.values) {
        const bucket: Record<string, string | number> = {};
        for (let i = 0; i < newTermsFields.length; i++) {
          const fieldIndex = newTermsFieldIndices[i];
          if (fieldIndex >= 0 && row[fieldIndex] != null) {
            bucket[newTermsFields[i]] = row[fieldIndex] as string | number;
          }
        }
        if (Object.keys(bucket).length === newTermsFields.length) {
          buckets.push(bucket);
        }
      }

      if (buckets.length === 0) {
        scheduleNotificationResponseActionsService({
          signals: result.createdSignals,
          signalsCount: result.createdSignalsCount,
          responseActions: completeRule.ruleParams.responseActions,
        });
        return { ...result, state, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
      }

      // ============================================
      // STEP 2: FETCH SOURCE DOCUMENTS (Phase 2) - Use msearch
      // ============================================
      // For each bucket, create a search query to find the first document in the rule execution interval
      // that contains that combination. Use msearch to execute all queries in parallel.
      const BATCH_SIZE = 500; // Process 500 buckets at a time to avoid too many concurrent requests
      let bucketIndex = 0;

      while (bucketIndex < buckets.length && result.createdSignalsCount < params.maxSignals) {
        const batch = buckets.slice(bucketIndex, bucketIndex + BATCH_SIZE);
        bucketIndex += BATCH_SIZE;

        // Build msearch requests: for each bucket, create a search query
        const searches: Array<Record<string, unknown>> = [];
        for (const bucket of batch) {
          // Build filter for this specific bucket combination
          const bucketFilter = {
            bool: {
              must: newTermsFields.map((field) => ({
                match: { [field]: bucket[field] },
              })),
            },
          };

          const esFilterForBucket = await getFilter({
            ...filterArgs,
            filters: [
              ...(Array.isArray(filterArgs.filters) ? filterArgs.filters : []),
              bucketFilter,
            ],
          });

          // Body for this search - find first document sorted by timestamp
          const searchQuery = buildEventsSearchQuery({
            aggregations: undefined,
            runtimeMappings,
            searchAfterSortIds: undefined,
            index: inputIndex,
            // Search only in the rule execution interval
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            filter: esFilterForBucket,
            size: 1, // Get only the first document
            primaryTimestamp,
            secondaryTimestamp,
          });

          // Extract header fields (index, allow_no_indices, ignore_unavailable) from search query
          // and put them in the header, rest goes in the body
          const {
            index: _index,
            allow_no_indices,
            ignore_unavailable,
            ...searchBody
          } = searchQuery;

          // Header for this search - msearch requires header before body
          searches.push({
            index: inputIndex,
            ignore_unavailable: ignore_unavailable ?? true,
            allow_no_indices: allow_no_indices ?? true,
          });

          searches.push(searchBody);
        }

        // Execute msearch
        const startTime = Date.now();

        // Log msearch request if enabled
        // msearch format is newline-delimited JSON: header1\nbody1\nheader2\nbody2\n...
        if (isLoggedRequestsEnabled) {
          const msearchLines: string[] = [];
          for (let i = 0; i < searches.length; i += 2) {
            const header = searches[i];
            const body = searches[i + 1];
            msearchLines.push(JSON.stringify(header));
            msearchLines.push(JSON.stringify(body));
          }
          const msearchRequestString = `POST /_msearch\n${msearchLines.join('\n')}`;
          loggedRequests.push({
            request: msearchRequestString,
            description: `Find documents for ${batch.length} new term combinations`,
          });
        }

        const msearchResponse = await services.scopedClusterClient.asCurrentUser.msearch({
          searches,
        });

        const searchDuration = `${(Date.now() - startTime) / 1000}s`;
        result.searchAfterTimes.push(searchDuration);

        // Update duration in loggedRequests if enabled
        if (isLoggedRequestsEnabled && loggedRequests.length > 0) {
          const lastRequest = loggedRequests[loggedRequests.length - 1];
          if (lastRequest && lastRequest.description?.includes('new term combinations')) {
            lastRequest.duration = Math.round((Date.now() - startTime) / 1000);
          }
        }

        // Process responses and create eventsAndTerms
        const eventsAndTerms: EventsAndTerms[] = [];
        for (let i = 0; i < batch.length; i++) {
          const response = msearchResponse.responses[i];
          if ('status' in response && response.status === 200 && 'hits' in response) {
            const hits = response.hits;
            if (hits?.hits?.length > 0) {
              const hit = hits.hits[0] as estypes.SearchHit<SignalSource>;
              const bucket = batch[i];
              const newTerms = newTermsFields.map((field) => bucket[field]);
              eventsAndTerms.push({
                event: hit,
                newTerms,
              });
            }
          } else if ('status' in response && response.status !== 200) {
            result.errors.push(
              `Error fetching document for bucket: ${JSON.stringify(batch[i])}, status: ${
                response.status
              }`
            );
          }
        }

        // Create alerts from eventsAndTerms
        if (eventsAndTerms.length > 0) {
          const eventAndTermsChunks = chunk(eventsAndTerms, 5 * params.maxSignals);
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
                isAlertSuppressionActive
                  ? getSuppressionMaxSignalsWarning()
                  : getMaxSignalsWarning()
              );
              break;
            }
          }

          if (
            bulkCreateResult.alertsWereTruncated ||
            result.createdSignalsCount >= params.maxSignals
          ) {
            break;
          }
        }
      }

      scheduleNotificationResponseActionsService({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });

      return { ...result, state, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
    },
  };
};
