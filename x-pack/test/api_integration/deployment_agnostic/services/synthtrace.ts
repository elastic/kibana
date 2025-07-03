/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url, { UrlObject } from 'url';
import {
  LogLevel,
  SynthtraceClientTypes,
  createLogger,
  getSynthtraceClients,
} from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export function SynthtraceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const client = getService('es');
  const config = getService('config');
  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;

  const logger = createLogger(LogLevel.info);

  const getClientsFn = (synthtraceClients: SynthtraceClientTypes[]) =>
    getSynthtraceClients({
      options: {
        logger,
        client,
        kibana: {
          target: url.format(url.format(kibanaServer).slice(0, -1)),
        },
        refreshAfterIndex: true,
        includePipelineSerialization: false,
      },
      synthClients: synthtraceClients,
    });

  return {
    async createLogsSynthtraceEsClient() {
      const { logsEsClient } = await getClientsFn(['logsEsClient']);

      return logsEsClient;
    },
    async createApmSynthtraceEsClient() {
      const { apmEsClient } = await getClientsFn(['apmEsClient']);

      return apmEsClient;
    },
  };
}
