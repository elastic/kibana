/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../common/step_types/triage_decisions_index';
import { hashKey } from '../../alert_triage/key_tags';
import { buildPatternKeys } from '../../alert_triage/pattern_key';
import {
  VERDICT_CACHE_KI_TYPE,
  readCacheRecord,
  verdictCacheId,
  type VerdictCacheMode,
} from '../../alert_triage/verdict_cache';
import { getTriageWriteVerdictCacheStepDefinition } from './write_verdict_cache_step';

const processSource = (executable: string, extra: Record<string, unknown> = {}) => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Rule One',
  'kibana.alert.rule.revision': 3,
  'kibana.alert.risk_score': 21,
  '@timestamp': '2026-11-18T10:00:00.000Z',
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
  ...extra,
});

const keyHashOf = (executable: string): string => {
  const { strict } = buildPatternKeys(processSource(executable));
  if (strict === undefined) throw new Error('no strict key');
  return hashKey('default', strict);
};

interface Verdict {
  alert_id: string;
  classification: string;
  confidence_score: number;
}

const verdict = (alertId: string, classification = 'false_positive', score = 0.95): Verdict => ({
  alert_id: alertId,
  classification,
  confidence_score: score,
});

interface StoredDoc {
  _source: Record<string, unknown>;
  _seq_no: number;
  _primary_term: number;
}

/**
 * A small stand-in for Elasticsearch: the records the step wrote stay in `store`, so that a second batch reads what the
 * first one wrote. `create` fails with 409 for an existing id, and `index` with a sequence number fails when it differs.
 */
const setup = ({
  mode = 'shadow',
  enabled = true,
  alerts = [],
  mgetDocError,
  bulkStatus,
  loadFails = false,
  race,
  runSpace = 'default',
}: {
  mode?: VerdictCacheMode;
  enabled?: boolean;
  alerts?: Array<{ _id: string; _source: Record<string, unknown> }>;
  mgetDocError?: { type: string; reason?: string };
  /** Makes every bulk item fail with this status. */
  bulkStatus?: number;
  loadFails?: boolean;
  /** Runs after the step read the records and before it writes: another batch writes in between. */
  race?: (store: Map<string, StoredDoc>) => void;
  /** The space of the workflow run. */
  runSpace?: string;
}) => {
  const store = new Map<string, StoredDoc>();
  let alertPool = alerts;
  const callKibanaApi = jest.fn(
    async ({ body }: { body: { query: { ids: { values: string[] } } } }) => {
      if (loadFails) throw new Error('alert search failed');
      const wanted = new Set(body.query.ids.values);
      return { body: { hits: { hits: alertPool.filter(({ _id }) => wanted.has(_id)) } } };
    }
  );
  const mget = jest.fn(async ({ ids }: { ids: string[] }) => ({
    docs: ids.map((id) => {
      if (mgetDocError) return { _id: id, error: mgetDocError };
      const doc = store.get(id);
      return doc ? { _id: id, found: true, ...doc } : { _id: id, found: false };
    }),
  }));
  const bulk = jest.fn(async ({ operations }: { operations: Array<Record<string, any>> }) => {
    race?.(store);
    const items: Array<Record<string, unknown>> = [];
    for (let i = 0; i < operations.length; i += 2) {
      const [action] = Object.keys(operations[i]);
      const meta = operations[i][action] as {
        _id: string;
        if_seq_no?: number;
        if_primary_term?: number;
      };
      const current = store.get(meta._id);
      let status = 201;
      if (bulkStatus !== undefined) status = bulkStatus;
      else if (action === 'create' && current) status = 409;
      else if (action === 'index' && current && current._seq_no !== meta.if_seq_no) status = 409;
      if (status < 300) {
        store.set(meta._id, {
          _source: operations[i + 1],
          _seq_no: (current?._seq_no ?? 0) + 1,
          _primary_term: 1,
        });
      }
      items.push({ [action]: status < 300 ? { status } : { status, error: { type: 'failure' } } });
    }
    return {
      errors: items.some(
        (item) => Object.values(item)[0] !== undefined && (Object.values(item)[0] as any).error
      ),
      items,
    };
  });
  const isContextEngineEnabled = jest.fn(async () => enabled);
  const warn = jest.fn();
  const run = (verdicts: Verdict[], extra: Record<string, unknown> = {}) =>
    getTriageWriteVerdictCacheStepDefinition({
      isContextEngineEnabled,
      getMode: async () => mode,
    }).handler({
      input: { verdicts, confidence_floor: 0.85, ...extra },
      contextManager: {
        callKibanaApi,
        getContext: () => ({ workflow: { spaceId: runSpace } }),
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ mget, bulk }),
      },
      logger: { warn },
    } as unknown as StepHandlerContext<unknown, unknown>);
  return {
    run,
    store,
    mget,
    bulk,
    warn,
    callKibanaApi,
    isContextEngineEnabled,
    setAlerts: (next: typeof alerts) => {
      alertPool = next;
    },
  };
};

