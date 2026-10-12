/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, EMPTY_EVIDENCE, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
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
    expect(outcome).toEqual({ brief, drops: [], structuralErrors: [], notes: [] });
  });

  it('removes unknown and duplicate ids from evidence lists', () => {
    const brief = edit((b) => {
      b.verdict.evidence = ['F-1', 'F-99', 'F-1', 'ENT-1'];
      b.areas[0].evidence = ['AD-1', 'L-1'];
    });
    const { brief: cleaned, drops, structuralErrors, notes } = run(brief);
    expect(cleaned.verdict.evidence).toEqual(['F-1', 'ENT-1']);
    expect(cleaned.areas[0].evidence).toEqual(['L-1']);
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([]);
    expect(notes).toEqual(['removed unknown ids: F-99, AD-1']);
  });

  it.each<[string, (brief: Brief) => void, string]>([
    ['cites only unknown ids', (b) => (b.areas[1].evidence = ['F-404']), 'no known fact'],
    ['cites only entities', (b) => (b.areas[1].evidence = ['ENT-4']), 'no known fact'],
    ['cites nothing', (b) => (b.areas[1].evidence = []), 'no known fact'],
    [
      'names an id in prose that does not exist',
      (b) => (b.areas[1].summary = 'ENT-12 is also involved.'),
      'ENT-12',
    ],
  ])('drops an area that %s', (_name, change, reason) => {
    expect(run(edit(change)).drops).toEqual([
      { path: 'areas[1]', check: 'citation', reason: expect.stringContaining(reason) },
    ]);
  });

  it.each<[string, (brief: Brief) => void, RegExp]>([
    ['cites no fact or link', (b) => (b.verdict.evidence = ['ENT-1', 'F-123']), /no known fact/],
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
    [
      'any claim on empty evidence',
      {
        verdict: { level: 'watch', headline: 'Quiet', summary: 'Quiet week.', evidence: [] },
        areas: [{ id: 'threats', level: 'watch', summary: 'No threats.', evidence: [] }],
      },
      EMPTY_EVIDENCE,
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
