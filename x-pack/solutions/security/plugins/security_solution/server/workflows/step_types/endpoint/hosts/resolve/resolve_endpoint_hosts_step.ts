/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { Agent, AgentStatus } from '@kbn/fleet-plugin/common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { METADATA_UNITED_INDEX } from '../../../../../../common/endpoint/constants';
import { isInElasticDefendAgentPolicy } from '../../common/elastic_defend_agent_policy';
import {
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
  collectPages,
  getMetadataAgentId,
  isLiveFleetStatus,
  isLiveHostStatus,
  selectEndpointHost,
  toHostStatus,
} from '../../../../../endpoint/services/endpoint_host_selection';
import type { EndpointHostCandidate } from '../../../../../endpoint/services/endpoint_host_selection';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { boundId, boundText } from '../../common/bound_string';
import { readKibanaApi } from '../../common/read_kibana_api';
import { parseFiniteNumber } from '../../common/number';
import { isUnauthorized, isNotFound, readErrorOutcome } from '../../common/read_error';

type HostTarget = z.infer<typeof hostTargetSchema>;
type HostRecordOutput = z.infer<typeof hostRecordSchema>;
type ResolveResultOutput = z.infer<typeof resolveEndpointHostsResultSchema>;

const RESOLVE_BY_ID_PAGE_SIZE = 10;
const RESOLVE_BY_NAME_PAGE_SIZE = 100;
const MAX_RESOLVE_FLEET_PAGES = 10;
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
  total?: number;
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

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const toNumber = (value: unknown): number => parseFiniteNumber(value) ?? 0;

const addPart = (parts: PartErrors, kind: 'unauthorized' | 'unavailable', part: ReadPart): void => {
  if (!parts[kind].includes(part)) {
    parts[kind].push(part);
  }
};

