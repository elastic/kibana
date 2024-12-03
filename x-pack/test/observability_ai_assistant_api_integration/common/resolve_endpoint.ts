/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function resolveEndpoint(endpoint: string, pathParams: Record<string, string>): string {
  return Object.keys(pathParams).reduce(
    (resolvedEndpoint, param) =>
      resolvedEndpoint.replace(`{${param}}`, encodeURIComponent(pathParams[param])),
    endpoint
  );
}
