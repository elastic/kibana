/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetFullAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { agentPolicyRouteService } from '@kbn/fleet-plugin/common';
import type { KbnClient, ScoutLogger } from '@kbn/scout-security';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { catchHttpErrorFormatAndThrow } from '../../../../../common/endpoint/format_http_error';
import {
  fetchAgentPolicy,
  updateAgentPolicy,
} from '../../../../../scripts/endpoint/common/fleet_services';
import {
  createEndpointPolicy,
  deleteEndpointPolicy,
  getCreatedPackagePolicy,
} from '../../../shared_host/ui/fixtures/endpoint_policy';

export interface ProtectedEndpointPolicy {
  agentPolicyId: string;
  /** Agent policy revision once tamper protection is on. */
  revision: number;
  indexedPolicy: IndexedFleetEndpointPolicyResponse;
}

const isProtectionEnabledInFullPolicy = async (
  kbnClient: KbnClient,
  agentPolicyId: string
): Promise<boolean> => {
  const { data } = await kbnClient
    .request<GetFullAgentPolicyResponse>({
      method: 'GET',
      path: agentPolicyRouteService.getInfoFullPath(agentPolicyId),
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .catch(catchHttpErrorFormatAndThrow);

  return data.item.agent?.protection?.enabled === true;
};

/**
 * Fleet turns `is_protected` off when the policy has no Elastic Defend, so read the
 * agent policy and the full policy the agent receives back before the test relies on it.
 */
const readBackProtectedRevision = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  agentPolicyId: string
): Promise<number> => {
  const { is_protected: isProtected, revision } = await fetchAgentPolicy(kbnClient, agentPolicyId);
  const protectionEnabled = await isProtectionEnabledInFullPolicy(kbnClient, agentPolicyId);
  log.info(
    `[edr_real_fleet] agent policy ${agentPolicyId}: is_protected=${isProtected}, full policy agent.protection.enabled=${protectionEnabled}, revision=${revision}`
  );

  if (!isProtected || !protectionEnabled) {
    throw new Error(
      `Tamper protection is not enabled on agent policy ${agentPolicyId} (is_protected=${isProtected}, agent.protection.enabled=${protectionEnabled})`
    );
  }

  return revision;
};

/** Deletes the agent and Endpoint package policies, logging instead of throwing. */
export const deleteProtectedEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  indexedPolicy: IndexedFleetEndpointPolicyResponse
): Promise<void> => {
  await deleteEndpointPolicy(kbnClient, indexedPolicy).catch((error) => {
    log.warning(`[edr_real_fleet] deleteEndpointPolicy failed: ${error}`);
  });
};

/**
 * Creates an agent policy with Elastic Defend and turns tamper protection on.
 * If a later step fails, the policy is deleted before the error is rethrown.
 */
export const createProtectedEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name: string
): Promise<ProtectedEndpointPolicy> => {
  const indexedPolicy = await createEndpointPolicy(kbnClient, log, name);

  try {
    const [agentPolicyId] = getCreatedPackagePolicy(indexedPolicy).policy_ids;
    if (!agentPolicyId) {
      throw new Error(`Endpoint package policy of '${name}' has no agent policy id`);
    }

    log.info(`[edr_real_fleet] enabling tamper protection on agent policy ${agentPolicyId}`);
    await updateAgentPolicy(kbnClient, agentPolicyId, { is_protected: true }, true);
    const revision = await readBackProtectedRevision(kbnClient, log, agentPolicyId);

    return { agentPolicyId, revision, indexedPolicy };
  } catch (error) {
    await deleteProtectedEndpointPolicy(kbnClient, log, indexedPolicy);
    throw error;
  }
};
