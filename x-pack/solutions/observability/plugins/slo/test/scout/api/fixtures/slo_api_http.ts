/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SLO_KIBANA_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export function mergeSloApiHeaders(apiKeyHeader: Record<string, string>): Record<string, string> {
  return {
    ...SLO_KIBANA_HEADERS,
    ...apiKeyHeader,
  };
}

export function sloApiPathWithQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  if (!query) {
    return path;
  }
  const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null) as Array<
    [string, string | number | boolean]
  >;
  if (entries.length === 0) {
    return path;
  }
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `${path}?${qs}`;
}
