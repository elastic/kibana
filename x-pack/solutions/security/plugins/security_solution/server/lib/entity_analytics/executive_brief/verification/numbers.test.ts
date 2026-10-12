/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { createNumbersCheck, findNumbers } from './numbers';

const run = (brief: Brief, dropped: string[] = []) =>
  createNumbersCheck('7d')(brief, {
    index: buildEvidenceIndex(FIXTURE_EVIDENCE),
    dropped: new Set(dropped),
  });

/** A brief whose `threats` area says `summary` and cites `evidence`. */
const withArea = (summary: string, evidence: string[]): Brief => {
  const brief = buildValidBrief();
  brief.areas[0] = { ...brief.areas[0], summary, evidence };
  return brief;
};

describe('findNumbers', () => {
  it.each([
    ['plain counts', 'ENT-1 raised 57 alerts across 4 rules', ['57', '4']],
    ['thousands and decimals', '1,204 events and a score of 92.5', ['1,204', '92.5']],
    ['percentages', 'up 18% this week', ['18']],
    ['evidence ids', 'ENT-12 F-3 L-10', []],
    ['ISO timestamps', 'at 2026-10-07T08:31:00.000Z and 2026-10-06', []],
    ['month-name dates', 'on Oct 7, on 12 October 2026 and on October 3rd', []],
    ['clock times and years', 'at 08:31, 9 am and in 2026', []],
    ['ordinals', 'the 1st, 2nd and 23rd logon', []],
    ['UUIDs', 'case 8f14e45f-ceea-467a-9575-0b2f0d8c7a11', []],
    ['identifiers with digits', 'host-01, S3, TA0008, T1078.003 and 10.0.0.1', []],
    ['words that start like months', 'alerts decreased 12 and marked 3', ['12', '3']],
  ])('%s', (_name, text, expected) => {
    expect(findNumbers(text)).toEqual(expected);
  });
});

describe('createNumbersCheck', () => {
  it.each<[string, string, string[]]>([
    ['a cited fact number', 'The attack has 12 alerts.', ['F-1']],
    ['a number of a fact behind a cited link', 'The attack has 12 alerts.', ['L-1']],
    ['a cited entity risk score', 'ENT-1 has a risk score of 92.5.', ['F-3']],
    ['a rounded risk score', 'ENT-1 has a risk score of 93.', ['F-3']],
    ['the risk score of an entity of a cited fact', 'ENT-3 scores 71.', ['F-1']],
    ['the risk score of an entity named in the prose', 'ENT-3 scores 71.', ['F-2']],
    ['an alias count', 'ENT-1 has 2 resolved aliases.', ['F-3']],
    ['a count of the cited entities', 'The attack spans 3 entities.', ['F-1']],
    ['the window length', 'Over the last 7 days, one attack.', ['F-1']],
    ['a date, time and id', 'On Oct 7 at 08:31, F-1 started.', ['F-1']],
  ])('accepts %s', (_name, summary, evidence) => {
    const outcome = run(withArea(summary, evidence));
    expect(outcome.drops).toEqual([]);
    expect(outcome.structuralErrors).toEqual([]);
  });

  it.each<[string, string, string[], string]>([
    ['an invented number', 'The attack has 250 alerts.', ['F-1'], '"250"'],
    ['a sum of fact numbers', 'There are 15 alerts in total.', ['F-1', 'F-2'], '"15"'],
    ['a number from a fact it does not cite', 'ENT-4 has 3 alerts.', ['F-1'], '"3"'],
  ])('drops an area with %s', (_name, summary, evidence, token) => {
    expect(run(withArea(summary, evidence)).drops).toEqual([
      {
        path: 'areas[0]',
        check: 'number',
        reason: expect.stringContaining(`areas[0].summary: ${token}`),
      },
    ]);
  });

  it('makes an unsupported number in the verdict structural', () => {
    const brief = buildValidBrief();
    brief.verdict.headline = '9,999 alerts need attention';
    const outcome = run(brief);
    expect(outcome.drops).toEqual([]);
    expect(outcome.structuralErrors).toEqual([
      expect.stringMatching(/^verdict: .*verdict\.headline: "9,999"/),
    ]);
  });

  it('skips areas already dropped by an earlier check', () => {
    expect(run(withArea('250 alerts.', ['F-1']), ['areas[0]']).drops).toEqual([]);
  });
});
