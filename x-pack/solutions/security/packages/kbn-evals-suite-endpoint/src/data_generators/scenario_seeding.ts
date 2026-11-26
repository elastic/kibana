/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { METADATA_UNITED_TRANSFORM } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { cleanupTroubleshootingData } from './cleanup';
import {
  SCENARIOS,
  seedScenario,
  waitForEndpointPackage,
  waitForTransformPropagation,
} from './endpoint_data';

const UNITED_TRANSFORM_WILDCARD = `${METADATA_UNITED_TRANSFORM}*`;
const ALL_SCENARIO_COUNT = Object.keys(SCENARIOS).length;

/**
 * Shared suite seeding: waits for the endpoint package and transforms, warms
 * the agent, cleans stale data, seeds every troubleshooting scenario, and waits
 * for transform propagation. Returns the united transform id so the caller's
 * afterAll can defensively restart it.
 */
export async function seedTroubleshootingScenarios({
  kbnClient,
  esClient,
  internalEsClient,
  agentBuilderClient,
  log,
}: {
  kbnClient: KbnClient;
  esClient: Client;
  internalEsClient: Client;
  agentBuilderClient: AgentBuilderClient;
  log: ToolingLog;
}): Promise<string> {
  await waitForEndpointPackage(kbnClient, esClient, log);

  const { transforms } = await esClient.transform.getTransformStats({
    transform_id: UNITED_TRANSFORM_WILDCARD,
  });
  const unitedTransformId = transforms[0].id;

  try {
    await agentBuilderClient.converse({
      agentId: agentBuilderDefaultAgentId,
      input: 'hello',
    });
  } catch (e) {
    log.warning(`Warmup failed: ${e}`);
  }

  const clients = { esClient, internalEsClient };
  await cleanupTroubleshootingData(clients);

  // Seeding is batched here because transform propagation is slow.
  for (const scenario of Object.values(SCENARIOS)) {
    await seedScenario(clients, scenario);
  }

  await waitForTransformPropagation(esClient, log, {
    metadataCurrent: ALL_SCENARIO_COUNT,
    metadataUnited: ALL_SCENARIO_COUNT,
  });

  return unitedTransformId;
}
