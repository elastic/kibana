/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AvailableConnector {
  id: string;
  type: string;
}

interface ConnectorConfig extends AvailableGenAIConnector {
  configVarEnv: string;
}

const connectorConfigs: ConnectorConfig[] = [
  { id: 'azure-gpt4', type: '.gen-ai', configVarEnv: 'KIBANA_CONNECTOR_GPT4' },
  { id: 'gemini-1-5-pro', type: '.gemini', configVarEnv: 'KIBANA_CONNECTOR_GEMINI_PRO_1_5' },
  { id: 'claude-3-5-sonnet', type: '.bedrock', configVarEnv: 'KIBANA_CONNECTOR_CLAUDE_3_5_SONNET' },
];

export const getAvailableConnectors = (): AvailableConnector[] => {
  return connectorConfigs
    .filter((config) => !!process.env[config.configVarEnv])
    .map((config) => ({ id: config.id, type: config.type }));
};

export const getPreconfiguredConnectorConfig = () => {
  const connectors = connectorConfigs.filter((config) => !!process.env[config.configVarEnv]);
  const connectorsWithConfig = connectors.reduce((record, connector) => {
    const config = JSON.parse(process.env[connector.configVarEnv]);

    record[connector.id] = {
      name: connector.id,
      actionTypeId: connector.type,
      ...config,
    };

    return record;
  }, {} as Record<string, any>);

  return connectorsWithConfig;
};
