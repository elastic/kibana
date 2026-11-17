#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies the workflow-execution `labels` platform slice against a real Elasticsearch (plan 18,
 * Phase 0). Runs the production repository, data client and label merge against a throwaway
 * index created from the real executions mapping, then deletes the index.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/verify_labels_es.js \
 *     [--es http://localhost:9200] [--user elastic] [--password changeme]
 */

require('@kbn/setup-node-env');

const assert = require('assert');
const { Client } = require('@elastic/elasticsearch');

const {
  PlainIndexDataClient,
} = require('@kbn/workflows-execution-engine/server/repositories/data_access_layer/implementations/plain_index/plain_index_data_client');
const {
  WorkflowExecutionRepository,
} = require('@kbn/workflows-execution-engine/server/repositories/workflow_execution_repository');
const {
  updateExecutionLabels,
} = require('@kbn/workflows-execution-engine/server/lib/update_execution_labels');
const {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
} = require('@kbn/workflows-execution-engine/server/repositories/data_access_layer/mappings/workflow_executions_mappings');

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const client = new Client({
  node: argValue('--es', 'http://localhost:9200'),
  auth: {
    username: argValue('--user', 'elastic'),
    password: argValue('--password', 'changeme'),
  },
});

const noop = () => {};
const logger = { debug: noop, info: noop, warn: noop, error: noop, trace: noop, fatal: noop };
const indexName = `zz-hunt-labels-verify-${Date.now()}`;
const namespaces = new Map([['hunt', 'alertzero']]);

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
  }
};

const searchByLabel = async (key, value) =>
  (
    await client.search({
      index: indexName,
      query: { term: { [`labels.${key}`]: value } },
    })
  ).hits.hits.map((h) => h._id);

