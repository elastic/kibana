/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  ALERT_EPISODE_STATUS,
  type AlertEpisodeStatus,
  type AlertEventSeverity,
} from '@kbn/alerting-v2-schemas';
import {
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  SEVERITY_OPTIONS,
  type SignificantEvent,
  type SignificantEventResponse,
  type Severity,
  type SignalVerdict,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import {
  MAX_DEDUP_SCAN_LIMIT,
  type CommonSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  applyLifetimeOverlap,
  applyTimeRange,
  esqlToObjects,
  executeCountQuery,
  executeEsqlQuery,
  isIndexNotFoundError,
  pickLatestPerGroup,
  queryEsql,
} from '../latest_source_query';
import {
  SIGNIFICANT_EVENT_INVESTIGATION_STATES,
  type SignificantEventsFacets,
  type SignificantEventsSortField,
  type SignificantEventsSortOrder,
} from '../../../../common/events_list';
import { RULE_EVENTS_INDEX } from '../alerting/rule_events_metric_series';
import type { EventsFilterOptions, EventsPaginatedSearchOptions } from './types';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import {
  decideStatusChange,
  requestedStatus,
  type StatusChange,
  type LifecycleSkipReason,
} from './lifecycle/lifecycle_controller';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { toRuleEvent } from './to_rule_event';

/** `.rule-events` groups a series of writes by `group_hash`, not `event_id` (unavailable as a column). */
const GROUP_HASH_FIELD = 'group_hash';

/** Note recorded when an operator changes status without giving a reason. */
export const operatorFallbackAssessmentNote = (status: 'active' | 'inactive'): string =>
  i18n.translate('xpack.significantEvents.events.operatorFallbackAssessmentNote', {
    defaultMessage: 'Manually set to {status} by an operator. No reason was given.',
    values: { status },
  });

const isSignificantEventStatus = (status: AlertEpisodeStatus): status is SignificantEventStatus =>
  (SIGNIFICANT_EVENT_STATUS_OPTIONS as readonly string[]).includes(status);

const isSignificantEventSeverity = (severity: AlertEventSeverity): severity is Severity =>
  severity === 'critical' || severity === 'high' || severity === 'medium' || severity === 'low';

type RuleEventsCurrentStateSearchOptions = CommonSearchOptions & EventsFilterOptions;

export type RuleEventsBatchSearchOptions = RuleEventsCurrentStateSearchOptions & {
  // Named `afterGroupHash`, not `afterEventId`: the keyset
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
 * `.rule-events` doesn't guarantee `source_ids` is an array — bridge docs write a scalar
 * string, and the field can be absent. Normalize so callers always get `string[]`.
 */
const normalizeSourceIds = (value: unknown): string[] => {
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
  const alertStatus = row.alert?.status ?? ALERT_EPISODE_STATUS.ACTIVE;
  const severity = row.severity ?? 'medium';
  return {
    ...data,
    source_ids: normalizeSourceIds(data.source_ids),
    '@timestamp': row['@timestamp'],
    status: isSignificantEventStatus(alertStatus) ? alertStatus : 'active',
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
  // a live `.rule-events` cluster). Matches the `['_id', '_source']` convention used in
  // `latest_source_query.ts`.
  esql.from([RULE_EVENTS_INDEX], ['_id', '_source']).where`space_id == ${esql.str(
    space
  )} AND type == ${esql.str('alert')} AND source == ${esql.str(SIGNIFICANT_EVENTS_ALERT_SOURCE)}`;

const withDataJsonProjection = (query: ComposerQuery): ComposerQuery =>
  query.pipe`EVAL data_json = JSON_EXTRACT(_source, "$.data")`;

/**
 * Free-text filter over `.rule-events`: the searched
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

const eventIdEquals = (eventId: string): ESQLAstExpression =>
  esql.exp`FIELD_EXTRACT(${esql.col('data')}, ${esql.str('event_id')}) == ${esql.str(eventId)}`;

const eventIdIn = (eventIds: string[]): ESQLAstExpression =>
  esql.exp`FIELD_EXTRACT(${esql.col('data')}, ${esql.str('event_id')}) IN (${eventIds.map((id) =>
    esql.str(id)
  )})`;

/**
 * Multi-value "contains any" filter targeting `FIELD_EXTRACT(data,
 * "source_ids")` instead of a top-level column. `MV_INTERSECTS` works correctly against
 * `FIELD_EXTRACT`'s output for array, scalar-string, and absent-field shapes (verified live
 * against `.rule-events` on nightshift-program#1492) — no extra normalization is needed here.
 */
const sourceIdsIntersects = (values: string[]): ESQLAstExpression =>
  esql.exp`MV_INTERSECTS(FIELD_EXTRACT(${esql.col('data')}, ${esql.str(
    'source_ids'
  )}), [${values.map((value) => esql.str(value))}])`;

/**
 * Continuation-candidate rule filter: targets
 * `FIELD_EXTRACT(data, "signals.metadata.rule_uuid")` instead of the top-level `signals` column.
 * `FIELD_EXTRACT` union-flattens leaf values across a nested array — it loses the pairing between
 * a given signal's `rule_uuid` and its other fields (e.g. `verdict`). The filter is a "contains any" match,
 * not a per-signal predicate.
 * Verified live against `.rule-events` on nightshift-program#1517.
 */
const ruleUuidsIntersects = (values: string[]): ESQLAstExpression =>
  esql.exp`MV_INTERSECTS(FIELD_EXTRACT(${esql.col('data')}, ${esql.str(
    'signals.metadata.rule_uuid'
  )}), [${values.map((value) => esql.str(value))}])`;

/**
 * Topology feature filter: an event matches when either
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

const INVESTIGATION_STATE_COLUMN = 'investigation_state';

/**
 * Derives `not_started` / `in_progress` / `completed` from the flattened `investigations` entries:
 * an entry without `completed_at` means a run is still open. Mirrors the browser's
 * `getInvestigationState` so the filter and the list agree. `FIELD_EXTRACT` drops duplicate
 * values, so two runs finishing in the same millisecond would read as in progress (verified live).
 */
const withInvestigationState = (query: ComposerQuery): ComposerQuery => {
  const dataCol = esql.col('data');
  const started = esql.exp`COALESCE(MV_COUNT(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'investigations.workflow_execution_id'
  )})), 0)`;
  const completed = esql.exp`COALESCE(MV_COUNT(FIELD_EXTRACT(${dataCol}, ${esql.str(
    'investigations.completed_at'
  )})), 0)`;
  return query.pipe`EVAL ${esql.col(INVESTIGATION_STATE_COLUMN)} = CASE(${started} == 0, ${esql.str(
    'not_started'
  )}, ${completed} < ${started}, ${esql.str('in_progress')}, ${esql.str('completed')})`;
};

const SORT_RANK_COLUMN = 'sort_rank';

/** Orders the latest revisions for the paginated list; ties fall back to newest first. */
const applySort = (
  query: ComposerQuery,
  sortField: SignificantEventsSortField | undefined,
  sortOrder: SignificantEventsSortOrder = 'desc'
): ComposerQuery => {
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  switch (sortField) {
    case 'created_at':
      return query.sort(['created_at', direction], ['@timestamp', 'DESC'], ['_id', 'ASC']);
    case 'severity':
      return query.pipe`EVAL ${esql.col(SORT_RANK_COLUMN)} = CASE(${esql.col(
        'severity'
      )} == ${esql.str('critical')}, 4, ${esql.col('severity')} == ${esql.str(
        'high'
      )}, 3, ${esql.col('severity')} == ${esql.str('low')}, 1, 2)`.sort(
        [SORT_RANK_COLUMN, direction],
        ['created_at', 'DESC'],
        ['_id', 'ASC']
      );
    case 'status':
      // A missing alert.status decodes as active (see decodeSignificantEvent).
      return query.pipe`EVAL ${esql.col(SORT_RANK_COLUMN)} = CASE(${esql.col(
        'alert.status'
      )} == ${esql.str(ALERT_EPISODE_STATUS.INACTIVE)}, 1, ${esql.col(
        'alert.status'
      )} == ${esql.str(ALERT_EPISODE_STATUS.RECOVERING)}, 2, 3)`.sort(
        [SORT_RANK_COLUMN, direction],
        ['created_at', 'DESC'],
        ['_id', 'ASC']
      );
    default:
      return query.sort(['@timestamp', 'DESC'], ['_id', 'ASC']);
  }
};

const countBy = async <Key extends string>({
  esClient,
  query,
  column,
  keys,
}: {
  esClient: ElasticsearchClient;
  query: ComposerQuery;
  column: string;
  keys: readonly Key[];
}): Promise<Record<Key, number>> => {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<Key, number>;
  try {
    const rows = esqlToObjects<Record<string, unknown>>(
      await queryEsql({
        esClient,
        query: query.pipe`STATS count = COUNT(*) BY ${esql.col(column)}`,
      })
    );
    for (const row of rows) {
      const key = row[column];
      if (typeof key === 'string' && key in counts) {
        counts[key as Key] = Number(row.count) || 0;
      }
    }
    return counts;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return counts;
    }
    throw error;
  }
};

export type UpdateEventResult =
  | { updated: true }
  /** Not written: another writer got there first (`head`), or the series could not be read back. */
  | { updated: false; head?: SignificantEvent };

export type UpdateEventStatusResult =
  | { updated: 1; ignored: 0; status: SignificantEventStatus }
  | {
      updated: 0;
      ignored: 1;
      status: SignificantEventStatus;
      reason: LifecycleSkipReason | 'not_found' | 'superseded';
    };

/** A rule's membership in one live series, with that member's latest stored signal. */
export interface LiveRuleMembership {
  eventId: string | undefined;
  status: SignificantEventStatus;
  verdict: SignalVerdict;
  /** The stored verification query, absent when the signal ran no query. */
  esqlQuery: string | undefined;
  /** Whether the stored query found rows when the verdict was made. */
  evidenceFound: boolean;
  /** When this member's signal was last verified: the agent's last verdict for the rule. */
  verifiedAt: string | undefined;
  /** When the series was opened: its earliest version. */
  createdAt: string | undefined;
  /** The sources the series covers. */
  sourceIds: string[];
  /** The series' title, for saying which event a decision rests on. */
  eventTitle: string | undefined;
}

/**
 * `.rule-events` client used by agent-side call sites (`event_search`, `event_write`'s dedup scan,
 * `attach_investigation`, SML): reads, plus `createEvent` / `updateEvent` / `updateEventStatus` to
 * write versions. Query strategy (which ES|QL extraction form to use per field) is validated
 * per-shape on nightshift-program#1492 and #1517 before this client's output is trusted in
 * production.
 *
 * Not implemented here:
 * - `findLatestActive`, topology/continuation search, `attach` — agent/discovery reads (#1517).
 */
export class RuleEventsClient {
  constructor(
    private readonly clients: {
      esClient: ElasticsearchClient;
      space: string;
      getAlertEventsClient?: () => Promise<AlertEventsClientApi>;
      emitTrigger?: TriggerEmitter;
    }
  ) {}

  private buildLatestByCurrentStateQuery(
    options: RuleEventsCurrentStateSearchOptions
  ): ComposerQuery {
    // `created_at` is the earliest `@timestamp` for the series. Compute it across the full lineage
    // before latest-reduction so a later time bound cannot hide the series' true creation time.
    let query = buildBaseQuery(this.clients.space)
      .pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(GROUP_HASH_FIELD)}`;

    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);

    // Free-text, lifetime overlap, and status/severity run on the latest revision. Filtering the
    // lineage first would promote a matching historical write to the returned current state.
    const searchWhere = buildFreeTextWhere(options.search);
    if (searchWhere) {
      query = query.where`${searchWhere}`;
    }

    query = applyLifetimeOverlap({
      query,
      from: options.from,
      to: options.to,
      activeWhere: esql.exp`${esql.col(
        'alert.status'
      )} IN (${SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS.map((status) => esql.str(status))})`,
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
    if (options.sourceIds?.length) {
      query = query.where`${sourceIdsIntersects(options.sourceIds)}`;
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
    if (options.investigationStates?.length) {
      query = withInvestigationState(query).where`${esql.col(
        INVESTIGATION_STATE_COLUMN
      )} IN (${options.investigationStates.map((state) => esql.str(state))})`;
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

    const dataQuery = applySort(
      withDataJsonProjection(this.buildLatestByCurrentStateQuery(options)),
      options.sortField,
      options.sortOrder
    )
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

  /** Counts the latest revisions per severity, status and investigation state. */
  async countFacets(
    options: RuleEventsCurrentStateSearchOptions
  ): Promise<SignificantEventsFacets> {
    const { esClient } = this.clients;
    const [severity, status, investigation] = await Promise.all([
      countBy({
        esClient,
        query: this.buildLatestByCurrentStateQuery({ ...options, severity: undefined }),
        column: 'severity',
        keys: SEVERITY_OPTIONS,
      }),
      countBy({
        esClient,
        // A missing alert.status decodes as active (see decodeSignificantEvent).
        query: this.buildLatestByCurrentStateQuery({ ...options, status: undefined })
          .pipe`EVAL event_status = COALESCE(${esql.col('alert.status')}, ${esql.str(
          ALERT_EPISODE_STATUS.ACTIVE
        )})`,
        column: 'event_status',
        keys: SIGNIFICANT_EVENT_STATUS_OPTIONS,
      }),
      countBy({
        esClient,
        query: withInvestigationState(
          this.buildLatestByCurrentStateQuery({ ...options, investigationStates: undefined })
        ),
        column: INVESTIGATION_STATE_COLUMN,
        keys: SIGNIFICANT_EVENT_INVESTIGATION_STATES,
      }),
    ]);

    return { severity, status, investigation };
  }

  async findLatestByCurrentStateBatch(
    options: RuleEventsBatchSearchOptions
  ): Promise<{ hits: SignificantEventResponse[]; lastGroupHash?: string }> {
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

    return {
      hits: hits.map(decodeSignificantEventResponse),
      lastGroupHash: hits.at(-1)?.[GROUP_HASH_FIELD],
    };
  }

  /**
   * Returns the latest version per `group_hash` for all active ("open") events within the given
   * time range, optionally narrowed to candidate source/rule identities so the scan stays
   * proportional to the write batch instead of the whole space. Filters on the persisted
   * `alert.status` column instead of a top-level `status` column, and reads `source_ids` /
   * `signals.metadata.rule_uuid` through `FIELD_EXTRACT` since both live in the flattened `data`
   * column.
   *
   * Capped at MAX_DEDUP_SCAN_LIMIT distinct active events.
   */
  async findLatestActive(
    options: CommonSearchOptions & { sourceIds?: string[]; ruleUuids?: string[] }
  ): Promise<{ hits: SignificantEvent[] }> {
    let query = applyTimeRange({
      query: buildBaseQuery(this.clients.space),
      from: options.from,
      to: options.to,
    });

    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);

    query = query.where`${esql.col('alert.status')} IN (${SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS.map(
      (status) => esql.str(status)
    )})`;

    if (options.sourceIds?.length) {
      query = query.where`${sourceIdsIntersects(options.sourceIds)}`;
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

  /**
   * Reads, in one query, the live series (`active` or `recovering`) the requested rules are members
   * of, with each member's latest stored signal. A rule in none is absent from the map.
   *
   * `from` bounds the read on a series' latest version, applied after `created_at` is computed over
   * the whole lineage: bounding earlier would clip `created_at` and make an old series look young.
   * A live series with no write since `from` is read as "not a live member", which sends its
   * detections to the agent. Capped at MAX_DEDUP_SCAN_LIMIT series, newest first; a space with more
   * can omit older ones, which callers must read the same way.
   */
  async findLiveMemberships({
    ruleUuids,
    from,
  }: {
    ruleUuids: string[];
    from: string;
  }): Promise<Map<string, LiveRuleMembership[]>> {
    const live = new Map<string, LiveRuleMembership[]>();
    if (ruleUuids.length === 0) return live;

    const requested = new Set(ruleUuids);
    const lineage = buildBaseQuery(this.clients.space)
      .pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(GROUP_HASH_FIELD)}`;
    const query = applyTimeRange({
      query: pickLatestPerGroup(lineage, GROUP_HASH_FIELD),
      from,
    }).where`${ruleUuidsIntersects(ruleUuids)}`;
    const rows = await executeEsqlQuery<RuleEventSourceRowWithCreatedAt>({
      esClient: this.clients.esClient,
      query: withDataJsonProjection(query)
        .sort(['@timestamp', 'DESC'], ['_id', 'ASC'])
        .keep('_source', 'data_json', 'created_at')
        .limit(MAX_DEDUP_SCAN_LIMIT),
      fields: ['data_json', 'created_at'],
    });

    for (const row of rows) {
      const event = decodeSignificantEvent(row);
      if (!(SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS as readonly string[]).includes(event.status)) {
        continue;
      }
      for (const signal of event.signals ?? []) {
        const ruleUuid = signal.metadata.rule_uuid;
        if (!ruleUuid || !requested.has(ruleUuid)) continue;
        live.set(ruleUuid, [
          ...(live.get(ruleUuid) ?? []),
          {
            eventId: event.event_id,
            status: event.status,
            verdict: signal.verdict,
            esqlQuery: signal.evidence?.esql_query,
            evidenceFound: signal.evidence?.result === 'found',
            verifiedAt: signal.collected_at,
            createdAt: row.created_at,
            sourceIds: event.source_ids,
            eventTitle: event.title,
          },
        ]);
      }
    }
    return live;
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

  /** Writes the first version of an event; unguarded, as there is no prior version to compare. */
  async createEvent({ event }: { event: SignificantEvent }): Promise<void> {
    await this.writeVersion({ event });
  }

  /** Writes the next version only while `prior` is still the head (best effort, not atomic). */
  async updateEvent({
    event,
    prior,
  }: {
    event: SignificantEvent;
    prior: SignificantEvent;
  }): Promise<UpdateEventResult> {
    // A head that cannot be read back is not a version to build on.
    const head = await this.findLatestByEventId(event.event_id);
    if (head === undefined || head['@timestamp'] !== prior['@timestamp']) {
      return { updated: false, head };
    }

    await this.writeVersion({ event, prior });
    return { updated: true };
  }

  /** Applies a status change to one event: the lifecycle controller decides, `updateEvent` writes. */
  async updateEventStatus({
    eventId,
    change,
    assessmentNote,
    expectedTimestamp,
  }: {
    eventId: string;
    change: StatusChange;
    assessmentNote?: string;
    /** Skips the write when the latest version's `@timestamp` differs (the event changed since). */
    expectedTimestamp?: string;
  }): Promise<UpdateEventStatusResult> {
    const latest = await this.findLatestByEventId(eventId);
    if (!latest) {
      return { updated: 0, ignored: 1, status: requestedStatus(change), reason: 'not_found' };
    }
    if (expectedTimestamp !== undefined && latest['@timestamp'] !== expectedTimestamp) {
      return { updated: 0, ignored: 1, status: latest.status, reason: 'superseded' };
    }

    const decision = decideStatusChange({
      latest,
      change,
      assessmentNote: assessmentNote?.trim()
        ? assessmentNote
        : change.kind === 'operator'
        ? operatorFallbackAssessmentNote(change.status)
        : undefined,
      timestamp: new Date().toISOString(),
    });
    if (!decision.write) {
      return { updated: 0, ignored: 1, status: decision.status, reason: decision.reason };
    }

    const written = await this.updateEvent({ event: decision.event, prior: latest });
    if (!written.updated) {
      return {
        updated: 0,
        ignored: 1,
        status: written.head?.status ?? latest.status,
        reason: 'superseded',
      };
    }

    return { updated: 1, ignored: 0, status: decision.event.status };
  }

  private async writeVersion({
    event,
    prior,
  }: {
    event: SignificantEvent;
    prior?: SignificantEvent;
  }): Promise<void> {
    const { getAlertEventsClient, emitTrigger } = this.clients;
    if (!getAlertEventsClient) {
      throw new Error('RuleEventsClient was created without a writer, so it cannot write events');
    }

    const alertEventsClient = await getAlertEventsClient();
    // `createAlertEvent` waits for a refresh, so the new version is readable immediately.
    await alertEventsClient.createAlertEvent(toRuleEvent(event));
    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: event,
      priorSignificantEvent: prior,
    });
  }
}
