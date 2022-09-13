/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, ApmFields, createLogger, LogLevel, StreamProcessor } from '@kbn/apm-synthtrace';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function synthtraceEsClientService(context: InheritedFtrProviderContext) {
  const es = context.getService('es');

  const logger = createLogger(LogLevel.info);
  const streamProcessor = new StreamProcessor<ApmFields>({
    logger,
    processors: apm.defaults.processors,
    streamAggregators: apm.defaults.streamAggregators,
  });
  return new apm.SynthtraceEsClient(es, createLogger(LogLevel.info), {
    refreshAfterIndex: true,
    streamProcessor,
  });
}