const alert = (id: string, executable: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  _source: processSource(executable, extra),
});

const stateOf = (store: Map<string, StoredDoc>, executable: string) =>
  readCacheRecord(store.get(verdictCacheId(keyHashOf(executable)))?._source)?.state;

describe('triage write verdict cache step', () => {
  describe('the flag and the Context Engine', () => {
    it('does nothing with the flag off: no alert is read and nothing is read or written', async () => {
      const { run, callKibanaApi, mget, bulk } = setup({
        mode: 'off',
        alerts: [alert('a-1', 'a.exe')],
      });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'off', created: 0 });
      expect(callKibanaApi).not.toHaveBeenCalled();
      expect(mget).not.toHaveBeenCalled();
      expect(bulk).not.toHaveBeenCalled();
    });

    it('reports `disabled` and writes nothing when the Context Engine is off', async () => {
      const { run, bulk } = setup({ enabled: false, alerts: [alert('a-1', 'a.exe')] });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'disabled' });
      expect(bulk).not.toHaveBeenCalled();
    });
  });

  it('stamps each record with the space of the run, which is also part of its key hash', async () => {
    const { run, store } = setup({ runSpace: 'team', alerts: [alert('a-1', 'a.exe')] });

    await run([verdict('a-1')]);

    const [[id, { _source: source }]] = [...store.entries()];
    const { strict } = buildPatternKeys(processSource('a.exe'));
    expect(id).toBe(verdictCacheId(hashKey('team', strict ?? '')));
    expect(source).toMatchObject({ permissions: { kibana: { privileges: [{ space: 'team' }] } } });
  });

  describe('run 1', () => {
    it('starts one pending record per key, from the first alert of the key, in the decisions index', async () => {
      const { run, store, bulk } = setup({
        alerts: [
          alert('a-1', 'a.exe', { 'kibana.alert.risk_score': 21 }),
          alert('a-2', 'a.exe', { 'kibana.alert.risk_score': 73 }),
          alert('b-1', 'b.exe'),
        ],
      });

      const { output } = await run([verdict('a-1'), verdict('a-2'), verdict('b-1')]);

      expect(output).toMatchObject({ skip_reason: 'none', keys_seen: 2, created: 2, failed: 0 });
      expect(store.size).toBe(2);
      const record = readCacheRecord(store.get(verdictCacheId(keyHashOf('a.exe')))?._source);
      // a-2 has the higher risk score, so it is the first alert of the key in the order of the budget.
      expect(record).toMatchObject({ state: 'pending', representativeId: 'a-2' });
      const [{ operations }] = bulk.mock.calls[0] as unknown as [
        { operations: Array<Record<string, any>> }
      ];
      expect(operations[0]).toEqual({
        create: {
          _index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
          _id: verdictCacheId(keyHashOf('a.exe')),
        },
      });
      expect(operations[1].type).toBe(VERDICT_CACHE_KI_TYPE);
    });

    it.each([
      ['an inconclusive verdict', verdict('a-1', 'inconclusive', 0.99)],
      ['a confidence under the floor', verdict('a-1', 'false_positive', 0.5)],
    ])('writes nothing for %s', async (_name, v) => {
      const { run, bulk } = setup({ alerts: [alert('a-1', 'a.exe')] });

      const { output } = await run([v]);

      expect(output).toMatchObject({ skip_reason: 'none', created: 0, left_alone: 1 });
      expect(bulk).not.toHaveBeenCalled();
    });

    it('counts an alert without a strict key and writes nothing for it', async () => {
      const { run, bulk } = setup({
        alerts: [{ _id: 'n-1', _source: { 'kibana.alert.rule.uuid': 'rule-9' } }],
      });

      const { output } = await run([verdict('n-1')]);

      expect(output).toMatchObject({ keys_seen: 0, alerts_without_strict_key: 1, created: 0 });
      expect(bulk).not.toHaveBeenCalled();
    });
  });

  describe('run 2, in a later batch', () => {
    it('makes the record active when the next batch has the same confident verdict for the key', async () => {
      const { run, store, setAlerts } = setup({ alerts: [alert('a-1', 'a.exe')] });
      await run([verdict('a-1')]);
      setAlerts([alert('a-9', 'a.exe')]);

      const { output } = await run([verdict('a-9')]);

      expect(output).toMatchObject({ created: 0, activated: 1, made_unstable: 0 });
      expect(stateOf(store, 'a.exe')).toBe('active');
    });

    it('makes the key unstable when the next batch disagrees', async () => {
      const { run, store, setAlerts } = setup({ alerts: [alert('a-1', 'a.exe')] });
      await run([verdict('a-1')]);
      setAlerts([alert('a-9', 'a.exe')]);

      const { output } = await run([verdict('a-9', 'true_positive', 0.99)]);

      expect(output).toMatchObject({ activated: 0, made_unstable: 1 });
      expect(stateOf(store, 'a.exe')).toBe('unstable');
    });

    it('writes with the sequence number it read, so that a lost update is refused', async () => {
      const { run, bulk, setAlerts } = setup({ alerts: [alert('a-1', 'a.exe')] });
      await run([verdict('a-1')]);
      setAlerts([alert('a-9', 'a.exe')]);

      await run([verdict('a-9')]);

      const [{ operations }] = bulk.mock.calls[1] as unknown as [
        { operations: Array<Record<string, any>> }
      ];
      expect(operations[0]).toEqual({
        index: {
          _index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
          _id: verdictCacheId(keyHashOf('a.exe')),
          if_seq_no: 1,
          if_primary_term: 1,
        },
      });
    });

    it('does not change an active record or an unstable key: a later alert is counted as a hit and nothing else', async () => {
      const { run, bulk, store, setAlerts } = setup({ alerts: [alert('a-1', 'a.exe')] });
      await run([verdict('a-1')]);
      setAlerts([alert('a-2', 'a.exe')]);
      await run([verdict('a-2')]);
      setAlerts([alert('a-3', 'a.exe')]);

      const { output } = await run([verdict('a-3', 'true_positive', 0.99)]);

      expect(output).toMatchObject({
        left_alone: 1,
        created: 0,
        activated: 0,
        made_unstable: 0,
        records_updated: 1,
        hit_alerts: 1,
        disagreements: 1,
      });
      expect(stateOf(store, 'a.exe')).toBe('active');
      expect(bulk).toHaveBeenCalledTimes(3);
    });
  });

  describe('shadow hits: alerts of a key that has an active record', () => {
    const activeKey = async (extraAlerts: Array<ReturnType<typeof alert>> = []) => {
      const context = setup({ alerts: [alert('a-1', 'a.exe')] });
      await context.run([verdict('a-1')]);
      context.setAlerts([alert('a-2', 'a.exe')]);
      await context.run([verdict('a-2')]);
      context.setAlerts([...extraAlerts]);
      return context;
    };
    const recordOf = (store: Map<string, StoredDoc>) =>
      readCacheRecord(store.get(verdictCacheId(keyHashOf('a.exe')))?._source);

    it('counts every alert of the batch as a hit and compares its verdict with the record, in one write', async () => {
      const context = await activeKey([
        alert('a-3', 'a.exe'),
        alert('a-4', 'a.exe'),
        alert('a-5', 'a.exe'),
      ]);

      const { output } = await context.run([
        verdict('a-3'),
        verdict('a-4'),
        verdict('a-5', 'true_positive', 0.9),
      ]);

      expect(output).toMatchObject({
        records_updated: 1,
        hit_alerts: 3,
        agreements: 2,
        disagreements: 1,
      });
      expect(recordOf(context.store)?.hits).toMatchObject({
        hits: 3,
        agreements: 2,
        disagreements: 1,
      });
    });

    it('adds up the hits of later batches, and writes with the sequence number it read', async () => {
      const context = await activeKey([alert('a-3', 'a.exe')]);
      await context.run([verdict('a-3')]);
      context.setAlerts([alert('a-4', 'a.exe')]);

      await context.run([verdict('a-4')]);

      expect(recordOf(context.store)?.hits).toMatchObject({ hits: 2, agreements: 2 });
      const [{ operations }] = context.bulk.mock.calls[3] as unknown as [
        { operations: Array<Record<string, any>> }
      ];
      expect(operations[0].index).toMatchObject({
        if_seq_no: expect.any(Number),
        if_primary_term: 1,
      });
    });

    it('counts no hit for a key whose record is pending or unstable', async () => {
      const { run, setAlerts } = setup({ alerts: [alert('a-1', 'a.exe')] });
      await run([verdict('a-1')]);
      setAlerts([alert('a-2', 'a.exe'), alert('a-3', 'a.exe')]);

      const { output } = await run([verdict('a-2', 'true_positive', 0.99), verdict('a-3')]);

      expect(output).toMatchObject({ hit_alerts: 0, records_updated: 0 });
    });

    it('counts a hit update that lost a race as a conflict and does not count its hits', async () => {
      const id = verdictCacheId(keyHashOf('a.exe'));
      let raceOn = false;
      const context = setup({
        alerts: [alert('a-1', 'a.exe')],
        race: (docs) => {
          const current = docs.get(id);
          if (raceOn && current) current._seq_no += 1;
        },
      });
      await context.run([verdict('a-1')]);
      context.setAlerts([alert('a-2', 'a.exe')]);
      await context.run([verdict('a-2')]);
      raceOn = true;
      context.setAlerts([alert('a-3', 'a.exe')]);

      const { output } = await context.run([verdict('a-3')]);

      expect(output).toMatchObject({ conflicts: 1, records_updated: 0, hit_alerts: 0 });
      expect(readCacheRecord(context.store.get(id)?._source)?.hits.hits).toBe(0);
    });
  });

  describe('novelty lists', () => {
    const withHash = (id: string, hash: string) =>
      alert(id, 'a.exe', {
        process: {
          executable: 'a.exe',
          code_signature: { subject_name: 'Acme' },
          hash: { sha256: hash },
        },
      });
    const hashesOf = (store: Map<string, StoredDoc>): string[] | undefined =>
      readCacheRecord(
        store.get(verdictCacheId(keyHashOf('a.exe')))?._source
      )?.novelty.hash?.slice();

    it('seeds the lists from run 1, adds an agreeing run 2, and adds the values of an agreeing later alert only', async () => {
      const { run, store, setAlerts } = setup({ alerts: [withHash('a-1', 'AA')] });
      await run([verdict('a-1')]);
      expect(hashesOf(store)).toEqual(['aa']);

      setAlerts([withHash('a-2', 'BB')]);
      await run([verdict('a-2')]);
      expect(hashesOf(store)).toEqual(['aa', 'bb']);

      setAlerts([withHash('a-3', 'CC'), withHash('a-4', 'DD')]);
      await run([verdict('a-3'), verdict('a-4', 'true_positive', 0.9)]);
      // a-3 agrees with the record and widens the list. a-4 is a bad variant that the model caught: it adds nothing.
      expect(hashesOf(store)).toEqual(['aa', 'bb', 'cc']);
    });
  });

  describe('failures', () => {
    it('counts a new record that another batch wrote first as a conflict, and does not overwrite it', async () => {
      const id = verdictCacheId(keyHashOf('a.exe'));
      const { run, store } = setup({
        alerts: [alert('a-1', 'a.exe')],
        race: (docs) => {
          docs.set(id, { _source: { type: 'theirs' }, _seq_no: 1, _primary_term: 1 });
        },
      });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'none', conflicts: 1, created: 0, failed: 0 });
      expect(store.get(id)?._source).toEqual({ type: 'theirs' });
    });

    it('counts a record that changed after it was read as a conflict, so that a lost update is not written', async () => {
      const id = verdictCacheId(keyHashOf('a.exe'));
      let raceOn = false;
      const { run, store, setAlerts } = setup({
        alerts: [alert('a-1', 'a.exe')],
        race: (docs) => {
          const current = docs.get(id);
          if (raceOn && current) current._seq_no += 1;
        },
      });
      await run([verdict('a-1')]);
      raceOn = true;
      const before = store.get(id)?._source;
      setAlerts([alert('a-9', 'a.exe')]);

      const { output } = await run([verdict('a-9')]);

      expect(output).toMatchObject({ conflicts: 1, activated: 0 });
      expect(store.get(id)?._source).toEqual(before);
    });

    it('reports `denied` when every write is refused with 403', async () => {
      const { run, warn } = setup({ alerts: [alert('a-1', 'a.exe')], bulkStatus: 403 });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'denied', failed: 1, created: 0 });
      expect(warn).toHaveBeenCalled();
    });

    it('reports a storage failure for any other refused write', async () => {
      const { run } = setup({ alerts: [alert('a-1', 'a.exe')], bulkStatus: 500 });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'storage_failure', failed: 1 });
    });

    it('reads a missing index as no records, and starts the record', async () => {
      const { run } = setup({
        alerts: [alert('a-1', 'a.exe')],
        mgetDocError: { type: 'index_not_found_exception' },
      });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'none', created: 1 });
    });

    it('writes nothing when a record could not be read, instead of writing over a record it did not see', async () => {
      const { run, bulk, warn } = setup({
        alerts: [alert('a-1', 'a.exe')],
        mgetDocError: { type: 'shard_failure', reason: 'unavailable' },
      });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'storage_failure' });
      expect(bulk).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be read'));
    });

    it('fails open when the alerts cannot be read: it reports the reason and does not throw', async () => {
      const { run, bulk } = setup({ alerts: [alert('a-1', 'a.exe')], loadFails: true });

      const { output } = await run([verdict('a-1')]);

      expect(output).toMatchObject({ skip_reason: 'storage_failure', created: 0 });
      expect(bulk).not.toHaveBeenCalled();
    });
  });
});
