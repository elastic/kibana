/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ALERT_EPISODE_STATUS,
  type AlertEpisodeStatus,
  type AlertEventSeverity,
} from '@kbn/alerting-v2-schemas';
import {
  SEVERITY_OPTIONS,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type SignificantEvent,
  type SignificantEventResponse,
  type Severity,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import {
  MAX_DEDUP_SCAN_LIMIT,
  type CommonSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  applyLifetimeOverlap,
  applyTimeRange,
  executeCountQuery,
  executeEsqlQuery,
  pickLatestPerGroup,
} from '../latest_source_query';
import { RULE_EVENTS_INDEX } from '../alerting/rule_events_metric_series';
import type {
  EventsFilterOptions,
  EventsPaginatedSearchOptions,
  SignificantEventsReadClient,
} from './event_client';

/** `.rule-events` groups a series of writes by `group_hash`, not `event_id` (unavailable as a column). */
const GROUP_HASH_FIELD = 'group_hash';

const isSignificantEventStatus = (status: AlertEpisodeStatus): status is SignificantEventStatus =>
  SIGNIFICANT_EVENT_STATUS_OPTIONS.some((option) => option === status);

const isSignificantEventSeverity = (severity: AlertEventSeverity): severity is Severity =>
  SEVERITY_OPTIONS.some((option) => option === severity);

type RuleEventsCurrentStateSearchOptions = CommonSearchOptions & EventsFilterOptions;

export type RuleEventsBatchSearchOptions = RuleEventsCurrentStateSearchOptions & {
  // Named `afterGroupHash`, not `afterEventId` like `EventClient`'s equivalent cursor: the keyset
  // here is `group_hash` (the only stable per-series column `.rule-events` carries — see
  // `GROUP_HASH_FIELD`), not `event_id`.
  afterGroupHash?: string;
  batchSize: number;
};

/** Raw decoded `_source` row, plus the derived columns every query in this client projects. */
interface RuleEventSourceRow {
  '@timestamp': string;
  [GROUP_HASH_FIELD]: string;
  severity?: AlertEventSeverity;
  alert?: { status?: AlertEpisodeStatus };
  data_json: string;
}

type RuleEventSourceRowWithCreatedAt = RuleEventSourceRow & { created_at: string };

/**
 * `.rule-events` doesn't guarantee `stream_names` is an array — bridge docs write a scalar
 * string, and the field can be absent. Normalize so callers always get `string[]`.
 */
const normalizeStreamNames = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
};

/**
 * Decodes a `.rule-events` row into a `SignificantEvent`.
 */
const decodeSignificantEvent = (row: RuleEventSourceRow): SignificantEvent => {
  const data = JSON.parse(row.data_json || '{}') as Omit<
    SignificantEvent,
    '@timestamp' | 'status' | 'severity'
  >;
  // Sigevents does not model the full alert lifecycle yet: episode states other than
  // active/inactive (e.g. pending, recovering) are still ongoing, so they map to `active`.
  const episodeStatus = row.alert?.status ?? ALERT_EPISODE_STATUS.ACTIVE;
  // Alerting v2 has an extra `info` level below `low` that Significant Events never writes. A row
  // carrying `info` (or no severity) comes from another rule source, so it falls back to the
  // neutral `medium` instead of being hidden as `low` or escalated.
  const severity = row.severity ?? 'medium';
  return {
    ...data,
    stream_names: normalizeStreamNames(data.stream_names),
    '@timestamp': row['@timestamp'],
    status: isSignificantEventStatus(episodeStatus) ? episodeStatus : 'active',
    severity: isSignificantEventSeverity(severity) ? severity : 'medium',
  };
};

const decodeSignificantEventResponse = (
  row: RuleEventSourceRowWithCreatedAt
): SignificantEventResponse => ({
  ...decodeSignificantEvent(row),
  created_at: row.created_at,
});

/**
 * `.rule-events` is shared by every Alerting v2 rule/source, not just Significant Events, so every
 * read must scope to `type == "alert"` (excludes MATCH-rule `signal` docs) and
 * `source == SIGNIFICANT_EVENTS_ALERT_SOURCE` (excludes alerts from unrelated rules/integrations in
 * the same space) in addition to `space_id`.
 */
