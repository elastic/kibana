/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashKey } from './key_tags';
import { buildPatternKeys } from './pattern_key';
import {
  VERDICT_CACHE_KI_TYPE,
  VERDICT_CACHE_NOVELTY_CAP,
  VERDICT_CACHE_TTL_MS,
  VERDICT_CACHE_UNSTABLE_BLOCK_MS,
  buildCacheDocument,
  isReusable,
  matchReusableRecords,
  mergeNovelty,
  nextCacheAction,
  pickKeyRepresentatives,
  readCacheRecord,
  recordShadowOutcome,
  toCacheVerdict,
  isAuditSample,
  toVerdictCacheMode,
  verdictCacheId,
  type BatchAlert,
  type CacheAction,
  type FreshVerdict,
  type VerdictCacheRecord,
} from './verdict_cache';

const NOW = new Date('2026-11-18T12:00:00.000Z');
const FLOOR = 0.85;
const SPACE = 'default';

const processDoc = (executable: string): Record<string, unknown> => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Rule One',
  'kibana.alert.rule.revision': 3,
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
});

const strictKeyOf = (doc: Record<string, unknown>): string => {
  const { strict } = buildPatternKeys(doc);
  if (strict === undefined) throw new Error('the test document has no strict key');
  return strict;
};

const KEY = strictKeyOf(processDoc('C:\\Tools\\one.exe'));
const KEY_HASH = hashKey(SPACE, KEY);

const fresh = (
  alertId: string,
  classification = 'false_positive',
  confidenceScore = 0.95
): FreshVerdict => ({ alertId, classification, confidenceScore });

const act = (
  existing: VerdictCacheRecord | undefined,
  verdict: FreshVerdict,
  extra: Partial<Parameters<typeof nextCacheAction>[0]> = {}
): CacheAction =>
  nextCacheAction({
    existing,
    fresh: verdict,
    keyHash: KEY_HASH,
    strictKey: KEY,
    floor: FLOOR,
    now: NOW,
    ...extra,
  });

const written = (action: CacheAction): VerdictCacheRecord => {
  if (action.type !== 'write') throw new Error(`expected a write, got ${action.reason}`);
  return action.record;
};

const pending = (): VerdictCacheRecord => written(act(undefined, fresh('alert-1')));

const later = (ms: number): Date => new Date(NOW.getTime() + ms);

describe('toVerdictCacheMode', () => {
  it('turns the cache on in shadow or on, and reads every other value as off, so that a mistyped value cannot reuse a verdict', () => {
    expect(toVerdictCacheMode('shadow')).toBe('shadow');
    expect(toVerdictCacheMode('on')).toBe('on');
    expect(['off', '', 'SHADOW', 'ON', 'true', 'shadow '].map(toVerdictCacheMode)).toEqual(
      Array(6).fill('off')
    );
  });
});

describe('isAuditSample', () => {
  const ids = Array.from({ length: 20_000 }, (_unused, i) => `alert-${i}`);

  it('chooses about the share that it is given, by a hash of the alert id', () => {
    const chosen = ids.filter((id) => isAuditSample(id)).length;

    expect(chosen / ids.length).toBeGreaterThan(0.04);
    expect(chosen / ids.length).toBeLessThan(0.06);
    expect(ids.filter((id) => isAuditSample(id, 0.5)).length / ids.length).toBeCloseTo(0.5, 1);
  });

  it('gives the same answer for the same alert every time, so that a sweep needs no state', () => {
    expect(ids.slice(0, 200).map((id) => isAuditSample(id))).toEqual(
      ids.slice(0, 200).map((id) => isAuditSample(id))
    );
  });

  it('chooses no alert at a share of 0 and every alert at a share of 1, and a bigger share keeps the alerts of a smaller one', () => {
    expect(ids.some((id) => isAuditSample(id, 0))).toBe(false);
    expect(ids.every((id) => isAuditSample(id, 1))).toBe(true);
    expect(ids.filter((id) => isAuditSample(id, 0.05)).every((id) => isAuditSample(id, 0.2))).toBe(
      true
    );
  });
});

