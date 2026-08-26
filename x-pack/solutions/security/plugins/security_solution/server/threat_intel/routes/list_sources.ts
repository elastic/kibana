/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  CREATE_SOURCE_API_PATH,
  LIST_SOURCES_API_PATH,
  MAX_URL_LENGTH,
  SOURCE_BY_ID_API_PATH,
  SOURCE_TYPES,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intel';
import {
  buildSpaceFilterTerms,
  canMutateSourceInSpace,
  resolveCurrentSpaceId,
} from '../lib/space_filter';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../lib/es_options';
import { redactUrl } from '../adapters/http_client';
import { BUILTIN_VENDOR_HANDLERS } from '../adapters/vendor_api/builtin_vendors';
import { THREAT_INTEL_READ_AUTHZ, THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import { rejectUntilBootstrapped } from './lib/bootstrap_ready';
import type { RouteRegistrationDeps } from '.';

const listBodySchema = schema.object({
  size: schema.maybe(schema.number({ min: 1, max: 500 })),
  time_range: schema.maybe(
    schema.object({
      from: schema.string({ maxLength: 64 }),
      to: schema.string({ maxLength: 64 }),
    })
  ),
});

interface ThreatIntelSourceDoc {
  name?: string;
  adapter_type?: string;
  enabled?: boolean;
  config?: { url?: unknown };
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  space_id?: string;
}

export interface ListSourcesItem {
  source_id: string;
  name?: string;
  adapter_type?: string;
  enabled?: boolean;
  url?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  space_id?: string;
  /** Count of threat reports attributed to this source name. */
  report_count: number;
  /** Latest `lineage.ingested_at` across reports for this source. */
  last_ingested_at?: string;
  /** Sum of `attribution.environment_hits_total` across reports for this source. */
  env_hits_total: number;
}

interface SourceReportStats {
  report_count: number;
  last_ingested_at?: string;
  env_hits_total: number;
}

const mapSourceHit = (hit: {
  _id?: string;
  _source?: ThreatIntelSourceDoc;
}): Omit<ListSourcesItem, 'report_count' | 'last_ingested_at' | 'env_hits_total'> => {
  const source = hit._source ?? {};
  // Redacted for display. Feed URLs can embed `user:password@`, and this route is
  // gated on Security Read and lists global sources in every space, so returning
  // the raw value handed feed credentials to anyone who could read the catalog.
  // The stored document keeps the real URL for the adapter to fetch with.
  const configUrl =
    typeof source.config?.url === 'string' ? redactUrl(source.config.url) : undefined;
  return {
    source_id: hit._id ?? '',
    name: source.name,
    adapter_type: source.adapter_type,
    enabled: source.enabled,
    ...(typeof configUrl === 'string' ? { url: configUrl } : {}),
    tags: source.tags,
    created_at: source.created_at,
    updated_at: source.updated_at,
    space_id: source.space_id,
  };
};

const emptyStats = (): SourceReportStats => ({
  report_count: 0,
  env_hits_total: 0,
});

const loadSourceForMutation = async ({
  esClient,
  sourceId,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  sourceId: string;
  spaceId: string;
}): Promise<
  { allowed: true; space_id?: string; existing?: ThreatIntelSourceDoc } | { allowed: false }
> => {
  try {
    const hit = await esClient.get<ThreatIntelSourceDoc>({
      index: THREAT_INTEL_SOURCES_INDEX,
      id: sourceId,
    });
    const sourceSpaceId = hit._source?.space_id;
    if (!canMutateSourceInSpace(sourceSpaceId, spaceId)) {
      // Deliberately not distinguished from "absent". Sources live in one shared
      // index, so a 403 here told the caller that a source with this id exists in
      // some other space, which is an existence oracle across a boundary the rest
      // of the feature treats as a security boundary.
      return { allowed: false };
    }
    return { allowed: true, space_id: sourceSpaceId, existing: hit._source };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404) {
      return { allowed: false };
    }
    throw err;
  }
};

/**
 * The `source.adapter_id` an adapter stamps on the reports it produces.
 * Adapters build it as `<adapter type>:<source doc id>`, which is stable and
 * unique per catalog row — unlike the display name, which is mutable and which
 * the create API allows to be duplicated (including between a space-private
 * source and a global one).
 */
const adapterIdForSource = (adapterType: string | undefined, sourceId: string): string =>
  `${adapterType ?? ''}:${sourceId}`;

/**
 * Aggregate report activity per `source.adapter_id` for list_sources enrichment.
 */