const buildBaseQuery = (space: string): ComposerQuery =>
  // `_id` metadata is required by `pickLatestPerGroup`'s tiebreaker (`MAX(_id)` / `WHERE _id ==
  // tiebreaker_id`) — omitting it fails at query time with `Unknown column [_id]` (verified against
  // a live `.rule-events` cluster). Matches the `['_id', '_source']` convention already used for
  // `EVENTS_DATA_STREAM` in `latest_source_query.ts`.
  esql.from([RULE_EVENTS_INDEX], ['_id', '_source']).where`space_id == ${esql.str(
    space
  )} AND type == ${esql.str('alert')} AND source == ${esql.str(SIGNIFICANT_EVENTS_ALERT_SOURCE)}`;

const withDataJsonProjection = (query: ComposerQuery): ComposerQuery =>
  query.pipe`EVAL data_json = JSON_EXTRACT(_source, "$.data")`;

/**
 * Free-text filter mirroring `EventClient`'s `buildWhere`, adapted to `.rule-events`: the searched
 * fields live in the flattened `data` column, so each lookup goes through `FIELD_EXTRACT` instead
 * of a direct column reference.
 */
const buildFreeTextWhere = (search: string | undefined): ESQLAstExpression | undefined => {
  if (!search) return undefined;

  const escaped = search.toLowerCase().replace(/\\/g, '\\\\').replace(/[*?]/g, '\\$&');
  const pattern = esql.str(`*${escaped}*`);
  const dataCol = esql.col('data');

  return esql.exp`(TO_LOWER(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'title'
  )})) LIKE ${pattern} OR TO_LOWER(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'summary'
  )})) LIKE ${pattern} OR TO_LOWER(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'symptom_hypothesis'
  )})) LIKE ${pattern} OR TO_LOWER(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'event_id'
  )})) == TO_LOWER(${esql.str(search)}))`;
};

const activeStatusWhere = (): ESQLAstExpression =>
  esql.exp`${esql.col('alert.status')} IN(${SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS.map((status) =>
    esql.str(status)
  )})`;

const eventIdEquals = (eventId: string): ESQLAstExpression =>
  esql.exp`FIELD_EXTRACT(${esql.col('data')}, ${esql.str('event_id')}) == ${esql.str(eventId)}`;

const eventIdIn = (eventIds: string[]): ESQLAstExpression =>
  esql.exp`FIELD_EXTRACT(${esql.col('data')}, ${esql.str('event_id')}) IN (${eventIds.map((id) =>
    esql.str(id)
  )})`;

/**
 * `EventClient`'s `multiValueContainsAnyFilter` equivalent, targeting `FIELD_EXTRACT(data,
 * "stream_names")` instead of a top-level column. `MV_INTERSECTS` works correctly against
 * `FIELD_EXTRACT`'s output for array, scalar-string, and absent-field shapes (verified live
 * against `.rule-events` on nightshift-program#1492) — no extra normalization is needed here.
 */
const streamNamesIntersects = (values: string[]): ESQLAstExpression =>
  esql.exp`MV_INTERSECTS(FIELD_EXTRACT(${esql.col('data')}, ${esql.str(
    'stream_names'
  )}), [${values.map((value) => esql.str(value))}])`;

/**
 * `EventClient`'s `continuationCandidateFilter`'s rule arm, adapted to `.rule-events`: targets
 * `FIELD_EXTRACT(data, "signals.metadata.rule_uuid")` instead of the top-level `signals` column.
 * `FIELD_EXTRACT` union-flattens leaf values across a nested array — it loses the pairing between
 * a given signal's `rule_uuid` and its other fields (e.g. `verdict`), same as `EventClient`'s own
 * `signals.metadata.rule_uuid` filter, which is a "contains any" match, not a per-signal predicate.
 * Verified live against `.rule-events` on nightshift-program#1517.
 */
const ruleUuidsIntersects = (values: string[]): ESQLAstExpression =>
  esql.exp`MV_INTERSECTS(FIELD_EXTRACT(${esql.col('data')}, ${esql.str(
    'signals.metadata.rule_uuid'
  )}), [${values.map((value) => esql.str(value))}])`;

/**
 * `EventClient`'s `topologyFeatureFilter`, adapted to `.rule-events`: an event matches when either
 * `causal_features.feature_id` or `blast_radius.feature_id` contains any requested ID, both read
 * through `FIELD_EXTRACT` since they live in the flattened `data` column. Verified live against
 * `.rule-events` on nightshift-program#1517.
 */