describe('toCacheVerdict', () => {
  it('caches a false or a true positive that reaches the floor, and nothing else', () => {
    expect(toCacheVerdict(fresh('a', 'false_positive', 0.85), FLOOR)).toBe('false_positive');
    expect(toCacheVerdict(fresh('a', 'true_positive', 0.9), FLOOR)).toBe('true_positive');
    expect(toCacheVerdict(fresh('a', 'false_positive', 0.8499), FLOOR)).toBeUndefined();
    expect(toCacheVerdict(fresh('a', 'inconclusive', 0.99), FLOOR)).toBeUndefined();
    expect(toCacheVerdict(fresh('a', 'false_positive', NaN), FLOOR)).toBeUndefined();
  });
});

describe('nextCacheAction: run 1', () => {
  it('starts a pending record from a confident verdict, with the ttl and the representative', () => {
    const record = pending();

    expect(record).toMatchObject({
      keyHash: KEY_HASH,
      state: 'pending',
      verdict: 'false_positive',
      representativeId: 'alert-1',
      run1: { alertId: 'alert-1', verdict: 'false_positive', confidence: 0.95 },
      novelty: {},
      createdAt: NOW.toISOString(),
      hits: { hits: 0, agreements: 0, disagreements: 0 },
    });
    expect(record.expiresAt).toBe(new Date(NOW.getTime() + VERDICT_CACHE_TTL_MS).toISOString());
    expect(record.run2).toBeUndefined();
  });

  it.each([
    ['an inconclusive verdict', fresh('a', 'inconclusive', 0.99)],
    ['a confidence under the floor', fresh('a', 'false_positive', 0.6)],
  ])('writes no record for %s', (_name, verdict) => {
    expect(act(undefined, verdict)).toEqual({ type: 'none', reason: 'not_eligible' });
  });

  it('records why Jev was not used, so that a reader of the record knows (without Jev the record still works)', () => {
    expect(written(act(undefined, fresh('a'))).jevSkipReason).toBe('not_used');
    expect(
      written(act(undefined, fresh('a'), { jev: { skipReason: 'not_configured' } })).jevSkipReason
    ).toBe('not_configured');
    const withScore = written(act(undefined, fresh('a'), { jev: { score: 0.04 } }));
    expect(withScore.jevScore).toBe(0.04);
    expect(withScore.jevSkipReason).toBeUndefined();
  });
});

describe('nextCacheAction: run 2', () => {
  it('makes the record active when run 2 has the same verdict at the floor', () => {
    const action = act(pending(), fresh('alert-2'));

    expect(action).toMatchObject({ type: 'write', transition: 'activated' });
    expect(written(action)).toMatchObject({
      state: 'active',
      run2: { alertId: 'alert-2', verdict: 'false_positive', confidence: 0.95 },
    });
  });

  it.each([
    ['the other verdict', fresh('alert-2', 'true_positive', 0.99)],
    ['an inconclusive verdict', fresh('alert-2', 'inconclusive', 0.99)],
    ['the same verdict under the floor', fresh('alert-2', 'false_positive', 0.7)],
  ])('makes the key unstable for 24 hours when run 2 is %s', (_name, verdict) => {
    const action = act(pending(), verdict);

    expect(action).toMatchObject({ type: 'write', transition: 'made_unstable' });
    expect(written(action).state).toBe('unstable');
    expect(written(action).expiresAt).toBe(
      new Date(NOW.getTime() + VERDICT_CACHE_UNSTABLE_BLOCK_MS).toISOString()
    );
  });

  it('makes the key unstable when Jev contradicts a verdict that agrees', () => {
    expect(written(act(pending(), fresh('alert-2'), { jev: { contradicts: true } })).state).toBe(
      'unstable'
    );
  });

  it('does not count the alert that made the record as run 2', () => {
    expect(act(pending(), fresh('alert-1'))).toEqual({ type: 'none', reason: 'same_alert' });
  });

  it('never makes a record active from anything but two runs', () => {
    const states = [
      act(undefined, fresh('alert-1')),
      act(undefined, fresh('alert-1', 'true_positive')),
    ].map((action) => written(action).state);

    expect(states).toEqual(['pending', 'pending']);
  });
});

