/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  buildEcsAndSemconvWideTimerange,
  generateSemconvHostsData,
  SEMCONV_HOSTS,
  SEMCONV_HOSTS_DATA_FROM,
  SEMCONV_HOSTS_DATA_TO,
} from './semconv_hosts_data';
export type { SemconvHost } from './semconv_hosts_data';

/** Headers used by log-analysis Scout API specs. */
export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const ES_ARCHIVES = {
  HOSTS_7_0: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/7.0.0/hosts',
  /** Alias used by metadata and other migrated specs. */
  HOSTS_7_0_0: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/7.0.0/hosts',
  HOSTS_AND_NETWORK_8_0:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/hosts_and_network',
  METRICS_HOSTS_PROCESSES_8_0:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/metrics_hosts_processes',
  LOGS_AND_METRICS_8_0:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics',
  /** Alias used by existing log-analysis Scout API specs. */
  logsAndMetrics:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics',
  LOGS_AND_METRICS:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics',
  LOGS_AND_METRICS_WITH_AWS_8_0:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics_with_aws',
  /** Alias used by metadata and other migrated specs. */
  LOGS_AND_METRICS_WITH_AWS_8_0_0:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics_with_aws',
  HOSTS_ONLY_8_0: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/hosts_only',
  PODS_ONLY_8_0: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/pods_only',
  DOCKER_6_6: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/6.6.0/docker',
  /** Alias used by metadata and other migrated specs. */
  DOCKER_6_6_0: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/6.6.0/docker',
} as const;

export const DATES = {
  '7.0.0': {
    hosts: {
      min: 1547571261002,
      max: 1547571831033,
    },
  },
  '6.6.0': {
    docker: {
      min: 1547578132289,
      max: 1547579090048,
    },
  },
  '8.0.0': {
    pods_only: {
      min: new Date('2022-01-20T17:09:55.124Z').getTime(),
      max: new Date('2022-01-20T17:14:57.378Z').getTime(),
    },
    hosts_and_network: {
      min: new Date('2022-11-23T14:13:19.534Z').getTime(),
      max: new Date('2022-11-25T14:13:19.534Z').getTime(),
    },
    hosts_only: {
      min: new Date('2022-01-18T19:57:47.534Z').getTime(),
      max: new Date('2022-01-18T20:02:50.043Z').getTime(),
    },
    rx: {
      max: new Date('2022-06-21T17:02:00.00Z').getTime(),
    },
    logs_and_metrics: {
      min: 1562786660845,
      max: 1562786716965,
    },
    logs_and_metrics_with_aws: {
      min: 1564083185000,
      max: 1564083705100,
    },
  },
} as const;

/** `to` timestamp used by the metrics process list archive tests. */
export const PROCESS_LIST_TO = 1680027660000;

/**
 * Near-now window for ECS `metrics-system.*` synthtrace seeding.
 * Fixed historical dates are rejected by TSDS once the Fleet system package is installed.
 */
export const getIpToHostRange = (): { from: string; to: string } => {
  const to = Date.now();
  const from = to - 10 * 60 * 1000;
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  };
};

/** Near-now range for ECS infra.host() synthtrace (sources and similar API suites). */
export const getApiSynthtraceRange = (): { from: string; to: string } => {
  const to = Date.now();
  const from = to - 2 * 60 * 1000;
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  };
};

/** Near-now range for APM services synthtrace. */
export const getServicesSynthtraceRange = (): { from: string; to: string } => {
  const to = Date.now();
  const from = to - 2 * 60 * 1000;
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  };
};

export const emptyQuery = {
  bool: {
    must: [],
    filter: [],
    should: [],
    must_not: [],
  },
};

/** Collapse newlines / multi-space runs so validation error assertions stay stable. */
export const normalizeNewLine = (text: string): string => text.replaceAll(/(\s{2,}|\n\s)/g, ' ');
