/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { escapeQuotes } from '@kbn/es-query';

import type { HostStatus } from '../../../../../../common/endpoint/types';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { GET_ENDPOINT_STATUS_TOOL_ID } from '../..';
import {
  endpointNotFoundData,
  insufficientPrivilegesResult,
  MAX_AGENT_ID_LENGTH,
  MAX_HOSTNAME_LENGTH,
  responseActionErrorResult,
} from '../types';
import { createEndpointLookupService } from '../services/endpoint_lookup';
import type { EndpointCandidate } from '../services/endpoint_lookup';

/**
 * Tool result returned when a hostname matches more than one endpoint record.
 *
 * Modelled apart from `EndpointNotFoundResult` on purpose: the ambiguity
 * outcome deliberately reports the candidate list instead of a status, so
 * sharing the not-found interface would advertise `status`/`isolated`/
 * `lastSeen` fields that this payload never carries. `reason` stays on the
 * shared `HostLookupReason` vocabulary so a consumer can still branch on it.
 */
export interface AmbiguousHostnameResult {
  kind: 'response_action_result';
  action: 'get-endpoint-status';
  hostName: string;
  found: false;
  reason: 'ambiguous_hostname';
  candidates: EndpointCandidate[];
  /** Set when more records matched than the lookup examined. */
  truncated?: true;
  totalCandidates?: number;
  message: string;
}

const getEndpointStatusSchema = z
  .object({
    hostName: z
      .string()
      .min(1)
      .max(MAX_HOSTNAME_LENGTH)
      .optional()
      .describe(
        'The hostname of the endpoint to check status for. Optional when agentId is supplied; pass both to confirm a specific host.'
      ),
    agentId: z
      .string()
      .min(1)
      .max(MAX_AGENT_ID_LENGTH)
      .optional()
      .describe(
        'The endpoint/agent ID. Pass it with hostName to select one specific host when several share the name, or on its own to look a host up by ID (for example, from an action record).'
      ),
  })
  .refine((value) => Boolean(value.hostName || value.agentId), {
    message: 'Provide hostName, agentId, or both.',
  });

