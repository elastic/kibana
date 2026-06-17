/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SynthtraceDataType } from './data_types';

export interface SynthtraceScenario {
  /** Scenario id as understood by `node scripts/synthtrace <id>` and the run API. */
  id: string;
  title: string;
  description: string;
  dataTypes: SynthtraceDataType[];
  /** When false, the scenario cannot be run from the browser (e.g. requires bootstrap). */
  browserRunnable?: boolean;
}

export interface SynthtraceConnectionSettings {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
  apiKey?: string;
}

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

/**
 * Derives default Elasticsearch/Kibana URLs and credentials from the current
 * browser location. Local dev gets localhost defaults; cloud hosts swap `.kb`
 * and `.es` segments on the same origin.
 */
export const deriveDefaultConnectionSettings = (): SynthtraceConnectionSettings => {
  const { hostname, protocol, host } = window.location;
  const origin = `${protocol}//${host}`;

  if (LOCALHOST_HOSTNAMES.has(hostname)) {
    return {
      esUrl: 'http://localhost:9200',
      kibanaUrl: 'http://localhost:5601',
      username: 'elastic',
      password: 'changeme',
    };
  }

  if (hostname.includes('.kb')) {
    return {
      esUrl: origin.replace('.kb', '.es'),
      kibanaUrl: origin,
      username: '',
      password: '',
    };
  }

  if (hostname.includes('.es')) {
    return {
      esUrl: origin,
      kibanaUrl: origin.replace('.es', '.kb'),
      username: '',
      password: '',
    };
  }

  return {
    esUrl: origin,
    kibanaUrl: origin,
    username: '',
    password: '',
  };
};

const buildTargetFlag = ({
  esUrl,
  username,
  password,
}: Pick<SynthtraceConnectionSettings, 'esUrl' | 'username' | 'password'>): string | undefined => {
  if (!esUrl) {
    return undefined;
  }

  try {
    const url = new URL(esUrl);
    const user = username || decodeURIComponent(url.username);
    const pass = password || decodeURIComponent(url.password);

    if (user && pass) {
      url.username = encodeURIComponent(user);
      url.password = encodeURIComponent(pass);
      return url.toString();
    }

    return esUrl;
  } catch {
    return esUrl;
  }
};

/**
 * Curated subset of synthtrace scenarios surfaced in the UI. The ids match
 * built-in scenarios in `@kbn/synthtrace` or aliases resolved by the CLI, and
 * are validated server-side against an allowlist before running.
 */
