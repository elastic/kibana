/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorResponse } from '@kbn/actions-plugin/common/routes/connector/response';

export const SANDBOX_CONNECTORS_API_PATH = '/internal/nightshift/sandbox_connectors';

/** A Kibana connector the investigation agent can use from its sandbox */
export type SandboxConnector = Pick<
  ConnectorResponse,
  'id' | 'name' | 'connector_type_id' | 'is_preconfigured'
>;

export interface GetSandboxConnectorsResponse {
  connectors: SandboxConnector[];
}
