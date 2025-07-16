/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format, UrlObject } from 'url';
import {
  SynthtraceClientsManager,
  SynthtraceClientTypes,
  GetClientsReturn,
  createLogger,
  LogLevel,
} from '@kbn/apm-synthtrace';
import { FtrProviderContext } from '../ftr_provider_context';

export function SynthtraceClientProvider({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const config = getService('config');

  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const kibanaServerUrlWithAuth = format(kibanaServer);

  return {
    getClients<TClient extends SynthtraceClientTypes>(
      synthtraceClients: TClient[]
    ): GetClientsReturn<TClient> {
      const clientManager = new SynthtraceClientsManager({
        client: esClient,
        logger: createLogger(LogLevel.info),
        refreshAfterIndex: true,
      });

      const clients = clientManager.getClients({
        clients: synthtraceClients,
        kibana: {
          target: kibanaServerUrlWithAuth,
          logger: createLogger(LogLevel.debug),
        },
      });

      return clients;
    },
  };
}
