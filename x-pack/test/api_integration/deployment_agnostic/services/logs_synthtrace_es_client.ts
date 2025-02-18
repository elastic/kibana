/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export function LogsSynthtraceEsClientProvider({
  getService,
}: DeploymentAgnosticFtrProviderContext) {
  return new LogsSynthtraceEsClient({
    client: getService('es'),
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
  });
}
