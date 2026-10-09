/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  ALERT_FETCH_LIMIT,
  OPEN_ALERT_STATUSES,
  TRIAGE_FAILED_TAG,
  TRIAGE_PENDING_TAG,
  VERDICT_TAGS,
} from '../../alert_triage/constants';
import type { SweepPorts } from '../../alert_triage/plan_sweep';
import type { TriageAlert } from '../../alert_triage/types';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

// Security Solution's detection-engine routes. Hard-coded because alertzero cannot import the
// security_solution constants.
const SIGNALS_SEARCH_PATH = '/api/detection_engine/signals/search';
const SIGNALS_TAGS_PATH = '/api/detection_engine/signals/tags';

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
  tags: 'kibana.alert.workflow_tags',
  timestamp: '@timestamp',
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
  return {
    id: _id,
    ruleId: String(readField(_source, ALERT_FIELDS.ruleId) ?? ''),
    ruleName: String(readField(_source, ALERT_FIELDS.ruleName) ?? ''),
    riskScore: Number(readField(_source, ALERT_FIELDS.riskScore) ?? 0),
    timestamp: typeof timestamp === 'number' ? timestamp : Date.parse(String(timestamp)) || 0,
    status: String(readField(_source, ALERT_FIELDS.status) ?? ''),
    tags: Array.isArray(tags) ? tags.map(String) : [],
  };
};

export const listLiveExecutionIds = async (
  { callKibanaApi }: KibanaApi,
  batchWorkflowId: string
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
  } catch {
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
      sort: [{ [ALERT_FIELDS.riskScore]: 'desc' }, { [ALERT_FIELDS.timestamp]: 'asc' }],
      query,
    },
  });
  return (body.hits?.hits ?? []).map(toTriageAlert);
};

/** Alerts no triage or analysis has touched: no verdict, failure, claim or analysis tag. */
const UNTRIAGED_MUST_NOT = (analysisTagPrefix: string) => [
  { terms: { [ALERT_FIELDS.tags]: [...VERDICT_TAGS, TRIAGE_FAILED_TAG, TRIAGE_PENDING_TAG] } },
  { prefix: { [ALERT_FIELDS.tags]: analysisTagPrefix } },
];

/**
 * Open alerts created since `windowStart` that still need triage, so the look-back is the search
 * window and older alerts are never read or tagged. Claimed alerts come from a separate query with
 * no time bound, so a claim on a low-risk or aged-out alert is still seen and can be reclaimed.
 */
export const fetchTriageAlerts = async (
  api: KibanaApi,
  analysisTagPrefix: string,
  windowStart: number
): Promise<TriageAlert[]> => {
  const openStatus = { terms: { [ALERT_FIELDS.status]: [...OPEN_ALERT_STATUSES] } };
  const [unclaimed, claimed] = await Promise.all([
    searchAlerts(api, {
      bool: {
        filter: [
          openStatus,
          { range: { [ALERT_FIELDS.timestamp]: { gte: new Date(windowStart).toISOString() } } },
        ],
        must_not: UNTRIAGED_MUST_NOT(analysisTagPrefix),
      },
    }),
    searchAlerts(api, {
      bool: { filter: [openStatus, { term: { [ALERT_FIELDS.tags]: TRIAGE_PENDING_TAG } }] },
    }),
  ]);
  return [...unclaimed, ...claimed];
};

/** The tags route returns Elasticsearch's update-by-query response, which can be a 200 with gaps. */
interface UpdateByQueryResult {
  timed_out?: boolean;
  failures?: unknown[];
}

/**
 * Throws unless the whole update was applied: a claim or release that was only partly stored would
 * otherwise be reported as done, and the next sweep could plan the same alerts again.
 */
export const tagAlerts =
  ({ callKibanaApi }: KibanaApi): SweepPorts['tagAlerts'] =>
  async ({ alertIds, add, remove }) => {
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
  };

/** One count query, no writes: open alerts older than the look-back that were never triaged. */
export const countAgedOutAlerts = async (
  { callKibanaApi }: KibanaApi,
  analysisTagPrefix: string,
  windowStart: number
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
          ],
          must_not: UNTRIAGED_MUST_NOT(analysisTagPrefix),
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

/** Loads a batch's alert documents by id, as `{ _id, _index, ...source }` for Alert Analysis. */
export const loadAlertsByIds = async (
  { callKibanaApi }: KibanaApi,
  alertIds: readonly string[]
): Promise<LoadedAlerts> => {
  const { body } = await callKibanaApi<{
    hits?: { hits?: Array<AlertHit & { _index?: string }> };
  }>({
    method: 'POST',
    path: SIGNALS_SEARCH_PATH,
    body: { size: alertIds.length, query: { ids: { values: alertIds } } },
  });
  const hits = body.hits?.hits ?? [];
  const found = new Set(hits.map(({ _id }) => _id));
  return {
    alerts: hits.map(({ _id, _index, _source = {} }) => ({ ..._source, _id, _index })),
    missingAlertIds: alertIds.filter((id) => !found.has(id)),
  };
};
