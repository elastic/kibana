/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ApmSynthtraceEsClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';

interface GetApmSynthtraceEsClientParams {
  client: Client;
  packageVersion: string;
}

export async function getApmSynthtraceEsClient({
  client,
  packageVersion,
}: GetApmSynthtraceEsClientParams) {
  return new ApmSynthtraceEsClient({
    client,
    logger: createLogger(LogLevel.info),
    version: packageVersion,
    refreshAfterIndex: true,
  });
}