const topologyFeatureIdsIntersects = (values: string[]): ESQLAstExpression => {
  const literals = values.map((value) => esql.str(value));
  const dataCol = esql.col('data');
  return esql.exp`(MV_INTERSECTS(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'causal_features.feature_id'
  )}), [${literals}]) OR MV_INTERSECTS(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'blast_radius.feature_id'
  )}), [${literals}]))`;
};

/**
 * Read-only `.rule-events` counterpart to `EventClient`, returned by `EventService.getClient()`
 * when `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ` is enabled. Implements {@link SignificantEventsReadClient}
 * so agent-side read call sites (`event_search`, `event_write`'s dedup scan, `attach_investigation`,
 * SML) can depend on that interface instead of a concrete client. Query strategy (which ES|QL
 * extraction form to use per field) is validated per-shape on nightshift-program#1492 and #1517
 * before this client's output is trusted in production.
 *
 * Not implemented here:
 * - `findLatestActive`, topology/continuation search, `attach` — agent/discovery reads (#1517).
 * - Writes (`bulkCreate`) and workflow triggers (`emitTrigger`) — this class is read-only.
 */
export class RuleEventsClient implements SignificantEventsReadClient {
  constructor(private readonly clients: { esClient: ElasticsearchClient; space: string }) {}

  private buildLatestByCurrentStateQuery(
    options: RuleEventsCurrentStateSearchOptions
  ): ComposerQuery {
    // `created_at` reflects the earliest (historical) `@timestamp` for the series, so it must be
    // computed before any filter narrows the row set.
    let query = buildBaseQuery(this.clients.space)
      .pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(GROUP_HASH_FIELD)}`;

    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);

    // Free-text search and status/severity run post-latest (against only the current state) so a
    // stale revision cannot make a closed series look open.
    const searchWhere = buildFreeTextWhere(options.search);
    if (searchWhere) {
      query = query.where`${searchWhere}`;
    }

    // The time range selects series active during it, always shown in their current state.
    query = applyLifetimeOverlap({
      query,
      from: options.from,
      to: options.to,
      activeWhere: activeStatusWhere(),
    });

    if (options.status?.length) {
      query = query.where`${esql.col('alert.status')} IN (${options.status.map((status) =>
        esql.str(status)
      )})`;
    }
    if (options.severity?.length) {
      query = query.where`${esql.col('severity')} IN (${options.severity.map((severity) =>
        esql.str(severity)
      )})`;
    }
    if (options.stream?.length) {
      query = query.where`${streamNamesIntersects(options.stream)}`;
    }
    if (options.eventIds?.length) {
      query = query.where`${eventIdIn(options.eventIds)}`;
    }
    if (options.ruleUuids?.length) {
      query = query.where`${ruleUuidsIntersects(options.ruleUuids)}`;
    }
    if (options.topologyFeatureIds?.length) {
      query = query.where`${topologyFeatureIdsIntersects(options.topologyFeatureIds)}`;
    }

    return query;
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: SignificantEvent[] }> {
    let query = applyTimeRange({
      query: buildBaseQuery(this.clients.space),
      from: options.from,
      to: options.to,
    });
    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);
    query = withDataJsonProjection(query).keep('_source', 'data_json');

    const hits = await executeEsqlQuery<RuleEventSourceRow>({
      esClient: this.clients.esClient,
      query,
      fields: ['data_json'],
    });
    return { hits: hits.map(decodeSignificantEvent) };
  }

  async findLatestPaginated(
    options: EventsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SignificantEventResponse>> {
    return this.findLatestByCurrentStatePaginated(options);
  }

  async findLatestByCurrentStatePaginated(
    options: EventsPaginatedSearchOptions
  ): Promise<PaginatedResponse<SignificantEventResponse>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 25;

    const dataQuery = withDataJsonProjection(this.buildLatestByCurrentStateQuery(options))
      .sort(['@timestamp', 'DESC'], ['_id', 'ASC'])
      .limit(page * perPage)
      .keep('_source', 'data_json', 'created_at');
    const countQuery = this.buildLatestByCurrentStateQuery(options)
      .pipe`STATS total = COUNT(*)`.keep('total');

    const [total, hits] = await Promise.all([
      executeCountQuery({ esClient: this.clients.esClient, query: countQuery }),
      executeEsqlQuery<RuleEventSourceRowWithCreatedAt>({
        esClient: this.clients.esClient,
        query: dataQuery,
        fields: ['data_json', 'created_at'],
      }),
    ]);

    const start = (page - 1) * perPage;
    const paginatedHits = start >= hits.length ? [] : hits.slice(start, start + perPage);

    return {
      hits: paginatedHits.map(decodeSignificantEventResponse),
      page,
      perPage,
      total,
    };
  }

  async findLatestByCurrentStateBatch(
    options: RuleEventsBatchSearchOptions
  ): Promise<{ hits: SignificantEventResponse[] }> {
    let query = this.buildLatestByCurrentStateQuery(options);
    if (options.afterGroupHash !== undefined) {
      query = query.where`${esql.col(GROUP_HASH_FIELD)} > ${esql.str(options.afterGroupHash)}`;
    }

    const hits = await executeEsqlQuery<RuleEventSourceRowWithCreatedAt>({
      esClient: this.clients.esClient,
      query: withDataJsonProjection(query)
        .sort([GROUP_HASH_FIELD, 'ASC'])
        .limit(options.batchSize)
        .keep('_source', 'data_json', 'created_at'),
      fields: ['data_json', 'created_at'],
    });

    return { hits: hits.map(decodeSignificantEventResponse) };
  }

  /**
   * Returns the latest version per `group_hash` for all active events within the given
   * time range, optionally narrowed to candidate stream/rule identities so the scan stays
   * proportional to the write batch instead of the whole space. Mirrors `EventClient`'s
   * `findLatestActive`, but filters on the nested `alert.status` column (via
   * `SIGNIFICANT_EVENTS_STATUS_MAP`, see `buildLatestByCurrentStateQuery`'s status branch) instead
   * of a top-level `status` column, and reads `stream_names` / `signals.metadata.rule_uuid`
   * through `FIELD_EXTRACT` since both live in the flattened `data` column.
   *
   * Capped at MAX_DEDUP_SCAN_LIMIT distinct active events, same bound as `EventClient`.
   */
  async findLatestActive(
    options: CommonSearchOptions & { streamNames?: string[]; ruleUuids?: string[] }
  ): Promise<{ hits: SignificantEvent[] }> {
    let query = applyTimeRange({
      query: buildBaseQuery(this.clients.space),
      from: options.from,
      to: options.to,
    });

    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);

    query = query.where`${activeStatusWhere()}`;

    if (options.streamNames?.length) {
      query = query.where`${streamNamesIntersects(options.streamNames)}`;
    }
    if (options.ruleUuids?.length) {
      query = query.where`${ruleUuidsIntersects(options.ruleUuids)}`;
    }

    const hits = await executeEsqlQuery<RuleEventSourceRow>({
      esClient: this.clients.esClient,
      query: withDataJsonProjection(query).keep('_source', 'data_json').limit(MAX_DEDUP_SCAN_LIMIT),
      fields: ['data_json'],
    });
    return { hits: hits.map(decodeSignificantEvent) };
  }

  async findByEventId(eventId: string): Promise<{ hits: SignificantEventResponse[] }> {
    const query = withDataJsonProjection(
      buildBaseQuery(this.clients.space).where`${eventIdEquals(eventId)}`
        .pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(GROUP_HASH_FIELD)}`
    )
      .sort(['@timestamp', 'ASC'])
      .keep('_source', 'data_json', 'created_at');

    const hits = await executeEsqlQuery<RuleEventSourceRowWithCreatedAt>({
      esClient: this.clients.esClient,
      query,
      fields: ['data_json', 'created_at'],
    });
    return { hits: hits.map(decodeSignificantEventResponse) };
  }

  /**
   * Resolves the latest version for an event_id lineage. `findByEventId` returns all versions
   * sorted ascending by `@timestamp`, so the latest version is always the last element — never
   * the first (a caller-supplied id must never pin a read to a stale revision).
   */
  async findLatestByEventId(eventId: string): Promise<SignificantEventResponse | undefined> {
    const { hits } = await this.findByEventId(eventId);
    return hits.at(-1);
  }

  async findLatestByEventIds(eventIds: string[]): Promise<Map<string, SignificantEvent>> {
    if (!eventIds.length) return new Map();

    let query = buildBaseQuery(this.clients.space).where`${eventIdIn(eventIds)}`;
    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);
    query = withDataJsonProjection(query).keep('_source', 'data_json').limit(eventIds.length);

    const hits = await executeEsqlQuery<RuleEventSourceRow>({
      esClient: this.clients.esClient,
      query,
      fields: ['data_json'],
    });

    const map = new Map<string, SignificantEvent>();
    for (const event of hits.map(decodeSignificantEvent)) {
      if (event.event_id) map.set(event.event_id, event);
    }
    return map;
  }
}
