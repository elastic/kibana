/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import objectHash from 'object-hash';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { SERVER_APP_ID } from '../../../../../common/constants';
import { ALERT_NEW_TERMS } from '../../../../../common/field_maps/field_names';

import { NewTermsRuleParams } from '../../rule_schema';
import type { SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';
import { parseDateString, validateHistoryWindowStart } from './utils';
import { createSearchAfterReturnType, getUnprocessedExceptionsWarnings } from '../utils/utils';
import { esqlExecutor } from '../esql/esql';
import { getFilter } from '../utils/get_filter';
import type { EsqlRuleParams } from '../../rule_schema';
import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';

// ============================================
// NEW TERMS RULE - ES|QL POC WITH INLINE STATS
// ============================================
//
// This is a proof-of-concept implementation that replaces the 3-phase
// DSL aggregation approach with a single ES|QL query using INLINE STATS.
//
// WHAT'S IMPLEMENTED:
// ✅ ES|QL query building with INLINE STATS
// ✅ Single-field new terms detection
// ✅ Multi-field new terms detection (same query, just add fields to BY clause)
// ✅ History window time range handling
// ✅ Reusing esqlExecutor for query execution
// ✅ kibana.alert.new_terms field population via mergeRuleTypeFields
// ✅ Alert suppression via groupBy fields
//
// WHAT'S MISSING / TODO:
// ❌ Array field handling - ES|QL doesn't "explode" arrays like DSL composite agg
//    - One doc with field: ["a", "b", "c"] → 1 alert (not 3)
// ❌ Alert ID generation using new terms values (for cross-execution deduplication)
//    - Current ID doesn't include new terms values in the hash
// ❌ High cardinality (>10k new terms) - ES|QL 10k limit
// ❌ Runtime field support may have limitations
// ❌ Integration tests need updating
//
// ES|QL QUERY STRUCTURE:
// ```
// FROM {index}
// | WHERE {nullFilters}  // exclude null values in new terms fields
// | INLINE STATS first_seen = MIN(@timestamp) BY {newTermsFields}
// | WHERE first_seen >= "{from}"  // only terms first seen in rule interval
// | WHERE @timestamp == first_seen  // get the document that introduced the term
// | LIMIT {maxSignals}
// ```

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
        // Note: exceptionFilter is handled by esqlExecutor via sharedParams
        unprocessedExceptions,
        scheduleNotificationResponseActionsService,
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

      // ============================================
      // BUILD ES|QL QUERY WITH INLINE STATS
      // ============================================

      // Build the BY clause for INLINE STATS (supports single and multi-field)
      const newTermsFields = params.newTermsFields;
      const byFields = newTermsFields.join(', ');

      // Build null filters - exclude documents where new terms fields are null
      // Use backticks to escape field names properly for ES|QL
      const nullFilters = newTermsFields.map((field) => `\`${field}\` IS NOT NULL`).join(' AND ');
      const nullFiltersCommand = newTermsFields.length > 0 ? `| WHERE ${nullFilters}` : '';

      // Build MV_EXPAND commands for each new terms field
      // This expands multivalue arrays into separate rows BEFORE aggregation
      // e.g., a document with host.ip = [1.2.3.4, 5.6.7.8] becomes 2 rows
      const mvExpandCommands = newTermsFields.map((field) => `| MV_EXPAND \`${field}\``).join(' ');

      // Use the aggregatable timestamp field (handles timestamp override)
      const timestampField = aggregatableTimestampField;

      // Handle timestamp override with EVAL command (like threshold rule)
      // When timestamp override is configured, we need to compute a combined timestamp
      // that falls back to @timestamp when the override field is missing
      const timestampOverrideCommand =
        aggregatableTimestampField === 'kibana.combined_timestamp'
          ? `| EVAL ${aggregatableTimestampField} = CASE(${primaryTimestamp} IS NOT NULL, ${primaryTimestamp}, ${secondaryTimestamp})`
          : '';

      // Build the ES|QL query
      // This single query replaces the 3-phase DSL approach:
      // - Phase 1 (find recent terms) -> handled by initial time range filter
      // - Phase 2 (check if new) -> INLINE STATS + WHERE first_seen >= from
      // - Phase 3 (fetch document) -> WHERE @timestamp == first_seen
      const indexPattern = inputIndex ?? [];
      const esqlQuery = [
        // Source command - FROM index pattern with METADATA to get _id and _index
        // This allows proper alert deduplication based on source document ID
        `FROM ${indexPattern.join(', ')} METADATA _id, _index`,
        `| KEEP _id, ${byFields}, _index, ${timestampField} `,
        // Compute combined timestamp for timestamp override (if configured)
        timestampOverrideCommand,

        // Filter out null values in new terms fields BEFORE expanding
        nullFiltersCommand,

        // MV_EXPAND: Expand multivalue fields into separate rows
        // This is crucial for detecting new terms in array fields
        // e.g., host.ip = ["10.0.0.1", "10.0.0.2"] becomes 2 rows
        mvExpandCommands,

        // INLINE STATS: compute first_seen for each term combination
        // This keeps all document fields AND adds the first_seen column
        `| INLINE STATS first_seen = MIN(\`${timestampField}\`) BY ${byFields}`,
        // Filter to only "new" terms - those first seen within the rule interval
        `| WHERE first_seen >= "${tuple.from.toISOString()}"`,

        // Get only the document that introduced the term (the first occurrence)
        `| WHERE \`${timestampField}\` == first_seen`,
        `| INLINE STATS min_doc_id = min(_id) BY ${byFields}`,
        `| WHERE _id == min_doc_id`,
      ]
        .filter(Boolean)
        .join(' ');

      ruleExecutionLogger.debug(`New Terms ES|QL query: ${esqlQuery}`);

      // ============================================
      // BUILD FILTER FROM USER'S KQL QUERY
      // ============================================
      // Note: Do NOT include exceptionFilter here - esqlExecutor handles it via buildEsqlSearchRequest
      // Including it here would cause the exception filter to be applied twice
      const esFilter = await getFilter({
        type: params.type,
        filters: params.filters ?? [],
        language: params.language,
        query: params.query,
        savedId: undefined,
        services,
        index: inputIndex,
        exceptionFilter: undefined, // esqlExecutor applies this from sharedParams
        loadFields: true,
      });

      // ============================================
      // MERGE RULE TYPE FIELDS (Add ALERT_NEW_TERMS)
      // ============================================
      // This function is called by esqlExecutor to add new terms-specific fields
      // Similar to how threshold adds kibana.alert.threshold_result
      const mergeRuleTypeFields = (
        alerts: Array<
          WrappedAlert<DetectionAlertLatest | (DetectionAlertLatest & SuppressionFieldsLatest)>
        >
      ): Array<
        WrappedAlert<DetectionAlertLatest | (DetectionAlertLatest & SuppressionFieldsLatest)>
      > => {
        const { spaceId } = sharedParams;

        return alerts.map((alert, index) => {
          const source = alert._source;

          // Extract new terms values from the source document
          // These are the field values from the newTermsFields configuration
          const newTermsValues = newTermsFields.map((field) => {
            const value = get(source, field);
            // Handle both single values and arrays - take first value if array
            return Array.isArray(value) ? value[0] : value;
          });

          // Calculate alert ID using document metadata (same as original DSL implementation)
          // ES|QL provides _id and _index via METADATA directive
          // This ensures proper deduplication:
          // 1. Same document + same rule + same new term = same alert (deduplicated)
          // 2. Different document = different alert (even if same term)

          // console.log('alert', JSON.stringify(alert, null, 2));
          const docId = alert._id;
          const docIndex = alert._index;
          console.log('docIndex', JSON.stringify(docIndex, null, 2));
          console.log('docId', JSON.stringify(docId, null, 2));
          console.log('spaceId', JSON.stringify(spaceId, null, 2));
          console.log('completeRule.alertId', JSON.stringify(completeRule.alertId, null, 2));
          console.log('newTermsValues', JSON.stringify(newTermsValues, null, 2));

          const alertId = objectHash([
            docIndex,
            docId,
            `${spaceId}:${completeRule.alertId}`,
            newTermsValues,
          ]);

          // Fix suppression term values to be arrays (expected format)
          // ES|QL-based alerts may have plain values instead of arrays due to _source merging
          // Note: null values should remain as null, not wrapped in arrays
          const suppressionTerms = get(source, 'kibana.alert.suppression.terms') as
            | Array<{ field: string; value: unknown }>
            | undefined;
          const fixedSuppressionTerms = suppressionTerms?.map((term) => ({
            ...term,
            // Wrap non-array, non-null values in arrays to match expected format
            // Null values indicate missing fields and should remain as null
            value:
              term.value === null || term.value === undefined
                ? null
                : Array.isArray(term.value)
                ? term.value
                : [term.value],
          }));

          return {
            ...alert,
            _id: alertId, // Use new ID that includes new terms values
            _source: {
              ...source,
              // Update the alert UUID to match the new ID
              'kibana.alert.uuid': alertId,
              // Add the ALERT_NEW_TERMS field with the new term values
              [ALERT_NEW_TERMS]: newTermsValues,
              // Fix suppression terms format if present
              ...(fixedSuppressionTerms
                ? { 'kibana.alert.suppression.terms': fixedSuppressionTerms }
                : {}),
            },
          };
        });
      };

      // ============================================
      // EXECUTE ES|QL QUERY
      // ============================================
      // Reuse the esqlExecutor with our custom query
      // Key difference: time range uses historyWindowStart instead of tuple.from
      const resultEsql = await esqlExecutor({
        ...execOptions,
        sharedParams: {
          ...sharedParams,
          // Override the tuple to use history window for the time range filter
          // This is critical - we need to search from historyWindowStart to tuple.to
          tuple: {
            ...tuple,
            from: parsedHistoryWindowStart, // Use history window start!
          },
          completeRule: {
            ...sharedParams.completeRule,
            ruleParams: {
              ...completeRule.ruleParams,
              // Pass our ES|QL query (esqlExecutor will append LIMIT)
              query: esqlQuery,
              // Configure alert suppression to use new terms fields as groupBy
              // This ensures proper suppression behavior matching the original implementation
              alertSuppression: params.alertSuppression
                ? {
                    ...params.alertSuppression,
                    // Keep the user's groupBy if specified, otherwise use newTermsFields
                    groupBy: params.alertSuppression.groupBy ?? newTermsFields,
                  }
                : undefined,
            } as unknown as EsqlRuleParams,
          },
        },
        licensing: sharedParams.licensing,
        scheduleNotificationResponseActionsService,
        filters: esFilter,
        // Pass our mergeRuleTypeFields function to add ALERT_NEW_TERMS
        mergeRuleTypeFields,
      });

      // Log results for debugging
      ruleExecutionLogger.debug(
        `New Terms ES|QL result: created ${resultEsql.createdSignalsCount} alerts`
      );

      scheduleNotificationResponseActionsService({
        signals: resultEsql.createdSignals,
        signalsCount: resultEsql.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });

      return { ...resultEsql, state };

      // ============================================
      // ORIGINAL 3-PHASE DSL IMPLEMENTATION (COMMENTED OUT)
      // ============================================
      // The code below is the original implementation using:
      // - Phase 1: Composite aggregation to find recent terms
      // - Phase 2: Terms aggregation with bucket_selector to find new terms
      // - Phase 3: top_hits aggregation to fetch source documents
      //
      // This has been replaced with the ES|QL INLINE STATS approach above.
      // Keeping for reference during development.

      /*
      const isLoggedRequestsEnabled = Boolean(state?.isLoggedRequestsEnabled);
      const loggedRequests: RulePreviewLoggedRequest[] = [];

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

      const isAlertSuppressionActive = await getIsAlertSuppressionActive({
        alertSuppression: params.alertSuppression,
        licensing,
      });
      let afterKey: Record<string, string | number | null> | undefined;

      let pageNumber = 0;

      while (result.createdSignalsCount <= params.maxSignals) {
        pageNumber++;
        // PHASE 1: Fetch a page of terms using a composite aggregation
        const searchRequest = buildEventsSearchQuery({
          aggregations: buildRecentTermsAgg({
            fields: params.newTermsFields,
            after: afterKey,
          }),
          searchAfterSortIds: undefined,
          index: inputIndex,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          filter: esFilter,
          size: 0,
          primaryTimestamp,
          secondaryTimestamp,
          runtimeMappings,
        });

        const {
          searchResult,
          searchDuration,
          searchErrors,
          loggedRequests: firstPhaseLoggedRequests = [],
        } = await singleSearchAfter({
          searchRequest,
          services,
          ruleExecutionLogger,
          loggedRequestsConfig: isLoggedRequestsEnabled
            ? {
                type: 'findAllTerms',
                description: i18n.FIND_ALL_NEW_TERMS_FIELDS_DESCRIPTION(
                  stringifyAfterKey(afterKey)
                ),
                skipRequestQuery: pageNumber > 2,
              }
            : undefined,
        });
        loggedRequests.push(...firstPhaseLoggedRequests);
        if (!searchResult.aggregations) {
          throw new Error('Aggregations were missing on recent terms search result');
        }
        logger.debug(`Time spent on composite agg: ${searchDuration}`);

        result.searchAfterTimes.push(searchDuration);
        result.errors.push(...searchErrors);

        if (searchResult.aggregations.new_terms.after_key == null) {
          break;
        }
        const bucketsForField = searchResult.aggregations.new_terms.buckets;

        const createAlertsHook: CreateAlertsHook = async (aggResult) => {
          const eventsAndTerms: EventsAndTerms[] = (
            aggResult?.aggregations?.new_terms.buckets ?? []
          ).map((bucket) => {
            const newTerms = isObject(bucket.key) ? Object.values(bucket.key) : [bucket.key];
            return {
              event: bucket.docs.hits.hits[0],
              newTerms,
            };
          });

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

          const eventAndTermsChunks = chunk(eventsAndTerms, 5 * params.maxSignals);

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
              break;
            }
          }

          return bulkCreateResult;
        };

        if (params.newTermsFields.length > 1) {
          const bulkCreateResult = await multiTermsComposite({
            sharedParams,
            filterArgs,
            buckets: bucketsForField,
            params,
            aggregatableTimestampField,
            parsedHistoryWindowSize,
            services,
            result,
            logger,
            afterKey,
            createAlertsHook,
            isAlertSuppressionActive,
            isLoggedRequestsEnabled,
          });
          loggedRequests.push(...(bulkCreateResult?.loggedRequests ?? []));

          if (bulkCreateResult && 'alertsWereTruncated' in bulkCreateResult) {
            break;
          }
        } else {
          // PHASE 2: Check if terms are new
          const includeValues = transformBucketsToValues(params.newTermsFields, bucketsForField);
          const pageSearchRequest = buildEventsSearchQuery({
            aggregations: buildNewTermsAgg({
              newValueWindowStart: tuple.from,
              timestampField: aggregatableTimestampField,
              field: params.newTermsFields[0],
              include: includeValues,
            }),
            runtimeMappings,
            searchAfterSortIds: undefined,
            index: inputIndex,
            from: parsedHistoryWindowSize.toISOString(),
            to: tuple.to.toISOString(),
            filter: esFilter,
            size: 0,
            primaryTimestamp,
            secondaryTimestamp,
          });
          const {
            searchResult: pageSearchResult,
            searchDuration: pageSearchDuration,
            searchErrors: pageSearchErrors,
            loggedRequests: pageSearchLoggedRequests = [],
          } = await singleSearchAfter({
            searchRequest: pageSearchRequest,
            services,
            ruleExecutionLogger,
            loggedRequestsConfig: isLoggedRequestsEnabled
              ? {
                  type: 'findNewTerms',
                  description: i18n.FIND_NEW_TERMS_VALUES_DESCRIPTION(stringifyAfterKey(afterKey)),
                  skipRequestQuery: pageNumber > 2,
                }
              : undefined,
          });
          result.searchAfterTimes.push(pageSearchDuration);
          result.errors.push(...pageSearchErrors);
          loggedRequests.push(...pageSearchLoggedRequests);

          logger.debug(`Time spent on phase 2 terms agg: ${pageSearchDuration}`);

          if (!pageSearchResult.aggregations) {
            throw new Error('Aggregations were missing on new terms search result');
          }

          // PHASE 3: Fetch source documents
          if (pageSearchResult.aggregations.new_terms.buckets.length > 0) {
            const actualNewTerms = pageSearchResult.aggregations.new_terms.buckets.map(
              (bucket) => bucket.key
            );

            const docFetchSearchRequest = buildEventsSearchQuery({
              aggregations: buildDocFetchAgg({
                timestampField: aggregatableTimestampField,
                field: params.newTermsFields[0],
                include: actualNewTerms,
              }),
              runtimeMappings,
              searchAfterSortIds: undefined,
              index: inputIndex,
              from: tuple.from.toISOString(),
              to: tuple.to.toISOString(),
              filter: esFilter,
              size: 0,
              primaryTimestamp,
              secondaryTimestamp,
            });
            const {
              searchResult: docFetchSearchResult,
              searchDuration: docFetchSearchDuration,
              searchErrors: docFetchSearchErrors,
              loggedRequests: docFetchLoggedRequests = [],
            } = await singleSearchAfter({
              searchRequest: docFetchSearchRequest,
              services,
              ruleExecutionLogger,
              loggedRequestsConfig: isLoggedRequestsEnabled
                ? {
                    type: 'findDocuments',
                    description: i18n.FIND_NEW_TERMS_EVENTS_DESCRIPTION(
                      stringifyAfterKey(afterKey)
                    ),
                    skipRequestQuery: pageNumber > 2,
                  }
                : undefined,
            });
            result.searchAfterTimes.push(docFetchSearchDuration);
            result.errors.push(...docFetchSearchErrors);
            loggedRequests.push(...docFetchLoggedRequests);

            if (!docFetchSearchResult.aggregations) {
              throw new Error('Aggregations were missing on document fetch search result');
            }

            const bulkCreateResult = await createAlertsHook(docFetchSearchResult);

            if (bulkCreateResult.alertsWereTruncated) {
              result.warningMessages.push(
                isAlertSuppressionActive
                  ? getSuppressionMaxSignalsWarning()
                  : getMaxSignalsWarning()
              );
              break;
            }
          }
        }

        afterKey = searchResult.aggregations.new_terms.after_key;
      }

      scheduleNotificationResponseActionsService({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });

      return { ...result, state, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
      */
    },
  };
};
