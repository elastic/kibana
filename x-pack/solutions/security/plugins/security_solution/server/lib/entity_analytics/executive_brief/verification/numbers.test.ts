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

const run = (brief: Brief) =>
  createNumbersCheck('7d')(brief, {
    index: buildEvidenceIndex(FIXTURE_EVIDENCE),
    dropped: new Set(),
  });

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
    ['window length', 'in the last 7 days (24h)', ['7', '24']],
  ])('%s', (_name, text, expected) => {
    expect(findNumbers(text)).toEqual(expected);
  });

  it('does not mistake words that start like months for dates', () => {
    expect(findNumbers('alerts decreased 12 and marked 3')).toEqual(['12', '3']);
  });
});

describe('createNumbersCheck', () => {
  it('passes numbers from cited facts, cited entities and the window', () => {
    const brief = buildValidBrief();
    brief.verdict.summary =
      'ENT-1 (risk score 92.5) is in a discovery with 12 alerts over the last 7 days.';
    brief.verdict.evidence = ['F-1', 'ENT-1'];
    const outcome = run(brief);
    expect(outcome.structuralErrors).toEqual([]);
    expect(outcome.flags).toEqual([]);
  });

  it('accepts numbers of facts behind a cited link', () => {
    const brief = buildValidBrief();
    brief.actions[0].rationale = 'ENT-1 raised 57 alerts with ENT-2.';
    brief.actions[0].evidence = ['L-3'];
    expect(run(brief).drops).toEqual([]);
  });

  it('drops a claim with an invented number', () => {
    const brief = buildValidBrief();
    brief.threats[1].narrative = 'ENT-5 owns ENT-6 and raised 250 alerts.';
    expect(run(brief).drops).toEqual([
      expect.objectContaining({
        path: 'threats[1]',
        check: 'number',
        reason: expect.stringContaining('threats[1].narrative: "250"'),
      }),
    ]);
  });

  it('flags a number that is in the evidence but not in what the claim cites', () => {
    const brief = buildValidBrief();
    brief.actions[1].rationale = 'There were 57 alerts on another account.';
    const outcome = run(brief);
    expect(outcome.drops).toEqual([]);
    expect(outcome.flags).toEqual([
      expect.objectContaining({ path: 'actions[1].rationale', check: 'number' }),
    ]);
  });

  it('makes an invented number in the verdict structural', () => {
    const brief = buildValidBrief();
    brief.verdict.headline = '9,999 alerts need attention';
    expect(run(brief).structuralErrors).toEqual([expect.stringContaining('"9,999"')]);
  });

  it('skips items already dropped by an earlier check', () => {
    const brief = buildValidBrief();
    brief.threats[1].narrative = 'ENT-5 raised 250 alerts.';
    const outcome = createNumbersCheck('7d')(brief, {
      index: buildEvidenceIndex(FIXTURE_EVIDENCE),
      dropped: new Set(['threats[1]']),
    });
    expect(outcome.drops).toEqual([]);
  });
});
