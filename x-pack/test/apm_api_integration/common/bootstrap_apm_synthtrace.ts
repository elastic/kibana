/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APM_TEST_PASSWORD } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  createLogger,
  LogLevel,
} from '@kbn/apm-synthtrace';
import url from 'url';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function bootstrapApmSynthtrace(
  context: InheritedFtrProviderContext,
  kibanaServerUrl: string
) {
  const es = context.getService('es');

  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
      auth: `elastic:${APM_TEST_PASSWORD}`,
    })
    .slice(0, -1);

  const kibanaClient = new ApmSynthtraceKibanaClient({
    target: kibanaServerUrlWithAuth,
    logger: createLogger(LogLevel.debug),
  });

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
