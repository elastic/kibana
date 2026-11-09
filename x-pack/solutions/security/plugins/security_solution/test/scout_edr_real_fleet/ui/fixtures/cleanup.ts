/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_SERVER_PACKAGE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-security';
import { deleteAllEndpointData } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import {
  deleteAgentPolicy,
  fetchFleetAgents,
  fetchIntegrationPolicyList,
  unEnrollFleetAgent,
} from '../../../../scripts/endpoint/common/fleet_services';
import type { StartedFleetServer } from '../../../../scripts/endpoint/common/fleet_server/fleet_server_services';

const TEST_SUPERUSER = 'super_superuser';
const TEST_SUPERUSER_ROLE = 'superuser_restricted_indices';

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
  try {
    await deleteAllEndpointData(esClient, log, agentIds);
  } finally {
    await deleteTestSuperuser(esClient, log);
  }
};

export const hasExistingFleetServerPolicy = async (kbnClient: KbnClient): Promise<boolean> => {
  const existing = await fetchIntegrationPolicyList(kbnClient, {
    perPage: 1,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${FLEET_SERVER_PACKAGE}"`,
  });
  return Boolean(existing.items[0]);
};

/**
 * Stops the Fleet Server container this worker started. Deletes the agent policy
 * only when this run created it — a reused policy and its service tokens are left
 * for the stack that already owned them.
 */
export const stopAndDeleteFleetServer = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  fleetServer: StartedFleetServer,
  { deletePolicy }: { deletePolicy: boolean }
): Promise<void> => {
  await fleetServer.stop().catch((error) => {
    warn(log, 'stop Fleet Server container failed', error);
  });

  if (!deletePolicy) {
    return;
  }

  const agents = await fetchFleetAgents(kbnClient, {
    perPage: 100,
    kuery: `policy_id:"${fleetServer.policyId}"`,
    showInactive: true,
  }).catch((error) => {
    warn(log, 'list Fleet Server policy agents failed', error);
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
};
