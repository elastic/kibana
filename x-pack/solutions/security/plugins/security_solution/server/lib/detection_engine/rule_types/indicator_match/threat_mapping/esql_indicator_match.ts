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
import type { SearchAfterAndBulkCreateReturnType, SignalSource, SecuritySharedParams, SecurityRuleServices } from '../../types';
import type { ThreatRuleParams } from '../../../rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import {
  buildEsqlIndicatorMatchQuery,
  validateThreatMappingForEsql,
} from './build_esql_indicator_match_query';
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

export interface EsqlIndicatorMatchOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: SecurityRuleServices;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
}

/**
 * Executes an indicator match rule using ES|QL LOOKUP JOIN.
 * 
 * This is an alternative execution path that leverages ES|QL's LOOKUP JOIN
 * capability to perform threat intelligence matching more efficiently.
 * 
 * Flow:
 * 1. Convert the user's KQL query to a DSL filter
 * 2. Build an ES|QL query with LOOKUP JOIN for threat matching
 * 3. Execute the ES|QL query
 * 4. Process results and build threat enrichments
 * 5. Create alerts with enrichment data
 */
export const esqlIndicatorMatchExecutor = async ({
  sharedParams,
  services,
  licensing,
  scheduleNotificationResponseActionsService,
}: EsqlIndicatorMatchOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
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

  return withSecuritySpan('esqlIndicatorMatchExecutor', async () => {
    const result = createSearchAfterReturnType();

    ruleExecutionLogger.debug('Starting ES|QL-based indicator match execution');

    // Validate threat mapping for ES|QL compatibility
    const validationErrors = validateThreatMappingForEsql(threatMapping);
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

      // Step 2: Build the ES|QL indicator match query
      const esqlQuery = buildEsqlIndicatorMatchQuery({
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
        `Built ES|QL query with ${esqlQuery.mappingCount} threat mapping(s), hasMultipleMappings: ${esqlQuery.hasMultipleMappings}`
      );
      ruleExecutionLogger.debug(`ES|QL query:\n${esqlQuery.query}`);
      ruleExecutionLogger.debug(`Threat mapping: ${JSON.stringify(threatMapping)}`);

      // Check for unprocessed exceptions warning
      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      // Step 3: Execute the ES|QL query
      const esqlSearchStart = performance.now();

      // Build the time range filter for the ES|QL request
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
        `ES|QL query returned ${response.values.length} results in ${esqlSearchDuration}ms`
      );
      ruleExecutionLogger.debug(`ES|QL columns: ${JSON.stringify(response.columns.map(c => c.name))}`);

      // Step 4: Process results and build enriched signals
      const documents = response.values.map((row) => rowToDocument(response.columns, row));
      
      // Debug: Log first few documents to see what was matched
      if (documents.length > 0) {
        ruleExecutionLogger.debug(`First document keys: ${JSON.stringify(Object.keys(documents[0]))}`);
        ruleExecutionLogger.debug(`First document _id: ${documents[0]._id}, _index: ${documents[0]._index}`);
        ruleExecutionLogger.debug(`First document source.ip: ${documents[0]['source.ip']}, file.hash.sha256: ${documents[0]['file.hash.sha256']}`);
        ruleExecutionLogger.debug(`First document threat.indicator.ip: ${documents[0]['threat.indicator.ip']}`);
        ruleExecutionLogger.debug(`First document threat.indicator.file.hash.sha256: ${documents[0]['threat.indicator.file.hash.sha256']}`);
        if (documents[0]['_fork']) {
          ruleExecutionLogger.debug(`First document _fork: ${documents[0]['_fork']}`);
        }
      }

      if (documents.length === 0) {
        ruleExecutionLogger.debug('No matching documents found');
        return result;
      }

      // Convert documents to SearchHit format with enrichments
      const enrichedHits = processEsqlResultsToHits({
        documents,
        threatMapping,
        threatIndicatorPath,
      });

      ruleExecutionLogger.debug(`Processed ${enrichedHits.length} enriched signals`);

      // DEBUG: Test reason message directly
      if (enrichedHits.length > 0) {
        const firstHit = enrichedHits[0];
        // eslint-disable-next-line no-console
        console.log('DEBUG firstHit._source.source:', JSON.stringify((firstHit._source as any)?.source));
        // eslint-disable-next-line no-console
        console.log('DEBUG firstHit._source.destination:', JSON.stringify((firstHit._source as any)?.destination));

        // Test reason message
        const testReason = buildReasonMessageForThreatMatchAlert({
          name: 'test',
          severity: 'low',
          mergedDoc: firstHit,
        });
        // eslint-disable-next-line no-console
        console.log('DEBUG testReason:', testReason);
      }

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
        `ES|QL indicator match completed: ${result.createdSignalsCount} signals created`
      );
    } catch (error) {
      ruleExecutionLogger.error(`ES|QL indicator match execution failed: ${error.message}`);
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
    // If we can't build the filter, return undefined and let the ES|QL query handle it
    return undefined;
  }
}

