/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { hashKey } from '../../alert_triage/key_tags';
import { buildPatternKeys } from '../../alert_triage/pattern_key';
import {
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
  VERDICT_CACHE_TTL_MS,
  buildCacheDocument,
  nextCacheAction,
  verdictCacheId,
  type CacheAction,
  type FreshVerdict,
  type VerdictCacheMode,
  type VerdictCacheRecord,
} from '../../alert_triage/verdict_cache';
import { getTriageMatchVerdictCacheStepDefinition } from './match_verdict_cache_step';

const source = (executable: string) => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 3,
  'kibana.alert.severity': 'low',
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
});

const strictOf = (executable: string): string => {
  const { strict } = buildPatternKeys(source(executable));
  if (strict === undefined) throw new Error('no strict key');
  return strict;
};
const hashOf = (executable: string): string => hashKey('default', strictOf(executable));

const fresh = (alertId: string, classification = 'false_positive'): FreshVerdict => ({
  alertId,
  classification,
  confidenceScore: 0.95,
});

const written = (action: CacheAction): VerdictCacheRecord => {
  if (action.type !== 'write') throw new Error(`expected a write, got ${action.reason}`);
  return action.record;
};

/** A record of a key, built with the production state machine: `pending` after run 1, `active` after a second agreeing run. */
const recordOf = (
  executable: string,
  state: 'pending' | 'active' | 'unstable',
  verdict = 'false_positive',
  now = new Date()
): VerdictCacheRecord => {
  const base = {
    keyHash: hashOf(executable),
    strictKey: strictOf(executable),
    floor: 0.85,
    now,
  };
  const run1 = written(
    nextCacheAction({ existing: undefined, fresh: fresh('first', verdict), ...base })
  );
  if (state === 'pending') return run1;
  return written(
    nextCacheAction({
      existing: run1,
      fresh: fresh('second', state === 'active' ? verdict : 'true_positive'),
      ...base,
    })
  );
};

const storedOf = (record: VerdictCacheRecord) =>
  buildCacheDocument({ record, spaceId: 'default', now: new Date() });

const setup = ({
  alerts,
  records = [],
  mode = 'shadow',
  enabled = true,
  missingIndex = false,
  unreadable = false,
  tagFailsFor,
}: {
  alerts: Array<[string, Record<string, unknown>]>;
  records?: VerdictCacheRecord[];
  mode?: VerdictCacheMode;
  enabled?: boolean;
  missingIndex?: boolean;
  unreadable?: boolean;
  /** The tag call for this record id fails. */
  tagFailsFor?: string;
}) => {
  const store = new Map(
    records.map((record) => [verdictCacheId(record.keyHash), storedOf(record)])
  );
  const callKibanaApi = jest.fn(
    async ({ path, body }: { path: string; body?: Record<string, any> }) => {
      if (path.endsWith('/signals/search')) {
        return { body: { hits: { hits: alerts.map(([_id, _source]) => ({ _id, _source })) } } };
      }
      if (path.endsWith('/signals/tags')) {
        if (
          tagFailsFor &&
          body?.tags.tags_to_add.includes(`${TRIAGE_WOULD_REUSE_TAG_PREFIX}${tagFailsFor}`)
        ) {
          throw new Error('tagging failed');
        }
        return { body: { updated: body?.ids.length ?? 0, timed_out: false, failures: [] } };
      }
      return { body: {} };
    }
  );
  const mget = jest.fn(async ({ ids }: { ids: string[] }) => ({
    docs: ids.map((_id) =>
      missingIndex
        ? { _id, error: { type: 'index_not_found_exception' } }
        : unreadable
        ? { _id, error: { type: 'shard_failure', reason: 'unavailable' } }
        : store.has(_id)
        ? { _id, found: true, _source: store.get(_id), _seq_no: 1, _primary_term: 1 }
        : { _id, found: false }
    ),
  }));
  const warn = jest.fn();
  const run = () =>
    getTriageMatchVerdictCacheStepDefinition({
      isContextEngineEnabled: async () => enabled,
      getMode: async () => mode,
    }).handler({
      input: {
        space_id: 'default',
        analysis_tag_prefix: 'alert_analysis:',
        lookback_hours: 24,
        min_severity: 'low',
        exclude_building_blocks: false,
        excluded_rule_tags: [],
      },
      contextManager: {
        callKibanaApi,
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ mget }),
      },
      logger: { warn },
    } as unknown as StepHandlerContext<unknown, unknown>);
  const tagCalls = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/signals/tags'))
      .map(([{ body }]) => body as { ids: string[]; tags: { tags_to_add: string[] } });
  return { run, callKibanaApi, mget, warn, tagCalls };
};

