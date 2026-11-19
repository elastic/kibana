/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsStringTermsAggregate,
  FieldCapsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, isSavedObjectErrorResult } from '@kbn/core/server';
import { nodeTypes } from '@kbn/es-query';
import { MAX_ANALYTICS_EVENT_SOURCES } from '../../common/analytics';
import type {
  AnalyticsClusterState,
  AnalyticsDashboardSummary,
  AnalyticsEventSource,
  AnalyticsStage,
} from '../../common/analytics';
import {
  SEARCH_INTENT_FIELD_TYPES,
  classifyDataKind,
  deriveJourney,
  readSearchEvidence,
} from './analytics_data_kind';
import { ANALYTICS_ROLE_FIELD_TYPES, detectSourceFields } from './analytics_source_fields';

const MAX_RECENT_DASHBOARDS = 3;

/** The same definition of user data as the Elasticsearch home deployment stats. */
const USER_INDICES_PATTERN = ['*', '-.*', '-traces-agent_builder.otel-*'];
const NON_USER_INDEX_PREFIX = '.';
const NON_USER_INDEX_ATTRIBUTES: readonly string[] = ['hidden', 'system'];
// Covers the Kibana sample data sets and what the Console tutorials create, such as
// `kibana_sample_weather_data_stream`.
const SAMPLE_DATA_INDEX_PREFIX = 'kibana_sample_';
const DEFAULT_TIME_FIELD = '@timestamp';
export const DATE_FIELD_TYPES = ['date', 'date_nanos'];
/** Names events conventionally keep their time under, most telling first. */
const EVENT_TIME_FIELDS: readonly string[] = [
  'timestamp',
  'event.created',
  'event.timestamp',
  'event_time',
  'event_timestamp',
  'created_at',
  'time',
  'ts',
  'order_date',
  'occurred_at',
  'event.ingested',
];
const TIME_LIKE_FIELD = /time|date/i;
/** Dates that describe an entity the event mentions rather than when the event happened. */
const ENTITY_ATTRIBUTE_FIELD =
  /birth|dob|death|expir|hire|anniversar|updat|modif|valid_|start_date|end_date/i;
// One bucket per backing index; indices beyond this many are left out of the per-source counts.
const MAX_INDEX_BUCKETS = 10000;
const DASHBOARD_TYPE = 'dashboard';

/** Thrown when Elasticsearch answered without covering every shard, so counts would be undercounts. */
export class IncompleteClusterStateError extends Error {
  public readonly statusCode = 503;

  constructor(failedShards: number, totalShards: number) {
    super(`Event counts covered only ${totalShards - failedShards} of ${totalShards} shards`);
    this.name = 'IncompleteClusterStateError';
  }
}

interface ResolvedSource {
  name: string;
  kind: AnalyticsEventSource['kind'];
  /** The concrete indices whose documents belong to the source. */
  indexNames: readonly string[];
  /** The field a data stream orders its events by; indices declare none. */
  timestampField?: string;
}

interface CountedSource extends ResolvedSource {
  documentsCount: number;
}

interface DashboardsState {
  dashboardsCount: number;
  recentDashboards: AnalyticsDashboardSummary[];
}

export interface FetchAnalyticsClusterStateParams {
  client: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  /** Ids of the dashboards Kibana sample data installs, as registered with the sample data registry. */
  sampleDashboardIds: readonly string[];
}

const isSampleSourceName = (name: string): boolean => name.startsWith(SAMPLE_DATA_INDEX_PREFIX);

const isUserSourceName = (name: string): boolean => !name.startsWith(NON_USER_INDEX_PREFIX);

const resolveSources = async (client: IScopedClusterClient): Promise<ResolvedSource[]> => {
  const { indices = [], data_streams: dataStreams = [] } =
    await client.asCurrentUser.indices.resolveIndex({
      name: USER_INDICES_PATTERN,
      expand_wildcards: ['open'],
      filter_path: [
        'indices.name',
        'indices.attributes',
        'indices.data_stream',
        'data_streams.name',
        'data_streams.backing_indices',
        'data_streams.timestamp_field',
      ],
    });

  return [
    ...dataStreams
      .filter(({ name }) => isUserSourceName(name))
      .map(({ name, backing_indices: backingIndices = [], timestamp_field: timestampField }) => ({
        name,
        kind: 'dataStream' as const,
        indexNames: [backingIndices].flat(),
        timestampField,
      })),
    ...indices
      .filter(
        ({ name, attributes = [], data_stream: dataStream }) =>
          isUserSourceName(name) &&
          dataStream === undefined &&
          !attributes.some((attribute) => NON_USER_INDEX_ATTRIBUTES.includes(attribute))
      )
      .map(({ name }) => ({ name, kind: 'index' as const, indexNames: [name] })),
  ];
};

