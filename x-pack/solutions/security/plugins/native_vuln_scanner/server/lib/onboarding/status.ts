/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import type {
  ElasticsearchClient,
  ISavedObjectsRepository,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AgentClient, AgentPolicyServiceInterface } from '@kbn/fleet-plugin/server';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import {
  findInventoryScheduleIds,
  INVENTORY_PACK_INTERVAL_SECONDS,
  inventoryResultsQuery,
  OSQUERY_RESULTS_INDEX,
} from '../inventory';
import type { SummaryDoc } from '../summary';
import { SUMMARY_INDEX } from '../summary';
import type { PackInspection } from './pack_state';
import { inspectInventoryPack } from './pack_state';
import { mergeRuntimePin } from './runtime_pin';

/** osquery_manager versions below this cannot run osquerybeat in a separate process. */
export const MIN_OSQUERY_MANAGER_VERSION = '0.6.0';
export const OSQUERY_MANAGER_PACKAGE = 'osquery_manager';

/** Policies listed per request. Policies beyond the cap are not reported. */
export const POLICY_LIST_CAP = 1000;
/** Agents listed per request. Agents beyond the cap are not joined to a policy; see `agentsTruncated`. */
export const AGENT_LIST_CAP = 5000;
const KUERY_POLICY_BATCH = 100;

/** Results younger than two pack intervals still show an agent as reporting. */
const REPORTING_WINDOW = `now-${2 * INVENTORY_PACK_INTERVAL_SECONDS}s`;

export type PolicyOnboardingState =
  | 'not_configured'
  | 'pending_inventory'
  | 'reporting'
  | 'scanned';

export interface PolicyStatus {
  id: string;
  name: string;
  packAssigned: boolean;
  runtimePinned: boolean;
  agents: { total: number; online: number };
  reportingInventory: number;
  state: PolicyOnboardingState;
}

export interface OnboardingStatus {
  license: 'ok';
  pack: PackInspection;
  policies: PolicyStatus[];
  /** Policies without a usable osquery_manager integration. */
  needs_osquery_integration: Array<{ id: string; name: string }>;
  lastScan: SummaryDoc | null;
  schedule: { installed: boolean; enabled: boolean };
  scanRunning: boolean;
  /** True when the agent list hit `AGENT_LIST_CAP`, so per-policy counts may be low. */
  agentsTruncated: boolean;
}

export interface OnboardingDeps {
  request: KibanaRequest;
  /** Request-scoped: policies and packs are read as the caller. */
  soClient: SavedObjectsClientContract;
  /** Origin-only under CPS: results and the run summary live in this project. */
  es: ElasticsearchClient;
  packRepository: ISavedObjectsRepository;
  agentPolicyService: Pick<AgentPolicyServiceInterface, 'list'>;
  agentClient: Pick<AgentClient, 'listAgents'>;
  workflows: Pick<WorkflowsManagementApi, 'getWorkflow' | 'getWorkflowExecutions'>;
}

export const hasUsableOsqueryManager = (policy: AgentPolicy): boolean =>
  (policy.package_policies ?? []).some(
    ({ package: pkg }) =>
      pkg?.name === OSQUERY_MANAGER_PACKAGE &&
      semver.valid(pkg.version) !== null &&
      semver.satisfies(pkg.version, `>=${MIN_OSQUERY_MANAGER_VERSION}`)
  );

