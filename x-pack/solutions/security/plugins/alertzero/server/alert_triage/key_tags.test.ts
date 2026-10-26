/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRIAGE_STRICT_KEY_TAG_PREFIX, TRIAGE_WIDE_KEY_TAG_PREFIX } from './constants';
import { planKeyTags } from './key_tags';

const processDoc = (executable: string, overrides: Record<string, unknown> = {}) => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 1,
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
  ...overrides,
});

const cloudDoc = (user: string) => ({
  'kibana.alert.rule.uuid': 'cloud-rule',
  'kibana.alert.rule.revision': 1,
  user: { name: user },
});

const plan = (
  alerts: Array<[string, Record<string, unknown>]>,
  fpCandidateIds: string[] = [],
  spaceId = 'default'
) => planKeyTags({ alerts: alerts.map(([id, doc]) => ({ id, doc })), fpCandidateIds, spaceId });

describe('planKeyTags', () => {
  it('gives alerts of one pattern one tag update with both key tags', () => {
    const { groups } = plan([
      ['a', processDoc('C:\\Tools\\x.exe')],
      ['b', processDoc('C:\\Tools\\x.exe')],
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].alertIds).toEqual(['a', 'b']);
    expect(groups[0].tags).toEqual([
      expect.stringMatching(new RegExp(`^${TRIAGE_STRICT_KEY_TAG_PREFIX}[0-9a-f]{16}$`)),
      expect.stringMatching(new RegExp(`^${TRIAGE_WIDE_KEY_TAG_PREFIX}[0-9a-f]{16}$`)),
    ]);
  });

  it('shares the wide tag but not the strict tag between two programs of one folder', () => {
    const { groups } = plan([
      ['a', processDoc('C:\\Tools\\x.exe')],
      ['b', processDoc('C:\\Tools\\y.exe')],
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].tags[0]).not.toBe(groups[1].tags[0]);
    expect(groups[0].tags[1]).toBe(groups[1].tags[1]);
  });

  it('writes only the wide tag on an alert with no identifying field, which has no strict key', () => {
    const { groups } = plan([['c', cloudDoc('a')]]);

    expect(groups[0].tags).toHaveLength(1);
    expect(groups[0].tags[0].startsWith(TRIAGE_WIDE_KEY_TAG_PREFIX)).toBe(true);
  });

  it('keeps the same key in two spaces apart, so one space never reads the other', () => {
    const one = plan([['a', processDoc('C:\\x.exe')]], [], 'default').groups[0].tags;
    const other = plan([['a', processDoc('C:\\x.exe')]], [], 'team').groups[0].tags;

    expect(one[0]).not.toBe(other[0]);
    expect(one[1]).not.toBe(other[1]);
  });

  it('counts keys, the keys only one alert has, and the false positives on the fallback', () => {
    const { counts } = plan(
      [
        ['a', processDoc('C:\\Tools\\x.exe')],
        ['b', processDoc('C:\\Tools\\x.exe')],
        ['c', processDoc('C:\\Other\\z.exe')],
        ['d', cloudDoc('a')],
        ['e', cloudDoc('b')],
      ],
      ['a', 'c', 'd', 'e']
    );

    expect(counts).toEqual({
      alertsWithStrictKey: 3,
      strictKeys: 2,
      strictKeysSingleAlert: 1,
      wideKeys: 3,
      wideKeysSingleAlert: 1,
      fpCandidatesOnFallback: 2,
    });
  });

  it('reports nothing for an empty batch', () => {
    expect(plan([])).toEqual({
      groups: [],
      counts: {
        alertsWithStrictKey: 0,
        strictKeys: 0,
        strictKeysSingleAlert: 0,
        wideKeys: 0,
        wideKeysSingleAlert: 0,
        fpCandidatesOnFallback: 0,
      },
    });
  });
});
