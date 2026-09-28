/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentStatusKueryHelper } from '@kbn/fleet-plugin/common/services';
import type { PolicyAccessContext } from './access_context';
import { uniqueAgentPolicyIds } from './policy_lookup';

export type EndpointCountSource = 'fleet_status_aggregation' | 'no_agent_policy_assignments';

export type EndpointCountResult = Readonly<{
  population: 'enrolled_agents';
  source: EndpointCountSource;
  status: Readonly<Record<string, number>>;
}>;

const EMPTY_ENROLLED_AGENT_COUNT: EndpointCountResult = {
  population: 'enrolled_agents',
  source: 'no_agent_policy_assignments',
  status: {},
};

const getEnrolledAgentStatus = async (
  access: PolicyAccessContext,
  agentPolicyIds: readonly string[]
): Promise<Record<string, number>> => {
  return access.fleet.agent.getAgentStatusForAgentPolicy(
    undefined,
    `not (${AgentStatusKueryHelper.buildKueryForUnenrolledAgents()})`,
    [...agentPolicyIds]
  );
};

export const countEndpoints = async (
  access: PolicyAccessContext,
  args: Readonly<{ agentPolicyIds: readonly string[] }>
): Promise<EndpointCountResult> => {
  const agentPolicyIds = uniqueAgentPolicyIds(args.agentPolicyIds);

  if (agentPolicyIds.length === 0) {
    return EMPTY_ENROLLED_AGENT_COUNT;
  }

  return {
    population: 'enrolled_agents',
    source: 'fleet_status_aggregation',
    status: await getEnrolledAgentStatus(access, agentPolicyIds),
  };
};
