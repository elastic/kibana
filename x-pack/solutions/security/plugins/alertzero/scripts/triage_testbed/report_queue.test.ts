/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildQueueSection, processStateOf } from './report_queue';
import type { TaggedAlert, Truth } from './report_run';

const alert = (id: string, tags: string[], buildingBlock = false): TaggedAlert => ({
  id,
  timestamp: '2026-11-20T10:00:00.000Z',
  tags,
  buildingBlock,
});

const truth = (
  entries: Record<string, [string, 'true_positive' | 'false_positive', string?]>
): Truth =>
  new Map(
    Object.entries(entries).map(([id, [kind, verdict, variant]]) => [
      id,
      { kind, verdict, variant: variant ?? null },
    ])
  );

describe('processStateOf', () => {
  it('reads an active key from the cache tags, because the shadow tag can be older than the active record', () => {
    expect(processStateOf(['az:would_reuse:r', 'az:guard_hit:novelty:hash'])).toBe(
      'active_guard_hit'
    );
    expect(processStateOf(['az:would_reuse:r', 'az:cache_audit:r'])).toBe('active_audit');
    expect(processStateOf(['az:jev_shadow_state:expired'])).toBe('expired');
    expect(processStateOf([])).toBe('not_seen');
  });
});

describe('buildQueueSection', () => {
  it('counts the gate share only for process alerts the model analyzed without an active key', () => {
    const section = buildQueueSection({
      alerts: [
        alert('m-proc-new', [
          'az:false_positive',
          'az:jev_shadow_state:no_record',
          'az:jev_shadow_lane:benign',
        ]),
        alert('m-proc-pend', [
          'az:false_positive',
          'az:jev_shadow_state:pending',
          'az:jev_shadow_lane:middle',
        ]),
        alert('m-proc-hit', ['az:true_positive', 'az:would_reuse:r', 'az:guard_hit:novelty:hash']),
        alert('m-file', ['az:false_positive']),
        alert('jev-file', ['az:false_positive', 'az:jev_verdict']),
        alert('open-proc', ['az:jev_shadow_state:expired', 'az:jev_shadow_lane:benign']),
        alert('bb', ['az:false_positive'], true),
      ],
      truth: truth({
        'm-proc-new': ['process', 'false_positive'],
        'm-proc-pend': ['process', 'false_positive'],
        'm-proc-hit': ['process', 'true_positive', 'new_hash'],
        'm-file': ['file', 'false_positive'],
        'jev-file': ['file', 'false_positive'],
        'open-proc': ['process', 'false_positive'],
        bb: ['process', 'false_positive'],
      }),
    });

    expect(section.modelQueue).toEqual({
      total: 4,
      byKind: { process: 3, file: 1 },
      processByState: { no_record: 1, pending: 1, active_guard_hit: 1 },
    });
    expect(section.noVerdict).toEqual({
      total: 1,
      byKind: { process: 1 },
      processByState: { expired: 1 },
    });
    expect(section.gate).toEqual({ processWithoutActiveShare: 0.5, jevProcessShare: 0.25 });
  });

  it('judges only what step 5 would score: a guard hit or a new key never counts, and a missed variant shows by name', () => {
    const section = buildQueueSection({
      alerts: [
        alert('a', ['az:jev_shadow_state:pending', 'az:jev_shadow_lane:benign']),
        alert('b', ['az:jev_shadow_state:expired', 'az:jev_shadow_lane:benign']),
        alert('c', [
          'az:jev_shadow_state:pending',
          'az:jev_shadow_lane:benign',
          'az:jev_shadow_guard_hit',
        ]),
        alert('d', ['az:jev_shadow_state:no_record', 'az:jev_shadow_lane:benign']),
        alert('e', ['az:jev_shadow_state:pending', 'az:jev_shadow_lane:attack']),
      ],
      truth: truth({
        a: ['process', 'false_positive'],
        b: ['process', 'true_positive', 'new_hash'],
        c: ['process', 'true_positive', 'new_hash'],
        d: ['process', 'true_positive'],
        e: ['process', 'true_positive'],
      }),
    });

    expect(section.shadow.scored).toBe(5);
    expect(section.shadow.guardHits).toBe(1);
    expect(section.shadow.jevProcess).toMatchObject({
      alerts: 3,
      benignShare: 0.6667,
      benignAttackShare: 0.5,
      benignVariants: { new_hash: 1 },
    });
    expect(section.shadow.byState.no_record.benign.truePositive).toBe(1);
  });

  it('judges a shadow lane by the state the shadow saw, even when the key turned active before the model ran', () => {
    const section = buildQueueSection({
      alerts: [
        alert('x', [
          'az:jev_shadow_state:pending',
          'az:jev_shadow_lane:benign',
          'az:would_reuse:r',
          'az:cache_audit:r',
        ]),
      ],
      truth: truth({ x: ['process', 'false_positive'] }),
    });

    expect(section.noVerdict.processByState).toEqual({ active_audit: 1 });
    expect(Object.keys(section.shadow.byState)).toEqual(['pending']);
    expect(section.shadow.jevProcess.alerts).toBe(1);
  });
});
