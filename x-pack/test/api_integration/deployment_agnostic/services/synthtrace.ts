/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmSynthtraceKibanaClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import url, { format, UrlObject } from 'url';

import { getLogsSynthtraceEsClient } from '../../../common/utils/synthtrace/logs_es_client';
import { getApmSynthtraceEsClient } from '../../../common/utils/synthtrace/apm_es_client';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

function getSynthtraceKibanaClient(kibanaServerUrl: string) {
  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
    })
    .slice(0, -1);

  const kibanaClient = new ApmSynthtraceKibanaClient({
    target: kibanaServerUrlWithAuth,
    logger: createLogger(LogLevel.debug),
  });

  return kibanaClient;
}

export function SynthtraceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const client = getService('es');
  const config = getService('config');

  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const kibanaServerUrl = format(kibanaServer);
  const apmSynthtraceKibanaClient = getSynthtraceKibanaClient(kibanaServerUrl);

  return {
    apmSynthtraceKibanaClient,
    createLogsSynthtraceEsClient: () => getLogsSynthtraceEsClient(client),
    async createApmSynthtraceEsClient() {
      const packageVersion = (await apmSynthtraceKibanaClient.installApmPackage()).version;
      return getApmSynthtraceEsClient({ client, packageVersion });
    },
  };
}