describe('triage match verdict cache step', () => {
  it('does nothing with the flag off: no alert is read, no record is read, no tag is written', async () => {
    const { run, callKibanaApi, mget } = setup({ mode: 'off', alerts: [['a-1', source('a.exe')]] });

    const { output } = await run();

    expect(output).toMatchObject({ status: 'off', would_reuse: 0 });
    expect(callKibanaApi).not.toHaveBeenCalled();
    expect(mget).not.toHaveBeenCalled();
  });

  it('reports `disabled` and tags nothing when the Context Engine is off', async () => {
    const { run, tagCalls } = setup({ enabled: false, alerts: [['a-1', source('a.exe')]] });

    const { output } = await run();

    expect(output).toMatchObject({ status: 'disabled' });
    expect(tagCalls()).toEqual([]);
  });

  it('tags the pending alerts of a key that has an active record with the id of the record, and leaves other keys alone', async () => {
    const { run, tagCalls } = setup({
      alerts: [
        ['a-1', source('a.exe')],
        ['a-2', source('a.exe')],
        ['b-1', source('b.exe')],
      ],
      records: [recordOf('a.exe', 'active')],
    });

    const { output } = await run();

    expect(output).toMatchObject({
      status: 'ok',
      candidates: 3,
      alerts_with_strict_key: 3,
      reusable_records: 1,
      would_reuse: 2,
      would_reuse_false_positive: 2,
      would_reuse_true_positive: 0,
    });
    expect(tagCalls()).toEqual([
      {
        ids: ['a-1', 'a-2'],
        tags: {
          tags_to_add: [`${TRIAGE_WOULD_REUSE_TAG_PREFIX}${verdictCacheId(hashOf('a.exe'))}`],
          tags_to_remove: [],
        },
      },
    ]);
  });

  it('counts a record of a true positive verdict apart', async () => {
    const { run } = setup({
      alerts: [['a-1', source('a.exe')]],
      records: [recordOf('a.exe', 'active', 'true_positive')],
    });

    const { output } = await run();

    expect(output).toMatchObject({ would_reuse_true_positive: 1, would_reuse_false_positive: 0 });
  });

  it.each([
    ['a pending record', recordOf('a.exe', 'pending')],
    ['an unstable record', recordOf('a.exe', 'unstable')],
    [
      'an expired record',
      recordOf(
        'a.exe',
        'active',
        'false_positive',
        new Date(Date.now() - VERDICT_CACHE_TTL_MS - 60_000)
      ),
    ],
  ])(
    'tags nothing for %s, because only an active record that has not expired is reusable',
    async (_name, record) => {
      const { run, tagCalls } = setup({ alerts: [['a-1', source('a.exe')]], records: [record] });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'ok', would_reuse: 0, reusable_records: 0 });
      expect(tagCalls()).toEqual([]);
    }
  );

  it('does not count or tag an alert without a strict key', async () => {
    const { run, tagCalls } = setup({
      alerts: [['n-1', { 'kibana.alert.rule.uuid': 'rule-9', 'kibana.alert.severity': 'low' }]],
      records: [recordOf('a.exe', 'active')],
    });

    const { output } = await run();

    expect(output).toMatchObject({ candidates: 1, alerts_with_strict_key: 0, would_reuse: 0 });
    expect(tagCalls()).toEqual([]);
  });

  it('leaves out of its search the alerts that already carry the tag, so a sweep does not tag them again', async () => {
    const { run, callKibanaApi } = setup({ alerts: [] });

    await run();

    const search = callKibanaApi.mock.calls.find(([{ path }]) => path.endsWith('/signals/search'));
    expect(search?.[0].body?.query.bool.must_not).toContainEqual({
      prefix: { 'kibana.alert.workflow_tags': TRIAGE_WOULD_REUSE_TAG_PREFIX },
    });
  });

  it('reads a missing decisions index as no records', async () => {
    const { run } = setup({ alerts: [['a-1', source('a.exe')]], missingIndex: true });

    const { output } = await run();

    expect(output).toMatchObject({ status: 'ok', would_reuse: 0 });
  });

  it('fails open when a record cannot be read: it reports `failed`, tags nothing and does not throw', async () => {
    const { run, tagCalls, warn } = setup({ alerts: [['a-1', source('a.exe')]], unreadable: true });

    const { output } = await run();

    expect(output).toMatchObject({ status: 'failed', would_reuse: 0 });
    expect(tagCalls()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be read'));
  });

  it('counts a record whose alerts could not be tagged, and still tags the other records', async () => {
    const { run, tagCalls } = setup({
      alerts: [
        ['a-1', source('a.exe')],
        ['b-1', source('b.exe')],
      ],
      records: [recordOf('a.exe', 'active'), recordOf('b.exe', 'active')],
      tagFailsFor: verdictCacheId(hashOf('a.exe')),
    });

    const { output } = await run();

    expect(output).toMatchObject({
      status: 'ok',
      tag_failures: 1,
      would_reuse: 1,
      reusable_records: 1,
    });
    expect(tagCalls().map(({ ids }) => ids)).toEqual([['a-1'], ['b-1']]);
  });
});
