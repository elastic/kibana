/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentStatus } from '@kbn/fleet-plugin/common';
import { HostStatus } from '../../../../common/endpoint/types';
import { fleetAgentStatusToEndpointHostStatus } from '../../utils/fleet_agent_status_to_endpoint_host_status';

export const MAX_AMBIGUOUS_CANDIDATES = 10;

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
 * no entry for (it falls back to `unhealthy`) although the record is gone.
 * The shared mapper is left alone because its other caller would change
 * behavior.
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

  const claimable = sorted.filter((candidate) => candidate.status !== HostStatus.UNENROLLED);
  const live = sorted.filter((candidate) => candidate.isLive);

  if (dispatch) {
    const originOnly = dispatch.originCandidates;
    const originIds = new Set(originOnly.map((candidate) => candidate.agentId));
    if (!originIds.size) {
      return { kind: 'not_found' };
    }

    if (truncated || claimable.length > 1) {
      return {
        kind: 'ambiguous',
        candidates: sorted.slice(0, MAX_AMBIGUOUS_CANDIDATES),
        ...(truncated ? { truncated: true as const } : {}),
      };
    }

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
