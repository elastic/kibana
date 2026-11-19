/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed';
import { parse } from 'yaml';

interface PrevalenceStep {
  name?: string;
  with?: {
    runtime_mappings?: Record<string, unknown>;
    aggs?: Record<string, unknown>;
  };
  steps?: PrevalenceStep[];
  [key: string]: unknown;
}

const findStep = (node: unknown, name: string): PrevalenceStep | undefined => {
  if (Array.isArray(node)) {
    return node.map((child) => findStep(child, name)).find((found) => found !== undefined);
  }
  if (node && typeof node === 'object') {
    if ((node as PrevalenceStep).name === name) {
      return node as PrevalenceStep;
    }
    return Object.values(node)
      .map((child) => findStep(child, name))
      .find(Boolean);
  }
  return undefined;
};

const NESTED_INDEX = 'prevalence-nested';
const FLAT_INDEX = 'prevalence-flat';

// The same three alerts in the shape a `logsdb` source event gives them (nested) and in the shape
// a `logsdb_columnar` source event gives them (flat dotted keys).
const ALERTS = [
  { host: 'srv-1', user: 'alice' },
  { host: 'srv-2', user: 'alice' },
  { host: 'srv-3', user: 'bob' },
];

describe('Alert Analysis prevalence steps against flat and nested alert _source', () => {
  let esServer: EsTestCluster;
  let client: Client;

  const workflow = parse(SECURITY_ALERT_ANALYSIS_WORKFLOW.yaml) as PrevalenceStep;

  beforeAll(async () => {
    jest.setTimeout(120_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();

    await client.bulk({
      refresh: 'wait_for',
      operations: ALERTS.flatMap(({ host, user }) => [
        { index: { _index: NESTED_INDEX } },
        { host: { name: host }, user: { name: user } },
        { index: { _index: FLAT_INDEX } },
        { 'host.name': host, 'user.name': user },
      ]),
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  /** Runs a prevalence step's runtime mappings and cardinality aggregations on one index. */
  const runStep = async (stepName: string, index: string) => {
    const step = findStep(workflow, stepName);
    if (!step?.with?.runtime_mappings || !step.with.aggs) {
      throw new Error(`Step ${stepName} has no runtime mappings or aggregations`);
    }
    const response = await client.search({
      index,
      size: 0,
      runtime_mappings: step.with.runtime_mappings as never,
      aggs: step.with.aggs as never,
    });
    const aggregations = response.aggregations as Record<string, { value: number }>;

    return {
      sources: aggregations.unique_sources.value,
      actors: aggregations.unique_actors.value,
    };
  };

  it.each(['get_global_prevalence_stats', 'get_noise_signal_stats'])(
    '%s counts the same sources and actors on flat and nested alerts',
    async (stepName) => {
      const nested = await runStep(stepName, NESTED_INDEX);
      const flat = await runStep(stepName, FLAT_INDEX);

      expect(nested).toEqual({ sources: 3, actors: 2 });
      expect(flat).toEqual(nested);
    }
  );

  it('would count nothing for flat alerts with a nested-only read (the regression being guarded)', async () => {
    const response = await client.search({
      index: FLAT_INDEX,
      size: 0,
      runtime_mappings: {
        nested_only: {
          type: 'keyword',
          script: { source: 'def v = params._source?.host?.name; if (v != null) { emit(v); }' },
        },
      },
      aggs: { unique: { cardinality: { field: 'nested_only' } } },
    });

    expect((response.aggregations as { unique: { value: number } }).unique.value).toBe(0);
  });
});
