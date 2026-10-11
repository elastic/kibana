/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type { EvidenceId } from '../../../../../common/entity_analytics/executive_brief/types';
import { buildEntityIndex } from './entity_mentions';
import { findPredicates } from './relation_predicates';
import { findUnbackedRelations } from './relations';

/**
 * Fixture storylines (names): S1 a.rodriguez / LAPTOP-FIN03 / jump-box-01 / docker-host-prod-01,
 * S2 j.chen / LAPTOP-MKT07, S3 svc-build / build-runner-02 / fileserver-03.
 *
 * Edges that matter here:
 * - a.rodriguez: same_ad docker-host-prod-01; co_alert LAPTOP-FIN03, jump-box-01 (RULE-2, TA0008),
 *   docker-host-prod-01; accesses_frequently LAPTOP-FIN03; accesses_infrequently jump-box-01 and
 *   docker-host-prod-01.
 * - j.chen: same_ad and owns LAPTOP-MKT07.
 * - svc-build co_alert build-runner-02 (RULE-9, TA0010); build-runner-02 communicates_with
 *   fileserver-03.
 */

const index = buildEntityIndex(FIXTURE_SNAPSHOT);
const allEdges = FIXTURE_SNAPSHOT.storylines.storylines.flatMap(({ edges }) => edges);
const edgesOf = (storyId: string) =>
  FIXTURE_SNAPSHOT.storylines.storylines.find(({ evidenceId }) => evidenceId === storyId)?.edges ??
  [];

const findings = (text: string, { story, cited = [] }: { story?: string; cited?: string[] } = {}) =>
  findUnbackedRelations({
    text,
    edges: story ? edgesOf(story) : allEdges,
    index,
    catalog: FIXTURE_SNAPSHOT.catalog,
    citedEvidence: cited as EvidenceId[],
  });

/** "from>to:strength" for every finding. */
const summary = (text: string, options?: { story?: string; cited?: string[] }): string[] =>
  findings(text, options).map(({ from, to, strength }) => `${from}>${to}:${strength}`);

describe('findPredicates', () => {
  const texts = (sentence: string): string[] => findPredicates(sentence).map(({ text }) => text);

  it('finds the relational verb phrases and nothing in plain enumerations', () => {
    expect(texts('A, B and C were noisy.')).toEqual([]);
    expect(texts('a owns b')).toEqual(['owns']);
    expect(texts('a administers b and manages c')).toEqual(['administers', 'manages']);
    expect(texts('a appeared together in alerts with b')).toEqual(['appeared together in alerts']);
    expect(texts('a logged on to b, signed in to c, accessed d')).toEqual([
      'logged on to',
      'signed in to',
      'accessed',
    ]);
  });

  it('prefers the longest match, so "linked via an Attack Discovery" is not the generic "linked"', () => {
    expect(texts('a linked via an Attack Discovery to b')).toEqual([
      'linked via an Attack Discovery',
    ]);
    expect(texts('a linked to b')).toEqual(['linked to']);
    expect(texts('a is part of the same discovered attack as b')).toEqual([
      'part of the same discovered attack',
    ]);
    expect(texts('a and b are related in an active hunting lead')).toEqual([
      'related in an active hunting lead',
    ]);
  });

  it('only reads lateral movement, pivoting and spreading as predicates with a direction', () => {
    expect(texts('a moved laterally to b')).toEqual(['moved laterally']);
    expect(texts('lateral movement from a to b')).toEqual(['lateral movement from']);
    expect(texts('a pivoted from b to c')).toEqual(['pivoted from']);
    expect(texts('a credential-theft and lateral-movement scenario')).toEqual([]);
    expect(texts('a stage of lateral movement')).toEqual([]);
    expect(texts('a pivot table of b')).toEqual([]);
  });

  it('does not match inside other words', () => {
    expect(texts('a downloaded something and reaccessed nothing')).toEqual([]);
    expect(texts('Greenfield logons are blocked')).toEqual([]);
  });
});

