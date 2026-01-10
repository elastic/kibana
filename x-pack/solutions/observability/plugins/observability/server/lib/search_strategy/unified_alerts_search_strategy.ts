/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMap, catchError } from 'rxjs';
import { of } from 'rxjs';
import type { Logger, CoreStart } from '@kbn/core/server';
import type {
  ISearchStrategy,
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '@kbn/rule-registry-plugin/common';
import { EXTERNAL_ALERTS_INDEX } from '../../../common/types/events';

// Use a unique name for the unified alerts search strategy
export const UNIFIED_ALERTS_SEARCH_STRATEGY_NAME = 'observabilityUnifiedAlertsSearchStrategy';

// The original strategy name we want to delegate to
const ORIGINAL_STRATEGY_NAME = 'privateRuleRegistryAlertsSearchStrategy';

interface StartServicesAccessor {
  getStartServices: () => Promise<
    [
      CoreStart,
      {
        data: DataPluginStart;
        alerting: AlertingServerStart;
        spaces?: SpacesPluginStart;
      }
    ]
  >;
}

/**
 * Creates a unified alerts search strategy that wraps the original
 * privateRuleRegistryAlertsSearchStrategy and also queries external alerts.
 *
 * This allows the ObservabilityAlertsTable to display both Kibana alerts
 * and external events (from Prometheus, Datadog, Sentry, etc.) in a single view.
 *
 * Note: This strategy is registered during setup but uses start services lazily
 * when the search is actually executed.
 */
export const unifiedAlertsSearchStrategyProvider = (
  dataSetup: DataPluginSetup,
  startServicesAccessor: StartServicesAccessor,
  logger: Logger,
  security?: SecurityPluginSetup
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  // Cache for the original strategy (retrieved lazily)
  let cachedOriginalStrategy: ISearchStrategy<
    RuleRegistrySearchRequest,
    RuleRegistrySearchResponse
  > | null = null;
  let startServicesPromise: Promise<
    [CoreStart, { data: DataPluginStart; alerting: AlertingServerStart; spaces?: SpacesPluginStart }]
  > | null = null;

  const getStartServices = async () => {
    if (!startServicesPromise) {
      startServicesPromise = startServicesAccessor.getStartServices();
    }
    return startServicesPromise;
  };

  const getOriginalStrategy = async () => {
    if (cachedOriginalStrategy) {
      return cachedOriginalStrategy;
    }
    const [, pluginStart] = await getStartServices();
    try {
      cachedOriginalStrategy = pluginStart.data.search.getSearchStrategy(ORIGINAL_STRATEGY_NAME);
      return cachedOriginalStrategy;
    } catch (err: any) {
      logger.error(`Failed to get original strategy ${ORIGINAL_STRATEGY_NAME}: ${err.message}`);
      return null;
    }
  };

  return {
    search: (request, options, deps) => {
      logger.info(`[UnifiedAlertsStrategy] Search called with request: ${JSON.stringify(request)}`);

      // We need to get the original strategy lazily since it may not be available during setup
      // Create an observable that first gets the strategy, then executes the search
      return of(null).pipe(
        mergeMap(async () => {
          logger.info(`[UnifiedAlertsStrategy] Getting original strategy...`);
          const originalStrategy = await getOriginalStrategy();

          if (!originalStrategy) {
            logger.error(`[UnifiedAlertsStrategy] Original strategy ${ORIGINAL_STRATEGY_NAME} not found`);
            return {
              rawResponse: {
                hits: { total: { value: 0, relation: 'eq' }, hits: [] },
              },
            } as RuleRegistrySearchResponse;
          }
          logger.info(`[UnifiedAlertsStrategy] Got original strategy, executing search...`);

          // Execute the original strategy for Kibana alerts
          // We need to convert the observable to a promise
          return new Promise<RuleRegistrySearchResponse>((resolve, reject) => {
            let lastResponse: RuleRegistrySearchResponse | null = null;
            logger.info(`[UnifiedAlertsStrategy] Subscribing to original strategy...`);
            originalStrategy.search(request, options, deps).subscribe({
              next: (response) => {
                logger.info(
                  `[UnifiedAlertsStrategy] Got response from original strategy, isRunning: ${response.isRunning}, hits: ${response.rawResponse?.hits?.hits?.length || 0}`
                );
                lastResponse = response;
                if (!response.isRunning) {
                  // Search is complete, now add external alerts
                  logger.info(`[UnifiedAlertsStrategy] Original search complete, adding external alerts...`);
                  addExternalAlerts(response, request, deps, logger)
                    .then((merged) => {
                      logger.info(`[UnifiedAlertsStrategy] External alerts added, resolving...`);
                      resolve(merged);
                    })
                    .catch((err) => {
                      logger.error(`[UnifiedAlertsStrategy] addExternalAlerts failed: ${err.message}`);
                      resolve(response);
                    }); // On error, return Kibana alerts only
                }
              },
              error: (err) => {
                logger.error(`[UnifiedAlertsStrategy] Original strategy error: ${err.message}`);
                reject(err);
              },
              complete: () => {
                logger.info(`[UnifiedAlertsStrategy] Original strategy complete`);
                if (lastResponse && lastResponse.isRunning !== false) {
                  resolve(lastResponse);
                }
              },
            });
          });
        }),
        catchError((err) => {
          logger.error(`[UnifiedAlertsStrategy] Unified alerts search failed: ${err.message}`);
          throw err;
        })
      );
    },
    cancel: async (id, options, deps) => {
      const originalStrategy = await getOriginalStrategy();
      if (originalStrategy?.cancel) {
        await originalStrategy.cancel(id, options, deps);
      }
    },
  };
};

/**
 * Adds external alerts to the Kibana alerts response
 */
async function addExternalAlerts(
  kibanaAlertsResponse: RuleRegistrySearchResponse,
  request: RuleRegistrySearchRequest,
  deps: any,
  logger: Logger
): Promise<RuleRegistrySearchResponse> {
  logger.info(`[UnifiedAlertsStrategy] addExternalAlerts called`);
  try {
    // Get ES client from deps - this is the scoped cluster client
    const esClient = deps.esClient.asCurrentUser;

    // Build the query for external alerts
    const externalQuery = buildExternalAlertsQuery(request);

    logger.info(
      `[UnifiedAlertsStrategy] Querying external alerts from ${EXTERNAL_ALERTS_INDEX} with query: ${JSON.stringify(externalQuery)}`
    );

    // Query external alerts index
    const externalResponse = await esClient.search({
      index: EXTERNAL_ALERTS_INDEX,
      ...externalQuery,
    });

    logger.info(
      `[UnifiedAlertsStrategy] External query returned ${externalResponse.hits?.hits?.length || 0} hits`
    );

    // Merge the results
    const merged = mergeAlertResponses(kibanaAlertsResponse, externalResponse, request);
    logger.info(
      `[UnifiedAlertsStrategy] Merged: ${kibanaAlertsResponse.rawResponse?.hits?.hits?.length || 0} Kibana + ${externalResponse.hits?.hits?.length || 0} external = ${merged.rawResponse?.hits?.hits?.length || 0} total`
    );
    return merged;
  } catch (error: any) {
    // If external alerts query fails (e.g., index doesn't exist), just return Kibana alerts
    if (error?.meta?.statusCode === 404) {
      logger.info(`[UnifiedAlertsStrategy] External alerts index ${EXTERNAL_ALERTS_INDEX} not found (404)`);
    } else {
      logger.error(`[UnifiedAlertsStrategy] External alerts query failed: ${error.message}`);
    }
    return kibanaAlertsResponse;
  }
}

/**
 * Builds the Elasticsearch query for external alerts based on the original request
 */
function buildExternalAlertsQuery(request: RuleRegistrySearchRequest) {
  const filter: Array<Record<string, unknown>> = [];

  // Apply any filters from the original request that are compatible with external alerts
  if (request.query?.bool?.filter) {
    const requestFilters = Array.isArray(request.query.bool.filter)
      ? request.query.bool.filter
      : [request.query.bool.filter];

    for (const f of requestFilters) {
      if (f && typeof f === 'object') {
        const filterStr = JSON.stringify(f);

        // Skip rule-specific filters that external alerts don't have
        if (
          filterStr.includes('kibana.alert.rule.rule_type_id') ||
          filterStr.includes('kibana.alert.rule.consumer') ||
          filterStr.includes('kibana.alert.rule.uuid')
        ) {
          continue;
        }

        // Convert kibana.alert.time_range to @timestamp for external alerts
        if (filterStr.includes('kibana.alert.time_range')) {
          const rangeFilter = f as { range?: { 'kibana.alert.time_range'?: Record<string, unknown> } };
          if (rangeFilter.range?.['kibana.alert.time_range']) {
            filter.push({
              range: {
                '@timestamp': rangeFilter.range['kibana.alert.time_range'],
              },
            });
            continue;
          }
        }

        filter.push(f as Record<string, unknown>);
      }
    }
  }

  const size = request.pagination?.pageSize || 50;
  const fromParam = request.pagination ? request.pagination.pageIndex * size : 0;

  // Build sort from request, converting kibana.alert.start to @timestamp
  let sort = request.sort || [{ '@timestamp': { order: 'desc' } }];
  // Convert kibana.alert.start sort to @timestamp for external alerts
  sort = sort.map((s: any) => {
    if (s['kibana.alert.start']) {
      return { '@timestamp': s['kibana.alert.start'] };
    }
    return s;
  });

  return {
    size,
    from: fromParam,
    sort,
    query: filter.length > 0 ? { bool: { filter } } : { match_all: {} },
    _source: false,
    fields: [
      { field: 'kibana.alert.*', include_unmapped: true },
      { field: '@timestamp' },
      { field: 'tags' },
      { field: '*', include_unmapped: true },
    ],
  };
}

/**
 * Merges Kibana alerts and external alerts into a single response
 */
function mergeAlertResponses(
  kibanaResponse: RuleRegistrySearchResponse,
  externalResponse: any,
  request: RuleRegistrySearchRequest
): RuleRegistrySearchResponse {
  const kibanaHits = kibanaResponse.rawResponse?.hits?.hits || [];
  const externalHits = externalResponse.hits?.hits || [];

  // Transform external hits to match Kibana alert format
  const transformedExternalHits = externalHits.map((hit: any) => ({
    _index: hit._index,
    _id: hit._id,
    fields: hit.fields || {},
  }));

  // Combine hits
  const allHits = [...kibanaHits, ...transformedExternalHits];

  // Sort combined hits by timestamp (descending)
  allHits.sort((a: any, b: any) => {
    const aTime =
      a.fields?.['@timestamp']?.[0] || a.fields?.['kibana.alert.start']?.[0] || '1970-01-01';
    const bTime =
      b.fields?.['@timestamp']?.[0] || b.fields?.['kibana.alert.start']?.[0] || '1970-01-01';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // Calculate total
  const kibanaTotal =
    typeof kibanaResponse.rawResponse?.hits?.total === 'number'
      ? kibanaResponse.rawResponse.hits.total
      : (kibanaResponse.rawResponse?.hits?.total as any)?.value || 0;
  const externalTotal =
    typeof externalResponse.hits?.total === 'number'
      ? externalResponse.hits.total
      : externalResponse.hits?.total?.value || 0;

  return {
    ...kibanaResponse,
    rawResponse: {
      ...kibanaResponse.rawResponse,
      hits: {
        ...kibanaResponse.rawResponse?.hits,
        total: {
          value: kibanaTotal + externalTotal,
          relation: 'eq',
        },
        hits: allHits,
      },
    },
  };
}
