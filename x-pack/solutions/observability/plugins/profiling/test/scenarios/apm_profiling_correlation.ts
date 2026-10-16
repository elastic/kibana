/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates APM data that correlates with the profiling data of the `universal_profiling` and
 * `otel_profiling` scenarios, to see the profiling views of APM with data in both profiling
 * schemas: the service "Universal Profiling" tab and the transaction "Universal Profiling" tab.
 * It doesn't generate profiling data, so run the profiling scenarios over the same time range first.
 *
 * Services, all in the `Synthtrace: apm_profiling_correlation` environment:
 * - `profiling-hosts-up`, `profiling-hosts-otel` and `profiling-hosts-mixed` (Node.js) run on the
 *   `up-host-N` hosts, the `otel-host-N` hosts, and one host of each. APM correlates their profiling
 *   data through these hosts, so they show Universal Profiling data, OTel data, or both.
 * - `profiling-java-up` (Java) and `profiling-java-otel` (OTel Java) record the IDs of stacktraces
 *   of the `universal_profiling` and `otel_profiling` scenarios on their transactions. APM
 *   correlates their profiling data through these IDs, in the service and transaction tabs.
 *   `profiling-java-mixed` (Java) has an instance recording the IDs of each scenario, so it shows
 *   data in both schemas.
 *   OTel SDKs write the IDs to `elastic.profiler_stack_trace_ids` on OTel-native data, which
 *   synthtrace doesn't keep, so all of them use `transaction.profiler_stack_trace_ids`.
 *
 * Usage:
 *   node scripts/synthtrace universal_profiling --from now-15m --to now
 *   node scripts/synthtrace otel_profiling --from now-15m --to now
 *   node scripts/synthtrace apm_profiling_correlation --from now-15m --to now
 * Options: --scenarioOpts.hosts=3 (as in the profiling scenarios)
 *          --scenarioOpts.rpm=10 (transactions per minute per instance)
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment, withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// Frequent stacktraces of the `universal_profiling` and `otel_profiling` scenarios. Their IDs are
// hashes of the stack frames, so they only change if the call trees of those scenarios change.
const UNIVERSAL_PROFILING_STACKTRACE_IDS = [
  '3CYxWYe5WW2psjqDWOD3Hw',
  'pW-Q5gYrxUfmfXfHOSThDw',
  '1LvJ7QSI3QzcFv3I2Jfb2g',
  'g9XKMv-XsDsAtWgb4ZM0Yw',
  'looaPoHC_UPi0p5hf7beLA',
];
const OTEL_STACKTRACE_IDS = [
  'yfzX7X51Q6NHyY46iRiulw',
  'Zffj3tlGcTfplAydqj_fdQ',
  'YtX3EnPE7_CK_o9Aj08xqg',
  'GWtE-4AF3P1N3Pd0dr_BTQ',
  'AVNZ98NeyO9kjvvM5hR3GA',
];

const scenario: Scenario<ApmFields> = async ({ scenarioOpts = {} }) => {
  const { hosts = 3, rpm = 10 } = scenarioOpts as { hosts?: number; rpm?: number };
  const hostIndices = [...Array(Number(hosts)).keys()];

  const nodeInstances = (serviceName: string, hostNames: string[]) =>
    hostNames.map((hostName) =>
      apm
        .service({ name: serviceName, environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance(hostName)
    );

  const hostsInstances = [
    ...nodeInstances(
      'profiling-hosts-up',
      hostIndices.map((index) => `up-host-${index}`)
    ),
    ...nodeInstances(
      'profiling-hosts-otel',
      hostIndices.map((index) => `otel-host-${index}`)
    ),
    ...nodeInstances('profiling-hosts-mixed', ['up-host-0', 'otel-host-0']),
  ];

  const javaInstances = [
    {
      instance: apm
        .service({ name: 'profiling-java-up', environment: ENVIRONMENT, agentName: 'java' })
        .instance('profiling-java-up-instance'),
      stacktraceIds: UNIVERSAL_PROFILING_STACKTRACE_IDS,
    },
    {
      instance: apm
        .service({
          name: 'profiling-java-otel',
          environment: ENVIRONMENT,
          agentName: 'opentelemetry/java/elastic',
        })
        .instance('profiling-java-otel-instance'),
      stacktraceIds: OTEL_STACKTRACE_IDS,
    },
    {
      instance: apm
        .service({ name: 'profiling-java-mixed', environment: ENVIRONMENT, agentName: 'java' })
        .instance('profiling-java-mixed-up-instance'),
      stacktraceIds: UNIVERSAL_PROFILING_STACKTRACE_IDS,
    },
    {
      instance: apm
        .service({ name: 'profiling-java-mixed', environment: ENVIRONMENT, agentName: 'java' })
        .instance('profiling-java-mixed-otel-instance'),
      stacktraceIds: OTEL_STACKTRACE_IDS,
    },
  ];

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const hostsTransactions = range
        .ratePerMinute(Number(rpm))
        .generator((timestamp) =>
          hostsInstances.map((instance) =>
            instance
              .transaction({ transactionName: 'GET /api/checkout' })
              .timestamp(timestamp)
              .duration(200)
              .success()
          )
        );

      const javaTransactions = range.ratePerMinute(Number(rpm)).generator((timestamp) =>
        javaInstances.map(({ instance, stacktraceIds }) =>
          instance
            .transaction({ transactionName: 'GET /api/orders' })
            .defaults({ 'transaction.profiler_stack_trace_ids': stacktraceIds } as ApmFields)
            .timestamp(timestamp)
            .duration(300)
            .success()
        )
      );

      return withClient(apmEsClient, [hostsTransactions, javaTransactions]);
    },
  };
};

export default scenario;
