/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { verifyBrief } from './verify_brief';

describe('verifyBrief', () => {
  it('keeps a valid brief intact', () => {
    const brief = buildValidBrief();
    const result = verifyBrief(brief, FIXTURE_EVIDENCE, { range: '7d' });
    expect(result).toEqual({ brief, summary: { dropped: {} }, structuralErrors: [], notes: [] });
  });

  it('drops failing areas, counts drops per check and keeps the rest', () => {
    const brief = buildValidBrief();
    brief.areas[0].evidence = ['F-77'];
    brief.areas[1].summary = 'There were 400 alerts.';
    brief.areas.push({ ...buildValidBrief().areas[0] });

    const result = verifyBrief(brief, FIXTURE_EVIDENCE, { range: '7d' });

    expect(result.structuralErrors).toEqual([]);
    expect(result.brief.areas).toEqual([buildValidBrief().areas[0]]);
    expect(result.summary.dropped).toEqual({ citation: 1, number: 1 });
    expect(result.notes).toEqual(
      expect.arrayContaining([
        'removed unknown ids: F-77',
        expect.stringMatching(/^dropped areas\[0\] \(citation\)/),
        expect.stringMatching(/^dropped areas\[1\] \(number\)/),
      ])
    );
  });

  it('reports verdict problems as structural without removing the verdict', () => {
    const brief = buildValidBrief();
    brief.verdict.evidence = ['F-500'];
    brief.verdict.level = 'clear';
    brief.areas = [];
    const result = verifyBrief(brief, FIXTURE_EVIDENCE);
    // A clear verdict needs no citation, but its numbers and the guardrail are still checked.
    expect(result.structuralErrors).toEqual([
      expect.stringMatching(/^verdict: numbers not found .*"12"/),
      expect.stringContaining('cannot be "clear"'),
    ]);
    expect(result.brief.verdict).toEqual({ ...brief.verdict, evidence: [] });
  });
});
