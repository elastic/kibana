/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  createLogger,
  LogLevel,
} from '@kbn/apm-synthtrace';
import url, { format, UrlObject } from 'url';
import { FtrProviderContext } from '../ftr_provider_context';

async function getSynthtraceEsClient(client: Client, kibanaClient: ApmSynthtraceKibanaClient) {
  const kibanaVersion = await kibanaClient.fetchLatestApmPackageVersion();
  await kibanaClient.installApmPackage(kibanaVersion);

  const esClient = new ApmSynthtraceEsClient({
    client,
    logger: createLogger(LogLevel.info),
    version: kibanaVersion,
    refreshAfterIndex: true,
  });

  return esClient;
}

function getSynthtraceKibanaClient(kibanaServerUrl: string) {
  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
    })
    .slice(0, -1);

  const kibanaClient = new ApmSynthtraceKibanaClient({
    target: kibanaServerUrlWithAuth,
    logger: createLogger(LogLevel.debug),
  });

  return kibanaClient;
}

export function SynthtraceProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const config = getService('config');

  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const kibanaServerUrl = format(kibanaServer);
  const synthtraceKibanaClient = getSynthtraceKibanaClient(kibanaServerUrl);

  return {
    createSynthtraceKibanaClient: getSynthtraceKibanaClient,
    async createSynthtraceEsClient() {
      return getSynthtraceEsClient(es, synthtraceKibanaClient);
    },
  };
}
