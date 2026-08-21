/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { SyntheticsServerSetup } from '../../../types';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  isAgentVersionMwCompatible,
  type OutdatedMwAgentLocationsResponse,
} from '../../../../common/utils/agent_mw_support';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';

interface AgentLocalMetadata {
  elastic?: { agent?: { version?: string } };
}

const PER_PAGE = 1000;
const MAX_PAGES = 10;

/**
 * True when the policy has at least one enrolled agent whose version predates
 * Maintenance Window support. Stops paging as soon as one is found.
 */
const locationHasOutdatedMwAgent = async (
  server: SyntheticsServerSetup,
  agentPolicyId: string
): Promise<boolean> => {
  let page = 1;
  let total = Infinity;
  let fetched = 0;

  while (fetched < total && page <= MAX_PAGES) {
    const { agents, total: totalAgents } =
      await server.fleet.agentService.asInternalUser.listAgents({
        showInactive: true,
        perPage: PER_PAGE,
        page,
        kuery: `policy_id:"${escapeQuotes(agentPolicyId)}"`,
      });
    total = totalAgents ?? agents.length;
    fetched += agents.length;

    for (const agent of agents) {
      const version = (agent.local_metadata as AgentLocalMetadata | undefined)?.elastic?.agent
        ?.version;
      if (!isAgentVersionMwCompatible(version)) {
        return true;
      }
    }

    if (agents.length === 0) {
      break;
    }
    page += 1;
  }

  return false;
};

/**
 * Private location ids with at least one enrolled agent older than the MW
 * support threshold. Fleet versions only — no host metrics.
 */
export const getOutdatedMwAgentLocations: SyntheticsRestApiRouteFactory<
  OutdatedMwAgentLocationsResponse
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATION_OUTDATED_MW_AGENTS,
  validate: {},
  handler: async ({ server, savedObjectsClient, syntheticsMonitorClient }) => {
    const { locations } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient,
      true
    );

    const outdatedLocationIds = (
      await Promise.all(
        locations.map(async (location) => {
          if (!location.agentPolicyId || !server.fleet) {
            return null;
          }
          try {
            const outdated = await locationHasOutdatedMwAgent(server, location.agentPolicyId);
            return outdated ? location.id : null;
          } catch {
            return null;
          }
        })
      )
    )
      .filter((id): id is string => id != null)
      .sort();

    return { outdatedLocationIds };
  },
});
