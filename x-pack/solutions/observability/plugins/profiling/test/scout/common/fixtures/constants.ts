/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'node:path';

// Test data time range constants
export const PROFILING_TEST_DATES = {
  rangeFrom: '2023-04-18T00:00:00.000Z',
  rangeTo: '2023-04-18T00:00:30.000Z',
} as const;

export const APM_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';
export const COLLECTOR_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-collector';
export const SYMBOLIZER_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-symbolizer';
export const esArchiversPath = Path.join(__dirname, 'es_archiver', 'profiling', 'data.json');

// OTel profiling data, adapted from the Elasticsearch profiling OTel integration tests. All but one of
// its events are within `PROFILING_OTEL_TEST_DATES`, which no Universal Profiling data overlaps, and
// have container, pod and executable names added so every Stacktraces grouping has data. All of its
// events are in the `PROFILING_OTEL_TEST_NAMESPACE` namespace.
export const otelEsArchiverPath = Path.join(
  __dirname,
  'es_archiver',
  'profiling_otel',
  'data.json'
);
export const PROFILING_OTEL_TEST_DATES = {
  rangeFrom: '2023-10-30T00:00:00.000Z',
  rangeTo: '2023-10-30T00:01:00.000Z',
} as const;
// The host every OTel profiling event in `otelEsArchiverPath` was sampled on.
export const PROFILING_OTEL_TEST_HOST_ID = '8457605156473051743';
// The Kubernetes namespace that tells the OTel profiling events in `otelEsArchiverPath` apart from
// any other OTel profiling data, and the KQL query that matches only them. Don't change the value unless
// you update the OTEL data.json file as well
export const PROFILING_OTEL_TEST_NAMESPACE = 'profiling-scout';
export const PROFILING_OTEL_TEST_KUERY = `k8s.namespace.name: "${PROFILING_OTEL_TEST_NAMESPACE}"`;
export const esResourcesEndpoint = 'api/profiling/setup/es_resources';

// Headers required by internal profiling API routes (xsrf + internal origin).
export const internalApiHeaders = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

// Internal profiling API endpoints, without a leading slash so they can be passed
// directly to the Scout `apiClient`. Mirrors `getRoutePaths()` from
// `@kbn/profiling-plugin/common`; kept local to avoid pulling the plugin into the
// Scout tsconfig graph (matches the existing suite's hardcoded `esResourcesEndpoint`).
export const profilingApiEndpoints = {
  topNContainers: 'internal/profiling/topn/containers',
  topNDeployments: 'internal/profiling/topn/deployments',
  topNExecutables: 'internal/profiling/topn/executables',
  topNHosts: 'internal/profiling/topn/hosts',
  topNTraces: 'internal/profiling/topn/traces',
  topNThreads: 'internal/profiling/topn/threads',
  topNFunctions: 'internal/profiling/topn/functions',
  flamechart: 'internal/profiling/flamechart',
  setupInstructions: 'internal/profiling/setup/instructions',
  status: 'internal/profiling/status',
  schemas: 'internal/profiling/schemas',
} as const;

// Full-resolution events data stream of the OTel profiling schema.
export const OTEL_PROFILING_EVENTS_DATA_STREAM = 'profiling-events-all.otel-default';