const escapeKueryValue = (value: string): string => value.replace(/(["\\])/g, '\\$1');

export const policyAgentsKuery = (policyIds: readonly string[]): string =>
  `policy_id:(${policyIds.map((id) => `"${escapeKueryValue(id)}"`).join(' or ')})`;

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

interface AgentRef {
  id: string;
  policyId: string;
  online: boolean;
}

const listAgents = async (
  agentClient: OnboardingDeps['agentClient'],
  policyIds: readonly string[]
): Promise<{ agents: AgentRef[]; truncated: boolean }> => {
  const agents: AgentRef[] = [];
  let truncated = false;
  for (const batch of chunk(policyIds, KUERY_POLICY_BATCH)) {
    const remaining = AGENT_LIST_CAP - agents.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const result = await agentClient.listAgents({
      showInactive: false,
      perPage: remaining,
      page: 1,
      kuery: policyAgentsKuery(batch),
    });
    for (const { id, policy_id: policyId, status } of result.agents) {
      if (policyId) agents.push({ id, policyId, online: status === 'online' });
    }
    if (result.total > result.agents.length) truncated = true;
  }
  return { agents, truncated };
};

/** Agents (of the given ones) that sent an inventory result within the reporting window. */
const findReportingAgentIds = async (
  { es, packRepository }: Pick<OnboardingDeps, 'es' | 'packRepository'>,
  agentIds: readonly string[]
): Promise<Set<string>> => {
  if (agentIds.length === 0) return new Set();
  const scheduleIds = Object.values(await findInventoryScheduleIds(packRepository)).flat();
  const reporting = new Set<string>();
  for (const batch of chunk(agentIds, 1000)) {
    const response = await es.search<unknown, { reporting: { buckets: Array<{ key: string }> } }>({
      index: OSQUERY_RESULTS_INDEX,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          // The same filters as the scan's reader: scheduled and live results both count.
          filter: [
            inventoryResultsQuery(scheduleIds, REPORTING_WINDOW),
            { terms: { 'agent.id': batch } },
          ],
        },
      },
      aggs: { reporting: { terms: { field: 'agent.id', size: batch.length } } },
    });
    for (const { key } of response.aggregations?.reporting.buckets ?? []) reporting.add(key);
  }
  return reporting;
};

const readLastScan = async (es: ElasticsearchClient): Promise<SummaryDoc | null> => {
  const response = await es.search<SummaryDoc>({
    index: SUMMARY_INDEX,
    ignore_unavailable: true,
    size: 1,
    sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
  });
  return response.hits.hits[0]?._source ?? null;
};

export const isScanRunning = async ({
  workflows,
  request,
}: Pick<OnboardingDeps, 'workflows' | 'request'>): Promise<boolean> => {
  const { total } = await workflows.getWorkflowExecutions(
    {
      workflowId: NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
      statuses: [...NonTerminalExecutionStatuses],
      size: 1,
      request,
    },
    DEFAULT_SPACE_ID
  );
  return total > 0;
};

const isRuntimePinned = (policy: AgentPolicy): boolean => {
  const settings = policy.advanced_settings;
  const internal = settings ? settings.agent_internal : undefined;
  if (internal !== undefined && internal !== null && typeof internal !== 'string') return false;
  const merge = mergeRuntimePin(internal);
  return merge.ok && !merge.changed;
};

const policyState = (
  { packAssigned, runtimePinned, reportingInventory }: Omit<PolicyStatus, 'state'>,
  scanned: boolean
): PolicyOnboardingState => {
  if (!packAssigned || !runtimePinned) return 'not_configured';
  if (reportingInventory === 0) return 'pending_inventory';
  return scanned ? 'scanned' : 'reporting';
};

export const collectOnboardingStatus = async (deps: OnboardingDeps): Promise<OnboardingStatus> => {
  const { soClient, es, agentPolicyService, agentClient, workflows, request } = deps;
  const [pack, { items }, lastScan, workflow, scanRunning] = await Promise.all([
    inspectInventoryPack(soClient),
    agentPolicyService.list(soClient, { perPage: POLICY_LIST_CAP, withPackagePolicies: true }),
    readLastScan(es),
    workflows.getWorkflow(NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID, DEFAULT_SPACE_ID, request),
    isScanRunning(deps),
  ]);

  const eligible = items.filter(hasUsableOsqueryManager);
  const { agents, truncated } = await listAgents(
    agentClient,
    eligible.map(({ id }) => id)
  );
  const reportingIds = await findReportingAgentIds(
    deps,
    agents.map(({ id }) => id)
  );
  // Coarse by design: the run summary is global, so a successful scan marks every reporting policy.
  const scanned =
    lastScan !== null &&
    (lastScan.status === 'success' || lastScan.status === 'partial') &&
    lastScan.hosts_scanned > 0;

  const policies = eligible.map((policy): PolicyStatus => {
    const own = agents.filter(({ policyId }) => policyId === policy.id);
    const base = {
      id: policy.id,
      name: policy.name,
      packAssigned: pack.policyIds.includes(policy.id),
      runtimePinned: isRuntimePinned(policy),
      agents: { total: own.length, online: own.filter(({ online }) => online).length },
      reportingInventory: own.filter(({ id }) => reportingIds.has(id)).length,
    };
    return { ...base, state: policyState(base, scanned) };
  });

  return {
    license: 'ok',
    pack,
    policies,
    needs_osquery_integration: items
      .filter((policy) => !hasUsableOsqueryManager(policy))
      .map(({ id, name }) => ({ id, name })),
    lastScan,
    schedule: { installed: workflow !== null, enabled: workflow?.enabled === true },
    scanRunning,
    agentsTruncated: truncated,
  };
};
