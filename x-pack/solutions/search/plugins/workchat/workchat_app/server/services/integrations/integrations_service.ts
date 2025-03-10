/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import type { KibanaRequest, ElasticsearchServiceStart } from '@kbn/core/server';
import { IntegrationPlugin, IntegrationTypes, InternalIntegrationServices } from '@kbn/wci-common';
import { Integration, ExternalIntegration, InternalIntegration } from './integration';
import { IntegrationsSession } from './integrations_session';

interface IntegrationsServiceOptions {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  integrationPlugins: IntegrationPlugin[];
}

export interface ExternalIntegrationModel {
  id: string;
  configuration: Record<string, any>;
  isInternal: false;
}

export interface InternalIntegrationModel {
  id: string;
  configuration: Record<string, any>;
  type?: IntegrationTypes;
  isInternal: true;
}

type IntegrationModel = ExternalIntegrationModel | InternalIntegrationModel;

// TODO: move to reading from saved objects
const IntegrationsSO: IntegrationModel[] = [
  {
    id: '1',
    type: 'salesforce' as IntegrationTypes,
    configuration: {},
    isInternal: true,
  },
  {
    id: '2',
    configuration: {
      url: 'http://127.0.0.1:3001/sse',
    },
    isInternal: false,
  },
  {
    id: '3',
    isInternal: false,
    type: 'custom_index' as IntegrationTypes,
    configuration: {
      index: "support-hub-questions",
      description: "Knowledge base articles",
      fields: {
        filterFields: [
          { field: "status", type: "keyword", aggs: true, description: "Status of the article" },
          { field: "tags", type: "keyword", aggs: true, description: "Tags of the article" },
          { field: "created", type: "date", aggs: false, description: "Date the article was created" }
        ],
        contextFields: [
          { field: "description", type: "keyword", description: "Description of the article" }
        ]
      },
      queryTemplate: '{"query":{"semantic":{"query":"{query}","field":"content"}}}'
    }
  }
];

function getIntegration(
  integrationModel: IntegrationModel,
  integrationPlugins: IntegrationPlugin[]
): Integration {
  if (!integrationModel.isInternal) {
    return new ExternalIntegration(integrationModel.id, integrationModel.configuration);
  }

  const plugin = integrationPlugins.find((p) => p.name === integrationModel.type);
  if (!plugin) {
    throw new Error(`Integration plugin for ${integrationModel.type} not found`);
  }
  return new InternalIntegration(integrationModel.id, plugin, integrationModel.configuration);
}

export function getIntegrations(
  integrationModels: IntegrationModel[],
  integrationPlugins: IntegrationPlugin[]
): Integration[] {
  return integrationModels.map((model) => getIntegration(model, integrationPlugins));
}

export class IntegrationsService {
  private logger: Logger;
  private elasticsearch: ElasticsearchServiceStart;
  private integrationPlugins: IntegrationPlugin[];
  private integrations: Integration[];

  constructor({ logger, integrationPlugins, elasticsearch }: IntegrationsServiceOptions) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
    this.integrationPlugins = integrationPlugins;
    this.integrations = getIntegrations(IntegrationsSO, this.integrationPlugins);
  }

  async createSession({ request }: { request: KibanaRequest }): Promise<IntegrationsSession> {
    this.logger.debug('Creating integrations session');

    const services: InternalIntegrationServices = {
      logger: this.logger.get('session'),
      elasticsearchClient: this.elasticsearch.client.asScoped(request).asCurrentUser,
    };

    return new IntegrationsSession(services, this.integrations);
  }
}