describe('nextCacheAction: novelty lists', () => {
  const seen = (hash: string) => ({ hash: [hash], host_name: ['h-1'] });

  it('seeds the novelty lists with the values of the alert of run 1', () => {
    const record = written(act(undefined, fresh('alert-1'), { noveltyValues: seen('aa') }));

    expect(record.novelty).toEqual(seen('aa'));
  });

  it('adds the values of run 2 when it agrees, so that a record sees both alerts before it can fire', () => {
    const first = written(act(undefined, fresh('alert-1'), { noveltyValues: seen('aa') }));

    const active = written(act(first, fresh('alert-2'), { noveltyValues: seen('bb') }));

    expect(active.state).toBe('active');
    expect(active.novelty.hash).toEqual(['aa', 'bb']);
  });

  it('keeps the lists as they were when run 2 disagrees, so a bad variant does not widen them', () => {
    const first = written(act(undefined, fresh('alert-1'), { noveltyValues: seen('aa') }));

    const unstable = written(
      act(first, fresh('alert-2', 'true_positive'), { noveltyValues: seen('bb') })
    );

    expect(unstable.state).toBe('unstable');
    expect(unstable.novelty.hash).toEqual(['aa']);
  });
});

describe('nextCacheAction: unstable, active and expired records', () => {
  it('gives an unstable key no new record until the block ends, and a new one after', () => {
    const unstable = written(act(pending(), fresh('alert-2', 'true_positive')));

    expect(act(unstable, fresh('alert-3'), { now: later(60 * 60 * 1000) })).toEqual({
      type: 'none',
      reason: 'blocked_unstable',
    });
    const after = act(unstable, fresh('alert-3'), {
      now: later(VERDICT_CACHE_UNSTABLE_BLOCK_MS + 1000),
    });
    expect(written(after)).toMatchObject({ state: 'pending', representativeId: 'alert-3' });
  });

  it('leaves an active record alone', () => {
    const active = written(act(pending(), fresh('alert-2')));

    expect(act(active, fresh('alert-3', 'true_positive', 0.99))).toEqual({
      type: 'none',
      reason: 'already_active',
    });
  });

  it('treats an expired record as no record, so a new run 1 starts', () => {
    const active = written(act(pending(), fresh('alert-2')));
    const afterTtl = later(VERDICT_CACHE_TTL_MS + 1000);

    expect(isReusable(active, NOW)).toBe(true);
    expect(isReusable(active, afterTtl)).toBe(false);
    expect(written(act(active, fresh('alert-9'), { now: afterTtl }))).toMatchObject({
      state: 'pending',
      representativeId: 'alert-9',
    });
  });

  it('does not reuse a pending or an unstable record', () => {
    expect(isReusable(pending(), NOW)).toBe(false);
    expect(isReusable(written(act(pending(), fresh('alert-2', 'true_positive'))), NOW)).toBe(false);
  });
});

describe('mergeNovelty', () => {
  it('adds values without duplicates and stops at the cap, so that a field becomes saturated', () => {
    const many = Array.from({ length: VERDICT_CACHE_NOVELTY_CAP + 20 }, (_, i) => `v${i}`);

    const merged = mergeNovelty(
      { 'process.hash.sha256': ['v0', 'x'] },
      { 'process.hash.sha256': many }
    );

    expect(merged['process.hash.sha256']).toHaveLength(VERDICT_CACHE_NOVELTY_CAP);
    expect(merged['process.hash.sha256'].filter((v) => v === 'v0')).toHaveLength(1);
    expect(merged['process.hash.sha256'][1]).toBe('x');
  });

  it('keeps the other fields and does not change its input', () => {
    const lists = { a: ['1'] };

    const merged = mergeNovelty(lists, { b: ['2'] });

    expect(merged).toEqual({ a: ['1'], b: ['2'] });
    expect(lists).toEqual({ a: ['1'] });
  });
});

