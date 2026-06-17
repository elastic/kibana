/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SynthtraceClientTypes } from '@kbn/synthtrace';

interface ServerScenarioDefinition {
  /** Repo-relative path to the scenario module. */
  relativePath: string;
  /** Synthtrace clients required by the scenario's generate() function. */
  clients: SynthtraceClientTypes[];
}

const SYNTHTRACE_SCENARIOS_DIR = 'src/platform/packages/shared/kbn-synthtrace/src/scenarios';
const APM_SCENARIOS_DIR = 'x-pack/solutions/observability/plugins/apm/test/scenarios';

/**
 * Allowlist of scenarios that can be run from the browser. Keys must match the
 * ids used by the onboarding UI catalog. Anything not listed here is rejected.
 */
export const SERVER_SCENARIO_CATALOG: Record<string, ServerScenarioDefinition> = {
  logs_and_metrics: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/logs_and_metrics.ts`,
    clients: ['apmEsClient', 'logsEsClient'],
  },
  logs_traces_hosts: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/logs_traces_hosts.ts`,
    clients: ['apmEsClient', 'logsEsClient', 'infraEsClient'],
  },
  infra_hosts_with_apm_hosts: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/infra_hosts_with_apm_hosts.ts`,
    clients: ['infraEsClient', 'apmEsClient'],
  },
  kubernetes_logs_traces_pods: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/kubernetes_logs_traces_pods.ts`,
    clients: ['apmEsClient', 'logsEsClient', 'infraEsClient'],
  },
  distributed_unstructured_logs: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/distributed_unstructured_logs.ts`,
    clients: ['logsEsClient'],
  },
  simple_trace: {
    relativePath: `${APM_SCENARIOS_DIR}/simple_trace.ts`,
    clients: ['apmEsClient'],
  },
  high_throughput: {
    relativePath: `${APM_SCENARIOS_DIR}/high_throughput.ts`,
    clients: ['apmEsClient'],
  },
  infra_hosts_semconv_with_apm_hosts: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/infra_hosts_semconv_with_apm_hosts.ts`,
    clients: ['infraEsClient', 'apmEsClient'],
  },
  infra_hosts_minimal_host: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/infra_hosts_minimal_host.ts`,
    clients: ['infraEsClient'],
  },
  infra_hosts_missing_normalized_load: {
    relativePath: `${SYNTHTRACE_SCENARIOS_DIR}/infra_hosts_missing_normalized_load.ts`,
    clients: ['infraEsClient'],
  },
};

export const isKnownScenario = (scenarioId: string): boolean =>
  Object.prototype.hasOwnProperty.call(SERVER_SCENARIO_CATALOG, scenarioId);
