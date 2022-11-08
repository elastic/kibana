/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import { esTestConfig } from '@kbn/test';
import { APM_TEST_PASSWORD } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function bootstrapApmSynthtrace(
  context: InheritedFtrProviderContext,
  kibanaServerUrl: string
) {
  const es = context.getService('es');
  const kibanaVersion = esTestConfig.getVersion();

  const kibanaClient = new apm.ApmSynthtraceKibanaClient(createLogger(LogLevel.info));
  await kibanaClient.installApmPackage(
    kibanaServerUrl,
    kibanaVersion,
    'elastic',
    APM_TEST_PASSWORD
  );

  const esClient = new apm.ApmSynthtraceEsClient(es, createLogger(LogLevel.info), {
    forceLegacyIndices: false,
    refreshAfterIndex: true,
  });

  return esClient;
}
