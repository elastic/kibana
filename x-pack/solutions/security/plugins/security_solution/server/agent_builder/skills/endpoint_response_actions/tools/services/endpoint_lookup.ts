/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../../endpoint/errors';
import { resolveAgentTypeFromPackages } from '../types';

export interface ResolvedEndpoint {
  agentId: string;
  agentType: ResponseActionAgentType;
  packages: string[];
}

/** A Fleet agent record that matched the hostname but could not be selected. */
export interface EndpointCandidate {
  agentId: string;
  status: string;
}

/**
 * Outcome of a hostname lookup.
 *
 * `ambiguous` is a first-class outcome, not an error: two distinct live
 * machines can legitimately share a hostname, so silently picking one would
 * report — or isolate — the wrong host. Callers must surface the ambiguity
 * and ask for an agent ID instead of guessing.
 */
export type EndpointLookupResult =
  | { kind: 'found'; endpoint: ResolvedEndpoint }
  | { kind: 'not_found' }
  | { kind: 'ambiguous'; candidates: EndpointCandidate[] };

export interface EndpointLookupService {
  resolveByHostName(hostName: string): Promise<EndpointLookupResult>;
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
    async resolveByHostName(hostName: string): Promise<EndpointLookupResult> {
      const agents = await fleetServices.agent.listAgents({
        showInactive: true,
        kuery: `local_metadata.host.name: ${escapeKuery(hostName)}`,
        page: 1,
        perPage: 10,
      });

      if (!agents?.agents?.length) {
        return { kind: 'not_found' };
      }

      // Drop agents this space cannot see BEFORE deciding ambiguity, otherwise
      // a host that is only reachable from another space would look ambiguous.
      const visible: Array<{ id: string; status: string; packages?: string[] }> = [];
      for (const candidate of agents.agents) {
        try {
          await fleetServices.ensureInCurrentSpace({ agentIds: [candidate.id] });
          visible.push(candidate as { id: string; status: string; packages?: string[] });
        } catch (e) {
          // A not-found means the agent is not visible in the caller's space:
          // skip it, but do not fail the whole lookup. Anything else (e.g. a
          // transient Fleet/ES failure) is a real error and must propagate
          // rather than be misreported as "host not found".
          if (!(e instanceof NotFoundError)) {
            throw e;
          }
        }
      }

      if (!visible.length) {
        return { kind: 'not_found' };
      }

      const sorted = [...visible].sort((a, b) => {
        const aOnline = a.status === 'online' ? 1 : 0;
        const bOnline = b.status === 'online' ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return ((b as { enrolled_at?: string }).enrolled_at ?? '').localeCompare(
          (a as { enrolled_at?: string }).enrolled_at ?? ''
        );
      });

      // More than one agent matching the hostname is normal Fleet bookkeeping
      // (re-enrollment, reinstall, agent upgrade) as long as only ONE of them
      // is live. Two live machines genuinely sharing a hostname is different:
      // picking either one silently would report — or isolate — the wrong
      // host, so surface the ambiguity instead of guessing.
      const live = sorted.filter((a) => a.status === 'online');
      if (live.length > 1) {
        return {
          kind: 'ambiguous',
          candidates: live.map((a) => ({ agentId: a.id, status: a.status })),
        };
      }

      const agent = sorted[0];
      const agentId = agent.id;
      const packages = (agent.packages as string[] | undefined) ?? [];

      return {
        kind: 'found',
        endpoint: {
          agentId,
          agentType: resolveAgentTypeFromPackages(packages),
          packages,
        },
      };
    },
  };
}
