/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { HostStatus } from '../../../../../../common/endpoint/types';
import { endpointNotFoundData, MAX_AGENT_ID_LENGTH, MAX_HOSTNAME_LENGTH } from '../types';
import type { EndpointCandidate, EndpointLookupService, ResolvedEndpoint } from './endpoint_lookup';

export type DispatchActionName = 'isolate' | 'unisolate' | 'scan' | 'running-processes';

/**
 * Target fields shared by every dispatching tool. Both are optional on their
 * own and {@link requireHostTarget} enforces that at least one is present, so
 * the `ambiguous_hostname` instruction ("identify the target by agent ID and
 * retry") is something the schema can actually carry out.
 */
export const hostTargetFields = (hostNameDescription: string) => ({
  hostName: z
    .string()
    .min(1)
    .max(MAX_HOSTNAME_LENGTH)
    .optional()
    .describe(`${hostNameDescription} Optional when agentId is supplied.`),
  ip: z
    .ipv4()
    .or(z.ipv6())
    .optional()
    .describe(
      'The exact IPv4 or IPv6 address of the endpoint. Use only when hostname and agent ID are unavailable; shared addresses return an ambiguity result instead of selecting a host.'
    ),
  agentId: z
    .string()
    .min(1)
    .max(MAX_AGENT_ID_LENGTH)
    .optional()
    .describe(
      'The endpoint/agent ID. Use it to select one specific host when several share the hostname (an `ambiguous_hostname` result lists the candidate IDs). Takes precedence over hostName.'
    ),
});

export const requireHostTarget = {
  check: (value: { hostName?: string; ip?: string; agentId?: string }) =>
    Boolean(value.hostName || value.ip || value.agentId) &&
    // A resolved agent ID takes precedence, so retaining the IP from an
    // ambiguity response must not make the model's retry invalid.
    !(value.ip && value.hostName && !value.agentId),
  message: 'Provide ip or hostName, or identify the target with agentId.',
};

/** How the analyst-facing confirmation names the host about to be acted on. */
export const describeTarget = (toolParams: Record<string, unknown>): string => {
  const hostName = toolParams.hostName as string | undefined;
  const agentId = toolParams.agentId as string | undefined;
  const ip = toolParams.ip as string | undefined;

  if (agentId) {
    return hostName ? `${hostName} (agent ID ${agentId})` : `the host with agent ID ${agentId}`;
  }

  return hostName ?? (ip ? `the host at IP ${ip}` : 'the host');
};

export interface AmbiguousDispatchData {
  kind: 'response_action_result';
  action: DispatchActionName;
  hostName?: string;
  ip?: string;
  found: false;
  reason: 'ambiguous_hostname' | 'ambiguous_ip';
  candidates: EndpointCandidate[];
  truncated?: true;
  totalCandidates?: number;
  message: string;
}

/**
 * The target resolved to an agent that is gone (`unenrolled` / `uninstalled`).
 * Such an agent cannot pick up an action, but its metadata document can
 * outlive it, so a dispatch would be accepted and then sit `pending` forever
 * while reading as containment in progress.
 */
export interface EndpointNotActiveData {
  kind: 'response_action_result';
  action: DispatchActionName;
  found: false;
  reason: 'endpoint_not_active';
  agentId: string;
  status: string;
  message: string;
}

export type ResolvedDispatchTarget =
  | {
      kind: 'found';
      endpoint: ResolvedEndpoint;
      /** Human-readable host label for audit comments and result payloads. */
      hostLabel: string;
    }
  | {
      kind: 'respond';
      /** Typed not-found / ambiguity / not-active payload to return without dispatching. */
      data: ReturnType<typeof endpointNotFoundData> | AmbiguousDispatchData | EndpointNotActiveData;
    };

const refuseGoneEndpoint = (
  action: DispatchActionName,
  endpoint: ResolvedEndpoint
): ResolvedDispatchTarget | undefined =>
  endpoint.status === HostStatus.UNENROLLED
    ? {
        kind: 'respond',
        data: {
          kind: 'response_action_result',
          action,
          found: false,
          reason: 'endpoint_not_active',
          agentId: endpoint.agentId,
          status: endpoint.status,
          message: `The endpoint with agent ID ${endpoint.agentId} is ${endpoint.status} (unenrolled or uninstalled), so it can no longer receive response actions and nothing was dispatched. If this ID came from earlier in the conversation it is stale: look the host up again by hostname.`,
        },
      }
    : undefined;

