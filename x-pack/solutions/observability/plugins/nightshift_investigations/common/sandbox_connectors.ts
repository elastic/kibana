/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-types';
import type { ConnectorResponse } from '@kbn/actions-plugin/common/routes/connector/response';

export const SANDBOX_CONNECTORS_API_PATH = '/internal/nightshift/sandbox_connectors';
export const SANDBOX_CONNECTOR_TYPES_API_PATH = '/internal/nightshift/sandbox_connector_types';

/**
 * The sub-actions Nightshift enables on the Elasticsearch connectors it creates, so the sandbox can
 * query them with `kbn-tool connector`. All of them read; `request` only allows GET.
 */
export const ELASTICSEARCH_CONNECTOR_SELECTED_ACTIONS: readonly string[] = [
  'search',
  'esql',
  'listIndices',
  'getMapping',
  'request',
  'getClusterInfo',
];

/** A Kibana connector the investigation agent can use from its sandbox */
export type SandboxConnector = Pick<
  ConnectorResponse,
  'id' | 'name' | 'connector_type_id' | 'is_preconfigured'
>;

export interface GetSandboxConnectorsResponse {
  connectors: SandboxConnector[];
}

export type SandboxConnectorType = ActionType;

export interface GetSandboxConnectorTypesResponse {
  connector_types: SandboxConnectorType[];
}
