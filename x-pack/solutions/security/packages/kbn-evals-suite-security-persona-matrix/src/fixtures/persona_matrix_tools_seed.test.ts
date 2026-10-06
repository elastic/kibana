/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { PARITY_DOCS } from './chrysalis_parity_docs';
import { seedPersonaMatrixTools, cleanupPersonaMatrixTools } from './persona_matrix_tools_seed';

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

describe('persona matrix tool ownership and parity queries', () => {
  it('deletes only tools created by this run, not preexisting 409 tools', async () => {
    const calls: Array<{ method: string; body?: { id: string }; path: string }> = [];
    const request = jest.fn(async (arg) => {
      calls.push(arg);
      if (arg.method === 'POST' && arg.body.id === 'on_call_lookup') {
        throw Object.assign(new Error('already exists'), { status: 409 });
      }
      return {};
    });
    const kbnClient = { request } as unknown as KbnClient;
    await seedPersonaMatrixTools({ kbnClient, log });
    await cleanupPersonaMatrixTools({ kbnClient, log });
    expect(calls.filter(({ method }) => method === 'DELETE').map(({ path }) => path)).toEqual([
      '/api/agent_builder/tools/virustotal_lookup',
    ]);
  });

  it('parity shims select real fixture indices and predicates matching seeded docs', async () => {
    const bodies: Array<{ id: string; configuration: { query: string } }> = [];
    const request = jest.fn(async ({ method, body }) => {
      if (method === 'POST') bodies.push(body);
      return {};
    });
    const kbnClient = { request } as unknown as KbnClient;
    await seedPersonaMatrixTools({ kbnClient, log, parity: true });
    for (const [id, expectedIndex, field] of [
      ['vt.hash.lookup', 'logs-chrysalis-sim.alerts-default', 'labels.simulation'],
      ['check.on.call.schedule', 'on-call-schedule', 'rotation'],
    ]) {
      const query = bodies.find((body) => body.id === id)?.configuration.query ?? '';
      const from = query.match(/FROM ([^ ]+)/)?.[1];
      const value = query.match(/WHERE [^ ]+ == "([^"]+)"/)?.[1];
      expect(from).toEqual(expectedIndex);
      expect(value).toBeDefined();
      const documents = PARITY_DOCS.filter(({ index }) => index === from).map(({ doc }) => doc);
      expect(documents.length).toBeGreaterThan(0);
      expect(
        documents.some((doc) => {
          const result = field
            .split('.')
            .reduce<unknown>(
              (current, key) =>
                current && typeof current === 'object'
                  ? (current as Record<string, unknown>)[key]
                  : undefined,
              doc
            );
          return result === value;
        })
      ).toBe(true);
    }
    await cleanupPersonaMatrixTools({ kbnClient, log });
  });
});
