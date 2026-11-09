/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

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

async function cleanupSeededData({
  esClient,
  internalEsClient,
  agentIdPrefix,
}: CleanupClients & {
  agentIdPrefix: string;
}): Promise<void> {
  const deleteQuery = { prefix: { 'agent.id': agentIdPrefix } };

  await Promise.all([
    ...EVAL_SEEDED_INDICES.map((index) =>
      esClient
        .deleteByQuery({ index, query: deleteQuery, refresh: true, ignore_unavailable: true })
        .catch(() => {})
    ),
    ...RESTRICTED_INDICES.map((index) =>
      internalEsClient
        .deleteByQuery({ index, query: deleteQuery, refresh: true, ignore_unavailable: true })
        .catch(() => {})
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
}: CleanupClients): Promise<void> {
  await cleanupSeededData({
    esClient,
    internalEsClient,
    agentIdPrefix: DEFEND_INSIGHTS_AGENT_ID_PREFIX,
  });

  await Promise.all([
    internalEsClient
      .deleteByQuery({
        index: WORKFLOW_INSIGHTS_INDEX,
        query: { prefix: { 'target.ids': DEFEND_INSIGHTS_AGENT_ID_PREFIX } },
        refresh: true,
        ignore_unavailable: true,
      })
      .catch(() => {}),
    internalEsClient
      .deleteByQuery({
        index: DEFEND_INSIGHTS_INDEX,
        query: { prefix: { endpoint_ids: DEFEND_INSIGHTS_AGENT_ID_PREFIX } },
        refresh: true,
        ignore_unavailable: true,
      })
      .catch(() => {}),
  ]);
}