export const loadSourceReportStatsByAdapterId = async ({
  esClient,
  spaceId,
  logger,
  timeRange,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  timeRange?: { from: string; to: string };
}): Promise<Map<string, SourceReportStats>> => {
  const statsByAdapterId = new Map<string, SourceReportStats>();

  try {
    const filters: Record<string, unknown>[] = [buildSpaceFilterTerms(spaceId)];
    if (timeRange?.from || timeRange?.to) {
      filters.push({
        range: {
          '@timestamp': {
            ...(timeRange.from ? { gte: timeRange.from } : {}),
            ...(timeRange.to ? { lte: timeRange.to } : {}),
          },
        },
      });
    }

    const response = await esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      // Reports live in a hidden index, which a wildcard skips by default.
      ...HIDDEN_INDEX_SEARCH_OPTIONS,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        by_adapter_id: {
          terms: {
            field: 'source.adapter_id',
            size: MAX_STATS_BUCKETS,
          },
          aggs: {
            last_ingested: {
              max: { field: 'lineage.ingested_at' },
            },
            env_hits: {
              sum: { field: 'attribution.environment_hits_total' },
            },
          },
        },
      },
    });

    const buckets =
      (
        response.aggregations?.by_adapter_id as
          | {
              buckets?: Array<{
                key: string | number;
                doc_count: number;
                last_ingested?: { value?: number | null; value_as_string?: string };
                env_hits?: { value?: number | null };
              }>;
            }
          | undefined
      )?.buckets ?? [];

    // A silent truncation here reads as "these sources have no activity", which is
    // indistinguishable from a source that genuinely produced nothing.
    if (buckets.length >= MAX_STATS_BUCKETS) {
      logger.warn(
        `Source activity aggregation hit the ${MAX_STATS_BUCKETS}-bucket cap, so some ` +
          `sources will report zero reports and no last-ingest time even though they have ` +
          `activity. Raise MAX_STATS_BUCKETS or narrow the requested time range.`
      );
    }

    for (const bucket of buckets) {
      const adapterId = String(bucket.key);
      const lastIngested =
        bucket.last_ingested?.value_as_string ??
        (typeof bucket.last_ingested?.value === 'number'
          ? new Date(bucket.last_ingested.value).toISOString()
          : undefined);
      statsByAdapterId.set(adapterId, {
        report_count: bucket.doc_count,
        ...(lastIngested ? { last_ingested_at: lastIngested } : {}),
        env_hits_total: Math.round(bucket.env_hits?.value ?? 0),
      });
    }
  } catch (err) {
    logger.warn(
      `list_sources report enrichment failed: ${(err as Error).message}; returning catalog only`
    );
  }

  return statsByAdapterId;
};

/**
 * POST `/internal/threat_intel/sources/list` — source catalog enriched with
 * report counts / last ingest / env hits from `.kibana-threat-reports*`.
 */
export const registerListSourcesRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: LIST_SOURCES_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_READ_AUTHZ },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: listBodySchema } },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        // Internal user: these are plugin-owned hidden indices, and Kibana
        // feature privileges (securitySolution / RULES_API_ALL) do not grant
        // Elasticsearch privileges on them, so asCurrentUser failed for every
        // non-superuser. Access is already gated by route authz above and
        // narrowed by the explicit space filter below.
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const size = request.body.size ?? 500;

        try {
          const [searchResponse, reportStatsByAdapterId] = await Promise.all([
            esClient.search<ThreatIntelSourceDoc>({
              index: THREAT_INTEL_SOURCES_INDEX,
              ignore_unavailable: true,
              size,
              track_total_hits: true,
              sort: [{ name: { order: 'asc' } }],
              query: {
                bool: {
                  filter: [buildSpaceFilterTerms(spaceId)],
                },
              },
            }),
            loadSourceReportStatsByAdapterId({
              esClient,
              spaceId,
              logger,
              timeRange: request.body.time_range,
            }),
          ]);

          const sources = (searchResponse.hits.hits ?? []).map((hit) => {
            const base = mapSourceHit(hit);
            const stats =
              reportStatsByAdapterId.get(adapterIdForSource(base.adapter_type, base.source_id)) ??
              emptyStats();
            return {
              ...base,
              report_count: stats.report_count,
              ...(stats.last_ingested_at ? { last_ingested_at: stats.last_ingested_at } : {}),
              env_hits_total: stats.env_hits_total,
            };
          });

          const total =
            typeof searchResponse.hits.total === 'number'
              ? searchResponse.hits.total
              : searchResponse.hits.total?.value ?? sources.length;

          return response.ok({ body: { total, sources } });
        } catch (err) {
          logger.warn(`list_sources failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to list sources: ${(err as Error).message}` },
          });
        }
      }
    );
};

