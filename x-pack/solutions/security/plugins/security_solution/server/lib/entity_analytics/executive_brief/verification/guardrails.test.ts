/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, FIXTURE_EVIDENCE, withFacts } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { checkGuardrails, unaddressedSevereDiscoveries } from './guardrails';

const run = (brief: Brief, evidence: Evidence = FIXTURE_EVIDENCE, dropped: string[] = []) =>
  checkGuardrails(brief, { index: buildEvidenceIndex(evidence), dropped: new Set(dropped) });

const withLevels = (
  verdict: Brief['verdict']['level'],
  areas: Array<Brief['verdict']['level']>
) => {
  const brief = buildValidBrief();
  brief.verdict.level = verdict;
  brief.areas = areas.map((level, i) => ({ ...brief.areas[i], level }));
  return brief;
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
    entities: ['ENT-3'],
    details: { status: 'in-progress' },
  },
]);

const F1_MEDIUM = withFacts((facts) =>
  facts.map((fact) => (fact.id === 'F-1' ? { ...fact, severity: 'medium' } : fact))
);

const ALL_LOW = withFacts((facts) => facts.map((fact) => ({ ...fact, severity: 'low' })));

const F1_UNRATED = withFacts((facts) =>
  facts.map(({ severity, ...fact }) => (fact.id === 'F-1' ? fact : { ...fact, severity }))
);

describe('unaddressedSevereDiscoveries', () => {
  it.each<[string, Evidence, string[]]>([
    ['an open critical discovery (an acknowledged high one is handled)', FIXTURE_EVIDENCE, ['F-1']],
    ['nothing when it is acknowledged', F1_ACKNOWLEDGED, []],
    ['nothing when a case covers one of its entities', F1_WITH_CASE, []],
    ['nothing below high severity', F1_MEDIUM, []],
  ])('finds %s', (_name, evidence, expected) => {
    expect(unaddressedSevereDiscoveries(buildEvidenceIndex(evidence)).map(({ id }) => id)).toEqual(
      expected
    );
  });
});

describe('checkGuardrails', () => {
  it.each<[string, Brief, Evidence, string[]]>([
    ['the valid brief', buildValidBrief(), FIXTURE_EVIDENCE, []],
    [
      'a clear verdict with an unaddressed critical discovery',
      withLevels('clear', []),
      FIXTURE_EVIDENCE,
      ['cannot be "clear" while unaddressed critical or high attack discoveries exist (F-1)'],
    ],
    ['a clear verdict once the discovery is handled', withLevels('clear', []), F1_ACKNOWLEDGED, []],
    [
      'a verdict calmer than an area',
      withLevels('action', ['urgent', 'watch']),
      FIXTURE_EVIDENCE,
      ['"action" is lower than the most severe area ("urgent")'],
    ],
    [
      'both violations',
      withLevels('clear', ['watch']),
      FIXTURE_EVIDENCE,
      ['cannot be "clear"', '"clear" is lower than the most severe area ("watch")'],
    ],
    ['a verdict equal to its worst area', withLevels('watch', ['watch']), F1_MEDIUM, []],
  ])('%s', (_name, brief, evidence, expected) => {
    expect(run(brief, evidence).structuralErrors).toEqual(
      expected.map((text) => expect.stringContaining(text))
    );
  });

  it('ignores areas dropped by an earlier check', () => {
    const brief = withLevels('action', ['urgent', 'action']);
    expect(run(brief, FIXTURE_EVIDENCE, ['areas[0]']).structuralErrors).toEqual([]);
  });

  it('drops duplicate areas', () => {
    const brief = buildValidBrief();
    brief.areas.push({ ...brief.areas[1] });
    expect(run(brief).drops).toEqual([
      { path: 'areas[2]', check: 'guardrail', reason: 'duplicate "response" area' },
    ]);
  });

  describe('level ceiling', () => {
    const citing = (
      verdict: [Brief['verdict']['level'], string[]],
      areas: Array<[Brief['verdict']['level'], string[]]>
    ): Brief => {
      const brief = buildValidBrief();
      brief.verdict = { ...brief.verdict, level: verdict[0], evidence: verdict[1] };
      brief.areas = areas.map(([level, evidence], i) => ({ ...brief.areas[i], level, evidence }));
      return brief;
    };

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
        citing(['urgent', ['F-2']], [['urgent', ['F-2']]]),
        FIXTURE_EVIDENCE,
        { verdict: 'action', areas: ['action'], lowered: 2 },
      ],
      [
        'caps an unrated fact at action',
        citing(['action', ['F-1']], [['urgent', ['F-1']]]),
        F1_UNRATED,
        { verdict: 'action', areas: ['action'], lowered: 1 },
      ],
      [
        'lets the verdict rest on what its areas cite',
        citing(['urgent', ['F-2']], [['urgent', ['L-1']]]),
        FIXTURE_EVIDENCE,
        { verdict: 'urgent', areas: ['urgent'], lowered: 0 },
      ],
    ])('%s', (_name, brief, evidence, expected) => {
      const outcome = run(brief, evidence);
      expect({
        verdict: outcome.brief.verdict.level,
        areas: outcome.brief.areas.map(({ level }) => level),
        lowered: outcome.lowered,
      }).toEqual(expected);
      expect(outcome.structuralErrors).toEqual([]);
    });
  });
});
