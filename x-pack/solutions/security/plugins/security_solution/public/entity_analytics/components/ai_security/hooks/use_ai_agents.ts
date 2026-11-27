/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { get } from 'lodash';
import { lastValueFrom } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';
import { runEsqlQuery } from '../../home/queries/run_esql_query';
import { AI_AGENTS_QUERY_KEYS, getEndpointProcessIndex } from '../constants';
import {
  buildAgentAlertCountsQuery,
  buildAgentAlertsQuery,
  buildAgentContextQuery,
  buildAgentInventoryQuery,
  buildEntitiesByIdQuery,
  buildSignedInAsQuery,
} from '../queries/agent_queries';
import {
  isDefined,
  toAgentAlert,
  toAgentRow,
  toInventoryPerson,
  toRelatedEntity,
} from '../queries/parse_rows';
import { buildAgentContext } from '../queries/build_agent_context';
import type {
  AgentAlert,
  AgentContext,
  AgentIdentity,
  AgentInventoryRow,
  AgentRow,
  InventoryPerson,
} from '../types';
import { firstString, getSignedInAccounts, parseAgentId, toNumber, toStringArray } from '../utils';

export type SearchService = DataPublicPluginStart['search'];
export type EsqlRecord = Record<string, unknown>;

const context = (id: string) =>
  buildExecutionContext(EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT, `ai_agents_${id}`);

export const esqlRecords = async (
  search: SearchService,
  query: string,
  id: string,
  signal?: AbortSignal
): Promise<EsqlRecord[]> =>
  esqlResponseToRecords<EsqlRecord>(await runEsqlQuery(search, query, `ai_agents_${id}`, signal));

/** A space with no alerts yet has no alerts alias, which ES|QL reports as an unknown index. */
const isMissingIndexError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : '';
  const attributes =
    typeof error === 'object' && error !== null && 'attributes' in error
      ? JSON.stringify(error.attributes)
      : '';
  return /Unknown index|index_not_found/.test(`${message} ${attributes}`);
};

/**
 * Runs a query whose source may be missing. A missing index reads as no data, any other failure
 * as "couldn't read" for that layer.
 */
export const optionalRecords = async (
  search: SearchService,
  query: string,
  id: string,
  signal?: AbortSignal
): Promise<{ records: EsqlRecord[]; failed: boolean }> => {
  try {
    return { records: await esqlRecords(search, query, id, signal), failed: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { records: [], failed: !isMissingIndexError(error) };
  }
};

/** Reads a namespace's data stream, which may not exist yet. Any other failure still throws. */
export const recordsIfIndexExists = async (
  search: SearchService,
  query: string,
  id: string,
  signal?: AbortSignal
): Promise<EsqlRecord[]> => {
  try {
    return await esqlRecords(search, query, id, signal);
  } catch (error) {
    if (!signal?.aborted && isMissingIndexError(error)) return [];
    throw error;
  }
};

export interface AgentInventory {
  readonly rows: readonly AgentInventoryRow[];
  /** The alerts index couldn't be read, so alert counts show as unknown. */
  readonly alertsUnavailable: boolean;
}

/** The agents and the resolved people they act for. A failed people read leaves the raw emails. */
const readAgentsAndPeople = async (
  search: SearchService,
  space: string,
  signal?: AbortSignal
): Promise<{ agents: AgentRow[]; peopleById: Map<string, InventoryPerson> }> => {
  const agents = (await esqlRecords(search, buildAgentInventoryQuery(space), 'inventory', signal))
    .map(toAgentRow)
    .filter(isDefined);
  const personIds = Array.from(new Set(agents.flatMap((agent) => agent.accountIds)));
  const people = personIds.length
    ? await optionalRecords(
        search,
        buildEntitiesByIdQuery(space, personIds, personIds.length),
        'people',
        signal
      )
    : { records: [] };
  return {
    agents,
    peopleById: new Map(
      people.records
        .map(toInventoryPerson)
        .filter(isDefined)
        .map((person) => [person.entityId, person])
    ),
  };
};

/** One row per agent install in the space, with its open alert count and the people it acts for. */
export const useAiAgentsInventory = () => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  return useQuery({
    queryKey: [AI_AGENTS_QUERY_KEYS.inventory, spaceId],
    enabled: !!spaceId,
    queryFn: async ({ signal }): Promise<AgentInventory> => {
      const space = spaceId ?? 'default';
      const [{ agents, peopleById }, alerts] = await Promise.all([
        readAgentsAndPeople(data.search, space, signal),
        optionalRecords(data.search, buildAgentAlertCountsQuery(space), 'alert_counts', signal),
      ]);
      const alertCounts = new Map(
        alerts.records.map((row) => [
          firstString(row['kibana.alert.entity.id']) ?? '',
          toNumber(row.alert_count) ?? 0,
        ])
      );
      return {
        rows: agents.map((row) => ({
          ...row,
          alertCount: alertCounts.get(row.entityId) ?? 0,
          accounts: getSignedInAccounts(row, peopleById),
        })),
        alertsUnavailable: alerts.failed,
      };
    },
  });
};

