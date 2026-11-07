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

/**
 * SLO routes wrap array responses as `{ _wrapped, _inspect }` when ES query inspection is
 * enabled, which is always the case when Kibana runs in dev mode (local Scout servers).
 */
export type InspectWrapped<T extends object[]> = T | { _wrapped: T; _inspect: object[] };

export const unwrapInspect = <T extends object[]>(body: InspectWrapped<T>): T =>
  '_wrapped' in body ? body._wrapped : body;

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