/**
 * Fields that should be stripped from the document because they come from the
 * threat index via LOOKUP JOIN and should only appear in threat.enrichments
 */
const THREAT_FIELD_PREFIXES = [
  'threat.indicator.',
  'threat.feed.',
  'threat.enrichments.matched.',
  'threat.enrichments.mapping_index',
];

/**
 * ES|QL-specific fields that should be removed from the alert
 */
const ESQL_METADATA_FIELDS = ['_fork', 'last_seen', 'first_seen'];

/**
 * Processes ES|QL results into SearchHit format with threat enrichments.
 * This format is compatible with wrapHits for alert creation.
 * 
 * Key transformations:
 * 1. Build proper threat.enrichments with nested indicator object
 * 2. Strip out flat threat indicator fields from root (they pollute the alert)
 * 3. Remove ES|QL-specific metadata fields
 */
function processEsqlResultsToHits({
  documents,
  threatMapping,
  threatIndicatorPath,
}: {
  documents: Array<Record<string, unknown>>;
  threatMapping: ThreatRuleParams['threatMapping'];
  threatIndicatorPath: string;
}): Array<estypes.SearchHit<SignalSource>> {
  return documents.map((doc) => {
    // Build the indicator object from flat ES|QL fields
    const indicatorObject = buildNestedObjectFromFlatFields(doc, threatIndicatorPath);
    
    // Get feed name
    const feedName = doc['threat.feed.name'] as string | undefined;

    // Extract the enrichment data
    const enrichments = buildEnrichmentsFromEsqlResult(
      doc,
      threatMapping,
      indicatorObject,
      feedName
    );

    // Clean the document: remove threat indicator fields and ES|QL metadata
    // This also converts flat ES|QL field names to nested objects
    const cleanedDoc = cleanDocumentForAlert(doc);

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

    // DEBUG: Log final hit structure
    // eslint-disable-next-line no-console
    console.log('DEBUG hit._source.source:', JSON.stringify((hit._source as any)?.source));
    // eslint-disable-next-line no-console
    console.log('DEBUG hit has fields?:', 'fields' in hit);

    return hit;
  });
}

/**
 * Builds a nested object from flat ES|QL field names.
 * For example, converts { "threat.indicator.ip": "1.2.3.4" } to { ip: "1.2.3.4" }
 * when called with prefix "threat.indicator"
 */
function buildNestedObjectFromFlatFields(
  doc: Record<string, unknown>,
  prefix: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const prefixWithDot = prefix + '.';

  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith(prefixWithDot)) {
      // Remove the prefix to get the relative path
      const relativePath = key.slice(prefixWithDot.length);
      setNestedValue(result, relativePath, value);
    }
  }

  return result;
}

