/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const AI_CONNECTORS_VAR_ENV = 'KIBANA_TESTING_AI_CONNECTORS';

const connectorsSchema = schema.recordOf(
  schema.string(),
  schema.object({
    name: schema.string(),
    actionTypeId: schema.string(),
    config: schema.recordOf(schema.string(), schema.any()),
    secrets: schema.recordOf(schema.string(), schema.any()),
  })
);

interface AvailableConnector {
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface AvailableConnectorWithId extends AvailableConnector {
  id: string;
}

export const loadConnectors = (): Record<string, AvailableConnector> => {
  const envValue = process.env[AI_CONNECTORS_VAR_ENV];
  if (!envValue) {
    return {};
  }

  let connectors: Record<string, AvailableConnector>;
  try {
    connectors = JSON.parse(Buffer.from(envValue, 'base64').toString('utf-8'));
  } catch (e) {
    throw new Error(
      `Error trying to parse value from KIBANA_AI_CONNECTORS environment variable: ${e.message}`
    );
  }
  return connectorsSchema.validate(connectors);
};

export const getPreconfiguredConnectorConfig = () => {
  return loadConnectors();
};

export const getAvailableConnectors = (): AvailableConnectorWithId[] => {
  return Object.entries(loadConnectors()).map(([id, connector]) => {
    return {
      id,
      ...connector,
    };
  });
};
