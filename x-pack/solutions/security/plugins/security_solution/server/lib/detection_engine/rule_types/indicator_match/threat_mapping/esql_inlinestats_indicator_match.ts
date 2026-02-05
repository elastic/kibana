/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { estypes } from '@elastic/elasticsearch';

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { Filter } from '@kbn/es-query';

import { getQueryFilter } from '../../utils/get_query_filter';
import { buildTimeRangeFilter } from '../../utils/build_events_query';
import { performEsqlRequest } from '../../esql/esql_request';
import { rowToDocument } from '../../esql/utils/row_to_document';
import type {
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
  SecuritySharedParams,
  SecurityRuleServices,
} from '../../types';
import type { ThreatRuleParams } from '../../../rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import {
  buildEsqlInlinestatsIndicatorMatchQuery,
  validateThreatMappingForInlinestats,
} from './build_esql_inlinestats_indicator_match_query';
import type { ThreatEnrichment } from './types';
import { ENRICHMENT_TYPES } from '../../../../../../common/cti/constants';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import {
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
  addToSearchAfterReturn,
} from '../../utils/utils';
import { getDataTierFilter } from '../../utils/get_data_tier_filter';
import type { ScheduleNotificationResponseActionsService } from '../../../rule_response_actions/schedule_notification_response_actions';
import type { RulePreviewLoggedRequest } from '../../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { wrapHits, bulkCreate } from '../../factories';
import { buildReasonMessageForThreatMatchAlert } from '../../utils/reason_formatters';

export interface EsqlInlinestatsIndicatorMatchOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: SecurityRuleServices;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
}

/**
 * Executes an indicator match rule using ES|QL INLINESTATS + FORK.
 *
 * This is an alternative execution path that uses INLINESTATS to broadcast
 * aggregated threat data to matching source rows. Key benefits:
 * - Works with data streams and aliases (no lookup mode requirement)
 * - Can handle larger threat datasets
 *
 * Key differences from LOOKUP JOIN approach:
 * - Threat enrichment data is returned as arrays (aggregated via VALUES())
 * - Creates one enrichment entry per unique threat document ID
 * - DOES NOT MATCH logic uses MV_CONTAINS on aggregated arrays
 *
 * Flow:
 * 1. Convert the user's KQL query to a DSL filter
 * 2. Build an ES|QL query with INLINESTATS + FORK for threat matching
 * 3. Execute the ES|QL query
 * 4. Process results and build threat enrichments from aggregated arrays
 * 5. Create alerts with enrichment data
 */
