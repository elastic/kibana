/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';

/**
 * Indices whose seeded documents carry the seeded agent id as `agent.id`.
 */
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
  // Response-action documents: the action request and its per-agent response.
  // Leaving these out leaves the seeded golden action ids in the cluster, so a
  // later run reads a previous run's documents while `afterAll` reports a clean
  // teardown.
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX,
];

const RESTRICTED_INDICES = ['.fleet-agents'];

/**
 * Fleet action indices. Their documents are NOT keyed by `agent.id`, so they
 * need their own delete field: `.fleet-actions` carries an `agents` array and
 * `.fleet-actions-results` an `agent_id`. Both are ES system indices, hence the
 * internal client plus the Fleet product-origin header.
 */
const FLEET_ACTION_INDICES: Array<{ index: string; agentIdField: string }> = [
  { index: AGENT_ACTIONS_INDEX, agentIdField: 'agents' },
  { index: AGENT_ACTIONS_RESULTS_INDEX, agentIdField: 'agent_id' },
];

const FLEET_PRODUCT_ORIGIN_HEADERS = { headers: { 'X-elastic-product-origin': 'fleet' } };

/**
 * Suite id namespaces MUST stay disjoint: neither prefix may be a prefix of the
 * other, or an ES `prefix` delete on one reclaims the other suite's documents.
 */
export const TROUBLESHOOTING_AGENT_ID_PREFIX = 'eval-agent-ts-';
export const FORENSIC_AGENT_ID_PREFIX = 'eval-agent-forensic-';
export const POLICY_MANAGEMENT_AGENT_ID_PREFIX = 'eval-agent-pm-';
export const RESPONSE_ACTIONS_AGENT_ID_PREFIX = 'eval-agent-era-';

interface CleanupClients {
  esClient: Client;
  internalEsClient: Client;
}

async function deleteSeededDocs(
  client: Client,
  index: string,
  agentIdField: string,
  agentIdPrefix: string,
  options?: Parameters<Client['deleteByQuery']>[1]
): Promise<void> {
  const request = {
    index,
    query: { prefix: { [agentIdField]: agentIdPrefix } },
    refresh: true,
    ignore_unavailable: true,
  };

  // Pass the options argument only when there is one: callers assert the
  // single-argument form, and an explicit `undefined` counts as a second
  // argument to jest.
  const call = options ? client.deleteByQuery(request, options) : client.deleteByQuery(request);

  await call.catch(() => {});
}

async function cleanupSeededData({
  esClient,
  internalEsClient,
  agentIdPrefix,
}: CleanupClients & {
  agentIdPrefix: string;
}): Promise<void> {
  await Promise.all([
    ...EVAL_SEEDED_INDICES.map((index) =>
      deleteSeededDocs(esClient, index, 'agent.id', agentIdPrefix)
    ),
    ...RESTRICTED_INDICES.map((index) =>
      deleteSeededDocs(internalEsClient, index, 'agent.id', agentIdPrefix)
    ),
    ...FLEET_ACTION_INDICES.map(({ index, agentIdField }) =>
      deleteSeededDocs(
        internalEsClient,
        index,
        agentIdField,
        agentIdPrefix,
        FLEET_PRODUCT_ORIGIN_HEADERS
      )
    ),
  ]);
}

export async function cleanupTroubleshootingData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: TROUBLESHOOTING_AGENT_ID_PREFIX });
}

export async function cleanupResponseActionsData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: RESPONSE_ACTIONS_AGENT_ID_PREFIX });
}

export async function cleanupForensicData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: FORENSIC_AGENT_ID_PREFIX });
}

export async function cleanupPolicyManagementSeededData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: POLICY_MANAGEMENT_AGENT_ID_PREFIX });
}