/** The agent row plus everything that gives it context: host, runs as, people and other installs. */
export const useAiAgentContext = (entityId: string) => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  return useQuery({
    queryKey: [AI_AGENTS_QUERY_KEYS.context, spaceId, entityId],
    enabled: !!spaceId,
    queryFn: async ({ signal }): Promise<AgentContext & { identity?: AgentIdentity }> => {
      const space = spaceId ?? 'default';
      const parsed = parseAgentId(entityId);
      const agentRows = await esqlRecords(
        data.search,
        buildEntitiesByIdQuery(space, [entityId]),
        'agent',
        signal
      );
      const agent = agentRows.map(toAgentRow).find((row) => row?.entityId === entityId);
      const identity: AgentIdentity | undefined = agent ?? parsed;
      if (!identity) return { people: [], otherAgentsOnHost: [], otherInstallsOnAccount: [] };

      const [relatedRecords, signedInRecords] = await Promise.all([
        esqlRecords(
          data.search,
          buildAgentContextQuery({
            spaceId: space,
            identity,
            accountEmails: agent?.accountEmails ?? [],
            accountIds: agent?.accountIds ?? [],
            dependsOnIds: agent?.dependsOnIds ?? [],
          }),
          'context',
          signal
        ),
        optionalRecords(data.search, buildSignedInAsQuery(space, identity), 'signed_in_as', signal),
      ]);
      const related = relatedRecords.map(toRelatedEntity).filter(isDefined);

      const knownIds = new Set(related.map((row) => row.entityId));
      const missingTargets = Array.from(
        new Set(related.flatMap((row) => row.resolvedTo).filter((id) => !knownIds.has(id)))
      );
      const targets = missingTargets.length
        ? await esqlRecords(
            data.search,
            buildEntitiesByIdQuery(space, missingTargets),
            'targets',
            signal
          )
        : [];

      return {
        identity,
        ...buildAgentContext({
          identity,
          agent,
          related: [...related, ...targets.map(toRelatedEntity).filter(isDefined)],
          signedInAs: firstString(signedInRecords.records[0]?.['process.ai_agent.email']),
          signedInAt: firstString(signedInRecords.records[0]?.['@timestamp']),
        }),
      };
    },
  });
};

/** Open alerts stamped with the agent ID. */
export const useAiAgentAlerts = (entityId: string) => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  return useQuery({
    queryKey: [AI_AGENTS_QUERY_KEYS.alerts, spaceId, entityId],
    enabled: !!spaceId,
    queryFn: async ({ signal }): Promise<{ alerts: AgentAlert[]; unavailable: boolean }> => {
      const { records, failed } = await optionalRecords(
        data.search,
        buildAgentAlertsQuery(spaceId ?? 'default', entityId),
        'alerts',
        signal
      );
      return { alerts: records.map(toAgentAlert).filter(isDefined), unavailable: failed };
    },
  });
};

type ArgsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type ArgsResponse = IKibanaSearchResponse<estypes.SearchResponse<EsqlRecord>>;

/** Ordered `process.args` from `_source`. ES|QL returns keyword arrays sorted, which loses the prompt. */
export const fetchOrderedArgs = async (
  search: SearchService,
  namespace: string,
  documentIds: readonly string[],
  signal?: AbortSignal
): Promise<Map<string, string[]>> => {
  if (documentIds.length === 0) return new Map();
  const response = await lastValueFrom(
    search.search<ArgsRequest, ArgsResponse>(
      {
        params: {
          index: getEndpointProcessIndex(namespace),
          ignore_unavailable: true,
          size: documentIds.length,
          query: { ids: { values: [...documentIds] } },
          _source: ['process.entity_id', 'process.args'],
        },
      },
      { abortSignal: signal, executionContext: context('root_args') }
    )
  );
  return new Map(
    response.rawResponse.hits.hits.flatMap((hit) => {
      const entityId = firstString(get(hit._source, 'process.entity_id'));
      return entityId ? [[entityId, toStringArray(get(hit._source, 'process.args'))] as const] : [];
    })
  );
};
