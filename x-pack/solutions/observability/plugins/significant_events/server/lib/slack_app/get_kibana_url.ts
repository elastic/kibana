/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

/**
 * Relay identifies the connecting deployment by its public Kibana URL
 * Prefers the configured public base URL, falls back to
 * the Cloud-reported URL, then to the server's own connection info.
 */
export function getKibanaUrl(core: CoreStart, cloud?: CloudSetup): string {
  return core.http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getFallbackKibanaUrl(core);
}

function getFallbackKibanaUrl({ http }: CoreStart): string {
  const basePath = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${basePath
    // Prepending on '' removes the serverBasePath
    .prepend('/')
    .slice(0, -1)}`;
}
