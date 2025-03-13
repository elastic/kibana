/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart, KibanaRequest } from '@kbn/core/server';
import { IntegrationType, IntegrationConfiguration } from '@kbn/wci-common';
import { IntegrationsSession } from './integrations_session';
import type { IntegrationRegistry } from './integration_registry';
import { IntegrationWithMeta } from './types';

interface IntegrationsServiceOptions {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  registry: IntegrationRegistry;
}

interface IntegrationModel {
  id: string;
  type: IntegrationType;
  configuration: IntegrationConfiguration;
}

// TODO: move to reading from saved objects
const availableIntegrations: IntegrationModel[] = [
  {
    id: '1',
    type: IntegrationType.salesforce,
    configuration: {},
  },
  {
    id: '2',
    type: IntegrationType.custom,
    configuration: {
      url: 'http://127.0.0.1:3001/sse',
    },
  },
];

export class IntegrationsService {
  private readonly logger: Logger;
  private readonly registry: IntegrationRegistry;

  constructor({ logger, registry }: IntegrationsServiceOptions) {
    this.logger = logger;
    this.registry = registry;
  }

  async createSession({ request }: { request: KibanaRequest }): Promise<IntegrationsSession> {
    this.logger.debug('Creating integrations session');

    // TODO: we should have access to the agent's config to see which integration it is
    //       configured to access. Should be done once we have agent configuration persisted

    const integrations = await Promise.all(
      availableIntegrations.map<Promise<IntegrationWithMeta>>(async (source) => {
        const definition = this.registry.get(source.type);
        const integration = await definition.createIntegration({
          request,
          configuration: source.configuration,
        });
        return Object.assign(integration, { id: source.id });
      })
    );

    return new IntegrationsSession({ integrations, logger: this.logger.get('session') });
  }
}
