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
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  SIGNIFICANT_EVENTS_SEVERITY_MAP,
  SIGNIFICANT_EVENTS_STATUS_MAP,
  type SignificantEvent,
  type SignificantEventResponse,
  type Severity,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type {
  CommonSearchOptions,
  PaginatedResponse,
  PaginatedSearchOptions,
} from '../query_utils';
import {
  applyTimeRange,
  executeCountQuery,
  executeEsqlQuery,
  pickLatestPerGroup,
} from '../latest_source_query';
import { RULE_EVENTS_INDEX } from '../alerting/rule_events_metric_series';

/** `.rule-events` groups a series of writes by `group_hash`, not `event_id` (unavailable as a column). */
const GROUP_HASH_FIELD = 'group_hash';

/**
 * Reverse of {@link SIGNIFICANT_EVENTS_STATUS_MAP}. Hand-typed rather than derived by inversion:
 * unlike the severity map, `SIGNIFICANT_EVENTS_STATUS_MAP` is a lossy 2:1 mapping (`closed` and
 * `dismissed` both write `inactive`), so `Object.fromEntries(Object.entries(map).map(...))` would
 * pick whichever of `closed`/`dismissed` happens to be inserted last — not necessarily `closed`.
 * This is a known limitation of `.rule-events` as a read source (see `SIGNIFICANT_EVENTS_STATUS_MAP`
 * doc comment): `dismissed` is indistinguishable from `closed` post-write, so `inactive` always
 * decodes to `closed` here by explicit choice, not by accident of iteration order.
 *
 * `AlertEventsClient.createAlertEvent` persists the `alert_status` *input* under the nested
 * `episode.status` field — there is no top-level `alert_status` column on `.rule-events`
 * (`alert_events.ts` mapping). `pending`/`recovering` are never written by Significant Events
 * (only `active`/`inactive` per `SIGNIFICANT_EVENTS_STATUS_MAP`), so they fall back to `open`.
 */
const EPISODE_STATUS_TO_SIGNIFICANT_EVENT_STATUS: Record<
  AlertEpisodeStatus,
  SignificantEventStatus
> = {
  [ALERT_EPISODE_STATUS.ACTIVE]: 'open',
  [ALERT_EPISODE_STATUS.INACTIVE]: 'closed',
  [ALERT_EPISODE_STATUS.PENDING]: 'open',
  [ALERT_EPISODE_STATUS.RECOVERING]: 'open',
};

/**
 * Reverse of {@link SIGNIFICANT_EVENTS_SEVERITY_MAP}, keyed by the canonical
 * {@link AlertEventSeverity} vocabulary (`@kbn/alerting-v2-schemas`) rather than a hand-typed union.
 * Derived by inversion — safe because `SIGNIFICANT_EVENTS_SEVERITY_MAP` is a bijection onto the
 * 4 levels Significant Events writes. `info` is the one `AlertEventSeverity` Significant Events
 * never produces (see `SIGNIFICANT_EVENTS_SEVERITY_MAP`), so it isn't a key here; `decodeSignificantEvent`
 * falls back below rather than indexing it directly.
 */
const RULE_EVENT_SEVERITY_TO_SIGNIFICANT_EVENT_SEVERITY: Partial<
  Record<AlertEventSeverity, Severity>
> = Object.fromEntries(
  Object.entries(SIGNIFICANT_EVENTS_SEVERITY_MAP).map(([severity, ruleEventSeverity]) => [
    ruleEventSeverity,
    severity,
  ])
);

export interface RuleEventsFilterOptions {
  status?: SignificantEventStatus[];
  severity?: Severity[];
  search?: string;
}

type RuleEventsCurrentStateSearchOptions = CommonSearchOptions & RuleEventsFilterOptions;

export type RuleEventsPaginatedSearchOptions = PaginatedSearchOptions & RuleEventsFilterOptions;

export type RuleEventsBatchSearchOptions = RuleEventsCurrentStateSearchOptions & {
  // Named `afterGroupHash`, not `afterEventId` like `EventClient`'s equivalent cursor: the keyset
  // here is `group_hash` (the only stable per-series column `.rule-events` carries — see
  // `GROUP_HASH_FIELD`), not `event_id`. Callers must pass `hits[last].event_uuid` (which holds
  // `group_hash`, per `decodeSignificantEvent`), not `hits[last].event_id`.
  afterGroupHash?: string;
  batchSize: number;
};

/** Raw decoded `_source` row, plus the derived columns every query in this client projects. */
interface RuleEventSourceRow {
  '@timestamp': string;
  [GROUP_HASH_FIELD]: string;
  severity?: AlertEventSeverity;
  episode?: { status?: AlertEpisodeStatus };
  data_json: string;
}

type RuleEventSourceRowWithCreatedAt = RuleEventSourceRow & { created_at: string };

