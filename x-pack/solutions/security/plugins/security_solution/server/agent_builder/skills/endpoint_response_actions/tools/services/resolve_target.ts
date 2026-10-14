/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

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
  check: (value: { hostName?: string; agentId?: string }) =>
    Boolean(value.hostName || value.agentId),
  message: 'Provide hostName, agentId, or both.',
};

/** How the analyst-facing confirmation names the host about to be acted on. */
export const describeTarget = (toolParams: Record<string, unknown>): string => {
  const hostName = toolParams.hostName as string | undefined;
  const agentId = toolParams.agentId as string | undefined;

  if (agentId) {
    return hostName ? `${hostName} (agent ID ${agentId})` : `the host with agent ID ${agentId}`;
  }

  return hostName ?? 'the host';
};

export interface AmbiguousDispatchData {
  kind: 'response_action_result';
  action: DispatchActionName;
  hostName: string;
  found: false;
  reason: 'ambiguous_hostname';
  candidates: EndpointCandidate[];
  truncated?: true;
  totalCandidates?: number;
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
      /** Typed not-found / ambiguity payload to return without dispatching. */
      data: ReturnType<typeof endpointNotFoundData> | AmbiguousDispatchData;
    };

/**
 * Resolves the host a dispatching tool will act on. A supplied `agentId` wins:
 * it goes through the same space gate as the hostname walk and never guesses.
 * Otherwise the hostname is resolved, and a shared name returns the typed
 * `ambiguous_hostname` payload so the analyst can pick an ID.
 */
export async function resolveDispatchTarget(
  lookup: EndpointLookupService,
  action: DispatchActionName,
  params: { hostName?: string; agentId?: string }
): Promise<ResolvedDispatchTarget> {
  const { hostName, agentId } = params;

  if (agentId) {
    const resolved = await lookup.resolveByAgentId(agentId);

    if (resolved.kind !== 'found') {
      return { kind: 'respond', data: endpointNotFoundData({ agentId }) };
    }

    return {
      kind: 'found',
      endpoint: resolved.endpoint,
      hostLabel: resolved.endpoint.hostName ?? hostName ?? agentId,
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

  return { kind: 'found', endpoint: resolved.endpoint, hostLabel: hostName };
}
