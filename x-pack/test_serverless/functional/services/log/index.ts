/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { FtrProviderContext } from '../../ftr_provider_context';

export function LogsSynthtraceProvider(context: FtrProviderContext) {
  return new LogsSynthtraceEsClient({
    client: context.getService('es'),
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
  });
}