/**
 * Decodes a `.rule-events` row into a `SignificantEvent`. `data_json` (via `JSON_EXTRACT`) carries
 * the fields `toRuleEvent` copied under `data` (`event_id`, `title`, `summary`, `stream_names`, …);
 * `@timestamp`, `episode.status`, and `severity` are read from the top-level document.
 *
 * `event_uuid` is not persisted to `.rule-events` at all (see the class doc comment), so
 * `group_hash` — the closest stable per-series identifier this index carries — stands in for it.
 * Callers that need the real `event_uuid` must keep using `EventClient`.
 */
const decodeSignificantEvent = (row: RuleEventSourceRow): SignificantEvent => {
  const data = JSON.parse(row.data_json || '{}') as Omit<
    SignificantEvent,
    '@timestamp' | 'event_uuid' | 'status' | 'severity'
  >;
  return {
    ...data,
    '@timestamp': row['@timestamp'],
    event_uuid: row[GROUP_HASH_FIELD],
    status:
      EPISODE_STATUS_TO_SIGNIFICANT_EVENT_STATUS[
        row.episode?.status ?? ALERT_EPISODE_STATUS.ACTIVE
      ],
    // `RULE_EVENT_SEVERITY_TO_SIGNIFICANT_EVENT_SEVERITY` has no `info` entry (Significant Events
    // never writes it) — fall back to `'40-medium'` for any row this reader wasn't built to expect.
    severity:
      RULE_EVENT_SEVERITY_TO_SIGNIFICANT_EVENT_SEVERITY[row.severity ?? 'medium'] ?? '40-medium',
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

const eventIdEquals = (eventId: string): ESQLAstExpression =>
  esql.exp`FIELD_EXTRACT(${esql.col('data')}, ${esql.str('event_id')}) == ${esql.str(eventId)}`;

const eventIdIn = (eventIds: string[]): ESQLAstExpression =>
  esql.exp`FIELD_EXTRACT(${esql.col('data')}, ${esql.str('event_id')}) IN (${eventIds.map((id) =>
    esql.str(id)
  )})`;

/**
 * Read-only `.rule-events` counterpart to `EventClient`, returned by `EventService.getClient()`
 * when `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ` is enabled. Query strategy (which ES|QL extraction
 * form to use per field) is validated per-shape on nightshift-program#1492 before this client's
 * output is trusted in production.
 *
 * Not implemented here:
 * - `findLatestActive`, topology/continuation search, `attach` — agent/discovery reads (#1517).
 * - Lookup by `event_uuid` — that identifier is never written to `.rule-events`; callers needing
 *   it must keep using `EventClient` directly.
 * - Writes (`bulkCreate`) and workflow triggers (`emitTrigger`) — this class is read-only.
 *
 * **`event_uuid` on every result is a stand-in, not a real identifier** (see `decodeSignificantEvent`):
 * it holds `group_hash`, which stays constant across every version of a series. Do not use it for
 * optimistic-concurrency checks or `previous_event_uuid` chaining (see `update_event_status.ts`) —
 * those require a value that changes per write, which `.rule-events` does not currently persist.
 */
export class RuleEventsClient {
  constructor(private readonly clients: { esClient: ElasticsearchClient; space: string }) {}

  private buildLatestByCurrentStateQuery(
    options: RuleEventsCurrentStateSearchOptions
  ): ComposerQuery {
    // `created_at` reflects the earliest (historical) `@timestamp` for the series, so it must be
    // computed before `applyTimeRange` narrows the row set — otherwise a `from` bound would hide
    // the series' true creation time.
    let query = buildBaseQuery(this.clients.space)
      .pipe`INLINE STATS created_at = MIN(@timestamp) BY ${esql.col(GROUP_HASH_FIELD)}`;

    query = applyTimeRange({ query, from: options.from, to: options.to });

    // Free-text search runs pre-latest (against the full lineage); status/severity run post-latest
    // (against only the current state) so a stale revision cannot make a closed series look open.
    const searchWhere = buildFreeTextWhere(options.search);
    if (searchWhere) {
      query = query.where`${searchWhere}`;
    }

    query = pickLatestPerGroup(query, GROUP_HASH_FIELD);

    if (options.status?.length) {
      // `episode.status` — the nested field `AlertEventsClient.createAlertEvent` persists the
      // `alert_status` input under (see `EPISODE_STATUS_TO_SIGNIFICANT_EVENT_STATUS` doc comment).
      query = query.where`${esql.col('episode.status')} IN (${options.status.map((status) =>
        esql.str(SIGNIFICANT_EVENTS_STATUS_MAP[status])
      )})`;
    }
    if (options.severity?.length) {
      query = query.where`${esql.col('severity')} IN (${options.severity.map((severity) =>
        esql.str(SIGNIFICANT_EVENTS_SEVERITY_MAP[severity])
      )})`;
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

  async findLatestByCurrentStatePaginated(
    options: RuleEventsPaginatedSearchOptions
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
