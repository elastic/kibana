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
  enableAllPolicyProtections,
  getCreatedPackagePolicy,
} from '../../../shared_host/ui/fixtures/endpoint_policy';

export interface EndpointAgentPolicy {
  agentPolicyId: string;
  /** Agent policy revision once its tamper protection setting is read back. */
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
const readBackRevision = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  agentPolicyId: string,
  expectedProtection: boolean
): Promise<number> => {
  const { is_protected: isProtected, revision } = await fetchAgentPolicy(kbnClient, agentPolicyId);
  const protectionEnabled = await isProtectionEnabledInFullPolicy(kbnClient, agentPolicyId);
  log.info(
    `[edr_real_fleet] agent policy ${agentPolicyId}: is_protected=${isProtected}, full policy agent.protection.enabled=${protectionEnabled}, revision=${revision}`
  );

  if (Boolean(isProtected) !== expectedProtection || protectionEnabled !== expectedProtection) {
    throw new Error(
      `Expected tamper protection ${
        expectedProtection ? 'on' : 'off'
      } on agent policy ${agentPolicyId} (is_protected=${isProtected}, agent.protection.enabled=${protectionEnabled})`
    );
  }

  return revision;
};

/** Deletes the agent and Endpoint package policies, logging instead of throwing. */
export const deleteEndpointAgentPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  indexedPolicy: IndexedFleetEndpointPolicyResponse
): Promise<void> => {
  await deleteEndpointPolicy(kbnClient, indexedPolicy).catch((error) => {
    log.warning(`[edr_real_fleet] deleteEndpointPolicy failed: ${error}`);
  });
};

/**
 * Creates an agent policy with Elastic Defend and applies `configure` to it.
 * If a later step fails, the policy is deleted before the error is rethrown.
 */
const createConfiguredEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name: string,
  {
    expectedProtection,
    configure,
  }: {
    expectedProtection: boolean;
    configure: (ids: { agentPolicyId: string; packagePolicyId: string }) => Promise<void>;
  }
): Promise<EndpointAgentPolicy> => {
  const indexedPolicy = await createEndpointPolicy(kbnClient, log, name);

  try {
    const {
      id: packagePolicyId,
      policy_ids: [agentPolicyId],
    } = getCreatedPackagePolicy(indexedPolicy);
    if (!agentPolicyId) {
      throw new Error(`Endpoint package policy of '${name}' has no agent policy id`);
    }

    await configure({ agentPolicyId, packagePolicyId });
    const revision = await readBackRevision(kbnClient, log, agentPolicyId, expectedProtection);

    return { agentPolicyId, revision, indexedPolicy };
  } catch (error) {
    await deleteEndpointAgentPolicy(kbnClient, log, indexedPolicy);
    throw error;
  }
};

/** Creates an agent policy with Elastic Defend and turns tamper protection on. */
export const createProtectedEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name: string
): Promise<EndpointAgentPolicy> =>
  createConfiguredEndpointPolicy(kbnClient, log, name, {
    expectedProtection: true,
    configure: async ({ agentPolicyId }) => {
      log.info(`[edr_real_fleet] enabling tamper protection on agent policy ${agentPolicyId}`);
      await updateAgentPolicy(kbnClient, agentPolicyId, { is_protected: true }, true);
    },
  });

/**
 * Creates an agent policy with Elastic Defend in prevent mode for every protection
 * and tamper protection off.
 */
export const createUnprotectedEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name: string
): Promise<EndpointAgentPolicy> =>
  createConfiguredEndpointPolicy(kbnClient, log, name, {
    expectedProtection: false,
    configure: async ({ packagePolicyId }) => {
      log.info(
        `[edr_real_fleet] enabling all Endpoint protections on package policy ${packagePolicyId}`
      );
      await enableAllPolicyProtections(kbnClient, packagePolicyId);
    },
  });
