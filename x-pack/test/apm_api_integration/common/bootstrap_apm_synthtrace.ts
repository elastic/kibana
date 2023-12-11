/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  createLogger,
  LogLevel,
} from '@kbn/apm-synthtrace';
import url from 'url';
import { kbnTestConfig } from '@kbn/test';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function bootstrapApmSynthtrace(
  context: InheritedFtrProviderContext,
  kibanaClient: ApmSynthtraceKibanaClient
) {
  const es = context.getService('es');

  const kibanaVersion = await kibanaClient.fetchLatestApmPackageVersion();
  await kibanaClient.installApmPackage(kibanaVersion);

  const esClient = new ApmSynthtraceEsClient({
    client: es,
    logger: createLogger(LogLevel.info),
    version: kibanaVersion,
    refreshAfterIndex: true,
  });

  return esClient;
}

export function getApmSynthtraceKibanaClient(kibanaServerUrl: string) {
  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
      auth: `elastic:${kbnTestConfig.getUrlParts().password}`,
    })
    .slice(0, -1);

  const kibanaClient = new ApmSynthtraceKibanaClient({
    target: kibanaServerUrlWithAuth,
    logger: createLogger(LogLevel.debug),
  });

  return kibanaClient;
}
