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
import {
  ACTIVITY_LOOKBACK_MARGIN_MS,
  ACTIVITY_MAX_PROCESS_EVENTS,
  AI_AGENTS_QUERY_KEYS,
  getEndpointProcessIndex,
} from '../constants';
import {
  buildAgentAlertCountsQuery,
  buildAgentAlertsQuery,
  buildAgentContextQuery,
  buildAgentInventoryQuery,
  buildEntitiesByIdQuery,
  buildEntraAccountsQuery,
  buildHrRecordsQuery,
  buildOktaAccountsQuery,
  buildSignedInAsQuery,
} from '../queries/agent_queries';
import {
  buildDescendantProcessesQuery,
  buildOtelEventsQuery,
  buildOwnProcessesQuery,
  buildProcessSideEffectsQuery,
} from '../queries/activity_queries';
import {
  isDefined,
  toAgentAlert,
  toAgentRow,
  toHrRecord,
  toIdpAccount,
  toRelatedEntity,
} from '../queries/parse_rows';
import { buildAgentContext } from '../queries/build_agent_context';
import {
  buildAgentActivity,
  toOtelRecord,
  toProcessEvent,
  toSideEffects,
} from '../activity/build_agent_activity';
import type { AgentActivity, OtelMatch, OtelRecord, SideEffects } from '../activity/types';
import type {
  AgentAlert,
  AgentContext,
  AgentIdentity,
  AgentInventoryRow,
  AgentRow,
  IdpAccount,
} from '../types';
import { firstString, isClaudeCode, parseAgentId, toNumber, toStringArray } from '../utils';

type SearchService = DataPublicPluginStart['search'];
type EsqlRecord = Record<string, unknown>;

const context = (id: string) =>
  buildExecutionContext(EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT, `ai_agents_${id}`);

