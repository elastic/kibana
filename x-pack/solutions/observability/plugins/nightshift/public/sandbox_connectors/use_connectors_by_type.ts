/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  SandboxConnector,
  SandboxConnectorType,
} from '@kbn/nightshift-investigations-plugin/common';
import { useFetchSandboxConnectorTypes } from './use_fetch_sandbox_connector_types';
import { useFetchSandboxConnectors } from './use_fetch_sandbox_connectors';
import { useAgentConnectors } from './use_agent_connectors';

export interface ConnectorTypeGroup {
  actionType: SandboxConnectorType;
  connectors: SandboxConnector[];
  assignedCount: number;
}

export function useConnectorsByType(): {
  groups: ConnectorTypeGroup[];
  telemetryConnectors: SandboxConnector[];
  isLoading: boolean;
  error: Error | null;
  typesError: Error | null;
  refetch: () => void;
  agent: ReturnType<typeof useAgentConnectors>;
} {
  const types = useFetchSandboxConnectorTypes();
  const connectors = useFetchSandboxConnectors();
  const agent = useAgentConnectors();
  const { assignedIds } = agent;

  const { telemetryConnectors, groups } = useMemo(() => {
    const telemetryIds = new Set(connectors.data?.telemetry_connector_ids ?? []);
    const byType = new Map<string, SandboxConnector[]>();
    const telemetry: SandboxConnector[] = [];
    for (const connector of connectors.data?.connectors ?? []) {
      if (telemetryIds.has(connector.id)) {
        telemetry.push(connector);
        continue;
      }
      const ofType = byType.get(connector.connector_type_id) ?? [];
      byType.set(connector.connector_type_id, [...ofType, connector]);
    }
    return {
      telemetryConnectors: telemetry,
      groups: (types.data ?? []).map((actionType): ConnectorTypeGroup => {
        const ofType = byType.get(actionType.id) ?? [];
        return {
          actionType,
          connectors: ofType,
          assignedCount: ofType.filter(({ id }) => assignedIds.includes(id)).length,
        };
      }),
    };
  }, [assignedIds, connectors.data, types.data]);

  return {
    groups,
    telemetryConnectors,
    isLoading: types.isLoading || connectors.isLoading || agent.isLoading,
    error: types.error ?? connectors.error ?? agent.error,
    typesError: types.error,
    refetch: () => {
      if (types.error) void types.refetch();
      if (connectors.error) void connectors.refetch();
      if (agent.error) agent.refetch();
    },
    agent,
  };
}
