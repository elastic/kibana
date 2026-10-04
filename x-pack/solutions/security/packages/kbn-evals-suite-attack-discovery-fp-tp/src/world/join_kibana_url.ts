/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Joins a Kibana origin (which may include server.basePath) with an API path.
 * `new URL('/api/...', 'http://host/sbb')` would drop the base path.
 */
export const joinKibanaUrl = (kibanaUrl: string, path: string): string => {
  const base = kibanaUrl.endsWith('/') ? kibanaUrl : `${kibanaUrl}/`;
  const relativePath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(relativePath, base).toString();
};
