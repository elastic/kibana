/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { IndexedFleetEndpointPolicyResponse } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { RESPONSE_ACTIONS_AGENT_ID_PREFIX } from './cleanup';
import type { EndpointScenario } from './endpoint_data';
import { cleanupPolicyManagementLeftoverFleetPolicies } from './policy_management_package_policy';

export type { IndexedFleetEndpointPolicyResponse };

export const RESPONSE_ACTIONS_ISOLATE_AGENT_ID = `${RESPONSE_ACTIONS_AGENT_ID_PREFIX}isolate-001`;
export const RESPONSE_ACTIONS_RELEASE_AGENT_ID = `${RESPONSE_ACTIONS_AGENT_ID_PREFIX}release-001`;

/**
 * The Fleet package the ERA host lookup keeps (`endpoint` is in
 * `RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES.endpoint`); a `.fleet-agents`
 * doc without it is dropped from candidate resolution.
 */
export const RESPONSE_ACTIONS_AGENT_PACKAGES = ['endpoint'];

/**
 * Creates a real Fleet agent policy carrying an Elastic Defend package policy.
 * `getHostMetadataList` only returns hosts whose `united.agent.policy_id` is the
 * agent policy of an existing endpoint package policy, so seeded hosts must be
 * enrolled on one of these to be visible to the response-actions tools.
 */
export const seedResponseActionsEndpointPolicy = async ({
  kbnClient,
  log,
  runId = String(Date.now()),
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  runId?: string;
}): Promise<{ agentPolicyId: string; indexed: IndexedFleetEndpointPolicyResponse }> => {
  const packagePolicyName = `eval-agent-era-package-policy-${runId}`;
  const agentPolicyName = `eval-agent-era-agent-policy-${runId}`;

  let indexed: IndexedFleetEndpointPolicyResponse;
  try {
    indexed = await indexFleetEndpointPolicy(
      kbnClient,
      packagePolicyName,
      undefined,
      agentPolicyName,
      log
    );
  } catch (error) {
    // The loader creates the agent policy before the package policy and does not
    // roll back when a later step throws (e.g. package policy creation times
    // out). `indexed` never reaches the caller, so its `afterAll` cleanup has
    // nothing to delete: remove what the failed attempt left, by name.
    await cleanupPolicyManagementLeftoverFleetPolicies({
      kbnClient,
      log,
      packagePolicyNames: [packagePolicyName],
      agentPolicyNames: [agentPolicyName],
    });
    throw error;
  }
  const agentPolicyId = indexed.agentPolicies[0]?.id;
  if (!agentPolicyId || indexed.integrationPolicies.length === 0) {
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexed);
    throw new Error(
      'seedResponseActionsEndpointPolicy: indexFleetEndpointPolicy returned no agent policy or endpoint package policy'
    );
  }
  return { agentPolicyId, indexed };
};

export const cleanupResponseActionsEndpointPolicy = async ({
  kbnClient,
  indexed,
}: {
  kbnClient: KbnClient;
  indexed: IndexedFleetEndpointPolicyResponse;
}): Promise<void> => {
  await deleteIndexedFleetEndpointPolicies(kbnClient, indexed);
};

/** The two ERA hosts, enrolled on `agentPolicyId` with the `endpoint` package. */
export const buildResponseActionsScenarios = (
  agentPolicyId: string
): { isolate: EndpointScenario; release: EndpointScenario } => ({
  isolate: {
    agentId: RESPONSE_ACTIONS_ISOLATE_AGENT_ID,
    hostName: 'eval-host-isolate',
    hostIp: ['10.42.0.15'],
    os: { name: 'Windows', version: '10' },
    policyName: 'eval-policy-response',
    policyStatus: 'success',
    policyId: agentPolicyId,
    agentPackages: RESPONSE_ACTIONS_AGENT_PACKAGES,
  },
  release: {
    agentId: RESPONSE_ACTIONS_RELEASE_AGENT_ID,
    hostName: 'eval-host-release',
    os: { name: 'Linux', version: 'Ubuntu 22.04' },
    policyName: 'eval-policy-response',
    policyStatus: 'success',
    policyId: agentPolicyId,
    agentPackages: RESPONSE_ACTIONS_AGENT_PACKAGES,
  },
});
