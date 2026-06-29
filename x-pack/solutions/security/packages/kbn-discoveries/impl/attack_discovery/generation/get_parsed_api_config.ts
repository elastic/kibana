/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedApiConfig } from './types';

interface CamelCaseApiConfig {
  actionTypeId?: string;
  connectorId?: string;
  model?: string;
  provider?: string;
}

interface SnakeCaseApiConfig {
  action_type_id?: string;
  connector_id?: string;
  model?: string;
  provider?: string;
}

export const getParsedApiConfig = (apiConfig: unknown): ParsedApiConfig => {
  const config = apiConfig as CamelCaseApiConfig & SnakeCaseApiConfig;

  return {
    action_type_id: config.action_type_id ?? config.actionTypeId ?? config.provider ?? '',
    connector_id: config.connector_id ?? config.connectorId ?? '',
    model: config.model,
    provider: config.provider,
  };
};
