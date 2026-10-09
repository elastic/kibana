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
  TRIAGE_STALE_TAG,
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

/**
 * Open alerts still needing triage, plus the claimed ones in a separate query so a claim on a
 * low-risk alert is still seen when the backlog exceeds one search window.
 */
export const fetchTriageAlerts = async (
  api: KibanaApi,
  analysisTagPrefix: string
): Promise<TriageAlert[]> => {
  const openStatus = { terms: { [ALERT_FIELDS.status]: [...OPEN_ALERT_STATUSES] } };
  const [unclaimed, claimed] = await Promise.all([
    searchAlerts(api, {
      bool: {
        filter: [openStatus],
        must_not: [
          {
            terms: {
              [ALERT_FIELDS.tags]: [
                ...VERDICT_TAGS,
                TRIAGE_FAILED_TAG,
                TRIAGE_STALE_TAG,
                TRIAGE_PENDING_TAG,
              ],
            },
          },
          { prefix: { [ALERT_FIELDS.tags]: analysisTagPrefix } },
        ],
      },
    }),
    searchAlerts(api, {
      bool: { filter: [openStatus, { term: { [ALERT_FIELDS.tags]: TRIAGE_PENDING_TAG } }] },
    }),
  ]);
  return [...unclaimed, ...claimed];
};

export const tagAlerts =
  ({ callKibanaApi }: KibanaApi): SweepPorts['tagAlerts'] =>
  async ({ alertIds, add, remove }) => {
    await callKibanaApi({
      method: 'POST',
      path: SIGNALS_TAGS_PATH,
      body: { ids: alertIds, tags: { tags_to_add: add, tags_to_remove: remove } },
    });
  };