const ingestibleAdapterTypes: readonly string[] = SOURCE_TYPES.filter(
  (type) => type !== 'manual' && type !== 'telemetry' && type !== 'email'
);

/**
 * `schema.uri()` validates format but has no length bound, so bound it here to
 * keep unbounded request input from reaching the index.
 */
const boundedUri = () =>
  schema.uri({
    scheme: ['http', 'https'],
    validate: (value) =>
      value.length > MAX_URL_LENGTH ? `must be ${MAX_URL_LENGTH} characters or fewer` : undefined,
  });

const createSourceBodySchema = schema.object({
  id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  name: schema.string({ minLength: 1, maxLength: 256 }),
  adapter_type: schema.string({
    maxLength: 64,
    validate: (value) =>
      ingestibleAdapterTypes.includes(value)
        ? undefined
        : `must be one of: ${ingestibleAdapterTypes.join(', ')}`,
  }),
  url: boundedUri(),
  tags: schema.maybe(schema.arrayOf(schema.string({ maxLength: 64 }), { maxSize: 32 })),
  enabled: schema.maybe(schema.boolean()),
  /**
   * Required for `vendor_api`, meaningless for every other adapter.
   *
   * A vendor feed needs a response-shape handler that only exists in code
   * (`BUILTIN_VENDOR_HANDLERS`). The adapter finds one by source id or by
   * `config.vendor`, and an API-created source's id is namespaced by space, so it
   * can never match a built-in. Without this field the route accepted
   * `vendor_api`, returned success, and every later fetch logged "no registered
   * handler" and produced nothing.
   */
  vendor: schema.maybe(
    schema.string({
      maxLength: 256,
      validate: (value) =>
        Object.keys(BUILTIN_VENDOR_HANDLERS).includes(value)
          ? undefined
          : `must be one of: ${Object.keys(BUILTIN_VENDOR_HANDLERS).join(', ')}`,
    })
  ),
});

const updateSourceBodySchema = schema.object({
  name: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  url: schema.maybe(boundedUri()),
  tags: schema.maybe(schema.arrayOf(schema.string({ maxLength: 64 }), { maxSize: 32 })),
  enabled: schema.maybe(schema.boolean()),
  vendor: schema.maybe(
    schema.string({
      maxLength: 256,
      validate: (value) =>
        Object.keys(BUILTIN_VENDOR_HANDLERS).includes(value)
          ? undefined
          : `must be one of: ${Object.keys(BUILTIN_VENDOR_HANDLERS).join(', ')}`,
    })
  ),
});

/** Exported for unit tests only — not part of the route contract. */
export const mapSourceHitForTest = mapSourceHit;
export const createSourceBodySchemaForTest = createSourceBodySchema;
export const loadSourceForMutationForTest = loadSourceForMutation;

/**
 * Bucket cap for the per-source activity aggregation. Sized well above the seeded
 * catalog plus any plausible number of operator-added feeds.
 */
const MAX_STATS_BUCKETS = 500;

const sourceIdParamsSchema = schema.object({
  sourceId: schema.string({ minLength: 1, maxLength: 256 }),
});

const slugifySourceId = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

/**
 * Document id for a source created through the API.
 *
 * Prefixed with the owning space. Sources share one index, so an unprefixed id
 * meant two spaces creating the same adapter and name targeted the same `_id`: the
 * second got a 409, which both blocked a name it had every right to use and
 * confirmed that another space held a source by that name. With a caller-supplied
 * `id` that was a general cross-space existence oracle.
 *
 * Seeded catalog entries keep their unprefixed ids on purpose. They are global, and
 * `vendorApiAdapter` resolves a built-in vendor handler from the source id, so
 * prefixing them would break that lookup.
 *
 * Callers do not have to build this: `list_sources` and create both return the
 * stored `_id` as `source_id`, which is what the by-id routes take.
 */
export const scopedSourceId = (spaceId: string, logicalId: string): string =>
  `${spaceId}:${logicalId}`;

