/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';
import { assessMembers, memberOutcomeOfSignal } from './event_members';

const detection = (
  rule: string,
  verdict: SignalEntry['verdict'],
  extra: Partial<SignalEntry> = {}
): SignalEntry =>
  ({
    type: 'detection',
    stream_name: 'logs',
    description: `${rule} ${verdict}`,
    verdict,
    metadata: { rule_uuid: rule, rule_name: rule },
    ...extra,
  } as SignalEntry);

describe('memberOutcomeOfSignal', () => {
  it.each<[string, SignalEntry, ReturnType<typeof memberOutcomeOfSignal>]>([
    ['confirms is a breach', detection('a', 'confirms'), 'breaching'],
    ['refutes is healthy', detection('a', 'refutes'), 'clean'],
    ['inconclusive cannot be judged', detection('a', 'inconclusive'), 'no_data'],
    ['not_checked cannot be judged', detection('a', 'not_checked'), 'no_data'],
    [
      'an off-topic observed error is a breach',
      detection('a', 'off_topic', { effect: 'degradation' } as Partial<SignalEntry>),
      'breaching',
    ],
    ['a benign off-topic row cannot be judged', detection('a', 'off_topic'), 'no_data'],
    [
      'a non-detection signal is not a member',
      { type: 'note', description: 'x', verdict: 'confirms' } as unknown as SignalEntry,
      undefined,
    ],
  ])('%s', (_label, signal, expected) => {
    expect(memberOutcomeOfSignal(signal)).toBe(expected);
  });
});

describe('assessMembers', () => {
  it('is breaching while any member breaches', () => {
    expect(assessMembers([detection('a', 'refutes'), detection('b', 'confirms')])).toBe(
      'breaching'
    );
  });

  it('is clean only when every member is healthy', () => {
    expect(assessMembers([detection('a', 'refutes'), detection('b', 'refutes')])).toBe('clean');
  });

  it('holds when a member cannot be judged and none breaches', () => {
    expect(assessMembers([detection('a', 'refutes'), detection('b', 'inconclusive')])).toBe(
      'no_data'
    );
  });

  it('cannot assess an event with no members', () => {
    expect(assessMembers([])).toBe('no_data');
    expect(assessMembers(undefined)).toBe('no_data');
  });
});