/**
 * Resolves the host a dispatching tool will act on. A supplied `agentId` wins:
 * it goes through the same space gate as the hostname walk and never guesses.
 * Otherwise the hostname is resolved, and a shared name returns the typed
 * `ambiguous_hostname` payload so the analyst can pick an ID.
 */
export async function resolveDispatchTarget(
  lookup: EndpointLookupService,
  action: DispatchActionName,
  params: { hostName?: string; ip?: string; agentId?: string }
): Promise<ResolvedDispatchTarget> {
  const { hostName, ip, agentId } = params;

  if (agentId) {
    const resolved = await lookup.resolveByAgentId(agentId);

    if (resolved.kind !== 'found') {
      return { kind: 'respond', data: endpointNotFoundData({ agentId }) };
    }

    const gone = refuseGoneEndpoint(action, resolved.endpoint);
    if (gone) {
      return gone;
    }

    return {
      kind: 'found',
      endpoint: resolved.endpoint,
      // Never the model-supplied hostName: when Fleet records no host name the
      // card and the audit comment would otherwise show an unverified name next
      // to the agent id.
      hostLabel: resolved.endpoint.hostName ?? agentId,
    };
  }

  if (ip) {
    const resolved = await lookup.resolveByIp(ip);
    if (resolved.kind === 'not_found') {
      return { kind: 'respond', data: endpointNotFoundData({ hostName: ip }) };
    }
    if (resolved.kind === 'ambiguous') {
      return {
        kind: 'respond',
        data: {
          kind: 'response_action_result',
          action,
          ip,
          found: false,
          reason: 'ambiguous_ip',
          candidates: resolved.candidates,
          ...(resolved.truncated
            ? { truncated: true as const, totalCandidates: resolved.totalCandidates }
            : {}),
          message: `Multiple endpoints use the IP address "${ip}". Ask the analyst to identify the target by agent ID, then call this tool again with that agentId — a write action must not guess.`,
        },
      };
    }
    const gone = refuseGoneEndpoint(action, resolved.endpoint);
    if (gone) return gone;
    return {
      kind: 'found',
      endpoint: resolved.endpoint,
      hostLabel: resolved.endpoint.hostName ?? ip,
    };
  }

  if (!hostName) {
    // Unreachable through the schema refine; fail closed rather than resolve
    // an empty hostname if the schema ever changes.
    return { kind: 'respond', data: endpointNotFoundData({ hostName: '' }) };
  }

  const resolved = await lookup.resolveByHostName(hostName);

  if (resolved.kind === 'not_found') {
    return { kind: 'respond', data: endpointNotFoundData({ hostName }) };
  }

  if (resolved.kind === 'ambiguous') {
    // Ambiguity is a first-class lookup outcome, not an error: two live
    // machines can share a hostname, and a write action must never guess
    // which one to act on.
    return {
      kind: 'respond',
      data: {
        kind: 'response_action_result',
        action,
        hostName,
        found: false,
        reason: 'ambiguous_hostname',
        candidates: resolved.candidates,
        ...(resolved.truncated
          ? { truncated: true as const, totalCandidates: resolved.totalCandidates }
          : {}),
        message: resolved.truncated
          ? `More endpoints match the hostname "${hostName}" than could be examined, so it cannot be resolved to a single host. Ask the analyst to identify the target by agent ID, then call this tool again with that agentId.`
          : `Multiple online endpoints share the hostname "${hostName}". Ask the analyst to identify the target by agent ID, then call this tool again with that agentId — a write action must not guess.`,
      },
    };
  }

  const gone = refuseGoneEndpoint(action, resolved.endpoint);
  if (gone) {
    return gone;
  }

  return { kind: 'found', endpoint: resolved.endpoint, hostLabel: hostName };
}