export const SYNTHTRACE_SCENARIOS: SynthtraceScenario[] = [
  {
    id: 'logs_and_metrics',
    title: i18n.translate('xpack.observability_onboarding.demoData.scenario.logsAndMetrics.title', {
      defaultMessage: 'Logs and APM metrics',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.logsAndMetrics.description',
      {
        defaultMessage:
          'Generates correlated application logs and APM transaction metrics for a small set of services.',
      }
    ),
    dataTypes: ['apm', 'logs'],
  },
  {
    id: 'logs_traces_hosts',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.logsTracesHosts.title',
      {
        defaultMessage: 'Logs, traces and hosts',
      }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.logsTracesHosts.description',
      {
        defaultMessage:
          'A full-stack sample: APM traces, application logs and infrastructure host metrics tied together.',
      }
    ),
    dataTypes: ['apm', 'logs', 'infra'],
  },
  {
    id: 'infra_hosts_with_apm_hosts',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsWithApmHosts.title',
      { defaultMessage: 'Infra hosts with APM' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsWithApmHosts.description',
      {
        defaultMessage:
          'Infrastructure hosts that also report APM data, useful for the Hosts view and APM correlation.',
      }
    ),
    dataTypes: ['infra', 'apm'],
  },
  {
    id: 'kubernetes_logs_traces_pods',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.kubernetesLogsTracesPods.title',
      { defaultMessage: 'Kubernetes pods, logs and traces' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.kubernetesLogsTracesPods.description',
      {
        defaultMessage:
          'Kubernetes pod metrics with container logs and APM traces emitted from the workloads.',
      }
    ),
    dataTypes: ['k8s', 'logs', 'apm'],
  },
  {
    id: 'distributed_unstructured_logs',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.distributedUnstructuredLogs.title',
      { defaultMessage: 'Distributed unstructured logs' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.distributedUnstructuredLogs.description',
      {
        defaultMessage:
          'Unstructured, free-text logs from multiple services for log parsing demos.',
      }
    ),
    dataTypes: ['logs'],
  },
  {
    id: 'simple_trace',
    title: i18n.translate('xpack.observability_onboarding.demoData.scenario.simpleTrace.title', {
      defaultMessage: 'Simple APM trace',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.simpleTrace.description',
      {
        defaultMessage: 'A minimal APM service emitting transactions, spans and errors.',
      }
    ),
    dataTypes: ['apm'],
  },
  {
    id: 'high_throughput',
    title: i18n.translate('xpack.observability_onboarding.demoData.scenario.highThroughput.title', {
      defaultMessage: 'High throughput APM',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.highThroughput.description',
      {
        defaultMessage:
          'A high-volume APM service, useful to exercise dashboards and aggregations.',
      }
    ),
    dataTypes: ['apm'],
  },
  {
    id: 'infra_hosts_semconv_with_apm_hosts',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsSemconvWithApm.title',
      { defaultMessage: 'OTel semconv hosts with APM' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsSemconvWithApm.description',
      {
        defaultMessage:
          'OpenTelemetry semantic-convention infrastructure host metrics with OTel APM traces from services on those hosts.',
      }
    ),
    dataTypes: ['otel', 'infra', 'apm'],
  },
  {
    id: 'infra_hosts_minimal_host',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsMinimalHost.title',
      { defaultMessage: 'Minimal infra host' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsMinimalHost.description',
      {
        defaultMessage:
          'A single ECS infrastructure host identity document for the Hosts page with no utilization metrics.',
      }
    ),
    dataTypes: ['infra'],
  },
  {
    id: 'infra_hosts_missing_normalized_load',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsMissingNormalizedLoad.title',
      { defaultMessage: 'Infra hosts with missing load metrics' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.infraHostsMissingNormalizedLoad.description',
      {
        defaultMessage:
          'Linux, Windows partial, and minimal hosts to exercise N/A metric states on the Hosts page.',
      }
    ),
    dataTypes: ['infra'],
  },
  {
    id: 'logs_and_metrics_custom_error_rate',
    title: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.logsAndMetricsCustomErrorRate.title',
      { defaultMessage: 'Logs and metrics with custom error rate' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.scenario.logsAndMetricsCustomErrorRate.description',
      {
        defaultMessage:
          'Correlated logs and APM metrics with configurable error and debug log rates (CLI only).',
      }
    ),
    dataTypes: ['logs', 'apm'],
    browserRunnable: false,
  },
];

export interface BuildSynthtraceCommandOptions {
  live?: boolean;
  clean?: boolean;
  from?: string;
  to?: string;
  connection?: SynthtraceConnectionSettings;
}

/**
 * Builds a copy-pasteable CLI command. Live mode is intentionally CLI-only
 * since it relies on long-running worker threads that are unsuitable for a
 * request-scoped server route.
 */
export const buildSynthtraceCommand = (
  scenarioId: string,
  {
    live = false,
    clean = false,
    from = 'now-1w',
    to = 'now',
    connection,
  }: BuildSynthtraceCommandOptions = {}
): string => {
  const parts = ['node scripts/synthtrace', scenarioId];

  if (connection) {
    const target = buildTargetFlag(connection);
    if (target) {
      parts.push(`--target=${target}`);
    }
    if (connection.kibanaUrl) {
      parts.push(`--kibana=${connection.kibanaUrl}`);
    }
    if (connection.apiKey) {
      parts.push(`--apiKey=${connection.apiKey}`);
    }
  }

  if (live) {
    parts.push('--live');
  } else {
    parts.push(`--from=${from}`, `--to=${to}`);
  }

  if (clean) {
    parts.push('--clean');
  }

  return parts.join(' ');
};