describe('recordShadowOutcome', () => {
  const active = (): VerdictCacheRecord => written(act(pending(), fresh('alert-2')));

  it('counts a hit that agrees, and adds the values of the alert to the novelty lists', () => {
    const after = recordShadowOutcome({
      record: active(),
      fresh: fresh('alert-3'),
      noveltyValues: { 'process.parent.executable': ['c:\\a.exe'] },
    });

    expect(after.hits).toMatchObject({ hits: 1, agreements: 1, disagreements: 0 });
    expect(after.novelty).toEqual({ 'process.parent.executable': ['c:\\a.exe'] });
  });

  it('counts a hit that disagrees and adds nothing, so a bad variant does not widen the lists', () => {
    const after = recordShadowOutcome({
      record: active(),
      fresh: fresh('alert-3', 'true_positive', 0.99),
      noveltyValues: { 'process.hash.sha256': ['bad'] },
    });

    expect(after.hits).toMatchObject({ hits: 1, agreements: 0, disagreements: 1 });
    expect(after.novelty).toEqual({});
  });

  it('counts an inconclusive fresh verdict as a disagreement', () => {
    expect(
      recordShadowOutcome({ record: active(), fresh: fresh('alert-3', 'inconclusive', 0.5) }).hits
        .disagreements
    ).toBe(1);
  });
});

describe('pickKeyRepresentatives', () => {
  const alert = (id: string, executable: string, extra: Partial<BatchAlert> = {}): BatchAlert => ({
    id,
    riskScore: 21,
    timestamp: 1000,
    doc: processDoc(executable),
    classification: 'false_positive',
    confidenceScore: 0.9,
    ...extra,
  });

  it('takes one alert per key, in the order of the budget: risk score, then oldest, then id', () => {
    const reps = pickKeyRepresentatives({
      alerts: [
        alert('c', 'C:\\Tools\\one.exe', { riskScore: 21, timestamp: 1 }),
        alert('b', 'C:\\Tools\\one.exe', { riskScore: 73, timestamp: 9 }),
        alert('a', 'C:\\Tools\\one.exe', { riskScore: 73, timestamp: 5 }),
        alert('z', 'C:\\Tools\\two.exe'),
        alert('y', 'C:\\Tools\\two.exe'),
      ],
      spaceId: SPACE,
    });

    expect(reps.map(({ alert: { id } }) => id).sort()).toEqual(['a', 'y']);
    expect(reps).toHaveLength(2);
  });

  it('leaves out alerts without a strict key, because they have no cache', () => {
    const reps = pickKeyRepresentatives({
      alerts: [{ ...alert('n', 'x'), doc: { 'kibana.alert.rule.uuid': 'rule-9' } }],
      spaceId: SPACE,
    });

    expect(reps).toEqual([]);
  });

  it('gives the same key hash as the key tags, so that records and tags agree', () => {
    const [rep] = pickKeyRepresentatives({
      alerts: [alert('a', 'C:\\Tools\\one.exe')],
      spaceId: SPACE,
    });

    expect(rep.keyHash).toBe(KEY_HASH);
    expect(rep.strictKey).toBe(KEY);
  });

  it('gives another hash in another space', () => {
    const [other] = pickKeyRepresentatives({
      alerts: [alert('a', 'C:\\Tools\\one.exe')],
      spaceId: 'other-space',
    });

    expect(other.keyHash).not.toBe(KEY_HASH);
  });
});

