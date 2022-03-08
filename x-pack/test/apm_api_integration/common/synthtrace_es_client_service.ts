/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, createLogger, LogLevel } from '@elastic/apm-synthtrace';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function synthtraceEsClientService(context: InheritedFtrProviderContext) {
  const es = context.getService('es');

  const forceDataStreams = false;
  return new apm.ApmSynthtraceEsClient(es, createLogger(LogLevel.info), forceDataStreams);
}
