/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { AgentSkillsDemoContext } from '../types';
import { fetchAgentPolicy, waitForHostToEnroll } from '../../common/fleet_services';

export const assertDefaultScenarioPreconditions = async (ctx: AgentSkillsDemoContext): Promise<void> => {
  const { kbnClient, log, agentPolicyId } = ctx;

  log.info('Validating demo preconditions (default scenario)');

  const policy = await fetchAgentPolicy(kbnClient, agentPolicyId);
  const integrations = policy.package_policies ?? [];

  const hasEndpoint = integrations.some((p) => p.package?.name === 'endpoint');
  const hasOsquery = integrations.some((p) => p.package?.name === 'osquery_manager');

  if (!hasEndpoint) {
    throw new Error(`Agent policy [${agentPolicyId}] is missing the Elastic Defend (endpoint) integration`);
  }

  if (!hasOsquery) {
    throw new Error(`Agent policy [${agentPolicyId}] is missing the Osquery Manager (osquery_manager) integration`);
  }

  if (ctx.vmName) {
    const enrolledAgent = await waitForHostToEnroll(kbnClient, log, ctx.vmName, 120000);

    if (enrolledAgent.policy_id !== agentPolicyId) {
      throw new Error(
        `Enrolled agent [${enrolledAgent.id}] is on policy [${enrolledAgent.policy_id}], expected [${agentPolicyId}]`
      );
    }
  } else {
    log.warning('No VM name captured; skipping Fleet enrollment validation by hostname');
  }
};


