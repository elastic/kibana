/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { resolveAgentTypeFromPackages } from '../types';

export interface ResolvedEndpoint {
  agentId: string;
  agentType: ResponseActionAgentType;
  packages: string[];
}

export interface EndpointLookupService {
  resolveByHostName(hostName: string): Promise<ResolvedEndpoint | null>;
}

/**
 * Resolves a hostname to a single Fleet agent + its response-action `agentType`.
 *
 * Why this service exists:
 * - All five host-lookup tools in this skill repeat the same `listAgents` +
 *   `ensureInCurrentSpace` flow. Consolidating it mirrors the Endpoint team's
 *   own “single search-strategy point” refactor in Osquery/Defend Workflows
 *   (`#274308`) and keeps hostname escaping, space validation, and multi-vendor
 *   `agentType` resolution in one place.
 * - A host can have MULTIPLE agent records over its lifetime (reinstall,
 *   agent upgrade, re-enrollment after a broken install) — Fleet keeps prior
 *   (offline/uninstalled) enrollments around alongside the current one, all
 *   matching the same `local_metadata.host.name`. We fetch a small page and
 *   pick the best match (online first, most recently enrolled as tiebreak)
 *   rather than trusting Fleet's default sort to always put the live agent
 *   first — otherwise isolate/unisolate/status tools can silently act on a
 *   dead agent while reporting success.
 */
export function createEndpointLookupService(
  endpointAppContextService: EndpointAppContextService,
  spaceId: string
): EndpointLookupService {
  const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);

  return {
    async resolveByHostName(hostName: string): Promise<ResolvedEndpoint | null> {
      const agents = await fleetServices.agent.listAgents({
        showInactive: true,
        kuery: `local_metadata.host.name: ${escapeKuery(hostName)}`,
        page: 1,
        perPage: 10,
      });

      if (!agents?.agents?.length) {
        return null;
      }

      const agent = [...agents.agents].sort((a, b) => {
        const aOnline = a.status === 'online' ? 1 : 0;
        const bOnline = b.status === 'online' ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return (b.enrolled_at ?? '').localeCompare(a.enrolled_at ?? '');
      })[0];
      const agentId = agent.id;

      // Reject hosts that live in a different space than the caller's active
      // space before the caller reads or acts on them.
      await fleetServices.ensureInCurrentSpace({ agentIds: [agentId] });

      const packages = (agent.packages as string[] | undefined) ?? [];

      return {
        agentId,
        agentType: resolveAgentTypeFromPackages(packages),
        packages,
      };
    },
  };
}
