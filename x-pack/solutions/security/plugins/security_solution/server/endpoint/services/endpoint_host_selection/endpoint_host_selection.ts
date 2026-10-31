/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentStatus } from '@kbn/fleet-plugin/common';
import { HostStatus } from '../../../../common/endpoint/types';
import { MAX_HOST_RECORDS } from '../../../../common/workflows/step_types/endpoint/hosts/hosts_contracts';
import { fleetAgentStatusToEndpointHostStatus } from '../../utils/fleet_agent_status_to_endpoint_host_status';

/** Ambiguity candidates returned to the model, newest/most-live first. */
export const MAX_AMBIGUOUS_CANDIDATES = MAX_HOST_RECORDS;

export const getMetadataAgentId = (entry: {
  metadata?: {
    elastic?: { agent?: { id?: string } };
    agent?: { id?: string };
  };
}): string | undefined => entry.metadata?.elastic?.agent?.id || entry.metadata?.agent?.id;

export interface EndpointHostCandidate {
  agentId: string;
  isLive: boolean;
  status: string;
  sortKey?: string;
}

export type EndpointHostSelection<T extends EndpointHostCandidate> =
  | { kind: 'found'; candidate: T }
  | { kind: 'not_found' }
  | { kind: 'ambiguous'; candidates: T[]; truncated?: true };

const NOT_LIVE_FLEET_STATUSES: ReadonlySet<string> = new Set([
  'offline',
  'inactive',
  'unenrolled',
  'uninstalled',
  'decommissioned',
]);

export const isLiveFleetStatus = (status: string): boolean => !NOT_LIVE_FLEET_STATUSES.has(status);

const NOT_LIVE_HOST_STATUSES: ReadonlySet<string> = new Set<string>([
  HostStatus.OFFLINE,
  HostStatus.INACTIVE,
  HostStatus.UNENROLLED,
]);

export const isLiveHostStatus = (status: string): boolean => !NOT_LIVE_HOST_STATUSES.has(status);

/**
 * Fleet statuses the shared `fleetAgentStatusToEndpointHostStatus` mapper has
 * no entry for (it falls back to `unhealthy`) although the record is gone, not
 * unhealthy: the metadata path reports them as `unenrolled`. They are exactly
 * the not-live statuses (`isLiveFleetStatus`) without a `HostStatus` entry. The shared
 * mapper is left alone because its other caller (`host_status` on the
 * metadata API) would change behavior. `orphaned` stays `unhealthy`: Fleet
 * counts it as an active agent (`ActiveAgentStatuses`), so it is live here too.
 */
const GONE_FLEET_STATUSES: ReadonlySet<string> = new Set(['unenrolled', 'uninstalled']);

export const toHostStatus = (status: AgentStatus): HostStatus =>
  GONE_FLEET_STATUSES.has(status)
    ? HostStatus.UNENROLLED
    : fleetAgentStatusToEndpointHostStatus(status);

export const selectEndpointHost = <T extends EndpointHostCandidate>(
  candidates: T[],
  { truncated, dispatch }: { truncated: boolean; dispatch?: { originCandidates: T[] } }
): EndpointHostSelection<T> => {
  if (!candidates.length) {
    return { kind: 'not_found' };
  }

  const sorted = [...candidates].sort((a, b) => {
    const aLive = a.isLive ? 1 : 0;
    const bLive = b.isLive ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    return (b.sortKey ?? '').localeCompare(a.sortKey ?? '');
  });

  // A candidate a write can meaningfully target: any record that is not
  // definitively gone (`unenrolled` / `uninstalled`). An offline or
  // inactive machine still picks the action up when it checks back in, so
  // for a dispatch it is as claimable as a live one — while re-enrollment
  // history (the current record plus stale `unenrolled` ones) collapses
  // to a single claimable candidate and keeps resolving.
  const claimable = sorted.filter((candidate) => candidate.status !== HostStatus.UNENROLLED);
  // Read mode: more than one agent matching the hostname is normal Fleet
  // bookkeeping (re-enrollment, reinstall, agent upgrade) as long as only
  // ONE of them is live; two live machines genuinely sharing a hostname —
  // including a same-named endpoint in a linked project — is different:
  // picking either one silently would report the wrong host, so surface
  // the ambiguity instead of guessing.
  //
  // An incomplete candidate set is treated the same way as a genuine
  // duplicate for the same reason: an unexamined record could be another
  // live machine. This applies only when at least one visible candidate
  // was found — the zero-visibility case is answered `not_found` above so
  // cross-space existence never leaks.
  const live = sorted.filter((candidate) => candidate.isLive);

  if (dispatch) {
    // Dispatch mode resolves on ORIGIN sources only. A hostname with no
    // origin candidate at all — its only matches live in linked projects,
    // visible to the scoped read but unreachable by the response-actions
    // client, which dispatches through origin Fleet — has no dispatchable
    // answer from this project: an action issued here would sit pending
    // forever. Answering `not_found` (rather than offering the scoped
    // candidates) also keeps the model from retrying with an ID the
    // agent-id path would refuse. An origin set that is entirely
    // un-enrollment history still resolves below, so the gone-endpoint
    // refusal can report the host accurately instead of `not_found`.
    const originOnly = dispatch.originCandidates;
    const originIds = new Set(originOnly.map((candidate) => candidate.agentId));
    if (!originIds.size) {
      return { kind: 'not_found' };
    }

    // Dispatch mode: a write must not guess among ANY two claimable
    // records, so the ambiguity set is the claimable one — origin records
    // plus same-named linked-project hosts the scoped read found, so the
    // origin host is not offered on a card while another machine shares
    // its name.
    if (truncated || claimable.length > 1) {
      return {
        kind: 'ambiguous',
        candidates: sorted.slice(0, MAX_AMBIGUOUS_CANDIDATES),
        ...(truncated ? { truncated: true as const } : {}),
      };
    }

    // Dispatch mode cannot land on a record the origin cannot act on: the
    // answer is the single claimable origin candidate, falling back to the
    // first origin record in merge order when every origin match is gone history (the
    // refusal path then names it). Read mode keeps the live-then-newest
    // fallback across every record.
    return {
      kind: 'found',
      candidate: claimable.find((candidate) => originIds.has(candidate.agentId)) ?? originOnly[0],
    };
  }

  if (truncated || live.length > 1) {
    return {
      kind: 'ambiguous',
      candidates: (truncated ? sorted : live).slice(0, MAX_AMBIGUOUS_CANDIDATES),
      ...(truncated ? { truncated: true as const } : {}),
    };
  }

  return { kind: 'found', candidate: sorted[0] };
};
