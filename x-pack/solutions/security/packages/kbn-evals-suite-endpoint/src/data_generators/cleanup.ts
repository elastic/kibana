/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

const EVAL_SEEDED_INDICES = [
  'metrics-endpoint.metadata-default',
  'logs-endpoint.events.process-default',
  'metrics-endpoint.policy-default',
];

const RESTRICTED_INDICES = ['.fleet-agents'];
const EVAL_AGENT_ID_PREFIX = 'eval-agent-';

export async function cleanupSeededData({
  esClient,
  internalEsClient,
}: {
  esClient: Client;
  internalEsClient: Client;
}): Promise<void> {
  const deleteQuery = { prefix: { 'agent.id': EVAL_AGENT_ID_PREFIX } };

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
