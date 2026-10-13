/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttentionLevel,
  Brief,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, DOCKER, FIXTURE_EVIDENCE, withFacts } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { checkGuardrails } from './guardrails';

const run = (brief: Brief, evidence: Evidence = FIXTURE_EVIDENCE) =>
  checkGuardrails(brief, { index: buildEvidenceIndex(evidence), dropped: new Set() });

/** A level, or a level with the evidence it cites. */
type Claim = AttentionLevel | [AttentionLevel, string[]];

const toClaim = (claim: Claim) =>
  typeof claim === 'string' ? { level: claim } : { level: claim[0], evidence: claim[1] };

/** The valid brief with the given levels (and evidence lists, where given). */
const brief = (verdict: Claim, areas: Claim[]): Brief => {
  const valid = buildValidBrief();
  return {
    verdict: { ...valid.verdict, ...toClaim(verdict) },
    areas: areas.map((area, i) => ({ ...valid.areas[i], ...toClaim(area) })),
  };
};

const F1_ACKNOWLEDGED = withFacts((facts) =>
  facts.map((fact) =>
    fact.id === 'F-1' ? { ...fact, details: { ...fact.details, status: 'acknowledged' } } : fact
  )
);

const F1_WITH_CASE = withFacts((facts) => [
  ...facts,
  {
    id: 'F-9',
    kind: 'case',
    signalId: 'cases',
    title: 'Investigate stolen credentials',
    entities: [DOCKER],
    details: { status: 'in-progress' },
  },
]);

const ALL_LOW = withFacts((facts) => facts.map((fact) => ({ ...fact, severity: 'low' })));

const F1_UNRATED = withFacts((facts) =>
  facts.map(({ severity, ...fact }) => (fact.id === 'F-1' ? fact : { ...fact, severity }))
);

describe('checkGuardrails', () => {
  it.each<[string, Brief, Evidence, { verdict: string; areas: string[]; lowered: number }]>([
    [
      'keeps levels the cited facts support',
      buildValidBrief(),
      FIXTURE_EVIDENCE,
      { verdict: 'urgent', areas: ['urgent', 'action'], lowered: 0 },
    ],
    [
      'lowers everything to watch when every fact is low severity',
      buildValidBrief(),
      ALL_LOW,
      { verdict: 'watch', areas: ['watch', 'watch'], lowered: 3 },
    ],
    [
      'lowers urgent to action when the severe discovery is already handled',
      brief(['urgent', ['F-2']], [['urgent', ['F-2']]]),
      FIXTURE_EVIDENCE,
      { verdict: 'action', areas: ['action'], lowered: 2 },
    ],
    [
      'caps an unrated fact at action',
      brief(['action', ['F-1']], [['urgent', ['F-1']]]),
      F1_UNRATED,
      { verdict: 'action', areas: ['action'], lowered: 1 },
    ],
    [
      'lets the verdict rest on what its areas cite',
      brief(['urgent', ['F-2']], [['urgent', ['L-1']]]),
      FIXTURE_EVIDENCE,
      { verdict: 'urgent', areas: ['urgent'], lowered: 0 },
    ],
  ])('level ceiling: %s', (_name, input, evidence, expected) => {
    const outcome = run(input, evidence);
    expect({
      verdict: outcome.brief.verdict.level,
      areas: outcome.brief.areas.map(({ level }) => level),
      lowered: outcome.lowered,
    }).toEqual(expected);
    expect(outcome.structuralErrors).toEqual([]);
  });

  it.each<[string, Brief, Evidence, string[]]>([
    [
      'a clear verdict with an unaddressed severe discovery',
      brief('clear', []),
      FIXTURE_EVIDENCE,
      ['cannot be "clear" while unaddressed critical or high attack discoveries exist (F-1)'],
    ],
    [
      'a verdict below its worst area',
      brief('action', ['urgent', 'watch']),
      FIXTURE_EVIDENCE,
      ['"action" is lower than the most severe area ("urgent")'],
    ],
    ['no error for an acknowledged discovery', brief('clear', []), F1_ACKNOWLEDGED, []],
    ['no error for a discovery covered by a case', brief('clear', []), F1_WITH_CASE, []],
  ])('structural: %s', (_name, input, evidence, expected) => {
    expect(run(input, evidence).structuralErrors).toEqual(
      expected.map((text) => expect.stringContaining(text))
    );
  });

  it('drops duplicate areas', () => {
    const input = buildValidBrief();
    input.areas.push({ ...input.areas[1] });
    expect(run(input).drops).toEqual([
      { path: 'areas[2]', check: 'guardrail', reason: 'duplicate "response" area' },
    ]);
  });
});
