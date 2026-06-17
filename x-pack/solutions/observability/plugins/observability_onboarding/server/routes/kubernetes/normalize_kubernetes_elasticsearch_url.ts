/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const KUBERNETES_HOST_GATEWAY = 'host.docker.internal';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function normalizeKubernetesElasticsearchUrl(elasticsearchUrl: string): string {
  try {
    const url = new URL(elasticsearchUrl);

    if (!LOOPBACK_HOSTNAMES.has(url.hostname)) {
      return elasticsearchUrl;
    }

    const port = url.port ? `:${url.port}` : '';
    const path = url.pathname !== '/' || elasticsearchUrl.endsWith('/') ? url.pathname : '';

    return `${url.protocol}//${KUBERNETES_HOST_GATEWAY}${port}${path}${url.search}${url.hash}`;
  } catch {
    return elasticsearchUrl;
  }
}
