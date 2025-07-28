/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApmSynthtraceEsClient,
  InfraSynthtraceEsClient,
  LogsSynthtraceEsClient,
  SynthtraceClientsManager,
} from '@kbn/apm-synthtrace';
import { ToolingLog } from '@kbn/tooling-log';
import { extendToolingLog } from '@kbn/apm-synthtrace';
import { Client } from '@elastic/elasticsearch';

export interface SynthtraceEsClients {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  infraSynthtraceEsClient: InfraSynthtraceEsClient;
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
}

export async function setupSynthtrace({
  log,
  client,
  target,
}: {
  log: ToolingLog;
  client: Client;
  target: string;
}): Promise<SynthtraceEsClients> {
  const logger = extendToolingLog(log);

  const clientManager = new SynthtraceClientsManager({
    client,
    logger,
    refreshAfterIndex: true,
  });

  const { apmEsClient, infraEsClient, logsEsClient } = clientManager.getClients({
    clients: ['apmEsClient', 'infraEsClient', 'logsEsClient'],
    kibana: {
      target,
    },
  });

  await clientManager.initFleetPackageForClient({
    clients: {
      apmEsClient,
    },
    skipInstallation: false,
  });

  return {
    apmSynthtraceEsClient: apmEsClient,
    logsSynthtraceEsClient: logsEsClient,
    infraSynthtraceEsClient: infraEsClient,
  };
}
