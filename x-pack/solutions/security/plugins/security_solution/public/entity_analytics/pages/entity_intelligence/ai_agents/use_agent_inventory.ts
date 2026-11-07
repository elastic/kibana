/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';
import { addAgentMetrics, buildAgentInventory, hasIncompleteSearch } from './model';
import { AGENT_LOOKBACK_DAYS, MAX_INVENTORY_AGENTS, buildAgentInventoryQuery } from './queries';
import type { AgentSearchRequest } from './queries';
import type {
  AgentDataStatus,
  AgentDefinitionResponse,
  AgentInventoryResult,
  AgentSearchResponse,
  AgentToolsResponse,
} from './types';

/** Loads agent definitions, explicit tool configuration, and space-scoped invocation metadata. */
export const useAgentInventory = (
  spaceId: string | undefined,
  refreshKey = 0
): AgentInventoryResult => {
  const { http, data } = useKibana().services;
  const enabled = Boolean(spaceId);
  const definitions = useQuery<AgentDefinitionResponse>(
    ['entityIntelligenceAgentDefinitions', spaceId, refreshKey],
    async ({ signal }) => {
      const response = await http.get<AgentDefinitionResponse>('/api/agent_builder/agents', {
        version: '2023-10-31',
        signal,
      });
      return {
        results: response.results.map((agent) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          type: agent.type,
          readonly: agent.readonly,
          created_by: agent.created_by,
          access_control: agent.access_control,
          configuration: {
            tools: agent.configuration.tools,
            connector_ids: agent.configuration.connector_ids,
            subagent_ids: agent.configuration.subagent_ids,
            enable_elastic_capabilities: agent.configuration.enable_elastic_capabilities,
          },
        })),
      };
    },
    { enabled, retry: false, refetchOnWindowFocus: false }
  );
  const tools = useQuery<AgentToolsResponse>(
    ['entityIntelligenceAgentTools', spaceId, refreshKey],
    async ({ signal }) => {
      const response = await http.get<AgentToolsResponse>('/api/agent_builder/tools', {
        version: '2023-10-31',
        signal,
      });
      return {
        results: response.results.map((tool) => ({
          id: tool.id,
          type: tool.type,
          confirmation: tool.confirmation,
          configuration:
            tool.type === 'mcp'
              ? {
                  connector_id: tool.configuration?.connector_id,
                  tool_name: tool.configuration?.tool_name,
                }
              : undefined,
        })),
      };
    },
    { enabled, retry: false, refetchOnWindowFocus: false }
  );
  const inventory = useMemo(
    () =>
      spaceId && definitions.data && !definitions.isError
        ? buildAgentInventory(spaceId, definitions.data, tools.isError ? undefined : tools.data)
        : [],
    [spaceId, definitions.data, definitions.isError, tools.data, tools.isError]
  );
  const metricsEnabled = enabled && inventory.length > 0;
  const metrics = useQuery<AgentSearchResponse>(
    ['entityIntelligenceAgentMetrics', spaceId, inventory.map((agent) => agent.id), refreshKey],
    async ({ signal }) => {
      if (!spaceId) throw new Error('A space is required to read agent traces');
      const response = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<AgentSearchResponse>>(
          buildAgentInventoryQuery(spaceId, inventory),
          { abortSignal: signal }
        )
      );
      return response.rawResponse;
    },
    { enabled: metricsEnabled, retry: false, refetchOnWindowFocus: false }
  );
  const noTraceStream = metrics.data?._shards?.total === 0;
  const incompleteMetrics = metrics.data ? hasIncompleteSearch(metrics.data) : false;
  const agents = useMemo(
    () =>
      addAgentMetrics(
        inventory,
        metrics.isError || noTraceStream || incompleteMetrics ? undefined : metrics.data
      ),
    [inventory, metrics.data, metrics.isError, noTraceStream, incompleteMetrics]
  );
  const definitionsStatus: AgentDataStatus = definitions.isError
    ? 'unavailable'
    : definitions.data
    ? inventory.length > 0
      ? 'available'
      : 'empty'
    : 'unavailable';
  const toolsStatus: AgentDataStatus = tools.isError
    ? 'unavailable'
    : tools.data
    ? agents.some((agent) => agent.configuredTools.some((tool) => !tool.definitionAvailable))
      ? 'partial'
      : tools.data.results.length > 0
      ? 'available'
      : 'empty'
    : 'unavailable';
  const activityStatus: AgentDataStatus =
    metrics.isError || noTraceStream
      ? 'unavailable'
      : metrics.data
      ? incompleteMetrics || inventory.length > MAX_INVENTORY_AGENTS
        ? 'partial'
        : agents.some((agent) => (agent.activity?.invocations ?? 0) > 0)
        ? 'available'
        : 'empty'
      : inventory.length === 0 && definitions.data
      ? 'empty'
      : 'unavailable';
  const isLoading =
    enabled && (definitions.isLoading || tools.isLoading || (metricsEnabled && metrics.isLoading));
  const status: AgentDataStatus =
    definitionsStatus === 'unavailable' || definitionsStatus === 'empty'
      ? definitionsStatus
      : toolsStatus === 'unavailable' ||
        toolsStatus === 'partial' ||
        activityStatus === 'unavailable' ||
        activityStatus === 'partial'
      ? 'partial'
      : 'available';
  const { refetch: refetchDefinitions } = definitions;
  const { refetch: refetchTools } = tools;
  const { refetch: refetchMetrics } = metrics;
  const refetch = useCallback(() => {
    void refetchDefinitions();
    void refetchTools();
    if (metricsEnabled) void refetchMetrics();
  }, [refetchDefinitions, refetchTools, refetchMetrics, metricsEnabled]);

  return {
    agents,
    status,
    definitionsStatus,
    toolsStatus,
    activityStatus,
    isLoading,
    isRefreshing: definitions.isFetching || tools.isFetching || metrics.isFetching,
    lookbackDays: AGENT_LOOKBACK_DAYS,
    refetch,
    error: definitions.isError
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiAgents.definitionsError',
          {
            defaultMessage:
              'Agent definitions are unavailable. Agent Builder access may be required.',
          }
        )
      : tools.isError
      ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiAgents.toolsError', {
          defaultMessage: 'Tool definitions are unavailable. Configured tool IDs are still shown.',
        })
      : metrics.isError || noTraceStream
      ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiAgents.tracesError', {
          defaultMessage:
            'Agent traces are unavailable in this space. Check trace collection and index read access.',
        })
      : incompleteMetrics
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiAgents.metricsIncomplete',
          {
            defaultMessage: 'The trace search was incomplete. Invocation totals are unavailable.',
          }
        )
      : inventory.length > MAX_INVENTORY_AGENTS
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiAgents.metricsLimited',
          {
            defaultMessage:
              'Invocation metrics are limited to the first {limit} agent definitions.',
            values: { limit: MAX_INVENTORY_AGENTS },
          }
        )
      : undefined,
  };
};
