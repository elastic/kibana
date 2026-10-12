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

const run = (brief: Brief, evidence: Evidence = FIXTURE_EVIDENCE) =>
  checkCitations(brief, { index: buildEvidenceIndex(evidence), dropped: new Set() });

describe('checkCitations', () => {
  it('passes a valid brief unchanged', () => {
    const brief = buildValidBrief();
    const outcome = run(brief);
    expect(outcome.drops).toEqual([]);
    expect(outcome.structuralErrors).toEqual([]);
    expect(outcome.brief).toEqual(brief);
  });

  it('removes unknown and misplaced ids from every list', () => {
    const brief = buildValidBrief();
    brief.verdict.evidence = ['F-1', 'F-99', 'F-1'];
    brief.threats[0].entities = ['ENT-1', 'ENT-42', 'F-1', 'ENT-2'];
    brief.threats[0].keyEvents = ['F-1', 'F-3', 'F-5', 'L-1'];
    brief.threats[0].evidence = ['F-1', 'AD-1', 'L-1'];
    brief.actions[0].targets = ['ENT-1', 'F-1', 'ENT-99'];
    const { brief: cleaned, drops, notes } = run(brief);

    expect(cleaned.verdict.evidence).toEqual(['F-1']);
    expect(cleaned.threats[0].entities).toEqual(['ENT-1', 'ENT-2']);
    // F-3 has no time; key events come back in time order.
    expect(cleaned.threats[0].keyEvents).toEqual(['F-5', 'F-1']);
    expect(cleaned.threats[0].evidence).toEqual(['F-1', 'L-1']);
    expect(cleaned.actions[0].targets).toEqual(['ENT-1']);
    expect(drops).toEqual([]);
    expect(notes[0]).toContain('F-99');
  });

  it('drops a claim left without a fact or link', () => {
    const brief = buildValidBrief();
    brief.threats[1].evidence = ['ENT-5', 'F-404'];
    brief.threats[1].keyEvents = [];
    brief.actions[1].evidence = [];
    const { drops } = run(brief);
    expect(drops.map(({ path, check }) => `${path}:${check}`)).toEqual([
      'threats[1]:citation',
      'actions[1]:citation',
    ]);
  });

  it('drops a threat with no known entity', () => {
    const brief = buildValidBrief();
    brief.threats[1].entities = ['ENT-77'];
    expect(run(brief).drops).toEqual([
      expect.objectContaining({
        path: 'threats[1]',
        reason: expect.stringContaining('no known entity'),
      }),
    ]);
  });

  it('drops a claim whose prose names an id that does not exist', () => {
    const brief = buildValidBrief();
    brief.actions[0].rationale = 'ENT-12 is also involved.';
    expect(run(brief).drops).toEqual([
      expect.objectContaining({ path: 'actions[0]', reason: expect.stringContaining('ENT-12') }),
    ]);
  });

  it('treats an uncited verdict as structural', () => {
    const brief = buildValidBrief();
    brief.verdict.evidence = ['ENT-1', 'F-123'];
    const { structuralErrors, drops } = run(brief);
    expect(drops).toEqual([]);
    expect(structuralErrors).toEqual([expect.stringMatching(/^verdict: .*no known fact/)]);
  });

  it('lets a clear claim, or any claim on empty evidence, go without citations', () => {
    const brief = buildValidBrief();
    brief.areas[1] = {
      id: 'response',
      level: 'clear',
      summary: 'Nothing to handle.',
      evidence: [],
    };
    expect(run(brief).drops).toEqual([]);

    const quiet: Brief = {
      verdict: {
        level: 'watch',
        headline: 'Nothing notable',
        summary: 'Quiet week.',
        evidence: [],
      },
      areas: [{ id: 'threats', level: 'watch', summary: 'No threats.', evidence: [] }],
      threats: [],
      actions: [],
    };
    const outcome = run(quiet, EMPTY_EVIDENCE);
    expect(outcome.structuralErrors).toEqual([]);
    expect(outcome.drops).toEqual([]);
  });

  it('removes an action threat reference beyond the threat list', () => {
    const brief = buildValidBrief();
    brief.actions[0].threat = 3;
    expect(run(brief).brief.actions[0]).not.toHaveProperty('threat');
  });
});
