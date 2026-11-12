/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout-security';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { updateAgentPolicy } from '../../../../../scripts/endpoint/common/fleet_services';
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
    const { revision } = await updateAgentPolicy(
      kbnClient,
      agentPolicyId,
      { is_protected: true },
      true
    );

    return { agentPolicyId, revision, indexedPolicy };
  } catch (error) {
    await deleteProtectedEndpointPolicy(kbnClient, log, indexedPolicy);
    throw error;
  }
};