const classifyReadError = (parts: PartErrors, part: ReadPart, error: unknown): void => {
  const outcome = readErrorOutcome(error, part);
  addPart(parts, 'unauthorized' in outcome ? 'unauthorized' : 'unavailable', part);
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
  `status:* and local_metadata.host.name.keyword:"${escapeQuotes(hostname)}"`;

const fetchMetadataList = async (
  endpointAppContextService: EndpointAppContextService,
  context: StepHandlerContext,
  pageSize: number,
  kuery: string,
  parts: PartErrors
): Promise<MetadataRouteHost[]> => {
  const query = new URLSearchParams({ pageSize: String(pageSize), kuery });
  const body = await readKibanaApi<MetadataRouteResponse>(
    context.contextManager,
    `/api/endpoint/metadata?${query.toString()}`,
    context.abortSignal
  );
  const records = body.data ?? [];
  if (records.length === 0) {
    context.abortSignal.throwIfAborted();
    try {
      const client = await endpointAppContextService.getReadEsClient(
        context.contextManager.getFakeRequest()
      );
      context.abortSignal.throwIfAborted();
      await client.search(
        { index: METADATA_UNITED_INDEX, size: 0 },
        { signal: context.abortSignal }
      );
      context.abortSignal.throwIfAborted();
    } catch {
      context.abortSignal.throwIfAborted();
      addPart(parts, 'unavailable', 'host_state');
    }
  }
  return records;
};

const fetchFleetAgentsByName = async (
  context: StepHandlerContext,
  kuery: string,
  endpointAgentPolicyIds: ReadonlySet<string>
): Promise<{ items: Agent[]; truncated: boolean }> =>
  collectPages<Agent>(
    async (page) => {
      const query = new URLSearchParams({
        showInactive: 'true',
        perPage: String(RESOLVE_BY_NAME_PAGE_SIZE),
        page: String(page),
        kuery,
      });
      const body = await readKibanaApi<FleetAgentsRouteResponse>(
        context.contextManager,
        `/api/fleet/agents?${query.toString()}`,
        context.abortSignal
      );
      const agents = body.items ?? [];
      const items = agents.filter((agent) =>
        isInElasticDefendAgentPolicy(agent, endpointAgentPolicyIds)
      );
      return { items, total: body.total, fetchedCount: agents.length };
    },
    { pageSize: RESOLVE_BY_NAME_PAGE_SIZE, maxPages: MAX_RESOLVE_FLEET_PAGES }
  );

const fetchFleetAgentById = async (
  context: StepHandlerContext,
  agentId: string
): Promise<Agent | undefined> => {
  const body = await readKibanaApi<FleetAgentRouteResponse>(
    context.contextManager,
    `/api/fleet/agents/${encodeURIComponent(agentId)}`,
    context.abortSignal
  );
  return body.item;
};

const buildPolicyInfo = (
  policyInfo: NonNullable<MetadataRouteHost['policy_info']>
): HostRecordOutput['policy_info'] => ({
  agent: {
    configured: {
      id: boundId(asString(policyInfo.agent?.configured?.id), MAX_INPUT_STRING_CHARS),
      revision: toNumber(policyInfo.agent?.configured?.revision),
    },
    applied: {
      id: boundId(asString(policyInfo.agent?.applied?.id), MAX_INPUT_STRING_CHARS),
      revision: toNumber(policyInfo.agent?.applied?.revision),
    },
  },
  endpoint: {
    id: boundId(asString(policyInfo.endpoint?.id), MAX_INPUT_STRING_CHARS),
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
    agent_id: boundId(asString(agentId), MAX_AGENT_ID_LENGTH),
    ...(agent?.id !== undefined
      ? { endpoint_id: boundId(asString(agent?.id), MAX_AGENT_ID_LENGTH) }
      : {}),
    host_status: boundId(asString(record.host_status), MAX_INPUT_STRING_CHARS),
    ...(record.last_checkin !== undefined
      ? { last_checkin: boundId(asString(record.last_checkin), MAX_INPUT_STRING_CHARS) }
      : {}),
    metadata: {
      agent: {
        id: boundId(asString(agent?.id), MAX_INPUT_STRING_CHARS),
        version: boundId(asString(agent?.version), MAX_INPUT_STRING_CHARS),
        type: boundId(asString(agent?.type), MAX_INPUT_STRING_CHARS),
      },
      elastic: {
        agent: {
          ...(metadata?.elastic?.agent?.id !== undefined
            ? { id: boundId(asString(metadata.elastic.agent.id), MAX_INPUT_STRING_CHARS) }
            : {}),
        },
      },
      host: {
        hostname: boundText(asString(host?.hostname), MAX_INPUT_STRING_CHARS),
        name: boundText(asString(host?.name), MAX_INPUT_STRING_CHARS),
        ip: cutIp.map((value) => boundId(asString(value), MAX_INPUT_STRING_CHARS)),
        ...(ip.length > MAX_HOST_IPS ? { ip_total: ip.length } : {}),
        architecture: boundId(asString(host?.architecture), MAX_INPUT_STRING_CHARS),
        os: {
          name: boundText(asString(os?.name), MAX_INPUT_STRING_CHARS),
          version: boundId(asString(os?.version), MAX_INPUT_STRING_CHARS),
          platform: boundId(asString(os?.platform), MAX_INPUT_STRING_CHARS),
          family: boundId(asString(os?.family), MAX_INPUT_STRING_CHARS),
        },
      },
      Endpoint: {
        status: boundId(asString(metadata?.Endpoint?.status), MAX_INPUT_STRING_CHARS),
        policy: {
          applied: {
            id: boundId(asString(applied?.id), MAX_INPUT_STRING_CHARS),
            name: boundText(asString(applied?.name), MAX_INPUT_STRING_CHARS),
            status: boundId(asString(applied?.status), MAX_INPUT_STRING_CHARS),
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
    agent_id: boundId(asString(agent.id), MAX_AGENT_ID_LENGTH),
    host_status: boundId(
      asString(toHostStatus(fleetStatus ?? ('' as AgentStatus))),
      MAX_INPUT_STRING_CHARS
    ),
    ...(agent.last_checkin !== undefined
      ? { last_checkin: boundId(asString(agent.last_checkin), MAX_INPUT_STRING_CHARS) }
      : {}),
    fleet_agent: {
      id: boundId(asString(agent.id), MAX_AGENT_ID_LENGTH),
      ...(fleetStatus !== undefined
        ? { status: boundId(asString(fleetStatus), MAX_INPUT_STRING_CHARS) }
        : {}),
      active: agent.active === true,
      enrolled_at: boundId(asString(agent.enrolled_at), MAX_INPUT_STRING_CHARS),
      ...(agent.unenrolled_at !== undefined
        ? { unenrolled_at: boundId(asString(agent.unenrolled_at), MAX_INPUT_STRING_CHARS) }
        : {}),
      ...(agent.last_checkin !== undefined
        ? { last_checkin: boundId(asString(agent.last_checkin), MAX_INPUT_STRING_CHARS) }
        : {}),
      ...(agent.policy_id !== undefined
        ? { policy_id: boundId(asString(agent.policy_id), MAX_INPUT_STRING_CHARS) }
        : {}),
      ...(agent.policy_revision !== undefined ? { policy_revision: agent.policy_revision } : {}),
      ...(agent.agent?.version !== undefined
        ? { agent: { version: boundId(asString(agent.agent.version), MAX_INPUT_STRING_CHARS) } }
        : {}),
      local_metadata: {
        host: {
          hostname: boundText(asString(host?.hostname), MAX_INPUT_STRING_CHARS),
          name: boundText(asString(host?.name), MAX_INPUT_STRING_CHARS),
        },
        os: {
          name: boundText(asString(os?.name), MAX_INPUT_STRING_CHARS),
          version: boundId(asString(os?.version), MAX_INPUT_STRING_CHARS),
          platform: boundId(asString(os?.platform), MAX_INPUT_STRING_CHARS),
        },
      },
    },
  };
};

const deduplicateCandidates = (candidates: ResolveCandidate[]): ResolveCandidate[] => {
  const byAgentId = new Map<string, ResolveCandidate>();
  for (const candidate of candidates) {
    const existing = byAgentId.get(candidate.agentId);
    if (!existing || (candidate.record.last_checkin ?? '') > (existing.record.last_checkin ?? '')) {
      byAgentId.set(candidate.agentId, candidate);
    }
  }
  return [...byAgentId.values()];
};

const toMetadataCandidates = (records: MetadataRouteHost[]): ResolveCandidate[] =>
  deduplicateCandidates(
    records.flatMap((record) => {
      const agentId = getMetadataAgentId(record);
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
    })
  );

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
  return deduplicateCandidates(
    agents.filter((agent) => !knownAgentIds.has(agent.id)).map(toFleetCandidate)
  );
};

const fetchElasticDefendAgentPolicyIds = async (
  endpointAppContextService: EndpointAppContextService,
  context: StepHandlerContext
): Promise<Set<string>> => {
  const spaceId = endpointAppContextService.getActiveSpaceId(
    context.contextManager.getFakeRequest()
  );
  const packagePolicies = await endpointAppContextService
    .getEndpointMetadataService(spaceId)
    .getAllEndpointPackagePolicies(context.abortSignal);
  return new Set(packagePolicies.flatMap((policy) => policy.policy_ids));
};

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
    status = parts.unauthorized.includes('host_enrollments')
      ? 'unauthorized'
      : parts.unavailable.length > 0
      ? 'unavailable'
      : 'not_found';
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
  endpointAppContextService: EndpointAppContextService,
  context: StepHandlerContext,
  target: HostTarget,
  agentId: string,
  parts: PartErrors
): Promise<ResolveResultOutput> => {
  const metadataAttempt = await attempt(
    fetchMetadataList(
      endpointAppContextService,
      context,
      RESOLVE_BY_ID_PAGE_SIZE,
      byIdKuery(agentId),
      parts
    )
  );

  if (!metadataAttempt.ok) {
    classifyReadError(parts, 'host_state', metadataAttempt.error);
    return buildEmptyResult(
      target,
      isUnauthorized(metadataAttempt.error) ? 'unauthorized' : 'unavailable',
      parts
    );
  }

  const candidates = toMetadataCandidates(metadataAttempt.value);

  if (candidates.length === 0) {
    const fleetAttempt = await attempt(fetchFleetAgentById(context, agentId));
    if (fleetAttempt.ok) {
      const agent = fleetAttempt.value;
      if (agent) {
        const policyIdsAttempt = await attempt(
          fetchElasticDefendAgentPolicyIds(endpointAppContextService, context)
        );
        if (policyIdsAttempt.ok) {
          if (isInElasticDefendAgentPolicy(agent, policyIdsAttempt.value)) {
            candidates.push(toFleetCandidate(agent));
          }
        } else {
          classifyReadError(parts, 'host_enrollments', policyIdsAttempt.error);
        }
      }
    } else if (!isNotFound(fleetAttempt.error)) {
      classifyReadError(parts, 'host_enrollments', fleetAttempt.error);
    }
  }

  const selection = selectEndpointHost(candidates, { truncated: false });
  return buildSelectionResult(target, candidates, selection, parts);
};

const resolveByName = async (
  endpointAppContextService: EndpointAppContextService,
  context: StepHandlerContext,
  target: HostTarget,
  hostname: string,
  expandShortHostname: boolean,
  parts: PartErrors
): Promise<ResolveResultOutput> => {
  const [metadataAttempt, fleetAttempt] = await Promise.all([
    attempt(
      fetchMetadataList(
        endpointAppContextService,
        context,
        RESOLVE_BY_NAME_PAGE_SIZE,
        byNameMetadataKuery(hostname),
        parts
      )
    ),
    attempt(
      (async () => {
        const policyIdsAttempt = await attempt(
          fetchElasticDefendAgentPolicyIds(endpointAppContextService, context)
        );
        if (!policyIdsAttempt.ok) {
          classifyReadError(parts, 'host_enrollments', policyIdsAttempt.error);
          return { items: [], truncated: false };
        }
        return fetchFleetAgentsByName(context, byNameFleetKuery(hostname), policyIdsAttempt.value);
      })()
    ),
  ]);

  if (!fleetAttempt.ok) {
    classifyReadError(parts, 'host_enrollments', fleetAttempt.error);
  }

  if (!metadataAttempt.ok) {
    classifyReadError(parts, 'host_state', metadataAttempt.error);
    return buildEmptyResult(
      target,
      isUnauthorized(metadataAttempt.error) ? 'unauthorized' : 'unavailable',
      parts
    );
  }

  const defendFleetItems = fleetAttempt.ok ? fleetAttempt.value.items : [];
  const fleetIncomplete = fleetAttempt.ok && fleetAttempt.value.truncated;
  let metadataRecords = metadataAttempt.value;
  let incomplete = metadataRecords.length >= RESOLVE_BY_NAME_PAGE_SIZE || fleetIncomplete;

  let metadataCandidates = toMetadataCandidates(metadataRecords);
  let fleetCandidates = toFleetOnlyCandidates(defendFleetItems, metadataCandidates);

  if (
    expandShortHostname &&
    metadataCandidates.length === 0 &&
    fleetCandidates.length === 0 &&
    EXPANDABLE_HOSTNAME.test(hostname)
  ) {
    const expansionAttempt = await attempt(
      fetchMetadataList(
        endpointAppContextService,
        context,
        RESOLVE_BY_NAME_PAGE_SIZE,
        byNameMetadataExpansionKuery(hostname),
        parts
      )
    );
    if (!expansionAttempt.ok) {
      classifyReadError(parts, 'host_state', expansionAttempt.error);
      return buildEmptyResult(
        target,
        isUnauthorized(expansionAttempt.error) ? 'unauthorized' : 'unavailable',
        parts
      );
    }
    metadataRecords = expansionAttempt.value;
    incomplete = fleetIncomplete || metadataRecords.length >= RESOLVE_BY_NAME_PAGE_SIZE;
    metadataCandidates = toMetadataCandidates(metadataRecords);
    fleetCandidates = toFleetOnlyCandidates(defendFleetItems, metadataCandidates);
  }

  const candidates = [...metadataCandidates, ...fleetCandidates];
  if (fleetIncomplete && candidates.length === 0) {
    addPart(parts, 'unavailable', 'host_enrollments');
    return buildEmptyResult(target, 'unavailable', parts);
  }
  const selection = selectEndpointHost(candidates, { truncated: incomplete });
  return buildSelectionResult(target, candidates, selection, parts);
};

const resolveTarget = (
  endpointAppContextService: EndpointAppContextService,
  context: StepHandlerContext,
  target: HostTarget,
  expandShortHostname: boolean
): Promise<ResolveResultOutput> => {
  const parts: PartErrors = { unauthorized: [], unavailable: [] };

  const agentId = target.agent_id?.trim();
  if (agentId) {
    return resolveById(endpointAppContextService, context, target, agentId, parts);
  }

  return resolveByName(
    endpointAppContextService,
    context,
    target,
    target.hostname?.trim() ?? '',
    expandShortHostname,
    parts
  );
};

interface ResolveEndpointHostsDependencies {
  endpointAppContextService: EndpointAppContextService;
}

export const createResolveEndpointHostsStepDefinition = ({
  endpointAppContextService,
}: ResolveEndpointHostsDependencies) =>
  createServerStepDefinition({
    ...resolveEndpointHostsStepCommonDefinition,
    handler: async (context) => {
      const { targets, expand_short_hostname: expandShortHostname } =
        resolveEndpointHostsInputSchema.parse(context.input);

      const results = await Promise.all(
        targets.map((target) =>
          resolveTarget(endpointAppContextService, context, target, expandShortHostname)
        )
      );

      context.abortSignal.throwIfAborted();
      return { output: { results } };
    },
  });