describe('the Knowledge Indicator document and its reader', () => {
  const full = (): VerdictCacheRecord => ({
    ...written(act(pending(), fresh('alert-2'))),
    jevScore: 0.04,
    novelty: { 'process.hash.sha256': ['abc', 'def'], 'process.parent.executable': ['c:\\a.exe'] },
    hits: { hits: 3, agreements: 2, disagreements: 1, guardHits: { 'novelty:hash': 4 } },
  });
  const docOf = (record: VerdictCacheRecord) =>
    buildCacheDocument({ record, spaceId: SPACE, now: NOW });

  it('reads back the record that was built, with every field (round trip)', () => {
    const record = full();

    expect(readCacheRecord(docOf(record))).toEqual(record);
  });

  it('round-trips a pending record that has no run 2 and no Jev score', () => {
    const record = pending();

    expect(readCacheRecord(docOf(record))).toEqual(record);
  });

  it('names the type, the id and the space of the record', () => {
    expect(docOf(full())).toMatchObject({
      type: VERDICT_CACHE_KI_TYPE,
      id: verdictCacheId(KEY_HASH),
      expires_at: full().expiresAt,
      permissions: { kibana: { privileges: [{ space: SPACE }] } },
    });
  });

  it('stores novelty as a list of field and values, because dots in a key would become nested objects', () => {
    const { attributes } = docOf(full()) as { attributes: { novelty: unknown } };

    expect(attributes.novelty).toEqual([
      { field: 'process.hash.sha256', values: ['abc', 'def'] },
      { field: 'process.parent.executable', values: ['c:\\a.exe'] },
    ]);
  });

  it('never stores the Jev score and the skip reason in one field', () => {
    const { attributes } = docOf(pending()) as { attributes: Record<string, unknown> };

    expect(attributes).toHaveProperty('jev_skip_reason', 'not_used');
    expect(attributes).not.toHaveProperty('jev_score');
  });

  it.each([
    ['a document of another type', { ...docOf(full()), type: 'security.fp_decision' }],
    [
      'a document that was retired',
      { ...docOf(full()), governance: { lifecycle: { status: 'retired' } } },
    ],
    ['a document with no strict key', { ...docOf(full()), attributes: { key_hash: 'x' } }],
    [
      'a document with an unknown state',
      {
        ...docOf(full()),
        attributes: { ...(docOf(full()).attributes as object), state: 'bogus' },
      },
    ],
    ['nothing', undefined],
  ])('does not read %s as a record', (_name, source) => {
    expect(readCacheRecord(source as Record<string, unknown> | undefined)).toBeUndefined();
  });

  it('reads a document that has an active lifecycle, and one that has none', () => {
    const withLifecycle = { ...docOf(full()), governance: { lifecycle: { status: 'active' } } };

    expect(readCacheRecord(withLifecycle)).toEqual(full());
  });
});

describe('matchReusableRecords', () => {
  const activeRecord = (): VerdictCacheRecord => written(act(pending(), fresh('alert-2')));

  it('groups the alerts of a key under the id of its active record, with the verdict to reuse', () => {
    const record = activeRecord();

    const matches = matchReusableRecords({
      hashes: new Map([
        ['p-1', KEY_HASH],
        ['p-2', KEY_HASH],
        ['p-3', 'other-key'],
      ]),
      recordsByHash: new Map([[KEY_HASH, record]]),
      now: NOW,
    });

    expect([...matches.entries()]).toEqual([
      [verdictCacheId(KEY_HASH), { verdict: 'false_positive', alertIds: ['p-1', 'p-2'] }],
    ]);
  });

  it('matches nothing for a pending or an unstable record, and nothing for an expired one', () => {
    const records = [
      pending(),
      written(act(pending(), fresh('alert-2', 'true_positive'))),
      activeRecord(),
    ];
    const after = later(VERDICT_CACHE_TTL_MS + 1000);

    records.slice(0, 2).forEach((record) => {
      const matches = matchReusableRecords({
        hashes: new Map([['p-1', KEY_HASH]]),
        recordsByHash: new Map([[KEY_HASH, record]]),
        now: NOW,
      });
      expect(matches.size).toBe(0);
    });
    expect(
      matchReusableRecords({
        hashes: new Map([['p-1', KEY_HASH]]),
        recordsByHash: new Map([[KEY_HASH, records[2]]]),
        now: after,
      }).size
    ).toBe(0);
  });

  it('matches nothing for an alert without a strict key, because it has no entry in the hashes', () => {
    const matches = matchReusableRecords({
      hashes: new Map(),
      recordsByHash: new Map([[KEY_HASH, activeRecord()]]),
      now: NOW,
    });

    expect(matches.size).toBe(0);
  });
});
