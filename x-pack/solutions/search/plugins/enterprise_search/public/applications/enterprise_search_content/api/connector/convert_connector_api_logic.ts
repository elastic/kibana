/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface ConvertConnectorApiLogicArgs {
  connectorId: string;
}

export interface ConvertConnectorApiLogicResponse {
  updated: boolean;
}

export const convertConnector = async ({
  connectorId,
}: ConvertConnectorApiLogicArgs): Promise<ConvertConnectorApiLogicResponse> => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/native`;

  return await HttpLogic.values.http.put<{ updated: boolean }>(route, {
    body: JSON.stringify({ is_native: false }),
  });
};

export const ConvertConnectorApiLogic = createApiLogic(
  ['convert_connector_api_logic'],
  convertConnector
);