describe('findUnbackedRelations', () => {
  describe('which sentences are relations', () => {
    it.each([
      ['an enumeration', 'Scope: a.rodriguez, LAPTOP-FIN03, jump-box-01 and docker-host-prod-01.'],
      ['co-mention with a verb that is not relational', 'a.rodriguez and j.chen were both noisy.'],
      ['one entity only', 'a.rodriguez moved laterally and compromised everything.'],
      ['no entity', 'Something owns something else.'],
      ['a noun phrase', 'a.rodriguez and j.chen: credential theft and lateral movement.'],
      ['an agent-style imperative', 'Compare a.rodriguez with j.chen and review svc-build.'],
    ])('%s is not a relation', (_name, text) => {
      expect(summary(text)).toEqual([]);
    });

    it('does not check two entities of an enumeration against each other', () => {
      // LAPTOP-FIN03 and jump-box-01 have no direct edge; both only hang off a.rodriguez.
      expect(
        summary(
          'a.rodriguez appeared together in alerts with LAPTOP-FIN03, jump-box-01 and docker-host-prod-01.',
          {
            story: 'STORY-1',
          }
        )
      ).toEqual([]);
    });

    it('checks the subject of a predicate against every object', () => {
      expect(
        summary('a.rodriguez owns LAPTOP-FIN03, jump-box-01 and docker-host-prod-01.', {
          story: 'STORY-1',
        })
      ).toEqual([
        'a.rodriguez>LAPTOP-FIN03:weak',
        'a.rodriguez>jump-box-01:weak',
        'a.rodriguez>docker-host-prod-01:weak',
      ]);
    });

    it('checks every member of a coordinated subject against the object', () => {
      expect(
        summary('a.rodriguez and j.chen appeared together in alerts with jump-box-01.')
      ).toEqual(['j.chen>jump-box-01:weak']);
    });

    it('relates the members of a subject group with each other for symmetric predicates', () => {
      expect(summary('a.rodriguez, LAPTOP-FIN03 and j.chen appeared together in alerts.')).toEqual([
        'a.rodriguez>j.chen:weak',
        'LAPTOP-FIN03>j.chen:weak',
      ]);
    });

    it('reads a ", and" that starts a new clause as the end of the list', () => {
      // j.chen is the subject of the second clause, not part of the first one's object list.
      expect(summary('a.rodriguez owns LAPTOP-FIN03, and j.chen owns LAPTOP-MKT07.')).toEqual([
        'a.rodriguez>LAPTOP-FIN03:weak',
      ]);
    });

    it('keeps an Oxford-comma list together when no predicate follows it', () => {
      expect(
        summary('a.rodriguez owns LAPTOP-FIN03, jump-box-01, and docker-host-prod-01.')
      ).toEqual([
        'a.rodriguez>LAPTOP-FIN03:weak',
        'a.rodriguez>jump-box-01:weak',
        'a.rodriguez>docker-host-prod-01:weak',
      ]);
    });

    it('lets the subject continue after "and" when only the predicate is repeated', () => {
      expect(
        summary(
          'a.rodriguez is part of the same discovered attack as docker-host-prod-01 and appeared together with LAPTOP-FIN03 in alerts.',
          { story: 'STORY-1' }
        )
      ).toEqual([]);
      // The second predicate belongs to a.rodriguez, not docker-host-prod-01.
      expect(
        summary(
          'a.rodriguez is part of the same discovered attack as docker-host-prod-01 and owns jump-box-01.'
        )
      ).toEqual(['a.rodriguez>jump-box-01:weak']);
    });

    it('does not carry a subject across a semicolon', () => {
      expect(
        summary('a.rodriguez owns LAPTOP-MKT07; the cause is unknown owns jump-box-01.')
      ).toEqual(['a.rodriguez>LAPTOP-MKT07:weak']);
    });

    it('does not carry a subject across a sentence boundary', () => {
      expect(summary('a.rodriguez is noisy. Owns j.chen.')).toEqual([]);
    });

    it('only links an object within a few words of the predicate', () => {
      expect(
        summary('a.rodriguez owns a large number of the assets that were seen near j.chen.')
      ).toEqual([]);
      expect(summary('a.rodriguez owns the account j.chen.')).toEqual(['a.rodriguez>j.chen:weak']);
    });
  });

  describe('typed predicates are backed by an edge of that type', () => {
    it.each([
      [
        'same_ad: part of the same discovered attack',
        'a.rodriguez is part of the same discovered attack as docker-host-prod-01.',
        [],
      ],
      [
        'same_ad: wrong pair',
        'a.rodriguez is part of the same discovered attack as jump-box-01.',
        ['a.rodriguez>jump-box-01:weak'],
      ],
      [
        'same_ad: linked via an Attack Discovery',
        'a.rodriguez is linked via an Attack Discovery to docker-host-prod-01.',
        [],
      ],
      [
        'same_ad: in the same attack discovery',
        'a.rodriguez and docker-host-prod-01 were in the same attack discovery.',
        [],
      ],
      [
        'same_ad: common neighbour with a same_ad spoke',
        'jump-box-01 and docker-host-prod-01 are part of the same discovered attack.',
        [],
      ],
      [
        'same_ad: common neighbour without a same_ad spoke',
        'LAPTOP-FIN03 and jump-box-01 are part of the same discovered attack.',
        ['LAPTOP-FIN03>jump-box-01:weak'],
      ],
      ['co_alert', 'a.rodriguez and LAPTOP-FIN03 appeared together in alerts.', []],
      ['co_alert: co-occurred', 'a.rodriguez co-occurred with LAPTOP-FIN03.', []],
      [
        'co_alert: reversed pair order',
        'jump-box-01 appeared together in alerts with a.rodriguez.',
        [],
      ],
      ['owns: no edge in S1', 'a.rodriguez owns LAPTOP-FIN03.', ['a.rodriguez>LAPTOP-FIN03:weak']],
      ['owns: edge in S2', 'j.chen owns LAPTOP-MKT07.', []],
      ['owned by: direction is not parsed', 'LAPTOP-MKT07 is owned by j.chen.', []],
      ['administers', 'j.chen administers LAPTOP-MKT07.', ['j.chen>LAPTOP-MKT07:weak']],
      ['manages', 'j.chen manages LAPTOP-MKT07.', ['j.chen>LAPTOP-MKT07:weak']],
    ])('%s', (_name, text, expected) => {
      expect(summary(text)).toEqual(expected);
    });
  });

  describe('logon predicates and their rarely/regularly qualifier', () => {
    it.each([
      ['no qualifier: any access edge', 'a.rodriguez logged on to jump-box-01.', []],
      [
        'no qualifier: no access edge',
        'a.rodriguez logged on to LAPTOP-MKT07.',
        ['a.rodriguez>LAPTOP-MKT07:weak'],
      ],
      ['accessed', 'a.rodriguez accessed docker-host-prod-01.', []],
      ['signed in to', 'a.rodriguez signed in to jump-box-01.', []],
      ['(rarely) after the verb, rare edge', 'a.rodriguez logged on to (rarely) jump-box-01.', []],
      [
        '(rarely) after the verb, regular edge only',
        'a.rodriguez logged on to (rarely) LAPTOP-FIN03.',
        ['a.rodriguez>LAPTOP-FIN03:weak'],
      ],
      [
        '"only rarely" after the objects',
        'a.rodriguez logged on to jump-box-01 and docker-host-prod-01 only rarely.',
        [],
      ],
      [
        '"only rarely" after a regular-only object',
        'a.rodriguez logged on to LAPTOP-FIN03 only rarely.',
        ['a.rodriguez>LAPTOP-FIN03:weak'],
      ],
      [
        'regularly before the verb, rare edge only',
        'a.rodriguez regularly logs on to jump-box-01.',
        ['a.rodriguez>jump-box-01:weak'],
      ],
      [
        'regularly before the verb, regular edge',
        'a.rodriguez regularly logs on to LAPTOP-FIN03.',
        [],
      ],
      ['frequently before the verb', 'a.rodriguez frequently accessed LAPTOP-FIN03.', []],
      [
        'communicates_with counts as regular',
        'build-runner-02 regularly logs on to fileserver-03.',
        [],
      ],
      ['occasionally', 'a.rodriguez occasionally logged on to docker-host-prod-01.', []],
    ])('%s', (_name, text, expected) => {
      expect(summary(text)).toEqual(expected);
    });

    it('stacked predicates share a subject and an object and are checked on their own', () => {
      // svc-build has no direct edge to fileserver-03, only via build-runner-02 (communicates_with
      // = regular logon), so "(rarely)" is not backed but "regularly logs on to" is.
      expect(
        summary('svc-build logged on to (rarely) and regularly logs on to fileserver-03.', {
          story: 'STORY-3',
        })
      ).toEqual(['svc-build>fileserver-03:weak']);
    });
  });

  describe('generic predicates', () => {
    it.each([
      ['related: edge', 'a.rodriguez and LAPTOP-FIN03 are related.', []],
      ['related: no edge', 'a.rodriguez and j.chen are related.', ['a.rodriguez>j.chen:weak']],
      ['linked to', 'j.chen is linked to LAPTOP-MKT07.', []],
      ['connected to: no edge', 'svc-build is connected to j.chen.', ['svc-build>j.chen:weak']],
      [
        'associated with',
        'a.rodriguez is associated with LAPTOP-MKT07.',
        ['a.rodriguez>LAPTOP-MKT07:weak'],
      ],
      [
        'related in a hunting lead: no lead edge',
        'a.rodriguez and LAPTOP-FIN03 are related in a hunting lead.',
        ['a.rodriguez>LAPTOP-FIN03:weak'],
      ],
    ])('%s', (_name, text, expected) => {
      expect(summary(text)).toEqual(expected);
    });
  });

  describe('strong predicates', () => {
    it('lateral movement needs a TA0008 rule cited by the claim or on a connecting edge', () => {
      const text = 'a.rodriguez moved laterally to LAPTOP-FIN03.';
      expect(summary(text, { story: 'STORY-1' })).toEqual(['a.rodriguez>LAPTOP-FIN03:strong']);
      expect(summary(text, { story: 'STORY-1', cited: ['RULE-2'] })).toEqual([]);
      expect(summary(text, { story: 'STORY-1', cited: ['RULE-1'] })).toEqual([
        'a.rodriguez>LAPTOP-FIN03:strong',
      ]);
      // RULE-2 (TA0008) sits on the co_alert edge a.rodriguez -> jump-box-01.
      expect(summary('a.rodriguez moved laterally to jump-box-01.', { story: 'STORY-1' })).toEqual(
        []
      );
    });

    it('lateral movement needs some edge between the pair, whatever is cited', () => {
      expect(summary('a.rodriguez moved laterally to j.chen.', { cited: ['RULE-2'] })).toEqual([
        'a.rodriguez>j.chen:strong',
      ]);
    });

    it.each([
      ['pivoted to', 'a.rodriguez pivoted to jump-box-01.'],
      ['pivoted from ... to', 'a.rodriguez pivoted from LAPTOP-FIN03 to jump-box-01.'],
      ['spread to', 'a.rodriguez spread to jump-box-01.'],
      ['lateral movement from ... to', 'lateral movement from a.rodriguez to jump-box-01.'],
    ])('%s is read as a strong predicate', (_name, text) => {
      expect(
        findings(text, { story: 'STORY-1' }).every(({ strength }) => strength === 'strong')
      ).toBe(true);
    });

    it('"pivoted from A to B" checks the pair A-B, not the entities before it', () => {
      // LAPTOP-FIN03 and jump-box-01 share a.rodriguez as common neighbour; RULE-2 backs the spoke.
      expect(
        summary('a.rodriguez pivoted from LAPTOP-FIN03 to jump-box-01.', {
          story: 'STORY-1',
        })
      ).toEqual([]);
      expect(
        summary('j.chen pivoted from LAPTOP-FIN03 to jump-box-01.', {
          story: 'STORY-1',
          cited: ['RULE-2'],
        })
      ).toEqual([]);
    });

    it('"movement between A and B" checks the pair inside the list', () => {
      expect(summary('There was lateral movement between a.rodriguez and j.chen.')).toEqual([
        'a.rodriguez>j.chen:strong',
      ]);
    });

    it('compromise needs an attack discovery edge', () => {
      expect(summary('a.rodriguez compromised docker-host-prod-01.')).toEqual([]);
      expect(summary('a.rodriguez compromised LAPTOP-FIN03.')).toEqual([
        'a.rodriguez>LAPTOP-FIN03:strong',
      ]);
      expect(summary('a.rodriguez hijacked jump-box-01.')).toEqual([
        'a.rodriguez>jump-box-01:strong',
      ]);
      expect(summary('j.chen breached LAPTOP-MKT07.')).toEqual([]);
    });

    it('exfiltration needs a TA0010 rule', () => {
      const text = 'svc-build exfiltrated data to build-runner-02.';
      // The co_alert edge carries RULE-9 (TA0010).
      expect(summary(text, { story: 'STORY-3' })).toEqual([]);
      expect(
        summary('build-runner-02 exfiltrated data to fileserver-03.', { story: 'STORY-3' })
      ).toEqual(['build-runner-02>fileserver-03:strong']);
      expect(
        summary('build-runner-02 exfiltrated data to fileserver-03.', {
          story: 'STORY-3',
          cited: ['RULE-9'],
        })
      ).toEqual([]);
    });

    it('does not read nouns and adjectives as strong predicates without two entities', () => {
      expect(summary('a.rodriguez has compromised credentials that reached production.')).toEqual(
        []
      );
      expect(summary('a.rodriguez and j.chen both saw data exfiltration alerts.')).toEqual([]);
    });
  });

  describe('comparison pairs (cross-storyline)', () => {
    const isComparisonPair = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
      a.has('user:a.rodriguez@acme.com@okta') && b.has('user:j.chen@acme.com@okta');

    const run = (text: string) =>
      findUnbackedRelations({
        text,
        edges: allEdges,
        index,
        catalog: FIXTURE_SNAPSHOT.catalog,
        citedEvidence: [],
        isComparisonPair,
      }).map(({ from, to, strength }) => `${from}>${to}:${strength}`);

    it('skips weak claims between comparison pairs', () => {
      expect(run('a.rodriguez appeared together in alerts with j.chen.')).toEqual([]);
    });

    it('does not skip weak claims between other pairs', () => {
      expect(run('a.rodriguez appeared together in alerts with LAPTOP-MKT07.')).toEqual([
        'a.rodriguez>LAPTOP-MKT07:weak',
      ]);
    });

    it('does not skip strong claims', () => {
      expect(run('a.rodriguez moved laterally to j.chen.')).toEqual(['a.rodriguez>j.chen:strong']);
    });
  });

  describe('matching and reporting', () => {
    it('reports the whole sentence and the display names', () => {
      const text = 'Context first. a.rodriguez owns j.chen. More context.';
      expect(findings(text)).toEqual([
        expect.objectContaining({
          statement: 'a.rodriguez owns j.chen.',
          from: 'a.rodriguez',
          to: 'j.chen',
          reason: expect.stringContaining('"owns" between a.rodriguez and j.chen'),
        }),
      ]);
    });

    it('describes why: no link at all, or which links exist', () => {
      expect(findings('a.rodriguez owns j.chen.')[0].reason).toContain(
        'no computed link between them'
      );
      expect(findings('a.rodriguez owns LAPTOP-FIN03.', { story: 'STORY-1' })[0].reason).toContain(
        'appeared together in alerts'
      );
      expect(
        findings('svc-build moved laterally to build-runner-02.', { story: 'STORY-3' })[0].reason
      ).toContain('no TA0008 rule evidence');
    });

    it('combines two unbacked predicates for the same pair into one finding', () => {
      const found = findings('a.rodriguez owns and administers LAPTOP-FIN03.');
      expect(found).toHaveLength(1);
      expect(found[0].reason).toContain('"owns"');
      expect(found[0].reason).toContain('"administers"');
    });

    it('marks the finding strong when any predicate for the pair is strong', () => {
      const found = findings('a.rodriguez owns and compromised LAPTOP-FIN03.');
      expect(found).toHaveLength(1);
      expect(found[0].strength).toBe('strong');
    });

    it('matches ENT ids, euids and aliases the same way as names', () => {
      expect(summary('ENT-1 owns ENT-2.')).toEqual(['a.rodriguez>LAPTOP-FIN03:weak']);
      expect(summary('user:a.rodriguez@acme.com@okta owns host:LAPTOP-FIN03.')).toEqual([
        'a.rodriguez>LAPTOP-FIN03:weak',
      ]);
    });

    it('handles empty text, repeated mentions and the same entity twice', () => {
      expect(summary('')).toEqual([]);
      expect(summary('a.rodriguez owns a.rodriguez.')).toEqual([]);
      expect(
        summary('a.rodriguez, a.rodriguez and a.rodriguez appeared together in alerts.')
      ).toEqual([]);
    });

    it('is case-insensitive and tolerant of punctuation around names', () => {
      expect(summary('(A.RODRIGUEZ) OWNS [laptop-fin03]!')).toEqual([
        'a.rodriguez>LAPTOP-FIN03:weak',
      ]);
    });

    it('does not match a name inside a longer name', () => {
      expect(summary('a.rodriguez2 owns LAPTOP-FIN033.')).toEqual([]);
    });
  });
});
