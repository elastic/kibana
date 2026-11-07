/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console -- Print live smoke counts to the test log. */
import { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { parse } from 'yaml';
import { PARITY_DOCS } from './chrysalis_parity_docs';
import { PARITY_WORKFLOWS, VT_HASH_LOOKUP_WORKFLOW_ID } from './parity_workflows';

// This suite exercises the parity profile end to end, so force it before the
// seed modules are loaded — regardless of the caller's SEED_PROFILE — and load
// them inside isolateModulesAsync so they read the forced value. Nothing from
// './chrysalis_seed' (or './persona_matrix_tools_seed', which imports it) may be
// statically imported: the module validates SEED_PROFILE at initialization, and
// a static import would evaluate it before the forced value is set. The forcing
// and loading happen in beforeAll, and afterAll restores the original value so
// 'parity' cannot leak into sibling suites sharing this worker.
let outerSeedProfile: string | undefined;
let chrysalisSeed: typeof import('./chrysalis_seed');
let toolsSeed: typeof import('./persona_matrix_tools_seed');
beforeAll(async () => {
  outerSeedProfile = process.env.SEED_PROFILE;
  process.env.SEED_PROFILE = 'parity';
  await jest.isolateModulesAsync(async () => {
    chrysalisSeed = await import('./chrysalis_seed');
    toolsSeed = await import('./persona_matrix_tools_seed');
  });
});
afterAll(() => {
  if (outerSeedProfile === undefined) {
    delete process.env.SEED_PROFILE;
  } else {
    process.env.SEED_PROFILE = outerSeedProfile;
  }
});

// Runs only against a dedicated, explicitly-provisioned Elasticsearch
// (set PERSONA_MATRIX_LIVE_ES to its URL; skipped otherwise). Credentials come
// from PERSONA_MATRIX_LIVE_ES_USERNAME / _PASSWORD.
const run = process.env.PERSONA_MATRIX_LIVE_ES ? it : it.skip;

run(
  'dedicated Elasticsearch: foreign telemetry survives parity seed, lookup, cleanup, and reseed',
  async () => {
    const { seedChrysalisAlerts, cleanupChrysalisAlerts, ALERT_INDEX } = chrysalisSeed;
    const { seedPersonaMatrixTools, cleanupPersonaMatrixTools } = toolsSeed;
    const esClient = new EsClient({
      node: process.env.PERSONA_MATRIX_LIVE_ES,
      auth: {
        username: process.env.PERSONA_MATRIX_LIVE_ES_USERNAME ?? 'elastic',
        password: process.env.PERSONA_MATRIX_LIVE_ES_PASSWORD ?? '',
      },
    });
    const log = { info: console.log, warning: console.warn } as unknown as ToolingLog;
    const foreignIndex = 'logs-endpoint.events.process-default';
    const foreignId = `foreign-${Date.now()}`;
    const foreignAlertId = `foreign-alert-${Date.now()}`;
    const count = async (index: string, simulation: string) =>
      (
        await esClient.count({
          index,
          query: {
            term: {
              [index === 'on-call-schedule' ? 'labels.simulation.keyword' : 'labels.simulation']:
                simulation,
            },
          },
        })
      ).count;
    const groups = [...new Set(PARITY_DOCS.map(({ index }) => index))];
    const queries: Record<string, string> = {};
    const kbnClient = {
      request: async ({
        method,
        body,
      }: {
        method: string;
        body?: { id: string; configuration?: { query?: string } };
      }) => {
        const query = body?.configuration?.query;
        if (method === 'POST' && body && query) queries[body.id] = query;
        return { data: {} };
      },
    } as unknown as Parameters<typeof seedPersonaMatrixTools>[0]['kbnClient'];
    // vt.hash.lookup is a workflow tool: run its workflow's ES|QL step with the
    // EICAR hash bound, the way the workflow engine renders it.
    const vtStep = (
      parse(PARITY_WORKFLOWS.find(({ id }) => id === VT_HASH_LOOKUP_WORKFLOW_ID)?.yaml ?? '') as {
        steps: Array<{ with: { query: string } }>;
      }
    ).steps[0];
    queries['vt.hash.lookup'] = vtStep.with.query.replace(
      '{{ inputs.hash }}',
      '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f'
    );
    try {
      await esClient.index({
        index: foreignIndex,
        id: foreignId,
        op_type: 'create',
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date().toISOString(),
          event: { kind: 'event' },
          host: { name: 'foreign' },
        },
      });
      console.log(
        `foreign-before=${
          (await esClient.search({ index: foreignIndex, query: { ids: { values: [foreignId] } } }))
            .hits.hits.length
        }`
      );
      // A foreign alert in the same index cleanup targets: it must survive the
      // id-scoped delete_by_query.
      await esClient.index({
        index: ALERT_INDEX,
        id: foreignAlertId,
        op_type: 'create',
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date().toISOString(),
          'kibana.alert.rule.name': 'foreign alert — not part of the persona-matrix seed',
          event: { kind: 'alert' },
        },
      });
      await seedChrysalisAlerts({ esClient, log });
      await seedPersonaMatrixTools({ kbnClient, log });
      await chrysalisSeed.assertParityDataGate({ esClient, log });
      for (const id of ['vt.hash.lookup', 'check.on.call.schedule']) {
        const response = await esClient.esql.query({ query: queries[id] });
        console.log(`shim ${id} rows=${response.values.length}`);
        expect(response.values.length).toBeGreaterThan(0);
      }
      await cleanupChrysalisAlerts({ esClient, log });
      const after = await Promise.all(
        groups.map(async (index) => [index, await count(index, 'chrysalis-sim')])
      );
      console.log(`seeded-after-cleanup=${JSON.stringify(after)}`);
      expect(after.every(([, total]) => total === 0)).toBe(true);
      console.log(
        `foreign-after=${
          (await esClient.search({ index: foreignIndex, query: { ids: { values: [foreignId] } } }))
            .hits.hits.length
        }`
      );
      expect(
        (await esClient.search({ index: foreignIndex, query: { ids: { values: [foreignId] } } }))
          .hits.hits
      ).toHaveLength(1);
      expect(
        (
          await esClient.search({
            index: ALERT_INDEX,
            query: { ids: { values: [foreignAlertId] } },
          })
        ).hits.hits
      ).toHaveLength(1);
      await seedChrysalisAlerts({ esClient, log });
      const reseed = await Promise.all(
        groups.map(async (index) => [index, await count(index, 'chrysalis-sim')])
      );
      console.log(
        `reseed=${JSON.stringify(reseed)} total=${reseed.reduce(
          (sum, [, total]) => sum + Number(total),
          0
        )}`
      );
      expect(reseed.reduce((sum, [, total]) => sum + Number(total), 0)).toBe(PARITY_DOCS.length);
    } finally {
      await cleanupChrysalisAlerts({ esClient, log });
      await cleanupPersonaMatrixTools({ kbnClient, log });
      await esClient
        .delete({ index: foreignIndex, id: foreignId, refresh: 'wait_for' })
        .catch(() => {});
      await esClient
        .delete({ index: ALERT_INDEX, id: foreignAlertId, refresh: 'wait_for' })
        .catch(() => {});
      await esClient.close();
    }
  },
  180000
);