/**
 * Sets a nested value in an object using dot notation path.
 * For example, setNestedValue(obj, "file.hash.sha256", "abc") creates
 * { file: { hash: { sha256: "abc" } } }
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

/**
 * Removes threat indicator fields and ES|QL metadata from the document,
 * and converts flat ES|QL field names to nested objects.
 * 
 * ES|QL returns flat field names like "source.port" but Kibana's reason
 * message builder expects nested objects like { source: { port: ... } }.
 * This function handles both the cleanup and the conversion.
 */
function cleanDocumentForAlert(doc: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc)) {
    // Skip ES|QL metadata fields
    if (ESQL_METADATA_FIELDS.includes(key)) {
      continue;
    }

    // Skip threat indicator and feed fields (they belong in enrichments)
    if (THREAT_FIELD_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue;
    }

    // Convert flat field names to nested objects
    // e.g., "source.port" -> { source: { port: ... } }
    if (key.includes('.') && !key.startsWith('@')) {
      setNestedValue(cleaned, key, value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Builds threat enrichments from ES|QL result document.
 * 
 * This creates the same enrichment structure as the regular indicator match rule:
 * - indicator: the full indicator object from threatIndicatorPath
 * - feed: contains feed.name if available
 * - matched: atomic (event field value), field, id, index, type
 * 
 * Note: LOOKUP JOIN doesn't provide the threat document's _id and _index,
 * so those fields will be empty in the ES|QL-based enrichment.
 */
function buildEnrichmentsFromEsqlResult(
  doc: Record<string, unknown>,
  threatMapping: ThreatRuleParams['threatMapping'],
  indicatorObject: Record<string, unknown>,
  feedName: string | undefined
): ThreatEnrichment[] {
  const enrichments: ThreatEnrichment[] = [];

  // Check if there's any indicator data (indicating a match occurred)
  const hasIndicatorData = Object.keys(indicatorObject).length > 0;
  if (!hasIndicatorData) {
    return enrichments;
  }

  // Build feed object
  const feed: { name?: string } = {};
  if (feedName) {
    feed.name = feedName;
  }

  // Build enrichments from each threat mapping entry
  // This matches the structure created by the regular indicator match rule
  threatMapping.forEach((mapping) => {
    const entries = mapping.entries.filter((entry) => entry.negate !== true);
    
    // Deduplicate entries (same as regular indicator match)
    const dedupedEntries = entries.reduce<typeof entries>((accum, entry) => {
      if (!accum.some((e) => e.field === entry.field && e.value === entry.value)) {
        accum.push(entry);
      }
      return accum;
    }, []);

    dedupedEntries.forEach((entry) => {
      const threatFieldValue = getFieldValue(doc, entry.value);
      const eventFieldValue = getFieldValue(doc, entry.field);

      // Only create enrichment if the threat field has a value (indicating a match)
      if (threatFieldValue !== undefined) {
        enrichments.push({
          indicator: indicatorObject,
          feed,
          matched: {
            // atomic is the value from the EVENT document's matched field
            // This matches enrichSignalWithThreatMatches: get(signalHit._source, enrichment.matched.field)
            atomic: eventFieldValue !== undefined ? String(eventFieldValue) : undefined,
            field: entry.field,
            // Note: LOOKUP JOIN doesn't provide threat document _id/_index
            // In production, these would need to be fetched separately if required
            id: '',
            index: '',
            type: ENRICHMENT_TYPES.IndicatorMatchRule,
          },
        });
      }
    });
  });

  return enrichments;
}

/**
 * Gets a value from an object, handling both flat keys and nested paths.
 * ES|QL returns flat field names like "threat.indicator.ip" as literal keys,
 * so we first try direct key access, then fall back to nested path access.
 */
function getFieldValue(obj: Record<string, unknown>, path: string): unknown {
  // First try direct key access (ES|QL returns flat field names)
  if (path in obj) {
    return obj[path];
  }

  // Fall back to nested path access
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
