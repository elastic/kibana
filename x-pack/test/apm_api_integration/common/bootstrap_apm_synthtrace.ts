/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apmDefaults,
  ApmFields,
  createLogger,
  LogLevel,
  StreamProcessor,
  SynthtraceKibanaClient,
  SynthtraceEsClient,
} from '@kbn/apm-synthtrace';
import { esTestConfig } from '@kbn/test';
import { APM_TEST_PASSWORD } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function bootstrapApmSynthtrace(
  context: InheritedFtrProviderContext,
  kibanaServerUrl: string
) {
  const es = context.getService('es');
  const kibanaVersion = esTestConfig.getVersion();

  const kibanaClient = new SynthtraceKibanaClient(createLogger(LogLevel.info));
  await kibanaClient.installApmPackage(
    kibanaServerUrl,
    kibanaVersion,
    'elastic',
    APM_TEST_PASSWORD
  );

  const logger = createLogger(LogLevel.info);
  const streamProcessor = new StreamProcessor<ApmFields>({
    version: kibanaVersion,
    logger,
    processors: apmDefaults.processors,
    streamAggregators: apmDefaults.streamAggregators,
  });
  const esClient = new SynthtraceEsClient(es, logger, {
    refreshAfterIndex: true,
    streamProcessor,
  });
  const oldClean = esClient.clean;
  esClient.clean = () => oldClean.apply(esClient, [apmDefaults.writeTargets]);

  return esClient;
}
