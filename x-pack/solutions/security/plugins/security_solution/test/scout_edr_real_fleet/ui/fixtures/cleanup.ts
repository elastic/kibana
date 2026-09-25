/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-security';
import { deleteAllEndpointData } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import {
  deleteAgentPolicy,
  fetchFleetAgents,
  unEnrollFleetAgent,
} from '../../../../scripts/endpoint/common/fleet_services';
import type { StartedFleetServer } from '../../../../scripts/endpoint/common/fleet_server/fleet_server_services';

const TEST_SUPERUSER = 'super_superuser';
const TEST_SUPERUSER_ROLE = 'superuser_restricted_indices';
const FLEET_SERVER_SERVICE_TOKENS_PATH = '_security/service/elastic/fleet-server/credential/token';

const warn = (log: ScoutLogger, message: string, error: unknown): void => {
  log.warning(`[edr_real_fleet] ${message}: ${error}`);
};

const deleteTestSuperuser = async (esClient: EsClient, log: ScoutLogger): Promise<void> => {
  await esClient.transport
    .request({ method: 'DELETE', path: `_security/user/${TEST_SUPERUSER}` })
    .catch((error) => {
      warn(log, `delete ${TEST_SUPERUSER} failed`, error);
    });
  await esClient.transport
    .request({ method: 'DELETE', path: `_security/role/${TEST_SUPERUSER_ROLE}` })
    .catch((error) => {
      warn(log, `delete ${TEST_SUPERUSER_ROLE} role failed`, error);
    });
};

/**
 * Deletes Endpoint documents for the agent, then removes the temporary
 * `super_superuser` account `deleteAllEndpointData` creates for restricted indices.
 */
export const deleteEndpointDataAndTestSuperuser = async (
  esClient: EsClient,
  log: ScoutLogger,
  agentIds: string[]
): Promise<void> => {
  await deleteAllEndpointData(esClient, log, agentIds);
  await deleteTestSuperuser(esClient, log);
};

const deleteFleetServerServiceTokens = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  const response = await esClient.transport
    .request<{ tokens?: Record<string, unknown> }>({
      method: 'GET',
      path: FLEET_SERVER_SERVICE_TOKENS_PATH,
    })
    .catch((error) => {
      warn(log, 'list Fleet Server service tokens failed', error);
      return undefined;
    });

  const tokenNames = Object.keys(response?.tokens ?? {});
  await Promise.all(
    tokenNames.map((tokenName) =>
      esClient.transport
        .request({
          method: 'DELETE',
          path: `${FLEET_SERVER_SERVICE_TOKENS_PATH}/${tokenName}`,
        })
        .catch((error) => {
          warn(log, `delete Fleet Server service token ${tokenName} failed`, error);
        })
    )
  );
};

/**
 * Stops the Fleet Server container and removes the policy, enrolled Fleet
 * Server agent, and service tokens created for this worker.
 */
export const stopAndDeleteFleetServer = async (
  kbnClient: KbnClient,
  esClient: EsClient,
  log: ScoutLogger,
  fleetServer: StartedFleetServer
): Promise<void> => {
  await fleetServer.stop();

  const agents = await fetchFleetAgents(kbnClient, {
    perPage: 100,
    kuery: `policy_id:"${fleetServer.policyId}"`,
    showInactive: true,
  }).catch((error) => {
    warn(log, `list Fleet Server policy agents failed`, error);
    return { items: [] };
  });

  await Promise.all(
    agents.items.map((agent) =>
      unEnrollFleetAgent(kbnClient, agent.id, true).catch((error) => {
        warn(log, `unenroll Fleet Server agent ${agent.id} failed`, error);
      })
    )
  );

  await deleteAgentPolicy(kbnClient, fleetServer.policyId);
  await deleteFleetServerServiceTokens(esClient, log);
};
