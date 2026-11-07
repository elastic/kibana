/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  ALERT_FETCH_LIMIT,
  TAG_CHUNK_SIZE,
  ALERT_SEVERITIES,
  BATCH_ALERT_CAP,
  OPEN_ALERT_STATUSES,
  RULE_FETCH_LIMIT,
  TRIAGE_FAILED_TAG,
  TRIAGE_PENDING_TAG,
  TRIAGE_WOULD_CLOSE_TAG_PREFIX,
  TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX,
  TRIAGE_WOULD_SKIP_TAG_PREFIX,
  VERDICT_TAGS,
  type AlertSeverity,
} from '../../alert_triage/constants';
import { LOADED_ALERT_FIELDS } from '../../alert_triage/loaded_alert_fields';
import { PATTERN_KEY_FIELDS, getDetection } from '../../alert_triage/pattern_key';
import type { SweepPorts } from '../../alert_triage/plan_sweep';
import type { MatchCandidate } from '../../alert_triage/fp_decisions';
import type { TriageAlert } from '../../alert_triage/types';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

// Security Solution's detection-engine routes. Hard-coded because alertzero cannot import the
// security_solution constants.
const SIGNALS_SEARCH_PATH = '/api/detection_engine/signals/search';
const SIGNALS_TAGS_PATH = '/api/detection_engine/signals/tags';
const SIGNALS_STATUS_PATH = '/api/detection_engine/signals/status';
const NOTE_PATH = '/api/note';

const WORKFLOW_RUN_TASK_TYPE = 'workflow:run';

/** Statuses in which a batch holds or waits for work, as `coverage_worker.yaml` lists them. */
const LIVE_STATUSES = [
  'pending',
  'queued',
  'waiting',
  'waiting_for_input',
  'waiting_for_child',
  'running',
];

const ALERT_FIELDS = {
  ruleId: 'kibana.alert.rule.uuid',
  ruleName: 'kibana.alert.rule.name',
  riskScore: 'kibana.alert.risk_score',
  status: 'kibana.alert.workflow_status',
  reason: 'kibana.alert.workflow_reason',
  tags: 'kibana.alert.workflow_tags',
  timestamp: '@timestamp',
  nameOverride: 'kibana.alert.rule.rule_name_override',
  defendRuleId: 'rule.id',
  eventCode: 'event.code',
} as const;

const readField = (source: Record<string, unknown>, field: string): unknown => {
  if (field in source) return source[field];
  return field
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)[key]
          : undefined,
      source
    );
};

interface AlertHit {
  _id: string;
  _source?: Record<string, unknown>;
}

const toTriageAlert = ({ _id, _source = {} }: AlertHit): TriageAlert => {
  const tags = readField(_source, ALERT_FIELDS.tags);
  const timestamp = readField(_source, ALERT_FIELDS.timestamp);
  const detection = getDetection(_source);
  return {
    id: _id,
    ruleId: String(readField(_source, ALERT_FIELDS.ruleId) ?? ''),
    ruleName: String(readField(_source, ALERT_FIELDS.ruleName) ?? ''),
    ...(detection ? { detection } : {}),
    riskScore: Number(readField(_source, ALERT_FIELDS.riskScore) ?? 0),
    timestamp: typeof timestamp === 'number' ? timestamp : Date.parse(String(timestamp)) || 0,
    status: String(readField(_source, ALERT_FIELDS.status) ?? ''),
    tags: Array.isArray(tags) ? tags.map(String) : [],
  };
};

