/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupStackServicesUsingCypressConfig } from '@kbn/security-solution-plugin/public/management/cypress/support/common';
import { loadAttackDiscoveryData } from '@kbn/security-solution-plugin/scripts/assistant/attack_discovery/load';

export const aiAssistantDataLoaders = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) => {
  const stackConfig = {
    ...config,
    kibanaUrl: config.baseUrl,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: !config.env.CLOUD_SERVERLESS,
  };
  const stackServicesPromise = setupStackServicesUsingCypressConfig(stackConfig, 'cy.aiAssistant');

  on('task', {
    loadAttackDiscoveryData: async () => {
      const { kbnClient, esClient, log } = await stackServicesPromise;
      return loadAttackDiscoveryData({ kbnClient, esClient, log });
    },
  });
};
