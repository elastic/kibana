/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface GenerateConnectorNamesApiArgs {
  connectorName?: string;
  connectorType?: string;
}

export interface GenerateConnectorNamesApiResponse {
  apiKeyName: string;
  connectorName: string;
  indexName: string;
}

export const generateConnectorNames = async (
  { connectorType, connectorName }: GenerateConnectorNamesApiArgs = { connectorType: 'custom' }
) => {
  if (connectorType === '') {
    connectorType = 'custom';
  }
  const route = `/internal/enterprise_search/connectors/generate_connector_name`;
  return await HttpLogic.values.http.post(route, {
    body: JSON.stringify({ connectorName, connectorType }),
  });
};

export const GenerateConnectorNamesApiLogic = createApiLogic(
  ['generate_connector_names_api_logic'],
  generateConnectorNames
);

export type GenerateConnectorNamesApiLogicActions = Actions<
  GenerateConnectorNamesApiArgs,
  GenerateConnectorNamesApiResponse
>;
