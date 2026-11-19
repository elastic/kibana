/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPolicyBaseIdWithFallbackKuery } from '@kbn/fleet-plugin/common';
import pMap from 'p-map';
import type { SyntheticsServerSetup } from '../../../types';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { MissingCompleteAgentLocationsResponse } from '../../../../common/types';
import { isCompleteElasticAgent } from '../../../synthetics_service/private_location/get_agent_info';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';

const PER_PAGE = 1000;
const MAX_PAGES = 10;
const LOCATION_AGENT_CONCURRENCY = 5;

/** True when the policy has an active agent that can run browser monitors. Stops at the first one. */
const locationHasCompleteAgent = async (
  server: SyntheticsServerSetup,
  agentPolicyId: string
): Promise<boolean> => {
  let page = 1;
  let total = Infinity;
  let fetched = 0;

  while (fetched < total && page <= MAX_PAGES) {
    const { agents, total: totalAgents } =
      await server.fleet.agentService.asInternalUser.listAgents({
        showInactive: false,
        perPage: PER_PAGE,
        page,
        kuery: buildPolicyBaseIdWithFallbackKuery(agentPolicyId),
      });
    total = totalAgents ?? agents.length;
    fetched += agents.length;

    if (agents.some((agent) => isCompleteElasticAgent(agent.local_metadata))) {
      return true;
    }
    if (agents.length === 0) {
      break;
    }
    page += 1;
  }

  return false;
};

/**
 * Private locations with no active agent that can run browser monitors. Fleet
 * agent metadata only, so the overview can check this without loading agent stats.
 */
export const getMissingCompleteAgentLocations: SyntheticsRestApiRouteFactory<
  MissingCompleteAgentLocationsResponse
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATION_MISSING_COMPLETE_AGENTS,
  validate: {},
  handler: async ({ server, savedObjectsClient, syntheticsMonitorClient }) => {
    const { locations } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient,
      true
    );

    const missing = await pMap(
      locations,
      async (location) => {
        if (!location.agentPolicyId || !server.fleet) {
          return null;
        }
        try {
          const hasComplete = await locationHasCompleteAgent(server, location.agentPolicyId);
          return hasComplete ? null : { id: location.id, label: location.label };
        } catch (error) {
          server.logger.error(
            `Failed to list Fleet agents for the complete agent check at private location ${location.id}`,
            { error }
          );
          return null;
        }
      },
      { concurrency: LOCATION_AGENT_CONCURRENCY, stopOnError: false }
    );

    return {
      locations: missing
        .filter((location): location is { id: string; label: string } => location != null)
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  },
});
