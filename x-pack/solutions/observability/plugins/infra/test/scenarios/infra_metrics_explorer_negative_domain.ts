/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reproduces Metrics Explorer crashing when Y-axis mode is "From zero" and every
 * charted value is negative.
 *
 * Metrics Explorer defaults to `fromZero`, which used to force `{ min: 0 }` while
 * leaving `max` at the (negative) data max. elastic-charts then throws:
 * `Error: [Axis values]: custom domain is invalid, min is greater than max`.
 *
 * Data types:
 * - ECS infrastructure host CPU docs (`metrics-system.cpu-default`)
 * - `system.cpu.total.norm.pct` is the Metrics Explorer default metric and is
 *   always negative in this scenario
 * - `system.cpu.user.pct` is also always negative so a custom metric selection
 *   hits the same path
 * - `labels.synthtrace_environment` isolates the run
 *
 * Run:
 *   node scripts/synthtrace infra_metrics_explorer_negative_domain --from now-1h --to now
 *
 *
 * Scenario options:
 * - hostName (string, default: "negative-domain-repro"): host.name / host.hostname
 * - minValue (number, default: -20): most negative sample
 * - maxValue (number, default: -5): least negative sample; must stay < 0
 *
 * Validation:
 * - Search `metrics-system.cpu-default` for host.name = negative-domain-repro
 * - Every `system.cpu.total.norm.pct` and `system.cpu.user.pct` value is < 0
 * - In Kibana Metrics Explorer (`/app/metrics/explorer`), chart
 *   `system.cpu.total.norm.pct` with Y-axis "From zero"
 */

import { Serializable, type InfraDocument } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { getNumberOpt, getStringOpt, getSynthtraceEnvironment, withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const DEFAULT_SCENARIO_OPTS = {
  hostName: 'negative-domain-repro',
  minValue: -20,
  maxValue: -5,
};

function assertNoUnknownScenarioOpts(opts: Record<string, unknown>) {
  const unknown = Object.keys(opts).filter((key) => !(key in DEFAULT_SCENARIO_OPTS));
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
}

const scenario: Scenario<InfraDocument> = async ({ scenarioOpts: rawScenarioOpts }) => {
  const scenarioOpts = (rawScenarioOpts ?? {}) as Record<string, unknown>;
  assertNoUnknownScenarioOpts(scenarioOpts);

  const hostName = getStringOpt(scenarioOpts, 'hostName') ?? DEFAULT_SCENARIO_OPTS.hostName;
  const minValue = getNumberOpt(scenarioOpts, 'minValue', DEFAULT_SCENARIO_OPTS.minValue);
  const maxValue = getNumberOpt(scenarioOpts, 'maxValue', DEFAULT_SCENARIO_OPTS.maxValue);

  if (!(minValue < 0 && maxValue < 0 && minValue <= maxValue)) {
    throw new Error(
      `minValue and maxValue must both be negative, with minValue <= maxValue. Received minValue=${minValue}, maxValue=${maxValue}`
    );
  }

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const span = maxValue - minValue;

      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const value = minValue + Math.abs(Math.sin(timestamp / 60_000)) * span;

          return new Serializable<InfraDocument>({
            'agent.id': 'synthtrace',
            'event.dataset': 'system.cpu',
            'event.module': 'system',
            'host.name': hostName,
            'host.hostname': hostName,
            'labels.synthtrace_environment': ENVIRONMENT,
            'metricset.name': 'cpu',
            'metricset.period': 10000,
            'system.cpu.total.norm.pct': value,
            'system.cpu.user.pct': value,
          } as InfraDocument).timestamp(timestamp);
        });

      return withClient(infraEsClient, metrics);
    },
  };
};

export default scenario;
