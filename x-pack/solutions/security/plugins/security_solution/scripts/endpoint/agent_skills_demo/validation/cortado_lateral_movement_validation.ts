/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { AgentSkillsDemoContext } from '../types';
import { fetchAgentPolicy, waitForHostToEnroll } from '../../common/fleet_services';

/**
 * Validates that all preconditions are met for the Cortado lateral movement scenario.
 *
 * Required preconditions:
 * 1. Agent policy exists and has Elastic Defend integration
 * 2. Agent policy has Osquery Manager integration (for forensic queries)
 * 3. At least one enrolled endpoint host exists
 *
 * Optional but recommended:
 * - Network Packet Capture integration for DNS telemetry
 * - Two enrolled hosts for proper lateral movement demonstration
 */
export const assertCortadoLateralMovementPreconditions = async (
  ctx: AgentSkillsDemoContext
): Promise<void> => {
  const { kbnClient, log, agentPolicyId, vmName } = ctx;

  log.info('Validating demo preconditions (Cortado lateral movement scenario)');

  // Validate agent policy exists and has required integrations
  const policy = await fetchAgentPolicy(kbnClient, agentPolicyId);
  const integrations = policy.package_policies ?? [];

  const hasEndpoint = integrations.some((p) => p.package?.name === 'endpoint');
  const hasOsquery = integrations.some((p) => p.package?.name === 'osquery_manager');
  const hasNetworkPacketCapture = integrations.some((p) => p.package?.name === 'network_traffic');

  if (!hasEndpoint) {
    throw new Error(
      `Agent policy [${agentPolicyId}] is missing the Elastic Defend (endpoint) integration. ` +
        `This is required for lateral movement detection.`
    );
  }

  if (!hasOsquery) {
    throw new Error(
      `Agent policy [${agentPolicyId}] is missing the Osquery Manager (osquery_manager) integration. ` +
        `This is required for forensic investigation capabilities.`
    );
  }

  if (!hasNetworkPacketCapture) {
    log.warning(
      `Agent policy [${agentPolicyId}] is missing the Network Packet Capture (network_traffic) integration. ` +
        `DNS telemetry may be limited. Consider adding it for full visibility.`
    );
  }

  // Validate enrolled host if VM name is provided
  if (vmName) {
    try {
      const enrolledAgent = await waitForHostToEnroll(kbnClient, log, vmName, 60000);

      if (enrolledAgent.policy_id !== agentPolicyId) {
        throw new Error(
          `Enrolled agent [${enrolledAgent.id}] is on policy [${enrolledAgent.policy_id}], ` +
            `expected [${agentPolicyId}]`
        );
      }

      log.info(`Validated enrolled agent [${enrolledAgent.id}] on policy [${agentPolicyId}]`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('Timed out')) {
        throw new Error(
          `No enrolled agent found with hostname [${vmName}] within timeout. ` +
            `Ensure the Elastic Agent is properly enrolled before running this scenario.`
        );
      }
      throw e;
    }
  } else {
    log.warning(
      'No VM name captured; skipping Fleet enrollment validation by hostname. ' +
        'Ensure at least one agent is enrolled to the policy before running lateral movement RTAs.'
    );
  }

  log.info('Cortado lateral movement preconditions validated successfully');
};

/**
 * Validates that a target host is available for lateral movement
 */
export const assertTargetHostAvailable = async (
  ctx: AgentSkillsDemoContext,
  targetVmName: string
): Promise<boolean> => {
  const { kbnClient, log } = ctx;

  try {
    await waitForHostToEnroll(kbnClient, log, targetVmName, 30000);
    return true;
  } catch {
    log.warning(
      `Target host [${targetVmName}] not available. ` +
        `Lateral movement will be demonstrated in self-target mode.`
    );
    return false;
  }
};
