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
  // Forensic kill-chain event indices (see forensic_data.ts) — reclaimed by the
  // `eval-agent-forensic-` scope so the forensic smoke suite can run concurrently
  // with automatic_troubleshooting.spec.ts without either cleanup wiping the other.
  'logs-endpoint.events.file-default',
  'logs-endpoint.events.network-default',
  'logs-endpoint.events.registry-default',
  'metrics-endpoint.metrics-default',
  'metrics-endpoint.policy-default',
];

const RESTRICTED_INDICES = ['.fleet-agents'];

/**
 * Troubleshooting scenarios in endpoint_data.ts seed `eval-agent-av-001`,
 * `eval-agent-policy-001`, ... — i.e. the shared `eval-agent-` prefix.
 */
const TROUBLESHOOTING_AGENT_ID_PREFIX = 'eval-agent-';

/** Forensic smoke suite seeds (see FORENSIC_AGENT_PREFIX in forensic_data.ts). */
const FORENSIC_AGENT_ID_PREFIX = 'eval-agent-forensic-';

interface CleanupClients {
  esClient: Client;
  internalEsClient: Client;
}

/**
 * Delete seeded documents whose `agent.id` starts with `agentIdPrefix`.
 *
 * The prefix is REQUIRED and suite-scoped so one suite's cleanup can never reclaim
 * another suite's freshly-seeded data when Playwright schedules the two spec files
 * on different workers (keep test suites independent). Do NOT widen a suite's prefix
 * to cover another suite's ids.
 */
async function cleanupSeededData({
  esClient,
  internalEsClient,
  agentIdPrefix,
}: CleanupClients & {
  /** Only delete documents whose `agent.id` starts with this prefix. */
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

/**
 * Reclaim only the automatic_troubleshooting scenario documents. Scoped to the
 * troubleshooting agent ids so it never touches the forensic suite's seeds.
 */
export async function cleanupTroubleshootingData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: TROUBLESHOOTING_AGENT_ID_PREFIX });
}

/**
 * Reclaim only the endpoint_forensic_analysis smoke-suite kill chain. Scoped to
 * `eval-agent-forensic-` so it never touches the troubleshooting suite's seeds.
 */
export async function cleanupForensicData(clients: CleanupClients): Promise<void> {
  return cleanupSeededData({ ...clients, agentIdPrefix: FORENSIC_AGENT_ID_PREFIX });
}
