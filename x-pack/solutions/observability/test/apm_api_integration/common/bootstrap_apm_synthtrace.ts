/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSynthtraceClients, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import url from 'url';
import { kbnTestConfig } from '@kbn/test';
import { Client } from '@elastic/elasticsearch';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function getApmSynthtraceEsClient(
  context: InheritedFtrProviderContext,
  kibanaServerUrl: string
) {
  const es = context.getService('es');

  const getSynthtraceClientsFn = (opts?: { esClient: Client }) =>
    getSynthtraceClients({
      options: {
        logger: createLogger(LogLevel.info),
        kibana: {
          target: url
            .format({
              ...url.parse(kibanaServerUrl),
              auth: `elastic:${kbnTestConfig.getUrlParts().password}`,
            })
            .slice(0, -1),
        },
        client: opts?.esClient || es,
        refreshAfterIndex: true,
        includePipelineSerialization: false,
      },
      synthClients: ['apmEsClient'],
    });

  return {
    getClient: async (opts?: { esClient?: Client }) => {
      const { apmEsClient } = await getSynthtraceClientsFn(opts);
      return apmEsClient;
    },
  };
}
