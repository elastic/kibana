/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { IntegrationPlugin, IntegrationTypes } from '@kbn/wci-common';
import { IntegrationsGateway } from './integrations_gateway';
import { IntegrationTool, IntegrationToolInputSchema } from '../../types';
import { Integration } from './integration';

interface IntegrationsServiceOptions {
  logger: Logger;
  integrationPlugins: IntegrationPlugin[];
}

export interface IntegrationModel {
  id: string;
  type: IntegrationTypes;
  configuration: Record<string, any>;
}

// TODO: move to reading from saved objects
const IntegrationsSO: IntegrationModel[] = [
  {
    id: '123',
    type: 'salesforce' as IntegrationTypes,
    configuration: {},
  },
];

function getIntegration(
  integrationModel: IntegrationModel,
  integrationPlugins: IntegrationPlugin[]
): Integration {
  const plugin = integrationPlugins.find((plugin) => plugin.name === integrationModel.type);
  if (!plugin) {
    throw new Error(`Integration plugin for ${integrationModel.type} not found`);
  }
  return new Integration(integrationModel.id, plugin, integrationModel.configuration);
}

export function getIntegrations(
  integrationModels: IntegrationModel[],
  integrationPlugins: IntegrationPlugin[]
): Integration[] {
  return integrationModels.map((model) => getIntegration(model, integrationPlugins));
}

export class IntegrationsService {
  private integrationsGateway: IntegrationsGateway;
  private logger: Logger;
  private integrationPlugins: IntegrationPlugin[];
  private integrations: Integration[];

  constructor({ logger, integrationPlugins }: IntegrationsServiceOptions) {
    this.logger = logger;
    this.integrationPlugins = integrationPlugins;
    this.integrations = getIntegrations(IntegrationsSO, this.integrationPlugins);
    this.integrationsGateway = new IntegrationsGateway(this.integrations);
  }

  async add(integration: IntegrationModel) {
    // TODO: persist the addition
    const integrationInstance = getIntegration(integration, this.integrationPlugins);
    this.integrations.push(integrationInstance);
    this.integrationsGateway.registerServer(integrationInstance.id, integrationInstance.mcpServer);
  }

  async remove(integrationId: string) {
    // TODO: persist the removal
    const integrationInstance = this.integrations.find(
      (integration) => integration.id === integrationId
    );
    if (!integrationInstance) {
      throw new Error(`Integration with id ${integrationId} not found`);
    }
    integrationInstance.mcpServer.close();
    this.integrations = this.integrations.filter((integration) => integration.id !== integrationId);
  }

  async update(integrationId: string, integration: IntegrationModel) {
    await this.remove(integrationId);
    await this.add(integration);
  }

  async getAllTools(): Promise<IntegrationTool[]> {
    this.logger.debug('Getting all tools');
    return this.integrationsGateway.getAllTools();
  }

  async executeTool(toolName: string, params: IntegrationToolInputSchema) {
    this.logger.debug(`Executing tool ${toolName} with params ${JSON.stringify(params)}`);
    return this.integrationsGateway.executeTool(toolName, params);
  }
}
