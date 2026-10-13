/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssessmentKey } from '../../../../../common/entity_analytics/executive_brief/brief';
import type {
  AttentionLevel,
  Brief,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { ASSESSMENT_KEYS } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../signals';
import {
  buildValidBrief,
  DOCKER,
  FIXTURE_EVIDENCE,
  runCheck,
  withFacts,
} from './__fixtures__/evidence';
import { checkGuardrails } from './guardrails';

const run = (brief: Brief, evidence: Evidence) => runCheck(checkGuardrails, brief, evidence);

/** A level, or a level with the fact ids it cites. */
type Claim = AttentionLevel | [AttentionLevel, number[]];

const toClaim = (claim: Claim) =>
  typeof claim === 'string' ? { level: claim } : { level: claim[0], factIds: claim[1] };

type Levels = Partial<Record<AssessmentKey, AttentionLevel>>;

/**
 * The valid brief at the given verdict level, with only the given assessments at the given levels
 * (and cited ids, where given).
 */
const brief = (
  verdict: AttentionLevel,
  assessments: Partial<Record<AssessmentKey, Claim>>
): Brief => {
  const valid = buildValidBrief();
  return {
    verdict: { ...valid.verdict, level: verdict },
    assessments: ASSESSMENT_KEYS.reduce<Brief['assessments']>((acc, key) => {
      const claim = assessments[key];
      return claim ? { ...acc, [key]: { ...valid.assessments[key], ...toClaim(claim) } } : acc;
    }, {}),
  };
};

const levelsOf = (assessments: Brief['assessments']): Levels =>
  ASSESSMENT_KEYS.reduce<Levels>((acc, key) => {
    const assessment = assessments[key];
    return assessment ? { ...acc, [key]: assessment.level } : acc;
  }, {});

const F1_ACKNOWLEDGED = withFacts((facts) =>
  facts.map((fact) =>
    fact.id === 1 ? { ...fact, details: { ...fact.details, status: 'acknowledged' } } : fact
  )
);

const F1_WITH_CASE = withFacts((facts) => [
  ...facts,
  {
    id: 9,
    signalId: 'cases',
    title: 'Investigate stolen credentials',
    entityIds: [DOCKER],
    details: { status: 'in-progress' },
    source: { type: 'case', id: 'case-1' },
  },
]);

const ALL_LOW = withFacts((facts) => facts.map((fact) => ({ ...fact, severity: 'low' })));

const F1_UNRATED = withFacts((facts) =>
  facts.map(({ severity, ...fact }) => (fact.id === 1 ? fact : { ...fact, severity }))
);

describe('checkGuardrails', () => {
  it.each<
    [string, Brief, Evidence, { verdict: AttentionLevel; assessments: Levels; lowered: number }]
  >([
    [
      'keeps levels the cited facts support',
      buildValidBrief(),
      FIXTURE_EVIDENCE,
      { verdict: 'urgent', assessments: { threats: 'urgent', response: 'action' }, lowered: 0 },
    ],
    [
      'lowers everything to watch when every fact is low severity',
      buildValidBrief(),
      ALL_LOW,
      { verdict: 'watch', assessments: { threats: 'watch', response: 'watch' }, lowered: 3 },
    ],
    [
      'lowers urgent to action when the severe discovery is already handled',
      brief('urgent', { threats: ['urgent', [2]] }),
      FIXTURE_EVIDENCE,
      { verdict: 'action', assessments: { threats: 'action' }, lowered: 2 },
    ],
    [
      'caps an unrated fact at action',
      brief('action', { threats: ['urgent', [1]] }),
      F1_UNRATED,
      { verdict: 'action', assessments: { threats: 'action' }, lowered: 1 },
    ],
    [
      'lowers a verdict without assessments to clear',
      brief('watch', {}),
      F1_ACKNOWLEDGED,
      { verdict: 'clear', assessments: {}, lowered: 1 },
    ],
  ])('level ceiling: %s', (_name, input, evidence, expected) => {
    const outcome = run(input, evidence);
    expect({
      verdict: outcome.brief.verdict.level,
      assessments: levelsOf(outcome.brief.assessments),
      lowered: outcome.lowered,
    }).toEqual(expected);
    expect(outcome.structuralErrors).toEqual([]);
  });

  it.each<[string, Brief, Evidence, string[]]>([
    [
      'a clear verdict with an unaddressed severe discovery',
      brief('clear', {}),
      FIXTURE_EVIDENCE,
      [
        'cannot be "clear" while unaddressed critical or high attack discoveries exist (fact ids 1)',
      ],
    ],
    [
      'a verdict below its worst assessment',
      brief('action', { threats: 'urgent', response: 'watch' }),
      FIXTURE_EVIDENCE,
      ['"action" is lower than the most severe assessment ("urgent")'],
    ],
    ['no error for an acknowledged discovery', brief('clear', {}), F1_ACKNOWLEDGED, []],
    ['no error for a discovery covered by a case', brief('clear', {}), F1_WITH_CASE, []],
  ])('structural: %s', (_name, input, evidence, expected) => {
    expect(run(input, evidence).structuralErrors).toEqual(
      expected.map((text) => expect.stringContaining(text))
    );
  });
});
