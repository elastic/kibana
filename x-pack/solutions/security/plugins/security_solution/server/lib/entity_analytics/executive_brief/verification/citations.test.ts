/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, CHEN, FIXTURE_EVIDENCE, ROD } from './__fixtures__/evidence';
import { checkCitations } from './citations';
import { buildEvidenceIndex } from './evidence_index';

const run = (brief: Brief, evidence: Evidence = FIXTURE_EVIDENCE, dropped: string[] = []) =>
  checkCitations(brief, { index: buildEvidenceIndex(evidence), dropped: new Set(dropped) });

const edit = (change: (brief: Brief) => void): Brief => {
  const brief = buildValidBrief();
  change(brief);
  return brief;
};

describe('checkCitations', () => {
  it('passes a valid brief unchanged', () => {
    const brief = buildValidBrief();
    const outcome = run(brief);
    expect(outcome).toEqual({ brief, drops: [], structuralErrors: [], lowered: 0, notes: [] });
  });

  it('removes unknown, duplicate and entity ids from evidence lists', () => {
    const brief = edit((b) => {
      b.verdict.evidence = ['F-1', 'F-99', 'F-1', ROD];
      b.areas[0].evidence = ['AD-1', 'L-1'];
    });
    const { brief: cleaned, drops, structuralErrors, notes } = run(brief);
    expect(cleaned.verdict.evidence).toEqual(['F-1']);
    expect(cleaned.areas[0].evidence).toEqual(['L-1']);
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([]);
    expect(notes).toEqual([`removed unknown ids: F-99, ${ROD}, AD-1`]);
  });

  it.each([
    ['one id', 'One attack is open (F-1).', 'One attack is open.'],
    ['a group of ids', 'One attack (F-1, L-1) is open.', 'One attack is open.'],
    [
      'groups ending sentences',
      'One attack (F-1). It is open (F-1 and L-1)',
      'One attack. It is open',
    ],
    ['no group', 'One attack (in production) is open.', 'One attack (in production) is open.'],
  ])('removes citation groups from prose: %s', (_name, summary, expected) => {
    const { brief, notes } = run(edit((b) => (b.areas[0].summary = summary)));
    expect(brief.areas[0].summary).toBe(expected);
    expect(notes).toEqual(
      summary === expected ? [] : ['removed citations from prose: areas[0].summary']
    );
  });

  it.each<[string, (brief: Brief) => void, string]>([
    ['cites only unknown ids', (b) => (b.areas[1].evidence = ['F-404']), 'no known fact'],
    ['cites only entities', (b) => (b.areas[1].evidence = [CHEN]), 'no known fact'],
    ['cites nothing', (b) => (b.areas[1].evidence = []), 'no known fact'],
    [
      'names an id in prose that does not exist',
      (b) => (b.areas[1].summary = 'F-12 is also involved.'),
      'F-12',
    ],
  ])('drops an area that %s', (_name, change, reason) => {
    expect(run(edit(change)).drops).toEqual([
      { path: 'areas[1]', check: 'citation', reason: expect.stringContaining(reason) },
    ]);
  });

  it.each<[string, (brief: Brief) => void, RegExp]>([
    ['cites no fact or link', (b) => (b.verdict.evidence = [ROD, 'F-123']), /no known fact/],
    ['names an invented id', (b) => (b.verdict.summary = 'See F-77.'), /F-77/],
  ])('treats a verdict that %s as structural', (_name, change, reason) => {
    const { structuralErrors, drops } = run(edit(change));
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([expect.stringMatching(/^verdict: /)]);
    expect(structuralErrors[0]).toMatch(reason);
  });

  it.each<[string, Brief, Evidence]>([
    [
      'a clear claim',
      edit((b) => {
        b.areas[1] = {
          id: 'response',
          level: 'clear',
          summary: 'Nothing to handle.',
          evidence: [],
        };
      }),
      FIXTURE_EVIDENCE,
    ],
  ])('lets %s go without citations', (_name, brief, evidence) => {
    const outcome = run(brief, evidence);
    expect(outcome.structuralErrors).toEqual([]);
    expect(outcome.drops).toEqual([]);
  });

  it('skips areas already dropped by an earlier check', () => {
    const brief = edit((b) => (b.areas[1].evidence = []));
    expect(run(brief, FIXTURE_EVIDENCE, ['areas[1]']).drops).toEqual([]);
  });
});