const esqlRecords = async (
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
const optionalRecords = async (
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
const recordsIfIndexExists = async (
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

/** One row per agent install in the space, with its open alert count. */
export const useAiAgentsInventory = () => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  return useQuery({
    queryKey: [AI_AGENTS_QUERY_KEYS.inventory, spaceId],
    enabled: !!spaceId,
    queryFn: async ({ signal }): Promise<AgentInventory> => {
      const space = spaceId ?? 'default';
      const [agents, alerts] = await Promise.all([
        esqlRecords(data.search, buildAgentInventoryQuery(space), 'inventory', signal),
        optionalRecords(data.search, buildAgentAlertCountsQuery(space), 'alert_counts', signal),
      ]);
      const alertCounts = new Map(
        alerts.records.map((row) => [
          firstString(row['kibana.alert.entity.id']) ?? '',
          toNumber(row.alert_count) ?? 0,
        ])
      );
      return {
        rows: agents
          .map(toAgentRow)
          .filter(isDefined)
          .map((row) => ({ ...row, alertCount: alertCounts.get(row.entityId) ?? 0 })),
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
      const emails = Array.from(
        new Set([
          ...(agent?.accountEmails ?? []),
          ...related
            .filter((row) => agent?.accountIds.includes(row.entityId))
            .map((row) => row.email)
            .filter(isDefined),
        ])
      );
      const noRecords = Promise.resolve({ records: [], failed: false });
      const [targets, okta, entra, hr] = await Promise.all([
        missingTargets.length
          ? esqlRecords(
              data.search,
              buildEntitiesByIdQuery(space, missingTargets),
              'targets',
              signal
            )
          : Promise.resolve([]),
        emails.length
          ? optionalRecords(data.search, buildOktaAccountsQuery(space, emails), 'okta', signal)
          : noRecords,
        emails.length
          ? optionalRecords(data.search, buildEntraAccountsQuery(space, emails), 'entra', signal)
          : noRecords,
        emails.length
          ? optionalRecords(data.search, buildHrRecordsQuery(emails), 'hr', signal)
          : noRecords,
      ]);
      const idpAccounts: IdpAccount[] = [...okta.records, ...entra.records]
        .map(toIdpAccount)
        .filter(isDefined);

      return {
        identity,
        ...buildAgentContext({
          identity,
          agent,
          related: [...related, ...targets.map(toRelatedEntity).filter(isDefined)],
          idpAccounts,
          hrRecords: hr.records.map(toHrRecord).filter(isDefined),
          signedInAs: firstString(signedInRecords.records[0]?.['process.ai_agent.email']),
          signedInAt: firstString(signedInRecords.records[0]?.['@timestamp']),
        }),
      };
    },
  });
};

/** Alerts stamped with the agent ID. */
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
const fetchOrderedArgs = async (
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

export interface AgentActivityResult extends AgentActivity {
  /** OTel couldn't be read (as opposed to: there is none). */
  readonly otelFailed: boolean;
}

/** Agent activity from every source that exists, assembled by `buildAgentActivity`. */
export const useAiAgentActivity = (agent: AgentRow | AgentIdentity | undefined) => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  const firstSeen = agent && 'firstSeen' in agent ? agent.firstSeen : undefined;
  const lastSeen = agent && 'lastSeen' in agent ? agent.lastSeen : undefined;
  const accountEmails = agent && 'accountEmails' in agent ? agent.accountEmails : [];
  return useQuery({
    queryKey: [AI_AGENTS_QUERY_KEYS.activity, spaceId, agent?.entityId, firstSeen, lastSeen],
    enabled: !!agent && !!spaceId,
    queryFn: async ({ signal }): Promise<AgentActivityResult | undefined> => {
      if (!agent) return undefined;
      const space = spaceId ?? 'default';
      const from = new Date(
        (firstSeen ? new Date(firstSeen).getTime() : Date.now() - 30 * 86_400_000) -
          ACTIVITY_LOOKBACK_MARGIN_MS
      ).toISOString();

      const [ownRecords, descendantRecords, sideEffectRecords] = await Promise.all([
        recordsIfIndexExists(
          data.search,
          buildOwnProcessesQuery(space, agent, from),
          'own',
          signal
        ),
        recordsIfIndexExists(
          data.search,
          buildDescendantProcessesQuery(space, agent, from),
          'descendants',
          signal
        ),
        optionalRecords(
          data.search,
          buildProcessSideEffectsQuery(space, agent, from),
          'effects',
          signal
        ),
      ]);
      const ownEvents = ownRecords.map(toProcessEvent).filter(isDefined);
      const descendantEvents = descendantRecords.map(toProcessEvent).filter(isDefined);
      const sideEffects: Map<string, SideEffects> = toSideEffects(sideEffectRecords.records);

      const sessionIds = Array.from(
        new Set(
          [...ownEvents, ...descendantEvents].map((event) => event.sessionId).filter(isDefined)
        )
      );
      let otelMatch: OtelMatch = 'none';
      let otelQuery: string | undefined;
      if (isClaudeCode(agent.agentName) && sessionIds.length > 0) {
        otelMatch = 'session';
        otelQuery = buildOtelEventsQuery(space, { sessionIds });
      } else if (isClaudeCode(agent.agentName) && accountEmails.length > 0) {
        otelMatch = 'account';
        otelQuery = buildOtelEventsQuery(space, {
          emails: accountEmails,
          from,
          to: new Date(
            (lastSeen ? new Date(lastSeen).getTime() : Date.now()) +
              ACTIVITY_LOOKBACK_MARGIN_MS * 60
          ).toISOString(),
        });
      }

      const rootDocumentIds = ownEvents
        .filter((event) => event.hasExec)
        .map((event) => event.documentId)
        .filter(isDefined);
      const [otel, rootArgs] = await Promise.all([
        otelQuery
          ? optionalRecords(data.search, otelQuery, 'otel', signal)
          : Promise.resolve({ records: [], failed: false }),
        fetchOrderedArgs(data.search, space, rootDocumentIds, signal).catch(
          () => new Map<string, string[]>()
        ),
      ]);
      const otelEvents: OtelRecord[] = otel.records.map(toOtelRecord).filter(isDefined);

      return {
        ...buildAgentActivity({
          identity: agent,
          ownEvents,
          descendantEvents,
          sideEffects,
          otelEvents,
          otelMatch,
          rootArgs,
          truncated:
            ownRecords.length >= ACTIVITY_MAX_PROCESS_EVENTS ||
            descendantRecords.length >= ACTIVITY_MAX_PROCESS_EVENTS,
        }),
        otelFailed: otel.failed,
      };
    },
  });
};
