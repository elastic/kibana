/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console -- Print live smoke counts to the test log. */
import { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { PARITY_DOCS } from './chrysalis_parity_docs';
import { seedPersonaMatrixTools, cleanupPersonaMatrixTools } from './persona_matrix_tools_seed';

// This suite exercises the parity profile end to end, so force it before the
// seed module is loaded — regardless of the caller's SEED_PROFILE — and load
// chrysalis_seed inside isolateModules so it reads the forced value. Nothing
// from './chrysalis_seed' may be statically imported: the module validates
// SEED_PROFILE at initialization, and a static import would evaluate it before
// the forced value below is set (failing collection even when skipped).
// Restore the original value afterwards so 'parity' cannot leak into sibling
// suites sharing this worker.
const outerSeedProfile = process.env.SEED_PROFILE;
process.env.SEED_PROFILE = 'parity';
let chrysalisSeed: typeof import('./chrysalis_seed');
jest.isolateModules(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  chrysalisSeed = require('./chrysalis_seed');
});
const { seedChrysalisAlerts, cleanupChrysalisAlerts, ALERT_INDEX } = chrysalisSeed!;
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
        body?: { id: string; configuration: { query: string } };
      }) => {
        if (method === 'POST' && body) queries[body.id] = body.configuration.query;
        return {};
      },
    } as unknown as Parameters<typeof seedPersonaMatrixTools>[0]['kbnClient'];
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
      await seedPersonaMatrixTools({ kbnClient, log, parity: true });
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
