/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlObject } from 'url';
import { format } from 'url';
import { LogLevel, createLogger, SynthtraceClientsManager } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export function SynthtraceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const client = getService('es');
  const config = getService('config');
  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const kibanaServerUrl = format(kibanaServer);

  const clientManager = new SynthtraceClientsManager({
    client,
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
  });

  return {
    createLogsSynthtraceEsClient() {
      const { logsEsClient } = clientManager.getClients({
        clients: ['logsEsClient'],
      });

      return logsEsClient;
    },
    async createApmSynthtraceEsClient() {
      const { apmEsClient } = clientManager.getClients({
        clients: ['apmEsClient'],
        kibana: {
          target: kibanaServerUrl,
          logger: createLogger(LogLevel.debug),
        },
      });

      await clientManager.initFleetPackageForClient({
        clients: {
          apmEsClient,
        },
      });

      return apmEsClient;
    },
  };
}
