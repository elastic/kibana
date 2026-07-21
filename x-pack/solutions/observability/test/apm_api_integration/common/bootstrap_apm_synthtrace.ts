/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  createLogger,
  LogLevel,
} from '@kbn/apm-synthtrace';
import { kibanaPackageJson } from '@kbn/repo-info';
import url from 'url';
import { kbnTestConfig } from '@kbn/test';
import { InheritedFtrProviderContext } from './ftr_provider_context';

/**
 * Creates the synthtrace ES client without talking to Fleet.
 *
 * FTR `providers.loadAll()` runs *before* `lifecycle.beforeTests`, and docker
 * registry servers are only started in `beforeTests`. Hitting Fleet here while
 * Kibana is pointed at the local registry (`xpack.fleet.registryUrl`) causes a
 * consistent HTTP 502 (RegistryConnectionError). Package installation is done
 * later from the suite root `before` hook instead.
 */
export function getApmSynthtraceEsClient(context: InheritedFtrProviderContext) {
  const es = context.getService('es');

  return new ApmSynthtraceEsClient({
    client: es,
    logger: createLogger(LogLevel.info),
    version: kibanaPackageJson.version,
    refreshAfterIndex: true,
  });
}

export async function installApmPackage(kibanaClient: ApmSynthtraceKibanaClient) {
  const packageVersion = await kibanaClient.fetchLatestApmPackageVersion();
  await kibanaClient.installApmPackage(packageVersion);
  return packageVersion;
}

export function getApmSynthtraceKibanaClient(kibanaServerUrl: string) {
  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
      auth: `elastic:${kbnTestConfig.getUrlParts().password}`,
    })
    .slice(0, -1);

  const kibanaClient = new ApmSynthtraceKibanaClient({
    target: kibanaServerUrlWithAuth,
    logger: createLogger(LogLevel.debug),
  });

  return kibanaClient;
}
