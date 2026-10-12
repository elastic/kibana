/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { findPredicates } from './relation_predicates';
import { checkRelations, findUnbackedRelations } from './relations';

/**
 * Fixture backing: 1-4 same_attack (L-1, F-1 with Lateral Movement, F-1 also names ENT-3);
 * 1-3 accesses_rarely (L-2); 1-2 co_alert (L-3, F-2); 5-6 owns (L-4) and co_alert (F-4);
 * ENT-7 is not connected to anything.
 */
const index = buildEvidenceIndex(FIXTURE_EVIDENCE);

const summary = (text: string): string[] =>
  findUnbackedRelations({ text, index }).map(
    ({ from, to, strength }) => `${from}>${to}:${strength}`
  );

describe('findPredicates', () => {
  const texts = (sentence: string): string[] => findPredicates(sentence).map(({ text }) => text);

  it('finds relational verb phrases and nothing in plain enumerations', () => {
    expect(texts('A, B and C were noisy.')).toEqual([]);
    expect(texts('a administers b and manages c')).toEqual(['administers', 'manages']);
    expect(texts('a logged on to b, signed in to c, accessed d')).toEqual([
      'logged on to',
      'signed in to',
      'accessed',
    ]);
  });

  it('prefers the longest match', () => {
    expect(texts('a linked via an Attack Discovery to b')).toEqual([
      'linked via an Attack Discovery',
    ]);
    expect(texts('a is part of the same discovered attack as b')).toEqual([
      'part of the same discovered attack',
    ]);
  });

  it('only reads lateral movement with a direction as a predicate', () => {
    expect(texts('a moved laterally to b')).toEqual(['moved laterally']);
    expect(texts('lateral movement from a to b')).toEqual(['lateral movement from']);
    expect(texts('a credential-theft and lateral-movement scenario')).toEqual([]);
  });
});

describe('findUnbackedRelations', () => {
  it.each([
    ['an enumeration', 'Scope: ENT-1, ENT-2, ENT-3 and ENT-4.'],
    ['co-mention without a relational verb', 'ENT-1 and ENT-5 were both noisy.'],
    ['one entity only', 'ENT-1 moved laterally and compromised everything.'],
    ['an imperative', 'Compare ENT-1 with ENT-5 and review ENT-7.'],
  ])('%s is not a relation', (_name, text) => {
    expect(summary(text)).toEqual([]);
  });

  it('checks the subject against every object', () => {
    expect(summary('ENT-1 owns ENT-2, ENT-3 and ENT-4.')).toEqual([
      'ENT-1>ENT-2:weak',
      'ENT-1>ENT-3:weak',
      'ENT-1>ENT-4:weak',
    ]);
  });

  it('checks every member of a coordinated subject', () => {
    expect(summary('ENT-1 and ENT-5 appeared together in alerts with ENT-2.')).toEqual([
      'ENT-5>ENT-2:weak',
    ]);
    expect(summary('ENT-1, ENT-2 and ENT-5 appeared together in alerts.')).toEqual([
      'ENT-1>ENT-5:weak',
      'ENT-2>ENT-5:weak',
    ]);
  });

  it('reads a ", and" that starts a new clause as the end of the list', () => {
    expect(summary('ENT-1 owns ENT-2, and ENT-5 owns ENT-6.')).toEqual(['ENT-1>ENT-2:weak']);
  });

  it.each([
    ['same attack via a link', 'ENT-1 is part of the same discovered attack as ENT-4.', []],
    [
      'same attack via a shared discovery',
      'ENT-3 and ENT-4 were in the same attack discovery.',
      [],
    ],
    [
      'same attack, wrong pair',
      'ENT-1 is part of the same discovered attack as ENT-2.',
      ['ENT-1>ENT-2:weak'],
    ],
    ['co_alert', 'ENT-1 and ENT-2 appeared together in alerts.', []],
    ['co_alert from a shared alert fact', 'ENT-5 appeared together in alerts with ENT-6.', []],
    ['common neighbour', 'ENT-2 and ENT-3 appeared together in alerts.', []],
    ['owns', 'ENT-5 owns ENT-6.', []],
    ['owned by (direction is not parsed)', 'ENT-6 is owned by ENT-5.', []],
    ['administers without a link', 'ENT-5 administers ENT-6.', ['ENT-5>ENT-6:weak']],
    ['logon with an access link', 'ENT-1 logged on to ENT-3.', []],
    ['logon without an access link', 'ENT-1 logged on to ENT-6.', ['ENT-1>ENT-6:weak']],
    ['(rarely) matches a rare link', 'ENT-1 logged on to (rarely) ENT-3.', []],
    [
      'regularly does not match a rare link',
      'ENT-1 regularly logs on to ENT-3.',
      ['ENT-1>ENT-3:weak'],
    ],
  ])('%s', (_name, text, expected) => {
    expect(summary(text)).toEqual(expected);
  });

  describe('strong claims', () => {
    it.each([
      [
        'lateral movement backed by a discovery with that tactic',
        'ENT-1 moved laterally to ENT-4.',
        [],
      ],
      [
        'lateral movement without that tactic',
        'ENT-1 moved laterally to ENT-2.',
        ['ENT-1>ENT-2:strong'],
      ],
      ['lateral movement from/to', 'Lateral movement from ENT-1 to ENT-2.', ['ENT-1>ENT-2:strong']],
      ['compromise backed by the same attack', 'ENT-1 compromised ENT-4.', []],
      ['compromise without an attack', 'ENT-5 compromised ENT-6.', ['ENT-5>ENT-6:strong']],
      [
        'exfiltration with no link at all',
        'ENT-7 exfiltrated data to ENT-1.',
        ['ENT-7>ENT-1:strong'],
      ],
    ])('%s', (_name, text, expected) => {
      expect(summary(text)).toEqual(expected);
    });
  });
});

describe('checkRelations', () => {
  const run = (brief = buildValidBrief()) => checkRelations(brief, { index, dropped: new Set() });

  it('passes the valid brief', () => {
    const outcome = run();
    expect(outcome.drops).toEqual([]);
    expect(outcome.flags).toEqual([]);
  });

  it('flags a weak unbacked relation and keeps the claim', () => {
    const brief = buildValidBrief();
    brief.threats[1].whyItMatters = 'ENT-5 administers ENT-6.';
    const outcome = run(brief);
    expect(outcome.drops).toEqual([]);
    expect(outcome.flags).toEqual([
      expect.objectContaining({ path: 'threats[1].whyItMatters', check: 'relation' }),
    ]);
  });

  it('drops a claim with a strong unbacked relation', () => {
    const brief = buildValidBrief();
    brief.threats[1].narrative = 'ENT-5 compromised ENT-6.';
    expect(run(brief).drops).toEqual([
      expect.objectContaining({ path: 'threats[1]', check: 'relation' }),
    ]);
  });

  it('makes a strong unbacked relation in the verdict structural', () => {
    const brief = buildValidBrief();
    brief.verdict.summary = 'ENT-1 moved laterally to ENT-2.';
    expect(run(brief).structuralErrors).toEqual([expect.stringMatching(/^verdict: /)]);
  });
});