export const esqlInlinestatsIndicatorMatchExecutor = async ({
  sharedParams,
  services,
  licensing,
  scheduleNotificationResponseActionsService,
}: EsqlInlinestatsIndicatorMatchOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const {
    inputIndex,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
    unprocessedExceptions,
    completeRule,
    tuple,
    ruleExecutionLogger,
  } = sharedParams;

  const {
    ruleParams: {
      query,
      language,
      filters,
      threatIndex,
      threatMapping,
      threatIndicatorPath = DEFAULT_INDICATOR_SOURCE_PATH,
    },
  } = completeRule;

  const loggedRequests: RulePreviewLoggedRequest[] = [];

  return withSecuritySpan('esqlInlinestatsIndicatorMatchExecutor', async () => {
    const result = createSearchAfterReturnType();

    ruleExecutionLogger.debug('Starting ES|QL INLINESTATS-based indicator match execution');

    // Validate threat mapping for INLINESTATS compatibility
    const validationErrors = validateThreatMappingForInlinestats(threatMapping);
    if (validationErrors.length > 0) {
      result.errors.push(...validationErrors.map((err) => `Threat mapping validation: ${err}`));
      result.success = false;
      ruleExecutionLogger.error(`Threat mapping validation failed: ${validationErrors.join(', ')}`);
      return result;
    }

    try {
      // Step 1: Convert KQL query to DSL filter
      const dslFilter = await buildDslFilterFromQuery({
        query,
        language,
        filters,
        inputIndex,
        exceptionFilter,
        services,
      });

      ruleExecutionLogger.debug('DSL filter built from KQL query');

      // Get data tier filters
      const dataTiersFilters = await getDataTierFilter({
        uiSettingsClient: services.uiSettingsClient,
      });

      // Step 2: Build the ES|QL INLINESTATS indicator match query
      const esqlQuery = buildEsqlInlinestatsIndicatorMatchQuery({
        inputIndex,
        threatIndex,
        threatMapping,
        threatIndicatorPath,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        primaryTimestamp,
        secondaryTimestamp,
        dslFilter,
        maxSignals: tuple.maxSignals,
      });

      ruleExecutionLogger.debug(
        `Built ES|QL INLINESTATS query with ${esqlQuery.mappingCount} threat mapping(s), hasMultipleMappings: ${esqlQuery.hasMultipleMappings}`
      );
      ruleExecutionLogger.debug(`ES|QL INLINESTATS query:\n${esqlQuery.query}`);

      // Check for unprocessed exceptions warning
      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      // Step 3: Execute the ES|QL query
      const esqlSearchStart = performance.now();

      // Build the time range filter for source documents
      // Note: For INLINESTATS, the time range is applied in the WHERE clause
      // but we still need a filter for the overall request
      const rangeFilter = buildTimeRangeFilter({
        to: tuple.to.toISOString(),
        from: tuple.from.toISOString(),
        primaryTimestamp,
        secondaryTimestamp,
      });

      // Combine all filters
      const combinedFilter: estypes.QueryDslQueryContainer = {
        bool: {
          filter: [
            rangeFilter,
            ...(dslFilter ? [dslFilter] : []),
            ...dataTiersFilters.map((f) => f as estypes.QueryDslQueryContainer),
          ],
        },
      };

      const esqlRequest = {
        query: esqlQuery.query,
        filter: combinedFilter,
        wait_for_completion_timeout: '4m',
      };

      const response = await performEsqlRequest({
        esClient: services.scopedClusterClient.asCurrentUser,
        requestBody: esqlRequest,
        requestQueryParams: {
          drop_null_columns: true,
        },
        shouldStopExecution: services.shouldStopExecution,
        ruleExecutionLogger,
        loggedRequests,
      });

      const esqlSearchDuration = performance.now() - esqlSearchStart;
      result.searchAfterTimes.push(makeFloatString(esqlSearchDuration));

      ruleExecutionLogger.debug(
        `ES|QL INLINESTATS query returned ${response.values.length} results in ${esqlSearchDuration}ms`
      );
      ruleExecutionLogger.debug(
        `ES|QL columns: ${JSON.stringify(response.columns.map((c) => c.name))}`
      );

      // Step 4: Process results and build enriched signals
      const documents = response.values.map((row) => rowToDocument(response.columns, row));

      // Debug: Log first document structure
      if (documents.length > 0) {
        ruleExecutionLogger.debug(`First document keys: ${JSON.stringify(Object.keys(documents[0]))}`);
        ruleExecutionLogger.debug(
          `First document _id: ${documents[0]._id}, _index: ${documents[0]._index}`
        );
        ruleExecutionLogger.debug(`First document threat_count: ${documents[0].threat_count}`);
        ruleExecutionLogger.debug(
          `First document threat_doc_ids: ${JSON.stringify(documents[0].threat_doc_ids)}`
        );
      }

      if (documents.length === 0) {
        ruleExecutionLogger.debug('No matching documents found');
        return result;
      }

      // Convert documents to SearchHit format with enrichments
      const enrichedHits = processInlinestatsResultsToHits({
        documents,
        threatMapping,
        threatIndicatorPath,
        threatIndex,
      });

      ruleExecutionLogger.debug(`Processed ${enrichedHits.length} enriched signals`);

      // Step 5: Wrap hits into alert format and bulk create
      const wrappedAlerts = wrapHits(
        sharedParams,
        enrichedHits,
        buildReasonMessageForThreatMatchAlert
      );

      ruleExecutionLogger.debug(`Wrapped ${wrappedAlerts.length} alerts`);

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
      }

      // Schedule notification response actions
      scheduleNotificationResponseActionsService({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });

      ruleExecutionLogger.debug(
        `ES|QL INLINESTATS indicator match completed: ${result.createdSignalsCount} signals created`
      );
    } catch (error) {
      ruleExecutionLogger.error(
        `ES|QL INLINESTATS indicator match execution failed: ${error.message}`
      );
      result.errors.push(error.message);
      result.success = false;
    }

    return result;
  });
};

/**
 * Builds a DSL filter from the user's KQL query
 */
