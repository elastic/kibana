/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import pLimit from 'p-limit';
import { v4 as uuidv4 } from 'uuid';
import type {
  QueriesGetResponse,
  QueriesOccurrencesGetResponse,
  QueryLink,
  SignificantEventsQueriesGenerationResult,
  StreamQuery,
} from '@kbn/significant-events-schema';
import {
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  generatedSignificantEventQuerySchema,
  upsertStreamQueryRequestSchema,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { deriveQueryType } from '@kbn/streams-schema';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { sortQueryLinksForTable } from '../../../../lib/significant_events/utils';
import { generateKIQueries } from '../../../../lib/significant_events/ki_queries_generation_service';
import { installKIQueryGenerationAgent } from '../../../../agent_builder/agents/ki_query_generation';
import { createSignificantEventsAvailability } from '../../../../agent_builder/tools/significant_events_availability';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { queryStatusSchema, toRuleUnbackedFilter } from '../../../utils/query_status';
import { BUCKET_SIZE_PATTERN } from '../../../../lib/significant_events/helpers/fill_bucket_gaps';
import { createSignificantEventsTracedEsClient } from '../../../../lib/significant_events/create_significant_events_traced_es_client';
import {
  computeOccurrences,
  fetchQueryLinks,
  getQueryOccurrences,
  toQueryWithOccurrences,
  type QueryOccurrences,
} from '../../../../lib/significant_events/fetch_query_occurrences_from_alerts';
import { searchModeSchema } from '../../../utils/search_mode';
import { assertValidDateRange, makeIsoDateFromString } from '../../../utils/iso_date_param';
import { assertSourceEnabled } from '../../../utils/assert_source_enabled';
import {
  MAX_SOURCE_IDS_PER_REQUEST,
  filterReadableSourceIds,
  requestedOrAllSourceIds,
  sourceIdsArraySchema,
  sourceIdsQuerySchema,
} from '../../../utils/resolve_source_ids';
import { listAllSources } from '../../../utils/list_all_sources';
import type { PersistQueriesResult } from '../../../../lib/significant_events/persist_queries';
import { persistQueries } from '../../../../lib/significant_events/persist_queries';
import { queryFromLink } from '../../../../lib/knowledge_indicators/knowledge_indicator_client/serializers';
import type {
  KnowledgeIndicatorClient,
  PromoteQueriesResult,
} from '../../../../lib/knowledge_indicators';
import { cleanupStaleEvents } from '../../../../lib/significant_events/events/cleanup_stale_events';
import { QueryNotFoundError } from '../../../../lib/errors/query_not_found_error';
import { validateEsqlQueryForSourceOrThrow } from '../../../../lib/significant_events/validate_esql_query';

const RECONCILE_SOURCE_CONCURRENCY = 3;
// Manual repair endpoint: keep each request small so operators batch large migrations explicitly.
const RECONCILE_MAX_SOURCES = 10;

const dateFromString = makeIsoDateFromString('ISO 8601 datetime');

const baseRequestParamsSchema = z.object({
  from: dateFromString.describe('Start of the time range'),
  to: dateFromString.describe('End of the time range'),
  bucketSize: z
    .string()
    .max(MAX_ID_LENGTH)
    .regex(BUCKET_SIZE_PATTERN)
    .describe('Size of time buckets for aggregation'),
  query: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Query string to filter significant events queries'),
  sourceIds: sourceIdsQuerySchema(MAX_SOURCE_IDS_PER_REQUEST).describe(
    'Source ids to filter queries'
  ),
});

const requestParamsSchema = baseRequestParamsSchema.extend({
  searchMode: searchModeSchema,
});

/**
 * Promotes unbacked queries to rule-backed status. Ineligible queries are
 * skipped and counted by reason: `skipped_stats` for STATS (unbacked until
 * #265778) and `skipped_ineligible` for MATCH that is not filter-only. The two
 * are reported separately so the UI can tell the user which one they hit.
 */
const promoteUnbackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_promote',
  options: {
    access: 'internal',
    summary: 'Promote unbacked queries',
    description:
      'Creates Kibana rules for stored queries across sources that do not yet have a backing rule, then marks them as backed.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        queryIds: z.array(z.string().max(MAX_ID_LENGTH)).optional(),
        minSeverityScore: z.number().int().min(0).max(100).optional(),
      })
      .nullish(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<PromoteQueriesResult> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    // A disabled source's rules must stay off, so its queries wait until the source is enabled.
    const sourceIds = (await listAllSources(sourcesClient, { enabled: true })).map(({ id }) => id);

    return kiClient.promoteUnbackedQueries({
      queryIds: params?.body?.queryIds,
      minSeverityScore: params?.body?.minSeverityScore,
      sourceIds,
    });
  },
});

const demoteBackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_demote',
  options: {
    access: 'internal',
    summary: 'Demote backed queries',
    description:
      'Removes Kibana rules for the provided stored significant-events queries and marks them as unbacked.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      queryIds: z.array(z.string().max(MAX_ID_LENGTH)).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
    logger,
  }): Promise<{ demoted: number }> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    // Only rule-backed queries can be demoted; unbacked queries have no rule to remove.
    const catalogSourceIds = await requestedOrAllSourceIds(undefined, sourcesClient);
    const toDemote = await kiClient.getQueryLinks(catalogSourceIds, {
      ruleUnbacked: 'exclude',
      queryIds: params.body.queryIds,
      includeExpired: true,
    });

    const bySource = toDemote.reduce<Record<string, string[]>>((acc, link) => {
      const sourceId = link.source_id;

      if (!acc[sourceId]) {
        acc[sourceId] = [];
      }

      acc[sourceId].push(link.query.id);
      return acc;
    }, {});

    const catalogIds = new Set(catalogSourceIds);

    let demoted = 0;

    for (const [sourceId, queryIds] of Object.entries(bySource)) {
      if (!catalogIds.has(sourceId)) {
        logger.warn(`Skipping demotion for missing source ${sourceId}`);
        continue;
      }
      const result = await kiClient.demoteQueries(sourceId, queryIds);
      demoted += result.demoted;
    }

    return { demoted };
  },
});

const bulkDeleteQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_bulk_delete',
  options: {
    access: 'internal',
    summary: 'Bulk delete queries across sources',
    description:
      'Hard-deletes stored significant-events queries across multiple sources in a single request. Removes backing Kibana rules for any backed queries.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      queryIds: z.array(z.string().max(MAX_ID_LENGTH)).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ succeeded: number; failed: number; skipped: number }> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    // Intentionally not guarded by assertNotPaused: bulk delete is teardown
    // (removes queries/rules), which stays allowed while paused — same as
    // disabling scheduled discovery / continuous onboarding.

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    // Bulk delete must cover both backed and unbacked queries; the default 'exclude'
    // filter would skip unbacked (draft) ones. includeExpired: explicit-id action, so
    // an expired query must stay reachable.
    const queryLinks = await getQueryLinksAcrossSources({
      kiClient,
      sourcesClient,
      filters: {
        queryIds: params.body.queryIds,
        ruleUnbacked: 'include',
        includeExpired: true,
      },
    });

    // Count requested IDs that getQueryLinks did not find — these are idempotent
    // no-ops (already gone / never existed) and reported as `skipped`, not failed.
    const foundIds = new Set(queryLinks.map((link) => link.query.id));
    const skipped = params.body.queryIds.filter((id) => !foundIds.has(id)).length;

    // Capture backed rule IDs per source to log on mid-flight failure.
    const bySource = new Map<string, { queryIds: string[]; backedRuleIds: string[] }>();
    for (const link of queryLinks) {
      const bucket = bySource.get(link.source_id) ?? { queryIds: [], backedRuleIds: [] };
      bucket.queryIds.push(link.query.id);
      if (link.rule_backed && link.rule_id) {
        bucket.backedRuleIds.push(link.rule_id);
      }
      bySource.set(link.source_id, bucket);
    }

    // Fetch only the sources we actually need. Rejections (the saved object is
    // gone) fail that source's batch.
    const sourceIds = Array.from(bySource.keys());
    const sourceResults = await Promise.allSettled(
      sourceIds.map((sourceId) => sourcesClient.get(sourceId))
    );
    const presentSourceIds = new Set<string>();
    sourceResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        presentSourceIds.add(sourceIds[i]);
      }
    });

    // deleteQueries uninstalls rules before writing storage, so a mid-flight
    // throw can leave rules gone while stored links still reference them. Log
    // the backed rule IDs on failure so ops can reconcile manually.
    const sigEventsLogger = logger.get('significantEvents');

    let succeeded = 0;
    let failed = 0;
    const candidateRuleIds = new Set<string>();

    for (const [sourceId, { queryIds, backedRuleIds }] of bySource) {
      if (!presentSourceIds.has(sourceId)) {
        logger.warn(`Skipping bulk delete for missing source ${sourceId}`);
        failed += queryIds.length;
        continue;
      }
      try {
        await kiClient.deleteQueries(sourceId, queryIds);
        backedRuleIds.forEach((ruleId) => candidateRuleIds.add(ruleId));
        succeeded += queryIds.length;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const orphanContext =
          backedRuleIds.length > 0 ? ` candidateOrphanedRuleIds=[${backedRuleIds.join(',')}]` : '';
        sigEventsLogger.error(
          `Bulk delete failed for source ${sourceId}: ${errorMessage}. ` +
            `queryIds=[${queryIds.join(',')}]${orphanContext}`
        );
        failed += queryIds.length;
      }
    }

    if (candidateRuleIds.size > 0) {
      try {
        const { rulesClient } = await scopedClients.getSignificantEventsAlertingContext();
        await cleanupStaleEvents({
          eventSearchClient: await scopedClients.getEventSearchClient(),
          rulesClient,
          candidateRuleIds: [...candidateRuleIds],
          alertEventsClient: await scopedClients.getAlertEventsClient(),
          emitTrigger: scopedClients.emitTrigger,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sigEventsLogger.error(
          `Failed to clean up significant events after bulk query deletion: ${errorMessage}`
        );
      }
    }

    return { succeeded, failed, skipped };
  },
});

const reconcileQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_reconcile',
  options: {
    access: 'internal',
    summary: 'Reconcile rule-backed queries',
    description:
      'Re-syncs stored rule-backed queries through the current rule scheduling policy in the current space.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      sourceIds: sourceIdsArraySchema({ min: 1, max: RECONCILE_MAX_SOURCES }),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
    logger,
  }): Promise<{
    reconciled: number;
    failed: number;
    sources: Array<{
      sourceId: string;
      status: 'reconciled' | 'failed';
      queries: number;
      error?: string;
    }>;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const { sourceIds } = params.body;
    const sourceResults = await Promise.allSettled(
      sourceIds.map((sourceId) => sourcesClient.get(sourceId))
    );
    const limiter = pLimit(RECONCILE_SOURCE_CONCURRENCY);

    const sources = await Promise.all(
      sourceResults.map((result, index) =>
        limiter(async () => {
          if (result.status === 'rejected') {
            const sourceId = sourceIds[index];
            const error =
              result.reason instanceof Error ? result.reason.message : String(result.reason);
            logger.warn(`Skipping query reconciliation for missing source ${sourceId}: ${error}`);
            return { sourceId, status: 'failed' as const, queries: 0, error };
          }

          const sourceId = result.value.source.id;
          let reconciledQueries = 0;
          try {
            assertSourceEnabled(result.value.source);
            await kiClient.replaceSourceQueries(sourceId, (currentLinks) => {
              reconciledQueries = currentLinks.filter((link) => link.rule_backed).length;
              return currentLinks.map(queryFromLink);
            });
            return {
              sourceId,
              status: 'reconciled' as const,
              queries: reconciledQueries,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`Query reconciliation failed for source ${sourceId}: ${errorMessage}`);
            return {
              sourceId,
              status: 'failed' as const,
              queries: reconciledQueries,
              error: errorMessage,
            };
          }
        })
      )
    );

    return {
      reconciled: sources.filter((source) => source.status === 'reconciled').length,
      failed: sources.filter((source) => source.status === 'failed').length,
      sources,
    };
  },
});

const getDiscoveryQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries',
  params: z.object({
    query: requestParamsSchema.extend({
      page: z.coerce.number().int().min(1).optional().describe('Page number (1-based)'),
      perPage: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of items per page'),
      status: queryStatusSchema,
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read paginated significant-event queries for the discovery table',
    description: 'Returns significant-event queries as table rows, with server-side pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
  }): Promise<QueriesGetResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const {
      from,
      to,
      bucketSize,
      query,
      sourceIds: requestedSourceIds,
      page = 1,
      perPage = 10,
      status,
      searchMode,
    } = params.query;
    assertValidDateRange(from, to);

    // The readers below run as the internal user, so keep only the sources the caller can read.
    const sourceIds = await filterReadableSourceIds(
      await requestedOrAllSourceIds(requestedSourceIds, scopedClients.sourcesClient),
      scopedClients.sourcesClient
    );

    const [kiClient, { alertsReader }] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getSignificantEventsAlertingContext(),
    ]);
    const queryLinks = await fetchQueryLinks(
      {
        sourceIds,
        query,
        filters: { ruleUnbacked: toRuleUnbackedFilter(status) },
        searchMode,
      },
      kiClient
    );

    // Paginate links first, then fetch occurrences for the page's rules only —
    // not the full (up to 10k) set.
    const total = queryLinks.length;
    const start = (page - 1) * perPage;
    const pageLinks =
      start >= total ? [] : sortQueryLinksForTable(queryLinks).slice(start, start + perPage);
    const pageRuleIds = [...new Set(pageLinks.map((link) => link.rule_id))];
    const spaceId = await getSpaceId(request);
    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });

    const occurrences = await computeOccurrences(
      { ruleIds: pageRuleIds, from, to, bucketSize, spaceId, alertsReader },
      { esClient }
    );
    const queryOccurrences: QueryOccurrences = { queryLinks: pageLinks, ...occurrences };
    const queriesPage = pageLinks.map((queryLink) =>
      toQueryWithOccurrences({ queryLink, queryOccurrences })
    );

    return { queries: queriesPage, page, perPage, total };
  },
});

// baseRequestParamsSchema (no searchMode): the histogram is an aggregate,
// always default-ranked, not a list of individual queries.
const getDiscoveryQueriesOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries/_occurrences',
  params: z.object({
    query: baseRequestParamsSchema,
  }),
  options: {
    access: 'internal',
    summary: 'Read aggregated occurrences for the discovery histogram',
    description:
      'Returns the aggregated occurrences histogram series for the chart above the queries table.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
  }): Promise<QueriesOccurrencesGetResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const { from, to, bucketSize, query, sourceIds: requestedSourceIds } = params.query;
    assertValidDateRange(from, to);

    // The readers below run as the internal user, so keep only the sources the caller can read.
    const sourceIds = await filterReadableSourceIds(
      await requestedOrAllSourceIds(requestedSourceIds, scopedClients.sourcesClient),
      scopedClients.sourcesClient
    );

    const [kiClient, { alertsReader }] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getSignificantEventsAlertingContext(),
    ]);
    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });
    const { aggregatedOccurrences: aggregatedOccurrenceBuckets } = await getQueryOccurrences(
      {
        from,
        to,
        bucketSize,
        query,
        sourceIds,
        alertsReader,
        spaceId: await getSpaceId(request),
      },
      { kiClient, esClient }
    );

    const occurrencesHistogram = aggregatedOccurrenceBuckets.map((bucket) => ({
      x: bucket.date,
      y: bucket.count,
    }));

    const totalOccurrences = aggregatedOccurrenceBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );

    return { occurrences_histogram: occurrencesHistogram, total_occurrences: totalOccurrences };
  },
});

const generateQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{sourceId}/queries/_generate',
  params: z.object({
    path: z.object({
      sourceId: z.string().max(MAX_ID_LENGTH).describe('The source id'),
    }),
    body: z
      .object({
        connectorId: z
          .string()
          .max(MAX_ID_LENGTH)
          .optional()
          .describe(
            'Optional chat model connector or inference endpoint ID. When omitted the Significant Events default is used.'
          ),
        runId: z.string().trim().min(1).max(MAX_ID_LENGTH).optional(),
      })
      .nullish(),
  }),
  options: {
    access: 'internal',
    summary: 'Generate significant events queries',
    description: 'Runs a single iteration of KI queries generation for the given source.',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
    logger,
    telemetry,
  }): Promise<SignificantEventsQueriesGenerationResult & { connectorId: string }> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { sourceId } = params.path;
    const { connectorId, runId } = params.body ?? {};
    const resolvedRunId = runId?.trim() || uuidv4();

    if (!server.agentBuilder) {
      throw new Error('Agent Builder is required to generate significant events queries');
    }

    // Startup installs the agent in the default space only, and onboarding runs in the space of
    // the request. Without this every generation outside the default space fails on a missing agent.
    await installKIQueryGenerationAgent({
      agentBuilder: server.agentBuilder,
      spaceId: request.spaceId,
      availability: createSignificantEventsAvailability({ server, logger }),
    });

    const [{ source }, kiClient] = await Promise.all([
      sourcesClient.get(sourceId),
      scopedClients.getKnowledgeIndicatorClient(),
    ]);

    const result = await generateKIQueries(
      {
        source,
        connectorId,
        runId: resolvedRunId,
      },
      {
        kiClient,
        agentBuilder: server.agentBuilder,
        resolveModel: (requestedId) =>
          resolveNightshiftModelForRequest({
            request,
            inference: server.inference,
            savedObjects: server.core.savedObjects,
            uiSettings: server.core.uiSettings,
            step: 'kiQueryGeneration',
            requestedId,
          }),
        request,
        logger: logger.get('significant_events_queries_generation'),
        signal: getRequestAbortSignal(request),
        telemetry,
      }
    );

    return {
      queries: result.queries,
      tokensUsed: result.tokensUsed,
      connectorId: result.connectorId,
    };
  },
});

const persistQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{sourceId}/queries/_persist',
  params: z.object({
    path: z.object({
      sourceId: z.string().max(MAX_ID_LENGTH).describe('The source id'),
    }),
    body: z.object({
      queries: z.array(generatedSignificantEventQuerySchema),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Persist generated queries with deduplication',
    description:
      'Persists generated significant event queries for a source, deduplicating by ES|QL and handling rule-backed replacements.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<PersistQueriesResult> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { sourceId } = params.path;
    const { queries } = params.body;
    const [{ source }, kiClient] = await Promise.all([
      sourcesClient.get(sourceId),
      scopedClients.getKnowledgeIndicatorClient(),
    ]);

    assertSourceEnabled(source);

    return persistQueries(source.id, queries, {
      kiClient,
      viewName: source.view_name,
    });
  },
});

const upsertQueryRoute = createServerRoute({
  endpoint: 'PUT /internal/significant_events/queries/{queryId}',
  options: {
    access: 'internal',
    summary: 'Upsert a significant-events query',
    description:
      'Creates or updates a stored significant-events query. When `source_id` is omitted, the source is resolved from the existing query link.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      queryId: z.string().max(MAX_ID_LENGTH).describe('The identifier of the query.'),
    }),
    body: lazySchema(() =>
      upsertStreamQueryRequestSchema.extend({
        source_id: z
          .string()
          .min(1)
          .max(MAX_ID_LENGTH)
          .optional()
          .describe(
            'Source id the query belongs to. Required when creating a query; omitted on update to keep the existing source.'
          ),
      })
    ),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<{ acknowledged: boolean }> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;
    const {
      path: { queryId },
      body: { source_id: requestedSourceId, ...queryBody },
    } = params;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const existingLink = await findExistingQueryLink({
      kiClient,
      sourcesClient,
      queryId,
      preferredSourceId: requestedSourceId,
    });
    const sourceId = requestedSourceId ?? existingLink?.source_id;
    if (!sourceId) {
      throw new QueryNotFoundError(`Query [${queryId}] not found`);
    }
    // `upsertQuery` only looks at the given source's links, so without this check an id that
    // belongs to another source would be installed as a second query (and rule) under this one.
    if (existingLink && existingLink.source_id !== sourceId) {
      throw new QueryNotFoundError(`Query [${queryId}] does not belong to source [${sourceId}]`);
    }
    const { source } = await sourcesClient.get(sourceId);
    // Any upsert can install a rule: a new query gets one, and an edit that changes the ES|QL
    // replaces the old one with an enabled rule.
    assertSourceEnabled(source);

    validateEsqlQueryForSourceOrThrow({
      esqlQuery: queryBody.esql.query,
      viewName: source.view_name,
    });

    const query: StreamQuery = {
      ...queryBody,
      id: queryId,
      type: deriveQueryType(queryBody.esql.query),
    };
    await kiClient.upsertQuery(source.id, query);

    return { acknowledged: true };
  },
});

/**
 * `getQueryLinks` returns nothing for an empty source list, so a lookup by query id alone has
 * to name every source of the space. Disabled sources stay in the list: their queries remain
 * reachable for edit, demote and delete.
 */
async function getQueryLinksAcrossSources({
  kiClient,
  sourcesClient,
  filters,
}: {
  kiClient: KnowledgeIndicatorClient;
  sourcesClient: SourcesClient;
  filters: Parameters<KnowledgeIndicatorClient['getQueryLinks']>[1];
}): Promise<QueryLink[]> {
  const sourceIds = await requestedOrAllSourceIds(undefined, sourcesClient);
  return kiClient.getQueryLinks(sourceIds, filters);
}

async function findExistingQueryLink({
  kiClient,
  sourcesClient,
  queryId,
  preferredSourceId,
}: {
  kiClient: KnowledgeIndicatorClient;
  sourcesClient: SourcesClient;
  queryId: string;
  /** The source the caller asked for; its link wins when the id exists on several sources. */
  preferredSourceId?: string;
}): Promise<QueryLink | undefined> {
  // Include expired and unbacked so an existing query is found whatever its state.
  const links = await getQueryLinksAcrossSources({
    kiClient,
    sourcesClient,
    filters: { queryIds: [queryId], ruleUnbacked: 'include', includeExpired: true },
  });
  // The reader returns links in no useful order, so the first hit may belong to another source
  // than the one being edited. Falling back to it keeps the cross-source guard in the handler.
  return links.find((link) => link.source_id === preferredSourceId) ?? links[0];
}

export const internalKIQueriesRoutes = {
  ...promoteUnbackedQueriesRoute,
  ...demoteBackedQueriesRoute,
  ...bulkDeleteQueriesRoute,
  ...reconcileQueriesRoute,
  ...getDiscoveryQueriesRoute,
  ...getDiscoveryQueriesOccurrencesRoute,
  ...generateQueriesRoute,
  ...persistQueriesRoute,
  ...upsertQueryRoute,
};
