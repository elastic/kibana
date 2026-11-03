/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXTERNAL_ELASTICSEARCH_CONNECTOR_TYPE_ID,
  type SandboxConnector,
} from '@kbn/nightshift-investigations-plugin/common';
import { useAgentConnectors } from './use_agent_connectors';
import { useFetchSandboxConnectors } from './use_fetch_sandbox_connectors';

export interface ConnectedClusters {
  /** The External Elasticsearch connectors the investigation agent can use. */
  clusters: SandboxConnector[];
  /** Whether the lookup finished without error. A loading or failed lookup is not "none". */
  known: boolean;
  /** Known, and nothing is connected: features that need a cluster are unavailable. */
  none: boolean;
}

/**
 * The remote clusters connected to this one: External Elasticsearch connectors that are assigned
 * to the investigation agent, which is what lets the agent query them from its sandbox.
 */
export const useConnectedClusters = (): ConnectedClusters => {
  const connectors = useFetchSandboxConnectors();
  const agent = useAgentConnectors();
  const clusters = (connectors.data?.connectors ?? []).filter(
    (connector) =>
      connector.connector_type_id === EXTERNAL_ELASTICSEARCH_CONNECTOR_TYPE_ID &&
      agent.assignedIds.includes(connector.id)
  );
  const known = connectors.data !== undefined && !agent.isLoading && agent.error === null;
  return { clusters, known, none: known && clusters.length === 0 };
};