async function buildDslFilterFromQuery({
  query,
  language,
  filters,
  inputIndex,
  exceptionFilter,
  services,
}: {
  query: string;
  language: string;
  filters: unknown[] | undefined;
  inputIndex: string[];
  exceptionFilter: Filter | undefined;
  services: SecurityRuleServices;
}): Promise<estypes.QueryDslQueryContainer | undefined> {
  if (!query || query.trim() === '' || query === '*') {
    return undefined;
  }

  try {
    const dataViews = await services.getDataViews();
    const indexFields = await dataViews.getFieldsForWildcard({
      pattern: inputIndex.join(','),
    });

    const dslFilter = getQueryFilter({
      query,
      language: language as 'kuery' | 'lucene',
      filters: filters || [],
      index: inputIndex,
      exceptionFilter,
      fields: indexFields,
    });

    return dslFilter as estypes.QueryDslQueryContainer;
  } catch (error) {
    return undefined;
  }
}

/**
 * ES|QL-specific fields that should be removed from the alert
 */
const ESQL_METADATA_FIELDS = [
  '_fork',
  'join_key',
  'threat_count',
  'threat_doc_ids',
  'matched_atomic',
  'matched_field',
  'matched_type',
  'mapping_index',
];

/**
 * Processes INLINESTATS results into SearchHit format with threat enrichments.
 *
 * Key differences from LOOKUP JOIN processing:
 * - Threat data comes as arrays (aggregated via VALUES())
 * - Creates one enrichment per threat document ID
 * - Must handle array-based enrichment fields
 */
function processInlinestatsResultsToHits({
  documents,
  threatMapping,
  threatIndicatorPath,
  threatIndex,
}: {
  documents: Array<Record<string, unknown>>;
  threatMapping: ThreatRuleParams['threatMapping'];
  threatIndicatorPath: string;
  threatIndex: string[];
}): Array<estypes.SearchHit<SignalSource>> {
  // Collect all threat fields from the mapping to know what to clean
  const threatFieldsToClean = collectAllThreatFieldsFromMapping(threatMapping);

  return documents.map((doc) => {
    // Build enrichments from aggregated threat data
    const enrichments = buildEnrichmentsFromInlinestatsResult(doc, threatMapping, threatIndex);

    // Clean the document: remove INLINESTATS metadata and threat aggregation fields
    const cleanedDoc = cleanDocumentForAlert(doc, threatFieldsToClean);

    // Extract ES document metadata
    const { _id, _index, _version, ...sourceWithoutMeta } = cleanedDoc;

    // Build the search hit with enrichments in the _source
    const hit: estypes.SearchHit<SignalSource> = {
      _id: (_id as string) || '',
      _index: (_index as string) || '',
      _version: _version as number | undefined,
      _source: {
        ...sourceWithoutMeta,
        threat: {
          enrichments,
        },
      } as SignalSource,
    };

    return hit;
  });
}

/**
 * Collects all threat fields from the threat mapping.
 */
function collectAllThreatFieldsFromMapping(threatMapping: ThreatRuleParams['threatMapping']): Set<string> {
  const fields = new Set<string>();

  threatMapping.forEach((mapping) => {
    mapping.entries.forEach((entry) => {
      // Convert threat field to underscore format (e.g., "threat.indicator.ip" -> "threat_indicator_ip")
      const varName = entry.value.replace(/\./g, '_');
      fields.add(varName);
    });
  });
  
  return fields;
}

/**
 * Builds threat enrichments from INLINESTATS aggregated arrays.
 *
 * Since INLINESTATS returns arrays via VALUES(), we create one enrichment
 * per threat document ID when possible. If IDs aren't available, we create
 * a single enrichment with the first values.
 */