interface DocumentCounts {
  total: number;
  byIndex: Map<string, number>;
}

/** Counts documents per concrete index in one request, however many indices there are. */
const countDocumentsByIndex = async (client: IScopedClusterClient): Promise<DocumentCounts> => {
  const {
    hits,
    aggregations,
    _shards: shards,
  } = await client.asCurrentUser.search<never, { byIndex: AggregationsStringTermsAggregate }>({
    index: USER_INDICES_PATTERN,
    expand_wildcards: ['open'],
    ignore_unavailable: true,
    size: 0,
    track_total_hits: true,
    aggs: { byIndex: { terms: { field: '_index', size: MAX_INDEX_BUCKETS } } },
  });

  if (shards.failed > 0) {
    throw new IncompleteClusterStateError(shards.failed, shards.total);
  }

  const buckets = aggregations?.byIndex.buckets ?? [];
  const byIndex = new Map<string, number>();
  for (const bucket of Array.isArray(buckets) ? buckets : Object.values(buckets)) {
    byIndex.set(String(bucket.key), bucket.doc_count);
  }
  const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;

  return { total, byIndex };
};

const getFieldDepth = (name: string): number => name.split('.').length;

/**
 * The date field that says when an event happened: `@timestamp`, else the data stream's own
 * timestamp field, else a conventional event-time name, else the shallowest date field named like a
 * time that is not an attribute of an entity. Null rather than a guess such as a birth date.
 * Field capabilities do not tell runtime fields from mapped ones, so both are candidates.
 */
export const pickTimeField = (
  fields: FieldCapsResponse['fields'],
  dataStreamTimestampField?: string
): string | null => {
  const dateFields = Object.entries(fields)
    .filter(([, capabilities]) => DATE_FIELD_TYPES.some((type) => type in capabilities))
    .map(([name]) => name);

  const preferredField = [DEFAULT_TIME_FIELD, dataStreamTimestampField, ...EVENT_TIME_FIELDS].find(
    (name) => name !== undefined && dateFields.includes(name)
  );
  if (preferredField !== undefined) {
    return preferredField;
  }

  const [timeLikeField] = dateFields
    .filter((name) => TIME_LIKE_FIELD.test(name) && !ENTITY_ATTRIBUTE_FIELD.test(name))
    .sort((a, b) => getFieldDepth(a) - getFieldDepth(b) || a.localeCompare(b));

  return timeLikeField ?? null;
};

/**
 * The time field, the parts the other fields play and what the documents are for, from one field
 * capabilities request.
 */
const describeSourceFields = async (
  client: IScopedClusterClient,
  { name, kind, timestampField }: Pick<ResolvedSource, 'name' | 'kind' | 'timestampField'>
): Promise<Pick<AnalyticsEventSource, 'timeField' | 'fields' | 'dataKind'>> => {
  const { fields = {} } = await client.asCurrentUser.fieldCaps({
    index: name,
    fields: '*',
    types: [...DATE_FIELD_TYPES, ...ANALYTICS_ROLE_FIELD_TYPES, ...SEARCH_INTENT_FIELD_TYPES],
    // ES|QL cannot read nested fields, and objects and metadata fields play no part.
    filters: '-metadata,-parent,-nested',
    filter_path: ['fields'],
  });
  const detectedFields = detectSourceFields(fields);
  const timeField = pickTimeField(fields, timestampField);

  return {
    timeField,
    dataKind: classifyDataKind({
      kind,
      timeField,
      roles: detectedFields,
      ...readSearchEvidence(fields),
    }),
    ...(detectedFields && { fields: detectedFields }),
  };
};

/** Sources that hold documents, largest first, with ties broken by name. */
export const rankSources = (
  sources: readonly ResolvedSource[],
  countsByIndex: ReadonlyMap<string, number>
): CountedSource[] =>
  sources
    .map((source) => ({
      ...source,
      documentsCount: source.indexNames.reduce(
        (sum, indexName) => sum + (countsByIndex.get(indexName) ?? 0),
        0
      ),
    }))
    .filter(({ documentsCount }) => documentsCount > 0)
    .sort((a, b) => b.documentsCount - a.documentsCount || a.name.localeCompare(b.name));

export const deriveStage = ({
  totalSources,
  dashboardsCount,
}: Pick<AnalyticsClusterState, 'totalSources' | 'dashboardsCount'>): AnalyticsStage => {
  if (totalSources === 0) {
    return 'noData';
  }
  return dashboardsCount > 0 ? 'hasDashboards' : 'hasData';
};

/**
 * Sample dashboards keep their registered id in the default space and carry it as `originId` in
 * every other space, so both are counted.
 */