export const getEndpointStatusTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool<typeof getEndpointStatusSchema> => {
  return {
    id: GET_ENDPOINT_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the current status of a host by its hostname or agent ID, including whether it is isolated, its last seen time, and its status (healthy, unhealthy, updating, offline, inactive, unenrolled; unknown when not yet reported). When several endpoints share the hostname, pass the endpoint's agent ID to select one, or pass the agent ID alone to look a host up by ID.`,
    schema: getEndpointStatusSchema,
    handler: async (params, { logger, request, spaceId }) => {
      try {
        let hostName = params.hostName;
        const requestedAgentId = params.agentId;

        // The endpoint metadata detail route allows either privilege
        // (`withEndpointAuthz({ any: ['canReadSecuritySolution', 'canAccessFleet'] })`,
        // `server/endpoint/routes/metadata/index.ts`), but this tool deliberately
        // requires the stricter `canReadSecuritySolution` on its own — a
        // Fleet-only caller can reach the route yet should not get host status
        // through this tool. The internal fleet and metadata services skip both
        // route-level checks, so assert this narrower privilege here before
        // resolving or reporting on a host.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canReadSecuritySolution) {
          return insufficientPrivilegesResult('canReadSecuritySolution');
        }

        const scoped = await endpointAppContextService.asScoped(request);

        let agentId = requestedAgentId;

        if (!agentId) {
          if (!hostName) {
            // Unreachable: the schema refine requires hostName when agentId is
            // absent — defensive guard so a future schema change can never
            // resolve an empty hostname here.
            return responseActionErrorResult(
              'invalid_argument',
              'Provide hostName, agentId, or both.'
            );
          }
          // Resolve hostname -> endpoint id + EDR vendor. The service handles
          // hostname escaping, space validation, and multi-vendor `agentType`
          // resolution in one place so every host-lookup tool behaves the same.
          //
          // Scoped to Elastic Defend (`agentTypes: ['endpoint']`): the status
          // read below is backed by the Defend metadata index, so resolving a
          // SentinelOne/CrowdStrike/MDE agent here would hand a valid agent id
          // to a read that can never find it — reporting a live, healthy
          // third-party host as not-found.
          const lookup = createEndpointLookupService(endpointAppContextService, spaceId, scoped, {
            agentTypes: ['endpoint'],
          });
          const resolved = await lookup.resolveByHostName(hostName);

          if (resolved.kind === 'not_found') {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: endpointNotFoundData({ hostName }),
                },
              ],
            };
          }

          if (resolved.kind === 'ambiguous') {
            // Either two live agents share this hostname, or more agent
            // records match it than the lookup examined. Picking one would
            // report the wrong machine's status, so ask for an agent ID —
            // which this tool accepts as `agentId`, making the instruction
            // something the model can actually carry out.
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    kind: 'response_action_result' as const,
                    action: 'get-endpoint-status' as const,
                    hostName,
                    found: false,
                    reason: 'ambiguous_hostname' as const,
                    candidates: resolved.candidates,
                    ...(resolved.truncated
                      ? {
                          truncated: true as const,
                          totalCandidates: resolved.totalCandidates,
                        }
                      : {}),
                    message: resolved.truncated
                      ? `More endpoints match the hostname "${hostName}" than could be examined, so it cannot be resolved to a single host. Ask the analyst which agent ID they mean, then call this tool again with that agentId.`
                      : `Multiple endpoints share the hostname "${hostName}". Ask the analyst which agent ID they mean, then call this tool again with that agentId.`,
                  } satisfies AmbiguousHostnameResult,
                },
              ],
            };
          }

          agentId = resolved.endpoint.agentId;
        }

        // Get detailed status from endpoint metadata service. `scoped` (built
        // above for the lookup) is threaded through so this read also fans out
        // to linked projects under CPS.
        //
        // A caller-supplied `agentId` is constrained by the hostname as well,
        // so a model pairing a candidate id with the wrong hostname is not told
        // another machine's isolation and status under the name it asked about.
        // When the id came from `resolveByHostName` the hostname was already
        // matched, and re-applying it would miss: Fleet's
        // `local_metadata.host.name` holds the FQDN under the FQDN policy
        // hostname format while Defend writes the short name to
        // `united.endpoint.host.hostname`. The constraint therefore accepts
        // either spelling. The query is filtered to the policies visible in
        // this space.
        //
        // The id matches EITHER identity: `united.agent.agent.id` is the Fleet
        // agent id, the top-level `agent.id` is the endpoint's own id, and the
        // two diverge on current agents.
        //
        // Quoted: `escapeKuery` leaves plain spaces unescaped, so an unquoted
        // ID with a space would parse as separate terms and, with pageSize 1,
        // could return another endpoint's status as a successful lookup.
        const quotedAgentId = `"${escapeQuotes(agentId)}"`;
        const idKuery = `(united.agent.agent.id: ${quotedAgentId} OR agent.id: ${quotedAgentId})`;
        const quotedHostName = hostName ? `"${escapeQuotes(hostName)}"` : undefined;
        const kuery =
          requestedAgentId && quotedHostName
            ? `${idKuery} AND (united.endpoint.host.hostname: ${quotedHostName} OR united.agent.local_metadata.host.name.keyword: ${quotedHostName})`
            : idKuery;
        const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);
        const hostInfo = await metadataService.getHostMetadataList(
          {
            page: 0,
            pageSize: 1,
            kuery,
          },
          scoped
        );

        if (!hostInfo.data?.length) {
          // Agent exists in Fleet but no metadata document was found (index
          // missing or agent filtered out). Return a not-found result rather
          // than reporting stale defaults as a successful lookup.
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                // An ID-only lookup reports the agent ID that failed to
                // resolve, not a hostname it never had.
                data: endpointNotFoundData(hostName ? { hostName } : { agentId }),
              },
            ],
          };
        }

        const hostMetadata = hostInfo.data[0];
        // ID-only lookup: report the matched host's own name.
        hostName = hostName ?? hostMetadata.metadata?.host?.hostname ?? 'unknown';
        // The request may supply either the Endpoint ID or the Fleet ID (the
        // kuery above matches both). Always report the Fleet agent id back —
        // matching list_endpoints and hostname resolution — so a caller that
        // looked this host up by its Endpoint ID still gets an id it can feed
        // into response-action follow-ups.
        const resolvedAgentId =
          (hostMetadata.metadata as { elastic?: { agent?: { id?: string } } } | undefined)?.elastic
            ?.agent?.id ?? agentId;
        const isolated = Boolean(hostMetadata.metadata.Endpoint?.state?.isolation);
        const lastSeen = hostMetadata.last_checkin || null;
        // The metadata service can return a document with no `host_status`
        // (e.g. a race between enrollment and the first checkin). Reporting a
        // fabricated `offline` in that gap would tell the caller the host is
        // known to be down when its state is simply unknown; `HostStatus` has
        // no "unknown" member (widening it would ripple into every UI
        // switch/map keyed on the enum), so fall back to the string literal
        // and widen the field's type at the point of use instead.
        const status: HostStatus | 'unknown' = hostMetadata.host_status || 'unknown';

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'get-endpoint-status' as const,
                hostName,
                agentId: resolvedAgentId,
                found: true,
                status,
                isolated,
                lastSeen,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return responseActionErrorResult(
          'unknown_error',
          `Error retrieving endpoint status: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
};