function buildEnrichmentsFromInlinestatsResult(
  doc: Record<string, unknown>,
  threatMapping: ThreatRuleParams['threatMapping'],
  threatIndex: string[]
): ThreatEnrichment[] {
  const enrichments: ThreatEnrichment[] = [];

  // Get matched metadata
  const matchedAtomic = doc.matched_atomic as string | undefined;
  const matchedField = doc.matched_field as string | undefined;

  // Get aggregated threat data
  const threatDocIds = normalizeToArray(doc.threat_doc_ids);
  const feedNames = normalizeToArray(doc.threat_feed_name);
  const indicatorTypes = normalizeToArray(doc.threat_indicator_type);

  // Dynamically extract threat fields from the document based on what's available
  const threatFields = extractThreatFieldsFromDoc(doc, threatMapping);

  // Determine the threat index name
  const threatIndexName = threatIndex.length === 1 ? threatIndex[0] : threatIndex.join(',');

  // Create one enrichment per threat document ID
  if (threatDocIds.length > 0) {
    threatDocIds.forEach((threatDocId, index) => {
      const indicator = buildIndicatorObjectDynamic(threatFields, index, indicatorTypes);

      enrichments.push({
        indicator,
        feed: {
          name: feedNames[index] ?? feedNames[0],
        },
        matched: {
          atomic: matchedAtomic,
          field: matchedField ?? '',
          id: String(threatDocId),
          index: threatIndexName,
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      });
    });
  } else {
    // No threat doc IDs - create a single enrichment with available data
    const indicator = buildIndicatorObjectDynamic(threatFields, 0, indicatorTypes);

    if (Object.keys(indicator).length > 0) {
      enrichments.push({
        indicator,
        feed: {
          name: feedNames[0],
        },
        matched: {
          atomic: matchedAtomic,
          field: matchedField ?? '',
          id: '',
          index: threatIndexName,
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      });
    }
  }

  return enrichments;
}

/**
 * Extracts threat fields from the document based on the threat mapping.
 * Returns a map of threat field paths to their array values.
 */
function extractThreatFieldsFromDoc(
  doc: Record<string, unknown>,
  threatMapping: ThreatRuleParams['threatMapping']
): Map<string, unknown[]> {
  const fieldMap = new Map<string, unknown[]>();

  // Extract fields from the threat mapping
  threatMapping.forEach((mapping) => {
    mapping.entries.forEach((entry) => {
      const threatField = entry.value; // e.g., "threat.indicator.ip"
      const varName = threatField.replace(/\./g, '_'); // e.g., "threat_indicator_ip"
      
      if (doc[varName] !== undefined) {
        fieldMap.set(threatField, normalizeToArray(doc[varName]));
      }
    });
  });

  return fieldMap;
}

/**
 * Builds a nested indicator object dynamically from extracted threat fields.
 */
function buildIndicatorObjectDynamic(
  threatFields: Map<string, unknown[]>,
  index: number,
  indicatorTypes: unknown[]
): Record<string, unknown> {
  const indicator: Record<string, unknown> = {};

  // Add indicator type if available
  if (indicatorTypes.length > 0) {
    indicator.type = indicatorTypes[index] ?? indicatorTypes[0];
  }

  // Build nested structure from flat threat fields
  threatFields.forEach((values, fieldPath) => {
    // Remove "threat.indicator." prefix to get the relative path
    const indicatorPrefix = 'threat.indicator.';
    if (fieldPath.startsWith(indicatorPrefix)) {
      const relativePath = fieldPath.slice(indicatorPrefix.length);
      const value = values[index] ?? values[0];
      
      if (value !== undefined) {
        setNestedValueInIndicator(indicator, relativePath, value);
      }
    }
  });

  return indicator;
}

/**
 * Sets a nested value in the indicator object using dot notation path.
 */
function setNestedValueInIndicator(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Normalizes a value to an array.
 * INLINESTATS VALUES() returns arrays, but single values might not be wrapped.
 */
function normalizeToArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

/**
 * Cleans the document for alert creation by removing INLINESTATS metadata
 * and converting flat field names to nested objects.
 */
function cleanDocumentForAlert(
  doc: Record<string, unknown>,
  threatFieldsToClean: Set<string>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc)) {
    // Skip INLINESTATS metadata fields
    if (ESQL_METADATA_FIELDS.includes(key)) {
      continue;
    }

    // Skip threat aggregation fields (they're used to build enrichments)
    if (threatFieldsToClean.has(key)) {
      continue;
    }

    // Skip fields that start with negated_ (DOES NOT MATCH aggregations)
    if (key.startsWith('negated_')) {
      continue;
    }

    // Skip threat_doc_ids
    if (key === 'threat_doc_ids') {
      continue;
    }

    // Convert flat field names to nested objects
    if (key.includes('.') && !key.startsWith('@')) {
      setNestedValue(cleaned, key, value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Sets a nested value in an object using dot notation path.
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
