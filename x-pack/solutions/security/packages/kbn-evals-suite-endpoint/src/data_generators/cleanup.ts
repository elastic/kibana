/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const EVAL_SEEDED_INDICES = [
  'metrics-endpoint.metadata-default',
  'metrics-endpoint.metadata_current_*',
  '.metrics-endpoint.metadata_united_*',
  'logs-elastic_agent.endpoint_security-default',
  'logs-endpoint.alerts-default',
  'logs-endpoint.events.process-default',
  'logs-endpoint.events.file-default',
  'logs-endpoint.events.network-default',
  'logs-endpoint.events.registry-default',
  'metrics-endpoint.metrics-default',
  'metrics-endpoint.policy-default',
];

const RESTRICTED_INDICES = [
  '.fleet-agents',
  '.logs-endpoint.actions-default',
  '.logs-endpoint.action.responses-default',
];

/**
 * Suite id namespaces MUST stay disjoint: neither prefix may be a prefix of the
 * other, or an ES `prefix` delete on one reclaims the other suite's documents.
 */
export const TROUBLESHOOTING_AGENT_ID_PREFIX = 'eval-agent-ts-';
export const FORENSIC_AGENT_ID_PREFIX = 'eval-agent-forensic-';
export const POLICY_MANAGEMENT_AGENT_ID_PREFIX = 'eval-agent-pm-';
export const RESPONSE_ACTIONS_AGENT_ID_PREFIX = 'eval-agent-era-';
export const DEFEND_INSIGHTS_AGENT_ID_PREFIX = 'eval-agent-di-';

/** Workflow insights (written by the POST route's post-create callback) target the seeded agent ids. */
const WORKFLOW_INSIGHTS_INDEX = '.edr-workflow-insights-default';
/** The persisted generation documents of the Defend Insights route (one data stream per space). */
const DEFEND_INSIGHTS_INDEX = '.kibana-elastic-ai-assistant-defend-insights-*';

interface CleanupClients {
  esClient: Client;
  internalEsClient: Client;
}

/**
 * Deletes matching documents, including from hidden indices and data streams (the Defend Insights
 * store is hidden, so a default `expand_wildcards` silently matches nothing). Without a `log` the
 * result is ignored, as in the other suites; with one, the deleted and version-conflict counts are
 * logged (conflicts as a warning) and errors are reported as warnings instead of swallowed.
 */
const deleteByQuerySafe = async ({
  client,
  index,
  query,
  log,
}: {
  client: Client;
  index: string;
  query: Record<string, unknown>;
  log?: ToolingLog;
}): Promise<number> => {
  try {
    const { deleted = 0, version_conflicts: versionConflicts = 0 } = await client.deleteByQuery({
      index,
      query,
      refresh: true,
      ignore_unavailable: true,
      expand_wildcards: ['open', 'hidden'],
      // Concurrent writers (the route's background run) must not turn a cleanup into a 409 failure.
      conflicts: 'proceed',
    });
    const summary = `cleanup ${index}: deleted ${deleted}, ${versionConflicts} version conflicts skipped`;
    // Skipped documents survive the cleanup and can leak into the next run, so make them visible.
    if (versionConflicts > 0) {
      log?.warning(summary);
    } else {
      log?.info(summary);
    }
    return deleted;
  } catch (e) {
    log?.warning(`cleanup ${index} failed: ${e instanceof Error ? e.message : String(e)}`);
    return 0;
  }
};

async function cleanupSeededData({
  esClient,
  internalEsClient,
  agentIdPrefix,
  log,
}: CleanupClients & {
  agentIdPrefix: string;
  log?: ToolingLog;
}): Promise<void> {
  const query = { prefix: { 'agent.id': agentIdPrefix } };

  await Promise.all([
    ...EVAL_SEEDED_INDICES.map((index) =>
      deleteByQuerySafe({ client: esClient, index, query, log })
    ),
    ...RESTRICTED_INDICES.map((index) =>
      deleteByQuerySafe({ client: internalEsClient, index, query, log })
    ),
  ]);
}

export async function cleanupTroubleshootingData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: TROUBLESHOOTING_AGENT_ID_PREFIX });
}

export async function cleanupForensicData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: FORENSIC_AGENT_ID_PREFIX });
}

export async function cleanupPolicyManagementSeededData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: POLICY_MANAGEMENT_AGENT_ID_PREFIX });
}

export async function cleanupResponseActionsData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: RESPONSE_ACTIONS_AGENT_ID_PREFIX });
}

export async function cleanupDefendInsightsData({
  esClient,
  internalEsClient,
  log,
}: CleanupClients & { log: ToolingLog }): Promise<void> {
  await cleanupSeededData({
    esClient,
    internalEsClient,
    agentIdPrefix: DEFEND_INSIGHTS_AGENT_ID_PREFIX,
    log,
  });

  await Promise.all([
    deleteByQuerySafe({
      client: internalEsClient,
      index: WORKFLOW_INSIGHTS_INDEX,
      query: { prefix: { 'target.ids': DEFEND_INSIGHTS_AGENT_ID_PREFIX } },
      log,
    }),
    deleteByQuerySafe({
      client: internalEsClient,
      index: DEFEND_INSIGHTS_INDEX,
      query: { prefix: { endpoint_ids: DEFEND_INSIGHTS_AGENT_ID_PREFIX } },
      log,
    }),
  ]);
}