const main = async () => {
  await client.indices.create({
    index: indexName,
    settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
    mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  });

  const dataClient = new PlainIndexDataClient({ esClient: client, logger, indexName });
  const repository = new WorkflowExecutionRepository(dataClient);
  const refresh = () => client.indices.refresh({ index: indexName });
  const base = { spaceId: 'default', workflowId: 'wf', status: 'completed' };
  const identity = {
    'hunt.kind': 'manual_session',
    'hunt.definition_id': 'lsass',
    'hunt.session_id': 's1',
  };

  try {
    await check('mapping stores labels as flattened', async () => {
      const m = await client.indices.getMapping({ index: indexName });
      assert.strictEqual(m[indexName].mappings.properties.labels.type, 'flattened');
    });

    await check('create stores labels under a deterministic id', async () => {
      const r = await repository.createWorkflowExecution(
        { ...base, id: 'det-1', labels: identity },
        { refresh: 'wait_for' }
      );
      assert.deepStrictEqual(r, { reusedExisting: false });
    });

    await check('second create with the same identity is reused, not rewritten', async () => {
      const r = await repository.createWorkflowExecution(
        { ...base, id: 'det-1', labels: identity },
        { refresh: 'wait_for' }
      );
      assert.deepStrictEqual(r, { reusedExisting: true });
    });

    await check('same id with a different identity label is rejected', async () => {
      await assert.rejects(
        repository.createWorkflowExecution({
          ...base,
          id: 'det-1',
          labels: { ...identity, 'hunt.session_id': 'other' },
        }),
        /Failed to create workflow execution det-1/
      );
    });

    await check('same id in another workflow or space is rejected', async () => {
      await assert.rejects(
        repository.createWorkflowExecution({
          ...base,
          id: 'det-1',
          workflowId: 'wf2',
          labels: identity,
        })
      );
      await assert.rejects(
        repository.createWorkflowExecution({
          ...base,
          id: 'det-1',
          spaceId: 'other',
          labels: identity,
        })
      );
    });

    await check('flattened dotted-key term queries match exactly', async () => {
      await refresh();
      assert.deepStrictEqual(await searchByLabel('hunt.kind', 'manual_session'), ['det-1']);
      assert.deepStrictEqual(await searchByLabel('hunt.session_id', 's1'), ['det-1']);
      assert.deepStrictEqual(await searchByLabel('hunt.kind', 'Manual_Session'), []);
      assert.deepStrictEqual(await searchByLabel('hunt.kind', 'library_child'), []);
    });

    await check(
      'merge onto a completed execution preserves identity and is searchable',
      async () => {
        const merged = await updateExecutionLabels(
          { repository, namespaces },
          {
            executionId: 'det-1',
            spaceId: 'default',
            workflowId: 'wf',
            labelOwnerId: 'alertzero',
            labels: { 'hunt.outcome': 'exploratory', 'hunt.evidence_count': 3 },
            immutableKeys: Object.keys(identity),
          }
        );
        assert.strictEqual(merged['hunt.outcome'], 'exploratory');
        assert.strictEqual(merged['hunt.session_id'], 's1');
        await refresh();
        assert.deepStrictEqual(await searchByLabel('hunt.outcome', 'exploratory'), ['det-1']);
        assert.deepStrictEqual(await searchByLabel('hunt.evidence_count', '3'), ['det-1']);
      }
    );

    await check('concurrent merges all land through revision retries', async () => {
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          updateExecutionLabels(
            { repository, namespaces },
            {
              executionId: 'det-1',
              spaceId: 'default',
              workflowId: 'wf',
              labelOwnerId: 'alertzero',
              labels: { [`hunt.group.${i}`]: `v${i}` },
            }
          )
        )
      );
      const doc = (await client.get({ index: indexName, id: 'det-1' }))._source;
      for (let i = 0; i < 5; i++) {
        assert.strictEqual(doc.labels[`hunt.group.${i}`], `v${i}`);
      }
      assert.strictEqual(doc.labels['hunt.kind'], 'manual_session');
    });

    await check(
      'immutable identity change, wrong workflow, wrong space and wrong owner are refused',
      async () => {
        const common = {
          executionId: 'det-1',
          spaceId: 'default',
          workflowId: 'wf',
          labelOwnerId: 'alertzero',
          immutableKeys: Object.keys(identity),
        };
        await assert.rejects(
          updateExecutionLabels(
            { repository, namespaces },
            { ...common, labels: { 'hunt.kind': 'library_child' } }
          ),
          /immutable/
        );
        await assert.rejects(
          updateExecutionLabels(
            { repository, namespaces },
            { ...common, workflowId: 'wf2', labels: { 'hunt.outcome': 'x' } }
          ),
          /not found/
        );
        await assert.rejects(
          updateExecutionLabels(
            { repository, namespaces },
            { ...common, spaceId: 'other', labels: { 'hunt.outcome': 'x' } }
          ),
          /not found/
        );
        await assert.rejects(
          updateExecutionLabels(
            { repository, namespaces },
            { ...common, labelOwnerId: 'someone', labels: { 'hunt.outcome': 'x' } }
          ),
          /owned by/
        );
      }
    );

    await check(
      'a 29-key child label set (lifetime maximum) indexes and is queryable',
      async () => {
        const labels = Object.fromEntries(
          Array.from({ length: 29 }, (_, i) => [`hunt.k${i}`, `v${i}`])
        );
        await repository.createWorkflowExecution(
          { ...base, id: 'child-1', labels },
          { refresh: 'wait_for' }
        );
        assert.deepStrictEqual(await searchByLabel('hunt.k28', 'v28'), ['child-1']);
      }
    );

    await check('a 256-char label value round-trips and matches', async () => {
      const value = 'x'.repeat(256);
      await repository.createWorkflowExecution(
        { ...base, id: 'long-1', labels: { 'hunt.group.0': value } },
        { refresh: 'wait_for' }
      );
      assert.deepStrictEqual(await searchByLabel('hunt.group.0', value), ['long-1']);
    });
  } finally {
    await client.indices.delete({ index: indexName, ignore_unavailable: true });
  }

  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.error}`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} checks passed (index ${indexName} deleted)`
  );
  process.exit(failed ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