export const registerCreateSourceRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: CREATE_SOURCE_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: createSourceBodySchema } },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        // Internal user: these are plugin-owned hidden indices, and Kibana
        // feature privileges (securitySolution / RULES_API_ALL) do not grant
        // Elasticsearch privileges on them, so asCurrentUser failed for every
        // non-superuser. Access is already gated by route authz above and
        // narrowed by the explicit space filter below.
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const now = new Date().toISOString();
        if (request.body.adapter_type === 'vendor_api' && !request.body.vendor) {
          return response.badRequest({
            body: {
              message:
                `A vendor_api source needs a \`vendor\` naming the built-in response handler to ` +
                `use, because its Elasticsearch id is namespaced by space and cannot match one. ` +
                `Available: ${Object.keys(BUILTIN_VENDOR_HANDLERS).join(', ')}. Without it the ` +
                `source would be created and then produce nothing on every fetch.`,
            },
          });
        }

        const logicalId =
          request.body.id ?? `${request.body.adapter_type}:${slugifySourceId(request.body.name)}`;
        const sourceId = scopedSourceId(spaceId, logicalId);
        const document = {
          adapter_type: request.body.adapter_type,
          name: request.body.name,
          enabled: request.body.enabled ?? true,
          config: {
            url: request.body.url,
            ...(request.body.vendor ? { vendor: request.body.vendor } : {}),
          },
          tags: request.body.tags ?? [],
          // Owned by the space that created it, always. Treating the default space
          // as the shared catalog admin meant a role granted Security All and Rules
          // All in `default` alone could create a feed visible to every space, whose
          // adapter then emits globally scoped reports. Route authorization only
          // proves privileges in the one space the request came from, so that was a
          // cross-space escalation. `GLOBAL_SPACE_ID` is reserved for
          // `seed_default_sources`.
          space_id: spaceId,
          created_at: now,
          updated_at: now,
        };

        try {
          await esClient.create({
            index: THREAT_INTEL_SOURCES_INDEX,
            id: sourceId,
            document,
            refresh: 'wait_for',
          });
          return response.ok({ body: { source_id: sourceId, ...document } });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 409) {
            return response.conflict({
              body: { message: `Source ${sourceId} already exists` },
            });
          }
          logger.warn(`create_source failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to create source: ${(err as Error).message}` },
          });
        }
      }
    );
};

export const registerUpdateSourceRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .patch({
      path: SOURCE_BY_ID_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: sourceIdParamsSchema, body: updateSourceBodySchema },
        },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        // Internal user: these are plugin-owned hidden indices, and Kibana
        // feature privileges (securitySolution / RULES_API_ALL) do not grant
        // Elasticsearch privileges on them, so asCurrentUser failed for every
        // non-superuser. Access is already gated by route authz above and
        // narrowed by the explicit space filter below.
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const { sourceId } = request.params;
        const now = new Date().toISOString();
        const doc: Record<string, unknown> = { updated_at: now };
        if (request.body.name !== undefined) {
          doc.name = request.body.name;
        }
        if (request.body.enabled !== undefined) {
          doc.enabled = request.body.enabled;
        }
        if (request.body.tags !== undefined) {
          doc.tags = request.body.tags;
        }

        try {
          const access = await loadSourceForMutation({ esClient, sourceId, spaceId });
          if (!access.allowed) {
            return response.notFound({
              body: { message: `Source ${sourceId} not found` },
            });
          }

          if (request.body.url !== undefined || request.body.vendor !== undefined) {
            // Merge rather than replace: `config` also carries adapter-specific
            // keys (`vendor` for vendor_api, TAXII collection/connector ids), and
            // replacing the object would silently break ingestion for that source.
            doc.config = {
              ...(access.existing?.config ?? {}),
              ...(request.body.url !== undefined ? { url: request.body.url } : {}),
              ...(request.body.vendor !== undefined ? { vendor: request.body.vendor } : {}),
            };
          }

          await esClient.update({
            index: THREAT_INTEL_SOURCES_INDEX,
            id: sourceId,
            doc,
            refresh: 'wait_for',
          });
          return response.ok({ body: { source_id: sourceId, updated: true } });
        } catch (err) {
          logger.warn(`update_source failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to update source: ${(err as Error).message}` },
          });
        }
      }
    );
};

export const registerDeleteSourceRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .delete({
      path: SOURCE_BY_ID_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { params: sourceIdParamsSchema } },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        // Internal user: these are plugin-owned hidden indices, and Kibana
        // feature privileges (securitySolution / RULES_API_ALL) do not grant
        // Elasticsearch privileges on them, so asCurrentUser failed for every
        // non-superuser. Access is already gated by route authz above and
        // narrowed by the explicit space filter below.
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const { sourceId } = request.params;

        try {
          const access = await loadSourceForMutation({ esClient, sourceId, spaceId });
          if (!access.allowed) {
            return response.notFound({
              body: { message: `Source ${sourceId} not found` },
            });
          }

          await esClient.delete({
            index: THREAT_INTEL_SOURCES_INDEX,
            id: sourceId,
            refresh: 'wait_for',
          });
          return response.ok({ body: { source_id: sourceId, deleted: true } });
        } catch (err) {
          logger.warn(`delete_source failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to delete source: ${(err as Error).message}` },
          });
        }
      }
    );
};
