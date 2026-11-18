/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashKey } from '../../server/alert_triage/key_tags';
import { buildPatternKeys } from '../../server/alert_triage/pattern_key';
import {
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
  buildCacheDocument,
  nextCacheAction,
  verdictCacheId,
  type CacheAction,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import {
  MATCH_STEP_TYPE,
  WRITE_STEP_TYPE,
  buildCacheSection,
  cacheNote,
  readCacheData,
  type CacheStepRow,
} from './report_cache';
import type { TaggedAlert, Truth } from './report_run';

const processDoc = (executable: string): Record<string, unknown> => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 3,
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
});

const cloudDoc: Record<string, unknown> = {
  'kibana.alert.rule.uuid': 'cloud-rule',
  'kibana.alert.rule.revision': 1,
  event: { action: 'ListBuckets' },
  cloud: { account: { id: '1234' } },
};

const strictOf = (doc: Record<string, unknown>): string => {
  const { strict } = buildPatternKeys(doc);
  if (strict === undefined) throw new Error('no strict key');
  return strict;
};

const NOW = new Date('2026-11-18T12:00:00.000Z');

const written = (action: CacheAction): VerdictCacheRecord => {
  if (action.type !== 'write') throw new Error('expected a write');
  return action.record;
};

const recordOf = (
  doc: Record<string, unknown>,
  state: 'pending' | 'active' | 'unstable',
  verdict = 'false_positive'
): VerdictCacheRecord => {
  const strictKey = strictOf(doc);
  const base = { keyHash: hashKey('default', strictKey), strictKey, floor: 0.85, now: NOW };
  const fresh = (alertId: string, classification: string) => ({
    alertId,
    classification,
    confidenceScore: 0.95,
  });
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

const tagOf = (record: VerdictCacheRecord): string =>
  `${TRIAGE_WOULD_REUSE_TAG_PREFIX}${verdictCacheId(record.keyHash)}`;

const alert = (id: string, ...tags: string[]): TaggedAlert => ({
  id,
  timestamp: '2026-11-18T10:00:00.000Z',
  tags,
});

const truthOf = (entries: Array<[string, 'true_positive' | 'false_positive']>): Truth =>
  new Map(entries.map(([id, verdict]) => [id, { verdict }]));

const write = (output: Record<string, unknown>): CacheStepRow => ({
  stepType: WRITE_STEP_TYPE,
  status: 'completed',
  output,
});
const match = (output: Record<string, unknown>): CacheStepRow => ({
  stepType: MATCH_STEP_TYPE,
  status: 'completed',
  output,
});

const build = (input: Partial<Parameters<typeof buildCacheSection>[0]> = {}) =>
  buildCacheSection({
    steps: [],
    records: [],
    alerts: [],
    truth: new Map(),
    analyzedAlerts: 0,
    ...input,
  });

describe('buildCacheSection', () => {
  it('has zeros and no shares when nothing happened, instead of dividing by zero', () => {
    const section = build();

    expect(section.records.total).toBe(0);
    expect(section.taggedAlerts).toMatchObject({ total: 0, shareOfAnalyzed: null });
    expect(section.agreement.withFresh).toBeNull();
    expect(section.agreement.againstTruth).toMatchObject({ checked: 0, wrongRate: null });
  });

  it('counts the records by state and verdict, and the active ones by kind of key', () => {
    const section = build({
      records: [
        recordOf(processDoc('a.exe'), 'active'),
        recordOf(processDoc('b.exe'), 'active', 'true_positive'),
        recordOf(cloudDoc, 'active'),
        recordOf(processDoc('c.exe'), 'pending'),
        recordOf(processDoc('d.exe'), 'unstable'),
      ],
    });

    expect(section.records).toEqual({
      total: 5,
      byState: { active: 3, pending: 1, unstable: 1 },
      byVerdict: { false_positive: 4, true_positive: 1 },
      activeByKind: { process: 2, cloud: 1 },
    });
  });

  it('adds up the outputs of the cache steps and counts their skip reasons and statuses', () => {
    const section = build({
      steps: [
        write({
          skip_reason: 'none',
          created: 3,
          activated: 1,
          made_unstable: 0,
          left_alone: 2,
          conflicts: 1,
          failed: 0,
          records_updated: 1,
          hit_alerts: 4,
          agreements: 3,
          disagreements: 1,
        }),
        write({
          skip_reason: 'none',
          created: 2,
          activated: 0,
          made_unstable: 1,
          left_alone: 0,
          conflicts: 0,
          failed: 0,
          records_updated: 0,
          hit_alerts: 0,
          agreements: 0,
          disagreements: 0,
        }),
        write({ skip_reason: 'denied', failed: 2 }),
        match({
          status: 'ok',
          candidates: 100,
          alerts_with_strict_key: 80,
          would_reuse: 30,
          would_reuse_false_positive: 25,
          would_reuse_true_positive: 5,
          tag_failures: 1,
        }),
        match({ status: 'failed' }),
        { stepType: 'ai.prompt', status: 'completed', output: { created: 99 } },
      ],
    });

    expect(section.writeStep).toMatchObject({
      steps: 3,
      skipReasons: { none: 2, denied: 1 },
      created: 5,
      activated: 1,
      madeUnstable: 1,
      leftAlone: 2,
      conflicts: 1,
      failed: 2,
      recordsUpdated: 1,
      hitAlerts: 4,
      agreements: 3,
      disagreements: 1,
    });
    expect(section.matchStep).toMatchObject({
      steps: 2,
      statuses: { ok: 1, failed: 1 },
      candidates: 100,
      wouldReuse: 30,
      wouldReuseFalsePositive: 25,
      wouldReuseTruePositive: 5,
      tagFailures: 1,
    });
    expect(section.agreement.withFresh).toBe(0.75);
  });

  describe('alerts tagged would-reuse', () => {
    const active = recordOf(processDoc('a.exe'), 'active');

    it('counts the tagged alerts, those that were analyzed in the run, and the share of the analyzed alerts', () => {
      const section = build({
        records: [active],
        alerts: [
          alert('a-1', tagOf(active), 'az:false_positive'),
          alert('a-2', tagOf(active), 'az:inconclusive'),
          alert('a-3', tagOf(active)),
          alert('x-1', 'az:true_positive'),
        ],
        analyzedAlerts: 10,
      });

      expect(section.taggedAlerts).toMatchObject({
        total: 3,
        analyzed: 2,
        notAnalyzed: 1,
        byKind: { process: 3 },
        bySeverity: { unknown: 3 },
        buildingBlocks: 0,
        shareOfAnalyzed: 0.2,
      });
    });

    it('does not join an alert whose record is gone, but still counts it as tagged', () => {
      const section = build({
        records: [],
        alerts: [alert('a-1', tagOf(active), 'az:false_positive')],
        truth: truthOf([['a-1', 'true_positive']]),
      });

      expect(section.taggedAlerts).toMatchObject({ total: 1, byKind: {} });
      expect(section.agreement.againstTruth.checked).toBe(0);
    });

    it('checks the reused verdict against the truth: a false positive record on a true positive is the dangerous case', () => {
      const trueRecord = recordOf(processDoc('t.exe'), 'active', 'true_positive');
      const section = build({
        records: [active, trueRecord],
        alerts: [
          alert('right', tagOf(active)),
          alert('attack', tagOf(active)),
          alert('benign', tagOf(trueRecord)),
          alert('unknown', tagOf(active)),
        ],
        truth: truthOf([
          ['right', 'false_positive'],
          ['attack', 'true_positive'],
          ['benign', 'false_positive'],
        ]),
      });

      expect(section.agreement.againstTruth).toEqual({
        checked: 3,
        wrong: 2,
        wrongRate: 0.6667,
        falsePositiveRecordOnTruePositive: 1,
      });
    });

    it('splits the tagged alerts by severity and building block, and counts those within one hour of their record', () => {
      const createdAt = Date.parse(active.createdAt);
      const at = (minutes: number): string => new Date(createdAt + minutes * 60_000).toISOString();
      const section = build({
        records: [active],
        alerts: [
          { ...alert('a-1', tagOf(active)), severity: 'high', timestamp: at(10) },
          {
            ...alert('a-2', tagOf(active)),
            severity: 'low',
            buildingBlock: true,
            timestamp: at(60),
          },
          {
            ...alert('a-3', tagOf(active)),
            severity: 'low',
            buildingBlock: false,
            timestamp: at(61),
          },
          { ...alert('a-4', tagOf(active)), timestamp: at(-30) },
        ],
      });

      expect(section.taggedAlerts).toMatchObject({
        bySeverity: { high: 1, low: 2, unknown: 1 },
        buildingBlocks: 1,
        withinOneHour: 3,
        withinOneHourShare: 0.75,
      });
    });

    it('reports what the novelty guard would do: how many wrong reuses it catches, how many right ones it stops, and the variants by type', () => {
      const guard = (field: string): string => `az:guard_hit:novelty:${field}`;
      const truth: Truth = new Map([
        ['caught', { verdict: 'true_positive', variant: 'new_hash' }],
        ['missed', { verdict: 'true_positive', variant: 'different_script' }],
        ['false-alarm', { verdict: 'false_positive', benign: 'hash_update' }],
        ['quiet', { verdict: 'false_positive' }],
      ]);

      const { guards } = build({
        records: [active],
        alerts: [
          alert('caught', tagOf(active), guard('hash'), guard('trusted')),
          alert('missed', tagOf(active)),
          alert('false-alarm', tagOf(active), guard('hash')),
          alert('quiet', tagOf(active)),
        ],
        truth,
      });

      expect(guards).toEqual({
        alertsWithHit: 2,
        shareWithHit: 0.5,
        byField: { hash: 2, trusted: 1 },
        wrongReuse: { total: 2, caught: 1, missed: 1, caughtShare: 0.5 },
        rightReuse: { total: 2, fired: 1, firedShare: 0.5 },
        byVariant: {
          new_hash: { tagged: 1, caught: 1 },
          different_script: { tagged: 1, caught: 0 },
        },
        harmlessHashUpdates: { tagged: 1, fired: 1 },
      });
    });

    it('has no shares when nothing was tagged', () => {
      expect(build().guards).toMatchObject({
        alertsWithHit: 0,
        shareWithHit: null,
        wrongReuse: { total: 0, caughtShare: null },
        rightReuse: { total: 0, firedShare: null },
      });
    });

    it('ignores the other az tags of an alert', () => {
      const section = build({
        records: [active],
        alerts: [alert('a-1', 'az:triage_strict_key:abc', 'az:would_close:fp-decision-x')],
      });

      expect(section.taggedAlerts.total).toBe(0);
    });
  });
});

describe('cacheNote', () => {
  it('says in one sentence what the cache would have done, with the dangerous count', () => {
    const active = recordOf(processDoc('a.exe'), 'active');
    const note = cacheNote(
      build({
        steps: [write({ skip_reason: 'none', hit_alerts: 4, agreements: 3 })],
        records: [active, recordOf(processDoc('d.exe'), 'unstable')],
        alerts: [alert('attack', tagOf(active), 'az:false_positive')],
        truth: truthOf([['attack', 'true_positive']]),
        analyzedAlerts: 4,
      })
    );

    expect(note).toBe(
      'Verdict cache (shadow): 2 records (1 active, 1 unstable), 1 alerts tagged would-reuse (25.0% of the analyzed alerts), 4 hits compared with fresh verdicts (75.0% agree), against the truth 1 of 1 tagged alerts would get a wrong reused verdict (1 of them a true positive covered by a false positive record). Of the tagged alerts, 0 are building blocks and 100.0% came within one hour of their record. The novelty guard fired on 0.0% of the tagged alerts and caught 0 of 1 wrong reuses (0 of 0 right reuses fired).'
    );
  });

  it('writes n/a for a share that has no data', () => {
    expect(cacheNote(build())).toContain('(n/a of the analyzed alerts)');
  });
});

describe('readCacheData', () => {
  const record = recordOf(processDoc('a.exe'), 'active');
  const source = buildCacheDocument({ record, spaceId: 'default', now: NOW });
  const stepRow = write({ skip_reason: 'none' });

  const requestFor = (handlers: { records?: () => Promise<unknown> }) =>
    jest.fn(async (_method: string, url: string, body?: object) => {
      if (url === '/.workflows-step-executions/_search') {
        return { hits: { hits: [{ _source: stepRow }] } };
      }
      if (url.endsWith('/_search') && handlers.records) return handlers.records();
      return { hits: { hits: [{ _source: source }, { _source: { type: 'other' } }] } };
    }) as unknown as Parameters<typeof readCacheData>[0];

  it('reads the cache steps of the window and the records, and drops documents that are not records', async () => {
    const request = requestFor({});

    const { steps, records } = await readCacheData(request, { from: 'a', to: 'b' });

    expect(steps).toEqual([stepRow]);
    expect(records).toEqual([record]);
    const [, , body] = (request as unknown as jest.Mock).mock.calls[0];
    expect(body.query.bool.filter[0]).toEqual({
      terms: { stepType: [WRITE_STEP_TYPE, MATCH_STEP_TYPE] },
    });
  });

  it('reads a missing decisions index as no records', async () => {
    const request = requestFor({
      records: async () => {
        throw new Error(
          'POST /.ai-index-idx-security-triage-decisions/_search failed with 404: nope'
        );
      },
    });

    const { records } = await readCacheData(request, { from: 'a', to: 'b' });

    expect(records).toEqual([]);
  });

  it('does not hide any other failure', async () => {
    const request = requestFor({
      records: async () => {
        throw new Error('POST /x/_search failed with 500: boom');
      },
    });

    await expect(readCacheData(request, { from: 'a', to: 'b' })).rejects.toThrow('500');
  });
});
