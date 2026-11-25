/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { hashKey } from '../../alert_triage/key_tags';
import {
  TRIAGE_CACHE_CONFIRM_TAG_PREFIX,
  TRIAGE_STRICT_KEY_TAG_PREFIX,
  TRIAGE_WIDE_KEY_TAG_PREFIX,
} from '../../alert_triage/constants';
import { buildPatternKeys } from '../../alert_triage/pattern_key';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_CACHE_REUSE_TAG_PREFIX,
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
  isAuditSample,
  VERDICT_CACHE_CONFIRM_MIN_WAITING,
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

const source = (executable: string, extra: Record<string, unknown> = {}) => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 3,
  'kibana.alert.severity': 'low',
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
  ...extra,
});

/** An alert of the key of `a.exe` that differs from the others only in a field outside the key. */
const withProcess = (fields: Record<string, unknown>) =>
  source('a.exe', {
    process: { executable: 'a.exe', code_signature: { subject_name: 'Acme' }, ...fields },
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
  now = new Date(),
  noveltyValues: Record<string, string[]> = {}
): VerdictCacheRecord => {
  const base = {
    keyHash: hashOf(executable),
    strictKey: strictOf(executable),
    floor: 0.85,
    now,
  };
  const run1 = written(
    nextCacheAction({
      existing: undefined,
      fresh: fresh('first', verdict),
      noveltyValues,
      ...base,
    })
  );
  if (state === 'pending') return run1;
  return written(
    nextCacheAction({
      existing: run1,
      fresh: fresh('second', state === 'active' ? verdict : 'true_positive'),
      noveltyValues,
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
  reuseTagFailsFor,
  confirm = false,
}: {
  alerts: Array<[string, Record<string, unknown>]>;
  records?: VerdictCacheRecord[];
  mode?: VerdictCacheMode;
  enabled?: boolean;
  missingIndex?: boolean;
  unreadable?: boolean;
  /** The tag call for this record id fails. */
  tagFailsFor?: string;
  /** The call that applies the verdict of this record id (`on` mode) fails. */
  reuseTagFailsFor?: string;
  /** The flag `alertzero.triageCacheConfirm`. */
  confirm?: boolean;
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
        if (
          reuseTagFailsFor &&
          body?.tags.tags_to_add.includes(`${TRIAGE_CACHE_REUSE_TAG_PREFIX}${reuseTagFailsFor}`)
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
      getCacheConfirm: async () => confirm,
    }).handler({
      input: {
        analysis_tag_prefix: 'alert_analysis:',
        lookback_hours: 24,
        min_severity: 'low',
        exclude_building_blocks: false,
        excluded_rule_tags: [],
      },
      contextManager: {
        callKibanaApi,
        getContext: () => ({ workflow: { spaceId: 'default' } }),
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

  describe('the novelty guard', () => {
    const SEEN = { hash: ['aa'], trusted: ['true'], command_line_shape: ['1234567890abcdef'] };
    const guardTags = (tagCalls: Array<{ ids: string[]; tags: { tags_to_add: string[] } }>) =>
      tagCalls
        .filter(({ tags }) => tags.tags_to_add[0].startsWith('az:guard_hit:'))
        .map(({ ids, tags }) => [tags.tags_to_add[0], ids]);

    it('tags an alert with a new hash, and only that alert, per field that fired, besides the would-reuse tag', async () => {
      const { run, tagCalls } = setup({
        alerts: [
          ['seen', withProcess({ hash: { sha256: 'AA' } })],
          ['new-hash', withProcess({ hash: { sha256: 'BB' } })],
        ],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 2, guard_hits: 1, guard_not_checked: 0 });
      expect(guardTags(tagCalls())).toEqual([['az:guard_hit:novelty:hash', ['new-hash']]]);
      expect(tagCalls()[0].ids).toEqual(['seen', 'new-hash']);
    });

    it('fires on a new trusted value and a new command line shape, each under its own tag', async () => {
      const { run, tagCalls } = setup({
        alerts: [
          [
            'variant',
            withProcess({
              hash: { sha256: 'AA' },
              command_line: 'a.exe -enc JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAAgAFMAeQBzAHQAZQBtAC4A',
            }),
          ],
        ],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ guard_hits: 1 });
      expect(guardTags(tagCalls())).toEqual([
        ['az:guard_hit:novelty:command_line_shape', ['variant']],
      ]);
    });

    it('does not fire on a new host or user, and tags no guard hit for an alert with values it has seen', async () => {
      const { run, tagCalls } = setup({
        alerts: [
          [
            'elsewhere',
            source('a.exe', {
              host: { os: { type: 'windows' }, name: 'other-host' },
              user: { name: 'bob' },
              process: {
                executable: 'a.exe',
                code_signature: { subject_name: 'Acme' },
                hash: { sha256: 'AA' },
              },
            }),
          ],
        ],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 1, guard_hits: 0 });
      expect(guardTags(tagCalls())).toEqual([]);
    });

    it('does not check a field whose list is full, and counts it', async () => {
      const full = Array.from({ length: 50 }, (_unused, i) => `h${i}`);
      const { run, tagCalls } = setup({
        alerts: [['new-hash', withProcess({ hash: { sha256: 'BB' } })]],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), { hash: full })],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 1, guard_hits: 0, guard_not_checked: 1 });
      expect(guardTags(tagCalls())).toEqual([]);
    });

    it('keeps the would-reuse tag and counts a failure when the guard tag cannot be written', async () => {
      const { run, callKibanaApi, warn } = setup({
        alerts: [['new-hash', withProcess({ hash: { sha256: 'BB' } })]],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });
      const original = callKibanaApi.getMockImplementation();
      callKibanaApi.mockImplementation(async (args) => {
        if (args.body?.tags?.tags_to_add[0].startsWith('az:guard_hit:')) throw new Error('nope');
        return original!(args);
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'ok', would_reuse: 1, tag_failures: 1 });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('guard hits'));
    });

    it('asks for the fields that the guard reads, so a new value outside the key can be seen', async () => {
      const { run, callKibanaApi } = setup({ alerts: [] });

      await run();

      const search = callKibanaApi.mock.calls.find(([{ path }]) =>
        path.endsWith('/signals/search')
      );
      expect(search?.[0].body?._source).toEqual(
        expect.arrayContaining(['process.command_line', 'destination.ip', 'process.hash.sha256'])
      );
    });
  });

  describe('on mode', () => {
    const SEEN = { hash: ['aa'] };
    const recordId = verdictCacheId(hashOf('a.exe'));
    const alertWithHash = (hash: string) => withProcess({ hash: { sha256: hash } });
    /** An id of an alert that is in the audit sample, and one that is not. */
    const auditId = Array.from({ length: 500 }, (_unused, i) => `audit-${i}`).find((id) =>
      isAuditSample(id)
    ) as string;
    const plainIds = Array.from({ length: 500 }, (_unused, i) => `plain-${i}`).filter(
      (id) => !isAuditSample(id)
    );
    const tagsOf = (calls: Array<{ ids: string[]; tags: { tags_to_add: string[] } }>) =>
      calls.map(({ ids, tags }) => ({ ids, add: tags.tags_to_add }));

    it('gives an alert of an active false positive record the verdict, the reuse tag and the key tags, so that the planner skips it', async () => {
      const { run, tagCalls } = setup({
        mode: 'on',
        alerts: [[plainIds[0], alertWithHash('AA')]],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({
        status: 'ok',
        would_reuse: 1,
        reused: 1,
        reused_false_positive: 1,
        reused_true_positive: 0,
        audit_sampled: 0,
        guard_hits: 0,
      });
      const [call] = tagsOf(tagCalls());
      expect(call.ids).toEqual([plainIds[0]]);
      expect(call.add).toEqual([
        'az:false_positive',
        `${TRIAGE_CACHE_REUSE_TAG_PREFIX}${recordId}`,
        `${TRIAGE_STRICT_KEY_TAG_PREFIX}${hashOf('a.exe')}`,
        `${TRIAGE_WIDE_KEY_TAG_PREFIX}${hashKey(
          'default',
          buildPatternKeys(alertWithHash('AA')).wide
        )}`,
      ]);
      expect(tagCalls().some(({ tags }) => tags.tags_to_add[0].startsWith('az:would_reuse'))).toBe(
        false
      );
    });

    it('gives an alert of a true positive record the true positive verdict', async () => {
      const { run, tagCalls } = setup({
        mode: 'on',
        alerts: [[plainIds[0], alertWithHash('AA')]],
        records: [recordOf('a.exe', 'active', 'true_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({
        reused: 1,
        reused_true_positive: 1,
        reused_false_positive: 0,
      });
      expect(tagsOf(tagCalls())[0].add[0]).toBe('az:true_positive');
    });

    it('analyzes an alert that a guard fired on: it keeps the would-reuse tag and the guard tag and gets no verdict', async () => {
      const { run, tagCalls } = setup({
        mode: 'on',
        alerts: [
          [plainIds[0], alertWithHash('AA')],
          [plainIds[1], alertWithHash('BB')],
        ],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 2, reused: 1, guard_hits: 1, audit_sampled: 0 });
      const calls = tagsOf(tagCalls());
      expect(calls).toContainEqual({ ids: [plainIds[1]], add: ['az:guard_hit:novelty:hash'] });
      expect(calls).toContainEqual({ ids: [plainIds[1]], add: [`az:would_reuse:${recordId}`] });
      const verdictCalls = calls.filter(({ add }) => add[0].startsWith('az:false_positive'));
      expect(verdictCalls.flatMap(({ ids }) => ids)).toEqual([plainIds[0]]);
    });

    it('analyzes the alerts of the audit sample: they carry the would-reuse tag and an audit tag and get no verdict', async () => {
      const { run, tagCalls } = setup({
        mode: 'on',
        alerts: [
          [auditId, alertWithHash('AA')],
          [plainIds[0], alertWithHash('AA')],
        ],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 2, reused: 1, audit_sampled: 1 });
      const calls = tagsOf(tagCalls());
      expect(calls).toContainEqual({ ids: [auditId], add: [`az:would_reuse:${recordId}`] });
      expect(calls).toContainEqual({
        ids: [auditId],
        add: [`${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${recordId}`],
      });
      const verdictIds = calls
        .filter(({ add }) => add[0] === 'az:false_positive')
        .flatMap(({ ids }) => ids);
      expect(verdictIds).toEqual([plainIds[0]]);
    });

    it('never reuses the record of a cloud key: its alerts are analyzed and keep the would-reuse tag, because a cloud key can cover alerts with different truths', async () => {
      const cloudAlert = {
        'kibana.alert.rule.uuid': 'cloud-rule',
        'kibana.alert.rule.revision': 1,
        'kibana.alert.severity': 'low',
        event: { action: 'ListBuckets' },
        cloud: { account: { id: '1234' } },
      };
      const { strict } = buildPatternKeys(cloudAlert);
      if (strict === undefined) throw new Error('no strict key');
      const keyHash = hashKey('default', strict);
      const base = { keyHash, strictKey: strict, floor: 0.85, now: new Date() };
      const run1 = written(
        nextCacheAction({ existing: undefined, fresh: fresh('first'), noveltyValues: {}, ...base })
      );
      const active = written(
        nextCacheAction({ existing: run1, fresh: fresh('second'), noveltyValues: {}, ...base })
      );
      const { run, tagCalls } = setup({
        mode: 'on',
        alerts: [[plainIds[0], cloudAlert]],
        records: [active],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 1, reused: 0, audit_sampled: 0 });
      expect(tagsOf(tagCalls())).toEqual([
        { ids: [plainIds[0]], add: [`az:would_reuse:${verdictCacheId(keyHash)}`] },
      ]);
    });

    it('leaves an alert pending, so that it is analyzed, when the verdict cannot be applied, and counts the failure', async () => {
      const { run, warn } = setup({
        mode: 'on',
        alerts: [[plainIds[0], alertWithHash('AA')]],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
        reuseTagFailsFor: recordId,
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'ok', would_reuse: 1, reused: 0, tag_failures: 1 });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Could not apply the verdict'));
    });

    it('does not reuse a pending, unstable or expired record, as in shadow mode', async () => {
      const { run, tagCalls } = setup({
        mode: 'on',
        alerts: [[plainIds[0], alertWithHash('AA')]],
        records: [recordOf('a.exe', 'pending', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 0, reused: 0 });
      expect(tagCalls()).toEqual([]);
    });

    it('reuses nothing in shadow mode: the same alerts only get the would-reuse tag', async () => {
      const { run, tagCalls } = setup({
        mode: 'shadow',
        alerts: [[plainIds[0], alertWithHash('AA')]],
        records: [recordOf('a.exe', 'active', 'false_positive', new Date(), SEEN)],
      });

      const { output } = await run();

      expect(output).toMatchObject({ would_reuse: 1, reused: 0, audit_sampled: 0 });
      expect(tagsOf(tagCalls())).toEqual([
        { ids: [plainIds[0]], add: [`az:would_reuse:${recordId}`] },
      ]);
    });
  });

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

  describe('confirming a pending record early', () => {
    const many = (executable: string, count: number, tags: string[] = []) =>
      Array.from({ length: count }, (_, i): [string, Record<string, unknown>] => [
        `${executable}-${i}`,
        { ...source(executable), 'kibana.alert.workflow_tags': i === 0 ? tags : [] },
      ]);
    const confirmTagsOf = (calls: Array<{ ids: string[]; tags: { tags_to_add: string[] } }>) =>
      calls.filter(({ tags }) =>
        tags.tags_to_add.some((tag) => tag.startsWith(TRIAGE_CACHE_CONFIRM_TAG_PREFIX))
      );

    // The record needs run 2 from a later batch. Tagging one waiting alert lets the planner serve it first, so the record can turn
    // active before the rest of the backlog waits behind other rules.
    it('tags one waiting alert of a pending record that many waiting alerts share, with the id of the record', async () => {
      const { run, tagCalls } = setup({
        mode: 'on',
        confirm: true,
        alerts: many('a.exe', VERDICT_CACHE_CONFIRM_MIN_WAITING),
        records: [recordOf('a.exe', 'pending')],
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'ok', confirm_tagged: 1 });
      expect(confirmTagsOf(tagCalls())).toEqual([
        expect.objectContaining({
          ids: ['a.exe-0'],
          tags: expect.objectContaining({
            tags_to_add: [`${TRIAGE_CACHE_CONFIRM_TAG_PREFIX}${verdictCacheId(hashOf('a.exe'))}`],
          }),
        }),
      ]);
    });

    it('tags nothing with the flag off, or when a waiting alert already carries the tag for the record', async () => {
      const recordId = verdictCacheId(hashOf('a.exe'));
      const off = setup({
        mode: 'on',
        alerts: many('a.exe', VERDICT_CACHE_CONFIRM_MIN_WAITING),
        records: [recordOf('a.exe', 'pending')],
      });
      const asked = setup({
        mode: 'on',
        confirm: true,
        alerts: many('a.exe', VERDICT_CACHE_CONFIRM_MIN_WAITING, [
          'az:claimed',
          `${TRIAGE_CACHE_CONFIRM_TAG_PREFIX}${recordId}`,
        ]),
        records: [recordOf('a.exe', 'pending')],
      });

      expect((await off.run()).output).toMatchObject({ confirm_tagged: 0 });
      expect((await asked.run()).output).toMatchObject({ confirm_tagged: 0 });
      expect(confirmTagsOf(off.tagCalls())).toEqual([]);
      expect(confirmTagsOf(asked.tagCalls())).toEqual([]);
    });
  });
});
