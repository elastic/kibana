/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { Agent, AgentStatus } from '@kbn/fleet-plugin/common';
import { createServerStepDefinition, KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import {
  ELASTIC_DEFEND_COMPONENT_TYPE,
  MAX_AGENT_ID_LENGTH,
  MAX_HOST_IPS,
  MAX_HOST_RECORDS,
  type hostRecordSchema,
  type hostTargetSchema,
  resolveEndpointHostsInputSchema,
  type resolveEndpointHostsResultSchema,
  resolveEndpointHostsStepCommonDefinition,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { MAX_INPUT_STRING_CHARS } from '../../../../../../common/workflows/step_types/common/budget';
import {
  isLiveFleetStatus,
  isLiveHostStatus,
  selectEndpointHost,
  toHostStatus,
} from '../../../../../endpoint/services/endpoint_host_selection';
import type { EndpointHostCandidate } from '../../../../../endpoint/services/endpoint_host_selection';

type HostTarget = z.infer<typeof hostTargetSchema>;
type HostRecordOutput = z.infer<typeof hostRecordSchema>;
type ResolveResultOutput = z.infer<typeof resolveEndpointHostsResultSchema>;

/** Metadata list page size for a lookup by id (one host, a handful of records). */
const RESOLVE_BY_ID_PAGE_SIZE = 10;
/** Metadata list and Fleet page size for a lookup by name; a full page means the read is incomplete. */
const RESOLVE_BY_NAME_PAGE_SIZE = 100;
/** A pass-2 expansion only applies to a simple hostname, never a value with a wildcard or space. */
const EXPANDABLE_HOSTNAME = /^[A-Za-z0-9._-]+$/;

interface MetadataRouteHost {
  host_status: string;
  last_checkin?: string;
  metadata?: {
    agent?: { id?: string; version?: string; type?: string };
    elastic?: { agent?: { id?: string } };
    host?: {
      hostname?: string;
      name?: string;
      ip?: string[];
      architecture?: string;
      os?: { name?: string; version?: string; platform?: string; family?: string };
    };
    Endpoint?: {
      status?: string;
      policy?: {
        applied?: {
          id?: string;
          name?: string;
          status?: string;
          endpoint_policy_version?: number;
          version?: number;
        };
      };
      state?: { isolation?: boolean };
    };
  };
  policy_info?: {
    agent?: {
      configured?: { id?: string; revision?: number };
      applied?: { id?: string; revision?: number };
    };
    endpoint?: { id?: string; revision?: number };
  };
}

interface MetadataRouteResponse {
  data?: MetadataRouteHost[];
}

interface FleetAgentsRouteResponse {
  items?: Agent[];
}

interface FleetAgentRouteResponse {
  item?: Agent;
}

interface ResolveCandidate extends EndpointHostCandidate {
  record: HostRecordOutput;
}

interface PartErrors {
  unauthorized: string[];
  unavailable: string[];
}

type ReadPart = 'host_state' | 'host_enrollments';

const boundString = (value: unknown, max: number): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.length > max ? value.slice(0, max) : value;
};

const boundInputString = (value: unknown): string => boundString(value, MAX_INPUT_STRING_CHARS);

const boundId = (value: unknown): string => boundString(value, MAX_AGENT_ID_LENGTH);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  return 0;
};

const isForbidden = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && error.status === 403;

const isNotFound = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && error.status === 404;

const addPart = (parts: PartErrors, kind: 'unauthorized' | 'unavailable', part: ReadPart): void => {
  if (!parts[kind].includes(part)) {
    parts[kind].push(part);
  }
};

const classifyReadError = (parts: PartErrors, part: ReadPart, error: unknown): void => {
  addPart(parts, isForbidden(error) ? 'unauthorized' : 'unavailable', part);
};

