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

type FieldPairs = Array<[string, string]>;

const AZURE_ACTOR = 'azure.auditlogs.properties.initiated_by.user.user_principal_name';
const GCP_ACTOR = 'gcp.audit.authentication_info.principal_email';

// Each row is one alert and uses a different branch of the source and actor fallback lists.
const ALERTS: FieldPairs[] = [
  [
    ['host.name', 'srv-1'],
    ['user.name', 'alice'],
  ],
  [
    ['host.name', 'srv-2'],
    ['user.name', 'alice'],
  ],
  [
    ['host.name', 'srv-3'],
    ['user.name', 'bob'],
  ],
  [
    ['host.id', 'hid-1'],
    ['user.id', 'uid-1'],
  ],
  [
    ['cloud.account.id', 'acct-1'],
    ['aws.cloudtrail.user_identity.arn', 'arn-1'],
  ],
  [
    ['source.ip', '10.0.0.1'],
    [AZURE_ACTOR, 'az@x'],
  ],
  [
    ['host.name', 'srv-9'],
    [GCP_ACTOR, 'gcp@x'],
  ],
  // Precedence: `host.name` must win over `host.id`, and `user.name` over `user.id`.
  [
    ['host.name', 'wins-host'],
    ['host.id', 'loses-host'],
    ['user.name', 'wins-user'],
    ['user.id', 'loses-user'],
  ],
];

const EXPECTED_SOURCES = [
  '10.0.0.1',
  'acct-1',
  'hid-1',
  'srv-1',
  'srv-2',
  'srv-3',
  'srv-9',
  'wins-host',
];
const EXPECTED_ACTORS = ['alice', 'arn-1', 'az@x', 'bob', 'gcp@x', 'uid-1', 'wins-user'];

// The shape a `logsdb` source event gives an alert: nested objects.
const toNested = (pairs: FieldPairs) =>
  pairs.reduce<Record<string, unknown>>((doc, [path, value]) => {
    const parts = path.split('.');
    const leaf = parts.pop() as string;
    const parent = parts.reduce<Record<string, unknown>>((node, part) => {
      node[part] = node[part] ?? {};
      return node[part] as Record<string, unknown>;
    }, doc);
    parent[leaf] = value;
    return doc;
  }, {});

// The shape a `logsdb_columnar` source event gives an alert: flat dotted keys.
const toFlat = (pairs: FieldPairs) => Object.fromEntries(pairs);

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
      operations: ALERTS.flatMap((pairs) => [
        { index: { _index: NESTED_INDEX } },
        toNested(pairs),
        { index: { _index: FLAT_INDEX } },
        toFlat(pairs),
      ]),
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  /** Runs a prevalence step's runtime mappings and aggregations on one index and returns the values. */
  const runStep = async (stepName: string, index: string) => {
    const step = findStep(workflow, stepName);
    if (!step?.with?.runtime_mappings || !step.with.aggs) {
      throw new Error(`Step ${stepName} has no runtime mappings or aggregations`);
    }
    const response = await client.search({
      index,
      size: 0,
      runtime_mappings: step.with.runtime_mappings as never,
      aggs: {
        ...(step.with.aggs as Record<string, never>),
        source_values: { terms: { field: 'effective_source', size: 50 } },
        actor_values: { terms: { field: 'effective_actor', size: 50 } },
      },
    });
    const aggregations = response.aggregations as unknown as {
      unique_sources: { value: number };
      unique_actors: { value: number };
      source_values: { buckets: Array<{ key: string }> };
      actor_values: { buckets: Array<{ key: string }> };
    };

    return {
      sources: aggregations.unique_sources.value,
      actors: aggregations.unique_actors.value,
      sourceValues: aggregations.source_values.buckets.map(({ key }) => key).sort(),
      actorValues: aggregations.actor_values.buckets.map(({ key }) => key).sort(),
    };
  };

  it.each(['get_global_prevalence_stats', 'get_noise_signal_stats'])(
    '%s finds the same sources and actors on flat and nested alerts',
    async (stepName) => {
      const nested = await runStep(stepName, NESTED_INDEX);
      const flat = await runStep(stepName, FLAT_INDEX);

      // Exact values, not only counts: counts cannot see a swapped fallback precedence.
      expect(nested).toEqual({
        sources: EXPECTED_SOURCES.length,
        actors: EXPECTED_ACTORS.length,
        sourceValues: EXPECTED_SOURCES,
        actorValues: EXPECTED_ACTORS,
      });
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
