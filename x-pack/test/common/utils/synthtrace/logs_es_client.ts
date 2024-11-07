/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { LogsSynthtraceEsClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';

export async function getLogsSynthtraceEsClient(client: Client) {
  return new LogsSynthtraceEsClient({
    client,
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
  });
}