const attempt = async <T>(
  promise: Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> => {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
};

const byIdKuery = (agentId: string): string => {
  const value = `"${escapeQuotes(agentId)}"`;
  return `united.endpoint.agent.id:${value} or united.agent.agent.id:${value}`;
};

const byNameMetadataKuery = (hostname: string): string => {
  const value = `"${escapeQuotes(hostname)}"`;
  return `united.endpoint.host.hostname:${value} or united.agent.local_metadata.host.name.keyword:${value}`;
};

const byNameMetadataExpansionKuery = (hostname: string): string =>
  `united.endpoint.host.hostname:${hostname}.*`;

const byNameFleetKuery = (hostname: string): string =>
  `status:* and local_metadata.host.name.keyword:"${escapeQuotes(
    hostname
  )}" and packages:"${ELASTIC_DEFEND_COMPONENT_TYPE}"`;

const fetchMetadataList = async (
  context: StepHandlerContext,
  pageSize: number,
  kuery: string
): Promise<MetadataRouteHost[]> => {
  const query = new URLSearchParams({ pageSize: String(pageSize), kuery });
  const { body } = await context.contextManager.callKibanaApi<MetadataRouteResponse>({
    method: 'GET',
    path: `/api/endpoint/metadata?${query.toString()}`,
  });
  return body.data ?? [];
};

const fetchFleetAgentsByName = async (
  context: StepHandlerContext,
  kuery: string
): Promise<Agent[]> => {
  const query = new URLSearchParams({
    showInactive: 'true',
    perPage: String(RESOLVE_BY_NAME_PAGE_SIZE),
    kuery,
  });
  const { body } = await context.contextManager.callKibanaApi<FleetAgentsRouteResponse>({
    method: 'GET',
    path: `/api/fleet/agents?${query.toString()}`,
  });
  return body.items ?? [];
};

const fetchFleetAgentById = async (
  context: StepHandlerContext,
  agentId: string
): Promise<Agent | undefined> => {
  const { body } = await context.contextManager.callKibanaApi<FleetAgentRouteResponse>({
    method: 'GET',
    path: `/api/fleet/agents/${encodeURIComponent(agentId)}`,
  });
  return body.item;
};

const buildPolicyInfo = (
  policyInfo: NonNullable<MetadataRouteHost['policy_info']>
): HostRecordOutput['policy_info'] => ({
  agent: {
    configured: {
      id: boundInputString(policyInfo.agent?.configured?.id),
      revision: toNumber(policyInfo.agent?.configured?.revision),
    },
    applied: {
      id: boundInputString(policyInfo.agent?.applied?.id),
      revision: toNumber(policyInfo.agent?.applied?.revision),
    },
  },
  endpoint: {
    id: boundInputString(policyInfo.endpoint?.id),
    revision: toNumber(policyInfo.endpoint?.revision),
  },
});

const buildMetadataHostRecord = (record: MetadataRouteHost, agentId: string): HostRecordOutput => {
  const metadata = record.metadata;
  const agent = metadata?.agent;
  const host = metadata?.host;
  const os = host?.os;
  const applied = metadata?.Endpoint?.policy?.applied;
  const isolation = metadata?.Endpoint?.state?.isolation;
  const hostIp = host?.ip;
  const ip = Array.isArray(hostIp)
    ? hostIp.filter((value): value is string => typeof value === 'string')
    : [];
  const cutIp = ip.slice(0, MAX_HOST_IPS);

  return {
    agent_id: boundId(agentId),
    ...(agent?.id !== undefined ? { endpoint_id: boundId(agent?.id) } : {}),
    host_status: boundInputString(record.host_status),
    ...(record.last_checkin !== undefined
      ? { last_checkin: boundInputString(record.last_checkin) }
      : {}),
    metadata: {
      agent: {
        id: boundInputString(agent?.id),
        version: boundInputString(agent?.version),
        type: boundInputString(agent?.type),
      },
      elastic: { agent: { id: boundInputString(metadata?.elastic?.agent?.id) } },
      host: {
        hostname: boundInputString(host?.hostname),
        name: boundInputString(host?.name),
        ip: cutIp.map(boundInputString),
        ...(ip.length > MAX_HOST_IPS ? { ip_total: ip.length } : {}),
        architecture: boundInputString(host?.architecture),
        os: {
          name: boundInputString(os?.name),
          version: boundInputString(os?.version),
          platform: boundInputString(os?.platform),
          family: boundInputString(os?.family),
        },
      },
      Endpoint: {
        status: boundInputString(metadata?.Endpoint?.status),
        policy: {
          applied: {
            id: boundInputString(applied?.id),
            name: boundInputString(applied?.name),
            status: boundInputString(applied?.status),
            endpoint_policy_version: toNumber(applied?.endpoint_policy_version),
            version: toNumber(applied?.version),
          },
        },
        ...(typeof isolation === 'boolean' ? { state: { isolation } } : {}),
      },
    },
    ...(record.policy_info !== undefined
      ? { policy_info: buildPolicyInfo(record.policy_info) }
      : {}),
  };
};

const buildFleetHostRecord = (agent: Agent): HostRecordOutput => {
  const localMetadata = agent.local_metadata as { host?: unknown; os?: unknown } | undefined;
  const host = localMetadata?.host as { hostname?: unknown; name?: unknown } | undefined;
  const os = localMetadata?.os as
    | { name?: unknown; version?: unknown; platform?: unknown }
    | undefined;
  const fleetStatus = agent.status as AgentStatus | undefined;

  return {
    agent_id: boundId(agent.id),
    host_status: boundInputString(toHostStatus(fleetStatus ?? ('' as AgentStatus))),
    ...(agent.last_checkin !== undefined
      ? { last_checkin: boundInputString(agent.last_checkin) }
      : {}),
    fleet_agent: {
      id: boundId(agent.id),
      ...(fleetStatus !== undefined ? { status: boundInputString(fleetStatus) } : {}),
      active: agent.active === true,
      enrolled_at: boundInputString(agent.enrolled_at),
      ...(agent.unenrolled_at !== undefined
        ? { unenrolled_at: boundInputString(agent.unenrolled_at) }
        : {}),
      ...(agent.last_checkin !== undefined
        ? { last_checkin: boundInputString(agent.last_checkin) }
        : {}),
      ...(agent.policy_id !== undefined ? { policy_id: boundInputString(agent.policy_id) } : {}),
      ...(agent.policy_revision !== undefined ? { policy_revision: agent.policy_revision } : {}),
      ...(agent.agent?.version !== undefined
        ? { agent: { version: boundInputString(agent.agent.version) } }
        : {}),
      local_metadata: {
        host: { hostname: boundInputString(host?.hostname), name: boundInputString(host?.name) },
        os: {
          name: boundInputString(os?.name),
          version: boundInputString(os?.version),
          platform: boundInputString(os?.platform),
        },
      },
    },
  };
};

const toMetadataCandidates = (records: MetadataRouteHost[]): ResolveCandidate[] =>
  records.flatMap((record) => {
    const agentId = record.metadata?.elastic?.agent?.id || record.metadata?.agent?.id;
    if (!agentId) {
      return [];
    }
    return [
      {
        agentId,
        isLive: isLiveHostStatus(record.host_status),
        status: record.host_status,
        sortKey: record.last_checkin,
        record: buildMetadataHostRecord(record, agentId),
      },
    ];
  });

const toFleetCandidate = (agent: Agent): ResolveCandidate => {
  const record = buildFleetHostRecord(agent);
  return {
    agentId: agent.id,
    isLive: isLiveFleetStatus(agent.status ?? ''),
    status: record.host_status,
    sortKey: agent.enrolled_at,
    record,
  };
};

const toFleetOnlyCandidates = (
  agents: Agent[],
  metadataCandidates: ResolveCandidate[]
): ResolveCandidate[] => {
  const knownAgentIds = new Set(metadataCandidates.map((candidate) => candidate.agentId));
  return agents.filter((agent) => !knownAgentIds.has(agent.id)).map(toFleetCandidate);
};

const hasEndpointPackage = (agent: Agent): boolean =>
  (agent.packages ?? []).includes(ELASTIC_DEFEND_COMPONENT_TYPE);

const buildEmptyResult = (
  target: HostTarget,
  status: string,
  parts: PartErrors
): ResolveResultOutput => ({
  target,
  status,
  hosts: [],
  truncation: { total: 0, returned: 0, truncated: false },
  unauthorized: parts.unauthorized,
  unavailable: parts.unavailable,
});

const buildSelectionResult = (
  target: HostTarget,
  candidates: ResolveCandidate[],
  selection: ReturnType<typeof selectEndpointHost<ResolveCandidate>>,
  parts: PartErrors
): ResolveResultOutput => {
  const total = candidates.length;
  let status: string;
  let hosts: HostRecordOutput[];

  if (selection.kind === 'found') {
    status = 'resolved';
    hosts = [
      selection.candidate,
      ...candidates.filter((candidate) => candidate !== selection.candidate),
    ]
      .slice(0, MAX_HOST_RECORDS)
      .map((candidate) => candidate.record);
  } else if (selection.kind === 'ambiguous') {
    status = 'ambiguous';
    hosts = selection.candidates.slice(0, MAX_HOST_RECORDS).map((candidate) => candidate.record);
  } else {
    status = 'not_found';
    hosts = [];
  }

  return {
    target,
    status,
    hosts,
    truncation: { total, returned: hosts.length, truncated: hosts.length < total },
    unauthorized: parts.unauthorized,
    unavailable: parts.unavailable,
  };
};

const resolveById = async (
  context: StepHandlerContext,
  target: HostTarget,
  agentId: string,
  parts: PartErrors
): Promise<ResolveResultOutput> => {
  const metadataAttempt = await attempt(
    fetchMetadataList(context, RESOLVE_BY_ID_PAGE_SIZE, byIdKuery(agentId))
  );

  if (!metadataAttempt.ok) {
    classifyReadError(parts, 'host_state', metadataAttempt.error);
    return buildEmptyResult(
      target,
      isForbidden(metadataAttempt.error) ? 'unauthorized' : 'unavailable',
      parts
    );
  }

  const candidates = toMetadataCandidates(metadataAttempt.value);

  if (candidates.length === 0) {
    const fleetAttempt = await attempt(fetchFleetAgentById(context, agentId));
    if (fleetAttempt.ok) {
      if (fleetAttempt.value && hasEndpointPackage(fleetAttempt.value)) {
        candidates.push(toFleetCandidate(fleetAttempt.value));
      }
    } else if (!isNotFound(fleetAttempt.error)) {
      classifyReadError(parts, 'host_enrollments', fleetAttempt.error);
    }
  }

  const selection = selectEndpointHost(candidates, { truncated: false });
  return buildSelectionResult(target, candidates, selection, parts);
};

const resolveByName = async (
  context: StepHandlerContext,
  target: HostTarget,
  hostname: string,
  expandShortHostname: boolean,
  parts: PartErrors
): Promise<ResolveResultOutput> => {
  const [metadataAttempt, fleetAttempt] = await Promise.all([
    attempt(fetchMetadataList(context, RESOLVE_BY_NAME_PAGE_SIZE, byNameMetadataKuery(hostname))),
    attempt(fetchFleetAgentsByName(context, byNameFleetKuery(hostname))),
  ]);

  if (!fleetAttempt.ok && !isNotFound(fleetAttempt.error)) {
    classifyReadError(parts, 'host_enrollments', fleetAttempt.error);
  }

  if (!metadataAttempt.ok) {
    classifyReadError(parts, 'host_state', metadataAttempt.error);
    return buildEmptyResult(
      target,
      isForbidden(metadataAttempt.error) ? 'unauthorized' : 'unavailable',
      parts
    );
  }

  const fleetItems = fleetAttempt.ok ? fleetAttempt.value : [];
  let metadataRecords = metadataAttempt.value;
  let incomplete =
    metadataRecords.length >= RESOLVE_BY_NAME_PAGE_SIZE ||
    fleetItems.length >= RESOLVE_BY_NAME_PAGE_SIZE;

  let metadataCandidates = toMetadataCandidates(metadataRecords);
  let fleetCandidates = toFleetOnlyCandidates(fleetItems, metadataCandidates);

  if (
    expandShortHostname &&
    metadataCandidates.length === 0 &&
    fleetCandidates.length === 0 &&
    EXPANDABLE_HOSTNAME.test(hostname)
  ) {
    const expansionAttempt = await attempt(
      fetchMetadataList(context, RESOLVE_BY_NAME_PAGE_SIZE, byNameMetadataExpansionKuery(hostname))
    );
    if (!expansionAttempt.ok) {
      classifyReadError(parts, 'host_state', expansionAttempt.error);
      return buildEmptyResult(
        target,
        isForbidden(expansionAttempt.error) ? 'unauthorized' : 'unavailable',
        parts
      );
    }
    metadataRecords = expansionAttempt.value;
    incomplete = incomplete || metadataRecords.length >= RESOLVE_BY_NAME_PAGE_SIZE;
    metadataCandidates = toMetadataCandidates(metadataRecords);
    fleetCandidates = toFleetOnlyCandidates(fleetItems, metadataCandidates);
  }

  const candidates = [...metadataCandidates, ...fleetCandidates];
  const selection = selectEndpointHost(candidates, { truncated: incomplete });
  return buildSelectionResult(target, candidates, selection, parts);
};

const resolveTarget = (
  context: StepHandlerContext,
  target: HostTarget,
  expandShortHostname: boolean
): Promise<ResolveResultOutput> => {
  const parts: PartErrors = { unauthorized: [], unavailable: [] };

  if (target.agent_id !== undefined) {
    return resolveById(context, target, target.agent_id, parts);
  }

  return resolveByName(context, target, target.hostname ?? '', expandShortHostname, parts);
};

export const resolveEndpointHostsStepDefinition = createServerStepDefinition({
  ...resolveEndpointHostsStepCommonDefinition,
  handler: async (context) => {
    const { targets, expand_short_hostname: expandShortHostname } =
      resolveEndpointHostsInputSchema.parse(context.input);

    const results = await Promise.all(
      targets.map((target) => resolveTarget(context, target, expandShortHostname))
    );

    return { output: { results } };
  },
});