export const listLiveExecutionIds = async (
  { callKibanaApi }: KibanaApi,
  batchWorkflowId: string,
  logger?: Pick<StepHandlerContext['logger'], 'warn'>
): Promise<Set<string> | undefined> => {
  try {
    const statuses = LIVE_STATUSES.map((status) => `statuses=${status}`).join('&');
    const { body } = await callKibanaApi<{ results?: Array<{ id: string }> }>({
      method: 'GET',
      path: `/api/workflows/workflow/${encodeURIComponent(
        batchWorkflowId
      )}/executions?${statuses}&size=100`,
    });
    return Array.isArray(body?.results) ? new Set(body.results.map(({ id }) => id)) : undefined;
  } catch (error) {
    logger?.warn(
      `Could not list live executions of ${batchWorkflowId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

/** Age of the oldest overdue `workflow:run` task. Cluster-wide, see `readHeadroom`. */
export const readWorkflowRunLagMs = async (
  taskManager: Pick<TaskManagerStartContract, 'aggregate'>,
  now: number
): Promise<number> => {
  const response = await taskManager.aggregate({
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'task.taskType': WORKFLOW_RUN_TASK_TYPE } },
          { term: { 'task.status': 'idle' } },
          { range: { 'task.runAt': { lte: new Date(now).toISOString() } } },
        ],
      },
    },
    aggs: { oldest: { min: { field: 'task.runAt' } } },
  });
  const oldest = (response.aggregations?.oldest as { value: number | null } | undefined)?.value;
  return typeof oldest === 'number' ? Math.max(0, now - oldest) : 0;
};

/** Most urgent first: highest risk, then oldest. */
const URGENCY_SORT = [{ [ALERT_FIELDS.riskScore]: 'desc' }, { [ALERT_FIELDS.timestamp]: 'asc' }];

const searchAlerts = async (
  { callKibanaApi }: KibanaApi,
  query: Record<string, unknown>
): Promise<TriageAlert[]> => {
  const { body } = await callKibanaApi<{ hits?: { hits?: AlertHit[] } }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: ALERT_FETCH_LIMIT,
      _source: Object.values(ALERT_FIELDS),
      sort: URGENCY_SORT,
      query,
    },
  });
  return (body.hits?.hits ?? []).map(toTriageAlert);
};

/**
 * The most urgent alerts of each rule, rules ordered by their most urgent alert. A batch holds at
 * most `BATCH_ALERT_CAP` alerts, so a rule with a large backlog contributes one batch's worth and
 * cannot fill the result and crowd quieter rules out of the plan.
 */
const searchAlertsPerRule = async (
  { callKibanaApi }: KibanaApi,
  query: Record<string, unknown>
): Promise<TriageAlert[]> => {
  const { body } = await callKibanaApi<{
    aggregations?: { rules?: { buckets?: Array<{ top?: { hits?: { hits?: AlertHit[] } } }> } };
  }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: 0,
      query,
      aggs: {
        rules: {
          terms: {
            field: ALERT_FIELDS.ruleId,
            size: RULE_FETCH_LIMIT,
            order: [{ most_urgent_risk: 'desc' }, { oldest: 'asc' }],
          },
          aggs: {
            most_urgent_risk: { max: { field: ALERT_FIELDS.riskScore } },
            oldest: { min: { field: ALERT_FIELDS.timestamp } },
            top: {
              top_hits: {
                size: BATCH_ALERT_CAP,
                _source: Object.values(ALERT_FIELDS),
                sort: URGENCY_SORT,
              },
            },
          },
        },
      },
    },
  });
  const buckets = body.aggregations?.rules?.buckets;
  // An empty result would read as an idle queue, so a response without the aggregation fails.
  if (buckets === undefined) throw new Error('Per-rule alerts missing from the search response');
  return buckets.flatMap(({ top }) => (top?.hits?.hits ?? []).map(toTriageAlert));
};

/** Alerts no triage or analysis has touched: no verdict, failure, claim or analysis tag. */
const UNTRIAGED_MUST_NOT = (analysisTagPrefix: string) => [
  { terms: { [ALERT_FIELDS.tags]: [...VERDICT_TAGS, TRIAGE_FAILED_TAG, TRIAGE_PENDING_TAG] } },
  { prefix: { [ALERT_FIELDS.tags]: analysisTagPrefix } },
];

export interface TriageFilters {
  minSeverity: AlertSeverity;
  excludeBuildingBlocks: boolean;
  excludedRuleTags: readonly string[];
}

// Filter-only fields: kept out of `ALERT_FIELDS`, which also decides which fields are fetched.
const SEVERITY_FIELD = 'kibana.alert.severity';
const BUILDING_BLOCK_TYPE_FIELD = 'kibana.alert.building_block_type';
const RULE_TAGS_FIELD = 'kibana.alert.rule.tags';

/** Alerts the settings keep from ever reaching a Worker, beyond the untriaged check. */
const excludedByFilters = ({ excludeBuildingBlocks, excludedRuleTags }: TriageFilters) => [
  ...(excludeBuildingBlocks ? [{ exists: { field: BUILDING_BLOCK_TYPE_FIELD } }] : []),
  ...(excludedRuleTags.length > 0 ? [{ terms: { [RULE_TAGS_FIELD]: [...excludedRuleTags] } }] : []),
];

/** No clause for `low`: the lowest severity admits every alert, including ones with no severity. */
const severityFilter = (minSeverity: AlertSeverity) =>
  minSeverity === ALERT_SEVERITIES[0]
    ? []
    : [
        {
          terms: {
            [SEVERITY_FIELD]: ALERT_SEVERITIES.slice(ALERT_SEVERITIES.indexOf(minSeverity)),
          },
        },
      ];

/** Claimed alerts the settings now exclude, so a stale claim is released but not planned again. */
const searchExcludedClaims = async (
  api: KibanaApi,
  filters: TriageFilters
): Promise<Set<string>> => {
  const severity = severityFilter(filters.minSeverity);
  const excluded = excludedByFilters(filters);
  if (severity.length === 0 && excluded.length === 0) return new Set();
  const alerts = await searchAlerts(api, {
    bool: {
      filter: [
        { terms: { [ALERT_FIELDS.status]: [...OPEN_ALERT_STATUSES] } },
        { term: { [ALERT_FIELDS.tags]: TRIAGE_PENDING_TAG } },
      ],
      // The negation of the unclaimed search's own conditions, so both read the settings the same way.
      must_not: [{ bool: { filter: severity, must_not: excluded } }],
    },
  });
  return new Set(alerts.map(({ id }) => id));
};

/**
 * Open alerts created since `windowStart` that still need triage, so the look-back is the search
 * window and older alerts are never read or tagged. They are read per rule, the most urgent
 * `BATCH_ALERT_CAP` of each, so one rule's backlog cannot hide the others. Claimed alerts come from
 * a separate query with no time bound, so a claim on a low-risk or aged-out alert is still seen and
 * can be reclaimed. Claims the settings now exclude are flagged so they are released, not re-planned.
 */
export const fetchTriageAlerts = async (
  api: KibanaApi,
  analysisTagPrefix: string,
  windowStart: number,
  filters: TriageFilters
): Promise<TriageAlert[]> => {
  const openStatus = { terms: { [ALERT_FIELDS.status]: [...OPEN_ALERT_STATUSES] } };
  const [unclaimed, claimed, excludedClaimIds] = await Promise.all([
    searchAlertsPerRule(api, {
      bool: {
        filter: [
          openStatus,
          { range: { [ALERT_FIELDS.timestamp]: { gte: new Date(windowStart).toISOString() } } },
          ...severityFilter(filters.minSeverity),
        ],
        must_not: [...UNTRIAGED_MUST_NOT(analysisTagPrefix), ...excludedByFilters(filters)],
      },
    }),
    searchAlerts(api, {
      bool: { filter: [openStatus, { term: { [ALERT_FIELDS.tags]: TRIAGE_PENDING_TAG } }] },
    }),
    searchExcludedClaims(api, filters),
  ]);
  return [
    ...unclaimed,
    ...claimed.map((alert) =>
      excludedClaimIds.has(alert.id) ? { ...alert, excludedBySettings: true } : alert
    ),
  ];
};

/** The tags route returns Elasticsearch's update-by-query response, which can be a 200 with gaps. */
interface UpdateByQueryResult {
  timed_out?: boolean;
  failures?: unknown[];
}

const TAG_ATTEMPTS = 3;
const VERSION_CONFLICT_STATUS = 409;

/**
 * Throws unless the whole update was applied: a claim or release that was only partly stored would
 * otherwise be reported as done, and the next sweep could plan the same alerts again. The route
 * answers 409 when another writer changed an alert between its search and its write (a batch
 * tagging a verdict, the rule engine, an analyst). Adding or removing a tag is idempotent, so the
 * call is repeated: the search runs again and sees the current version.
 */
export const tagAlerts =
  ({ callKibanaApi }: KibanaApi): SweepPorts['tagAlerts'] =>
  async ({ alertIds, add, remove }) => {
    for (let attempt = 1; ; attempt++) {
      try {
        const { body } = await callKibanaApi<UpdateByQueryResult>({
          method: 'POST',
          path: SIGNALS_TAGS_PATH,
          body: { ids: alertIds, tags: { tags_to_add: add, tags_to_remove: remove } },
        });
        const failureCount = body.failures?.length ?? 0;
        if (body.timed_out === true || failureCount > 0) {
          throw new Error(
            `Tagging ${alertIds.length} alert(s) was not fully applied (timed_out: ${
              body.timed_out === true
            }, failures: ${failureCount})`
          );
        }
        return;
      } catch (error) {
        const conflict =
          error instanceof KibanaApiCallError && error.status === VERSION_CONFLICT_STATUS;
        if (!conflict || attempt >= TAG_ATTEMPTS) throw error;
      }
    }
  };

/**
 * Closes alerts as false positives, the reason the closure action records. Throws unless every
 * alert was updated: a close that was only partly applied must not be reported as done.
 */
export const closeAlertsAsFalsePositive = (api: KibanaApi, alertIds: readonly string[]) =>
  updateAlertStatus(api, alertIds, { status: 'closed', reason: 'false_positive' });

/** Reopens alerts, in the chunks the status route takes. Throws unless every alert was updated. */
export const openAlerts = async (api: KibanaApi, alertIds: readonly string[]): Promise<void> => {
  for (let from = 0; from < alertIds.length; from += TAG_CHUNK_SIZE) {
    await updateAlertStatus(api, alertIds.slice(from, from + TAG_CHUNK_SIZE), { status: 'open' });
  }
};

/** Which of the given alerts are still open or acknowledged. Used to undo a tag after a failed close. */
export const findOpenAlertIds = (api: KibanaApi, alertIds: readonly string[]): Promise<string[]> =>
  findAlertIdsWithStatus(api, alertIds, OPEN_ALERT_STATUSES);

/** Which of the given alerts are still closed. Used by revoke, so it never overrides a later analyst decision. */
export const findClosedAlertIds = (
  api: KibanaApi,
  alertIds: readonly string[]
): Promise<string[]> => findAlertIdsWithStatus(api, alertIds, ['closed']);

const findAlertIdsWithStatus = async (
  { callKibanaApi }: KibanaApi,
  alertIds: readonly string[],
  statuses: readonly string[]
): Promise<string[]> => {
  const { body } = await callKibanaApi<{ hits?: { hits?: AlertHit[] } }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: alertIds.length,
      _source: false,
      query: {
        bool: {
          filter: [
            { ids: { values: [...alertIds] } },
            { terms: { [ALERT_FIELDS.status]: [...statuses] } },
          ],
        },
      },
    },
  });
  return (body.hits?.hits ?? []).map(({ _id }) => _id);
};

/** The ids of the alerts that carry a tag, up to one page. Used by revoke to find what to put back. */
export const findAlertIdsByTag = async (
  { callKibanaApi }: KibanaApi,
  tag: string
): Promise<string[]> => {
  const { body } = await callKibanaApi<{ hits?: { hits?: AlertHit[] } }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: ALERT_FETCH_LIMIT,
      _source: false,
      query: { bool: { filter: [{ term: { [ALERT_FIELDS.tags]: tag } }] } },
    },
  });
  return (body.hits?.hits ?? []).map(({ _id }) => _id);
};

const updateAlertStatus = async (
  { callKibanaApi }: KibanaApi,
  alertIds: readonly string[],
  change: { status: 'open' | 'closed'; reason?: 'false_positive' }
): Promise<void> => {
  const { body } = await callKibanaApi<{
    updated?: number;
    version_conflicts?: number;
    failures?: unknown[];
  }>({
    method: 'POST',
    path: SIGNALS_STATUS_PATH,
    body: { signal_ids: alertIds, ...change },
  });
  const failureCount = body.failures?.length ?? 0;
  if (failureCount > 0 || (body.updated ?? 0) < alertIds.length) {
    throw new Error(
      `Setting ${alertIds.length} alert(s) to ${change.status} was not fully applied (updated: ${
        body.updated ?? 0
      }, conflicts: ${body.version_conflicts ?? 0}, failures: ${failureCount})`
    );
  }
};

/**
 * Writes the given notes, `concurrency` at a time, because the notes route takes one note per call.
 * It starts no note after `deadline`. Never throws: returns how many notes were not written, those
 * that failed and those it did not start.
 */
export const writeAlertNotes = async (
  { callKibanaApi }: KibanaApi,
  notes: ReadonlyArray<{ alertId: string; note: string }>,
  { concurrency, deadline }: { concurrency: number; deadline: number }
): Promise<number> => {
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < notes.length && Date.now() <= deadline) {
      const { alertId, note } = notes[next++];
      try {
        await callKibanaApi({
          method: 'PATCH',
          path: NOTE_PATH,
          body: { note: { eventId: alertId, timelineId: '', note } },
        });
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, notes.length) }, worker));
  return failed + (notes.length - next);
};

/**
 * Alerts one decision closed in the last 24 hours, for its daily cap. shortcut: it relies on
 * `kibana.alert.workflow_status_updated_at`, which every closed alert carries; if a mapping lacks
 * it the count is 0 and only the per-sweep cap applies. Upgrade to a stored counter if that matters.
 */
export const countClosedByDecision = async (
  { callKibanaApi }: KibanaApi,
  decisionId: string,
  since: number
): Promise<number> => {
  const { body } = await callKibanaApi<{ hits?: { total?: { value?: number } | number } }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            {
              term: { [ALERT_FIELDS.tags]: `${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${decisionId}` },
            },
            {
              range: {
                'kibana.alert.workflow_status_updated_at': { gte: new Date(since).toISOString() },
              },
            },
          ],
        },
      },
    },
  });
  const total = body.hits?.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
};

/** One count query, no writes: open alerts older than the look-back that were never triaged. */
export const countAgedOutAlerts = async (
  { callKibanaApi }: KibanaApi,
  analysisTagPrefix: string,
  windowStart: number,
  filters: TriageFilters
): Promise<number> => {
  const { body } = await callKibanaApi<{ hits?: { total?: { value?: number } | number } }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { terms: { [ALERT_FIELDS.status]: [...OPEN_ALERT_STATUSES] } },
            { range: { [ALERT_FIELDS.timestamp]: { lt: new Date(windowStart).toISOString() } } },
            ...severityFilter(filters.minSeverity),
          ],
          must_not: [...UNTRIAGED_MUST_NOT(analysisTagPrefix), ...excludedByFilters(filters)],
        },
      },
    },
  });
  const total = body.hits?.total;
  if (typeof total === 'number') return total;
  if (typeof total?.value === 'number') return total.value;
  throw new Error('Aged-out alert count missing from the search response');
};

export interface LoadedAlerts {
  alerts: Array<Record<string, unknown>>;
  missingAlertIds: string[];
}

/**
 * The alerts index stores `kibana.*` as flat dotted keys next to nested ECS objects. Alert
 * Analysis requires the nested `kibana.alert.rule.uuid` shape, so dotted keys are expanded.
 */
const expandDottedKeys = (source: Record<string, unknown>): Record<string, unknown> =>
  Object.entries(source).reduce<Record<string, unknown>>((expanded, [key, value]) => {
    if (key.includes('.')) {
      set(expanded, key, value);
    } else {
      expanded[key] = value;
    }
    return expanded;
  }, {});

export interface KeyHistory {
  falsePositive: number;
  truePositive: number;
}

/**
 * How earlier alerts of the same pattern were judged: the false positives and true positives in the
 * period, whatever their status. `excludeIds` are the alerts of the proposal itself, which already
 * carry their verdict tag.
 */
export const readKeyHistory = async (
  { callKibanaApi }: KibanaApi,
  {
    strictKeyTags,
    excludeIds,
    since,
  }: { strictKeyTags: readonly string[]; excludeIds: readonly string[]; since: number }
): Promise<KeyHistory> => {
  const { body } = await callKibanaApi<{
    aggregations?: {
      verdicts?: { buckets?: Record<string, { doc_count?: number }> };
    };
  }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { [ALERT_FIELDS.tags]: [...strictKeyTags] } },
            { range: { [ALERT_FIELDS.timestamp]: { gte: new Date(since).toISOString() } } },
          ],
          must_not: [{ ids: { values: [...excludeIds] } }],
        },
      },
      aggs: {
        verdicts: {
          filters: {
            filters: {
              // Expiry and a failed closure swap `az:false_positive` for `az:inconclusive` and keep
              // `az:model_fp`, so the model's earlier judgement is still counted. An alert with both
              // tags matches once.
              falsePositive: {
                terms: { [ALERT_FIELDS.tags]: ['az:false_positive', 'az:model_fp'] },
              },
              truePositive: { term: { [ALERT_FIELDS.tags]: 'az:true_positive' } },
            },
          },
        },
      },
    },
  });
  const buckets = body.aggregations?.verdicts?.buckets;
  if (buckets === undefined) throw new Error('Key history missing from the search response');
  return {
    falsePositive: buckets.falsePositive?.doc_count ?? 0,
    truePositive: buckets.truePositive?.doc_count ?? 0,
  };
};

/** Keys per search, so the `terms` clauses stay far below the default clause limit. */
const BLOCKED_KEYS_CHUNK = 500;

/**
 * The strict key tags among `keyTags` that some alert carries together with a verdict tag other
 * than false positive. Every alert counts, with no time limit: the consistency rule is about
 * every earlier verdict of the key. A failed read throws, so no decision is written on a guess.
 */
export const findKeyTagsWithVerdicts = async (
  { callKibanaApi }: KibanaApi,
  keyTags: readonly string[],
  verdictTags: readonly string[]
): Promise<Set<string>> => {
  const found = new Set<string>();
  for (let from = 0; from < keyTags.length; from += BLOCKED_KEYS_CHUNK) {
    const chunk = keyTags.slice(from, from + BLOCKED_KEYS_CHUNK);
    const { body } = await callKibanaApi<{
      aggregations?: { keys?: { buckets?: Array<{ key: string }> } };
    }>({
      method: 'POST',
      path: SIGNALS_SEARCH_PATH,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { [ALERT_FIELDS.tags]: chunk } },
              { terms: { [ALERT_FIELDS.tags]: [...verdictTags] } },
            ],
          },
        },
        // `include` keeps only the key tags: the matching alerts carry other tags as well.
        aggs: {
          keys: { terms: { field: ALERT_FIELDS.tags, include: chunk, size: chunk.length } },
        },
      },
    });
    const buckets = body.aggregations?.keys?.buckets;
    if (buckets === undefined) throw new Error('Key verdicts missing from the search response');
    for (const { key } of buckets) found.add(key);
  }
  return found;
};

/** Orders alerts of one timestamp the same way on every page. */
const ALERT_UUID_FIELD = 'kibana.alert.uuid';

/** The status code of an Elasticsearch or Kibana client error, whichever shape the client used. */
export const statusCodeOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { statusCode, meta } = error as { statusCode?: unknown; meta?: { statusCode?: unknown } };
  const code = statusCode ?? meta?.statusCode;
  return typeof code === 'number' ? code : undefined;
};

/**
 * Where the next page of candidates starts: the last timestamp read, and the ids already read at
 * that timestamp. The alerts route drops `search_after`, so a page is read as "from this
 * timestamp on, except these ids" instead.
 */
export interface DecisionCursor {
  timestamp: number;
  seenIds: string[];
}

const nextCursor = (
  hits: ReadonlyArray<{ _id: string; sort?: unknown[] }>,
  lastTimestamp: number,
  previous: DecisionCursor | undefined
): DecisionCursor => {
  const atLast = hits
    .filter(({ sort }) => Number(sort?.[0]) === lastTimestamp)
    .map(({ _id }) => _id);
  // A page that stayed inside one timestamp keeps the ids read there before.
  const earlier = previous?.timestamp === lastTimestamp ? previous.seenIds : [];
  return { timestamp: lastTimestamp, seenIds: [...earlier, ...atLast] };
};

export interface DecisionCandidatesPage {
  candidates: MatchCandidate[];
  /** The cursor of the next page. Absent on the last page. */
  after?: DecisionCursor;
}

/**
 * One page of the open (not acknowledged), untriaged alerts of the look-back that a decision may match, oldest first,
 * so the alerts closest to ageing out are matched first. They are the alerts the planner would
 * consider, not only the ones it picks, so a match never has to wait for a batch. Alerts already
 * tagged by a decision match are left out. Only the fields a key reads are fetched. A page is at
 * most `ALERT_FETCH_LIMIT` alerts; pass `after` of the last page to read the next. A timestamp with
 * more than one page of alerts is read through its `seenIds`, so no alert is read twice or missed.
 */
export const fetchDecisionCandidates = async (
  { callKibanaApi }: KibanaApi,
  analysisTagPrefix: string,
  windowStart: number,
  filters: TriageFilters,
  {
    after,
    includeTaggedByShadow = false,
  }: { after?: DecisionCursor; includeTaggedByShadow?: boolean } = {}
): Promise<DecisionCandidatesPage> => {
  const { body } = await callKibanaApi<{
    hits?: { hits?: Array<AlertHit & { sort?: unknown[] }> };
  }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: {
      size: ALERT_FETCH_LIMIT,
      _source: [...PATTERN_KEY_FIELDS, SEVERITY_FIELD],
      sort: [{ [ALERT_FIELDS.timestamp]: 'asc' }, { [ALERT_UUID_FIELD]: 'asc' }],
      query: {
        bool: {
          filter: [
            // Only `open`: an analyst who acknowledged an alert has taken it, so a decision must not
            // close it or keep it out of analysis.
            { term: { [ALERT_FIELDS.status]: 'open' } },
            { range: { [ALERT_FIELDS.timestamp]: { gte: new Date(windowStart).toISOString() } } },
            ...severityFilter(filters.minSeverity),
            ...(after
              ? [
                  {
                    range: {
                      [ALERT_FIELDS.timestamp]: { gte: after.timestamp, format: 'epoch_millis' },
                    },
                  },
                ]
              : []),
          ],
          must_not: [
            ...UNTRIAGED_MUST_NOT(analysisTagPrefix),
            ...(after ? [{ ids: { values: after.seenIds } }] : []),
            // An alert a decision closed and an analyst reopened keeps this tag. It must not be
            // closed again: the analyst's act wins, and revoke still finds it by the tag.
            { prefix: { [ALERT_FIELDS.tags]: TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX } },
            // In `on` the alerts shadow tagged are the ones to close, so they stay in.
            ...(includeTaggedByShadow
              ? []
              : [
                  { prefix: { [ALERT_FIELDS.tags]: TRIAGE_WOULD_CLOSE_TAG_PREFIX } },
                  { prefix: { [ALERT_FIELDS.tags]: TRIAGE_WOULD_SKIP_TAG_PREFIX } },
                ]),
            ...excludedByFilters(filters),
          ],
        },
      },
    },
  });
  const hits = body.hits?.hits ?? [];
  const lastTimestamp = Number(hits[hits.length - 1]?.sort?.[0]);
  return {
    candidates: hits.map(({ _id, _source = {} }) => {
      const severity = readField(_source, SEVERITY_FIELD);
      return {
        id: _id,
        doc: expandDottedKeys(_source),
        ...(typeof severity === 'string' ? { severity } : {}),
      };
    }),
    ...(hits.length === ALERT_FETCH_LIMIT && Number.isFinite(lastTimestamp)
      ? { after: nextCursor(hits, lastTimestamp, after) }
      : {}),
  };
};

/** Ids per search, so a proposal of up to 1,000 alerts does not exceed the 10 MiB response cap. */
const LOAD_CHUNK_SIZE = 100;

/**
 * Loads alerts by id as `{ _id, _index, ...source }` with only the `LOADED_ALERT_FIELDS`, which are
 * what Alert Analysis, the pattern keys and the proposal text read. The load is in chunks of
 * `LOAD_CHUNK_SIZE` ids, and a failing chunk fails the load.
 */
export const loadAlertsByIds = async (
  { callKibanaApi }: KibanaApi,
  alertIds: readonly string[]
): Promise<LoadedAlerts> => {
  const chunks = Array.from({ length: Math.ceil(alertIds.length / LOAD_CHUNK_SIZE) }, (_, index) =>
    alertIds.slice(index * LOAD_CHUNK_SIZE, (index + 1) * LOAD_CHUNK_SIZE)
  );
  const hits: Array<AlertHit & { _index?: string }> = [];
  for (const ids of chunks) {
    const { body } = await callKibanaApi<{
      hits?: { hits?: Array<AlertHit & { _index?: string }> };
    }>({
      method: 'POST',
      path: SIGNALS_SEARCH_PATH,
      body: {
        size: ids.length,
        query: { ids: { values: ids } },
        _source: LOADED_ALERT_FIELDS,
      },
    });
    hits.push(...(body.hits?.hits ?? []));
  }
  const found = new Set(hits.map(({ _id }) => _id));
  return {
    alerts: hits.map(({ _id, _index, _source = {} }) => ({
      ...expandDottedKeys(_source),
      _id,
      _index,
    })),
    missingAlertIds: alertIds.filter((id) => !found.has(id)),
  };
};

const SEARCH_RESULT_LIMIT = 10_000;

/**
 * Open alerts that still carry `az:false_positive` and belong to a proposal: they carry its
 * `az:proposal` tag or are in `ids`. Alerts in `excludeIds` are left out. With `modelMarkerOnly`
 * it finds alerts of any status that carry `az:model_fp` instead.
 */
export const findLeftoverFalsePositiveIds = async (
  { callKibanaApi }: KibanaApi,
  {
    proposalTag,
    ids,
    excludeIds,
    modelMarkerOnly = false,
  }: {
    proposalTag?: string;
    ids: readonly string[];
    excludeIds: readonly string[];
    modelMarkerOnly?: boolean;
  }
): Promise<string[]> => {
  const should = [
    ...(proposalTag ? [{ term: { [ALERT_FIELDS.tags]: proposalTag } }] : []),
    ...(ids.length > 0 ? [{ ids: { values: [...ids] } }] : []),
  ];
  const { body } = await callKibanaApi<{ hits?: { hits?: Array<{ _id: string }> } }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
/**
 * Which of the given alerts an analyst closed with a reason other than false positive (a true
 * positive, for example). A closed alert with no reason is not one of them. A failed read throws,
 * so no decision is written on a guess.
 */
export const findAlertIdsClosedAsOther = async (
  { callKibanaApi }: KibanaApi,
  alertIds: readonly string[]
): Promise<string[]> => {
  const found: string[] = [];
  // The search reads no `_source` and the filter runs in Elasticsearch, so a chunk can be large.
  for (let from = 0; from < alertIds.length; from += CLOSE_REASON_CHUNK_SIZE) {
    const ids = alertIds.slice(from, from + CLOSE_REASON_CHUNK_SIZE);
    const { body } = await callKibanaApi<{ hits?: { hits?: AlertHit[] } }>({
      method: 'POST',
      path: SIGNALS_SEARCH_PATH,
      body: {
        size: ids.length,
        _source: false,
        query: {
          bool: {
            filter: [
              { ids: { values: ids } },
              { term: { [ALERT_FIELDS.status]: 'closed' } },
              { exists: { field: ALERT_FIELDS.reason } },
            ],
            must_not: [{ term: { [ALERT_FIELDS.reason]: 'false_positive' } }],
          },
        },
      },
    });
    found.push(...(body.hits?.hits ?? []).map(({ _id }) => _id));
  }
  return found;
};

const CLOSE_REASON_CHUNK_SIZE = 1000;

    body: {
      size: SEARCH_RESULT_LIMIT,
      _source: false,
      query: {
        bool: {
          filter: [
            ...(modelMarkerOnly
              ? [{ term: { [ALERT_FIELDS.tags]: 'az:model_fp' } }]
              : [
                  { terms: { [ALERT_FIELDS.status]: [...OPEN_ALERT_STATUSES] } },
                  { term: { [ALERT_FIELDS.tags]: 'az:false_positive' } },
                ]),
          ],
          should,
          minimum_should_match: 1,
          must_not: [{ ids: { values: [...excludeIds] } }],
        },
      },
    },
  });
  return (body.hits?.hits ?? []).map(({ _id }) => _id);
};
