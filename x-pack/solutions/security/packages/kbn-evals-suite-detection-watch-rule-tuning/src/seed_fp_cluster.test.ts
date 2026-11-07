/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { seedRuleAndFpAlerts } from '../evals/seed_fp_cluster';
import { ALERTS_INDEX } from './constants';

/**
 * Executes the seeder against a mocked kbn-evals fetch and ES client, so the rule-create
 * call site is pinned by behaviour rather than by a source regex. The kbn-evals fetch
 * defaults to GET: a create call without `method: 'POST'` becomes a read-rule request
 * with no id, returns 400 and fails every case at seed.
 */

interface BulkParams {
  index: string;
  operations: Array<Record<string, unknown>>;
}

const RULES_PATH = '/api/detection_engine/rules';
// Deliberately non-zero: a hard-coded `0` (the fresh-create value) at the baseAlert call
// site must fail these tests.
const CREATED_REVISION = 3;
const CREATED_RULE_ID = 'rule-uuid-from-create-response';

const setup = (createResponse: { id?: string; revision?: number } = {}) => {
  const fetch = jest.fn(async (path: string, options?: Record<string, unknown>) => {
    if (options?.method === 'POST' && path.startsWith(RULES_PATH)) {
      return { id: CREATED_RULE_ID, revision: CREATED_REVISION, ...createResponse };
    }
    if (options?.method === 'DELETE') return {};
    // Mirrors the real API: anything else is a read-rule request with no id.
    throw new Error(`400 Bad Request: unexpected ${String(options?.method ?? 'GET')} ${path}`);
  });
  const bulk = jest.fn(async (_params: BulkParams) => ({ errors: false, items: [] }));
  const log = { info: jest.fn() };
  const ctx = { fetch, esClient: { bulk }, log } as unknown as Parameters<
    typeof seedRuleAndFpAlerts
  >[0];
  return { ctx, fetch, bulk };
};

const fixture = { id: 'fp-host-exception', ruleType: 'query', expected: 'exception' };

describe('seedRuleAndFpAlerts', () => {
  it('creates the rule with POST to /api/detection_engine/rules', async () => {
    const { ctx, fetch } = setup();
    await seedRuleAndFpAlerts(ctx, fixture, 'unique-1');

    const createCalls = fetch.mock.calls.filter(
      ([path, options]) => path.startsWith(RULES_PATH) && options?.body !== undefined
    );
    expect(createCalls).toHaveLength(1);
    const [path, options] = createCalls[0];
    expect(options?.method).toBe('POST');
    expect(path.split('?')[0]).toBe(RULES_PATH);
    expect(JSON.parse(options?.body as string)).toEqual(
      expect.objectContaining({ type: 'query', enabled: true })
    );
  });

  it('seeds kibana.alert.rule.revision on every alert from the create response', async () => {
    const { ctx, bulk } = setup();
    const { seededUuid } = await seedRuleAndFpAlerts(ctx, fixture, 'unique-2');

    expect(seededUuid).toBe(CREATED_RULE_ID);
    expect(bulk).toHaveBeenCalledTimes(1);
    const [{ index, operations }] = bulk.mock.calls[0];
    expect(index).toBe(ALERTS_INDEX);
    const docs = operations.filter((op) => 'kibana.alert.rule.uuid' in op);
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      expect(doc['kibana.alert.rule.uuid']).toBe(CREATED_RULE_ID);
      expect(doc['kibana.alert.rule.revision']).toBe(CREATED_REVISION);
    }
  });

  it('falls back to revision 0 when the create response omits it', async () => {
    const { ctx, bulk } = setup({ revision: undefined });
    await seedRuleAndFpAlerts(ctx, fixture, 'unique-3');

    const [{ operations }] = bulk.mock.calls[0];
    const docs = operations.filter((op) => 'kibana.alert.rule.uuid' in op);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d) => d['kibana.alert.rule.revision'] === 0)).toBe(true);
  });
});
