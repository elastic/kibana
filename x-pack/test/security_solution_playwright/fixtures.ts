/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import pMap from 'p-map';
import { setupStackServicesUsingCypressConfig } from '@kbn/security-solution-plugin/public/management/cypress/support/common';
import { test as base } from '@playwright/test';
import { prefixedOutputLogger } from '@kbn/security-solution-plugin/scripts/endpoint/common/utils';
import { ToolingLog } from '@kbn/tooling-log';
import { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { ConnectorResponse } from '@kbn/actions-plugin/common/routes/connector/response';

export const connectorsFile = '../../../.ftr/actions_connectors.json';

export * from '@playwright/test';
export const test = base.extend({
  stackServices: async ({}, use) => {
    const stackConfig = {
      KIBANA_URL: process.env.KIBANA_URL || 'http://localhost:5620',
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9220',
      FLEET_SERVER_URL: process.env.FLEET_SERVER_URL || 'http://localhost:8220',
      KIBANA_USERNAME: process.env.KIBANA_USERNAME || 'elastic',
      KIBANA_PASSWORD: process.env.KIBANA_PASSWORD || 'changeme',
      ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
      CLOUD_SERVERLESS: process.env.CLOUD_SERVERLESS || false,
    };
    const stackServicesPromise = setupStackServicesUsingCypressConfig(
      stackConfig,
      'cy.aiAssistant'
    );

    return use(await stackServicesPromise);
  },
  connectors: async ({ stackServices }, use) => {
    const logger = new ToolingLog();
    const prefixedLogger = prefixedOutputLogger('Playwright fixtures', logger);
    const existingConnectors = (
      (
        await stackServices.kbnClient.request({
          path: '/api/actions/connectors',
        })
      ).data as ConnectorResponse[]
    ).filter(
      (connector) =>
        !connector.is_missing_secrets &&
        ['.bedrock', '.gen-ai'].includes(connector.connector_type_id)
    );

    if (existingConnectors.length) {
      return use(existingConnectors);
    }

    let prebuiltConnectors;
    try {
      prebuiltConnectors = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, connectorsFile), 'utf8')
      );
    } catch (e) {
      /* empty */
    }

    try {
      if (!(prebuiltConnectors && Object.entries(prebuiltConnectors).length)) {
        let kibanaDevConfig;
        try {
          kibanaDevConfig = fs.readFileSync(
            path.resolve(__dirname, '../../../config/kibana.dev.yml'),
            'utf8'
          );
        } catch (e) {
          prefixedLogger.error('Error reading kibana.dev.yml', e);
        }

        if (!kibanaDevConfig) {
          return use(undefined);
        }

        const configYaml = yaml.load(kibanaDevConfig);

        if (Object.entries(configYaml['xpack.actions.preconfigured'])?.length) {
          fs.writeFileSync(
            path.resolve(__dirname, connectorsFile),
            JSON.stringify(configYaml['xpack.actions.preconfigured'], null, 2)
          );
        }

        prebuiltConnectors = configYaml['xpack.actions.preconfigured'];
      }

      if (prebuiltConnectors) {
        await pMap<[string, Connector & { secrets: Record<string, string> }], Promise<void>>(
          Object.entries(prebuiltConnectors),
          async ([connectorId, connector]) => {
            return stackServices.kbnClient.request({
              method: 'POST',
              path: '/api/actions/connector',
              body: {
                name: connector.name,
                secrets: connector.secrets,
                connector_type_id: connector.actionTypeId,
                config: connector.config,
              },
            });
          }
        );
      }
    } catch (e) {
      prefixedLogger.error('Error copying action connectors', e);
    }

    const connectors = (
      await stackServices.kbnClient.request({
        path: '/api/actions/connectors',
      })
    ).data;

    return use(
      connectors.filter((connector) =>
        ['.bedrock', '.gen-ai'].includes(connector.connector_type_id)
      )
    );
  },
});
