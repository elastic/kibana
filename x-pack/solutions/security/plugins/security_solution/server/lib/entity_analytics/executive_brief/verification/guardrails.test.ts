/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { checkGuardrails, unaddressedSevereDiscoveries } from './guardrails';

const run = (
  brief = buildValidBrief(),
  evidence: Evidence = FIXTURE_EVIDENCE,
  dropped: string[] = []
) => checkGuardrails(brief, { index: buildEvidenceIndex(evidence), dropped: new Set(dropped) });

const withCase: Evidence = {
  ...FIXTURE_EVIDENCE,
  facts: [
    ...FIXTURE_EVIDENCE.facts,
    {
      id: 'F-7',
      kind: 'case',
      signalId: 'response_status',
      title: 'Investigate stolen credentials',
      entities: ['ENT-4'],
      details: { status: 'in-progress' },
    },
  ],
};

describe('unaddressedSevereDiscoveries', () => {
  it('finds critical or high discoveries nobody handles', () => {
    expect(
      unaddressedSevereDiscoveries(buildEvidenceIndex(FIXTURE_EVIDENCE)).map(({ id }) => id)
    ).toEqual(['F-1']);
  });

  it('treats a discovery as handled when a case covers one of its entities or it is acknowledged', () => {
    expect(unaddressedSevereDiscoveries(buildEvidenceIndex(withCase))).toEqual([]);
    const acknowledged: Evidence = {
      ...FIXTURE_EVIDENCE,
      facts: FIXTURE_EVIDENCE.facts.map((fact) =>
        fact.id === 'F-1' ? { ...fact, details: { ...fact.details, status: 'acknowledged' } } : fact
      ),
    };
    expect(unaddressedSevereDiscoveries(buildEvidenceIndex(acknowledged))).toEqual([]);
  });
});

describe('checkGuardrails', () => {
  it('passes the valid brief', () => {
    const outcome = run();
    expect(outcome.structuralErrors).toEqual([]);
    expect(outcome.drops).toEqual([]);
  });

  it('rejects a clear verdict while an unaddressed critical discovery exists', () => {
    const brief = buildValidBrief();
    brief.verdict.level = 'clear';
    brief.areas = [];
    expect(run(brief).structuralErrors).toEqual([
      expect.stringContaining(
        'cannot be "clear" while unaddressed critical or high attack discoveries exist (F-1)'
      ),
    ]);
    expect(run(brief, withCase).structuralErrors).toEqual([]);
  });

  it('rejects a verdict calmer than its most severe area', () => {
    const brief = buildValidBrief();
    brief.verdict.level = 'action';
    expect(run(brief).structuralErrors).toEqual([
      expect.stringContaining('lower than the most severe area ("urgent")'),
    ]);
    // A dropped area does not count.
    expect(run(brief, FIXTURE_EVIDENCE, ['areas[0]']).structuralErrors).toEqual([]);
  });

  it('rejects an urgent verdict or threats area without a surviving threat', () => {
    const errors = run(buildValidBrief(), FIXTURE_EVIDENCE, [
      'threats[0]',
      'threats[1]',
    ]).structuralErrors;
    expect(errors).toEqual([
      expect.stringContaining('verdict.level: "urgent" needs at least one threat'),
      expect.stringContaining('areas (threats): "urgent" needs at least one threat'),
    ]);
  });

  it('rejects a clear threats area while an unaddressed critical threat is reported', () => {
    const brief = buildValidBrief();
    brief.areas[0].level = 'clear';
    expect(run(brief).structuralErrors).toEqual([
      expect.stringContaining('areas (threats): cannot be "clear"'),
    ]);
  });

  it('drops duplicate areas', () => {
    const brief = buildValidBrief();
    brief.areas.push({ ...brief.areas[1] });
    expect(run(brief).drops).toEqual([
      expect.objectContaining({ path: 'areas[2]', check: 'guardrail' }),
    ]);
  });
});