const countInstalledSampleDashboards = async (
  savedObjectsClient: SavedObjectsClientContract,
  sampleDashboardIds: readonly string[]
): Promise<number> => {
  if (sampleDashboardIds.length === 0) {
    return 0;
  }

  const [{ saved_objects: sameId }, { total: sameOrigin }] = await Promise.all([
    savedObjectsClient.bulkGet(
      sampleDashboardIds.map((id) => ({ type: DASHBOARD_TYPE, id, fields: ['title'] }))
    ),
    savedObjectsClient.find({
      type: DASHBOARD_TYPE,
      perPage: 0,
      filter: nodeTypes.function.buildNode(
        'or',
        sampleDashboardIds.map((id) =>
          nodeTypes.function.buildNode('is', `${DASHBOARD_TYPE}.originId`, id)
        )
      ),
    }),
  ]);

  return sameId.filter((dashboard) => !isSavedObjectErrorResult(dashboard)).length + sameOrigin;
};

/**
 * The caller's dashboards in the current space without the ones Kibana sample data installed. A
 * caller who may not read dashboards has none to show, which is reported as zero; any other failure
 * is thrown.
 */
export const fetchDashboardsState = async (
  savedObjectsClient: SavedObjectsClientContract,
  sampleDashboardIds: readonly string[],
  logger: Logger
): Promise<DashboardsState> => {
  const sampleIds = new Set(sampleDashboardIds);

  try {
    const [{ total, saved_objects: recent }, sampleDashboardsCount] = await Promise.all([
      savedObjectsClient.find<{ title?: string }>({
        type: DASHBOARD_TYPE,
        fields: ['title'],
        sortField: 'updated_at',
        sortOrder: 'desc',
        // Enough to still fill the list when every sample dashboard is among the newest.
        perPage: MAX_RECENT_DASHBOARDS + sampleIds.size,
      }),
      countInstalledSampleDashboards(savedObjectsClient, sampleDashboardIds),
    ]);

    return {
      dashboardsCount: Math.max(0, total - sampleDashboardsCount),
      recentDashboards: recent
        .filter(({ id, originId }) => !sampleIds.has(id) && !(originId && sampleIds.has(originId)))
        .slice(0, MAX_RECENT_DASHBOARDS)
        .map(({ id, attributes }) => ({ id, title: attributes.title ?? '' })),
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isForbiddenError(error)) {
      logger.debug(`The caller may not read dashboards; reporting none: ${error.message}`);
      return { dashboardsCount: 0, recentDashboards: [] };
    }
    throw error;
  }
};

/**
 * What the caller's data and dashboards look like right now. The stage and the counts cover every
 * source, whatever it is for; `dataKind` and `journey` say which of it is events. Every read runs as the caller, so
 * the result covers only what they may see, and a caller who may read no user index sees the same
 * as an empty cluster. Elasticsearch failures are thrown rather than reported as an empty cluster.
 */
export const fetchAnalyticsClusterState = async ({
  client,
  savedObjectsClient,
  logger,
  sampleDashboardIds,
}: FetchAnalyticsClusterStateParams): Promise<AnalyticsClusterState> => {
  const [resolvedSources, documentCounts, { dashboardsCount, recentDashboards }] =
    await Promise.all([
      resolveSources(client),
      countDocumentsByIndex(client),
      fetchDashboardsState(savedObjectsClient, sampleDashboardIds, logger),
    ]);

  const rankedSources = rankSources(resolvedSources, documentCounts.byIndex);
  const totalSources = rankedSources.length;

  const sources = await Promise.all(
    rankedSources.slice(0, MAX_ANALYTICS_EVENT_SOURCES).map(
      async ({ name, kind, documentsCount, timestampField }): Promise<AnalyticsEventSource> => ({
        name,
        kind,
        documentsCount,
        isSampleData: isSampleSourceName(name),
        ...(await describeSourceFields(client, { name, kind, timestampField })),
      })
    )
  );
  // Sources beyond the returned ones get no field capabilities request, so only the data streams
  // among them count towards the journey; an index there has an unknown kind and is left out.
  const unreadDataStreams = rankedSources
    .slice(MAX_ANALYTICS_EVENT_SOURCES)
    .filter(({ kind }) => kind === 'dataStream')
    .map(({ name }) => ({ dataKind: 'events' as const, isSampleData: isSampleSourceName(name) }));

  return {
    stage: deriveStage({ totalSources, dashboardsCount }),
    journey: deriveJourney([...sources, ...unreadDataStreams]),
    sources,
    totalSources,
    documentsCount: documentCounts.total,
    dashboardsCount,
    recentDashboards,
  };
};
