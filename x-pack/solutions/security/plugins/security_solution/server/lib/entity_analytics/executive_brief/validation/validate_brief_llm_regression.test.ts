/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefSnapshot,
  EvidenceId,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { buildBriefPayload } from '../generation/brief_prompt';
import {
  LLM_RUN_FALSE_POSITIVE_STATEMENTS,
  LLM_RUN_RAW_BRIEF,
  LLM_RUN_SNAPSHOT,
} from './__fixtures__/llm_sonnet5_names_run';
import { buildEntityIndex } from './entity_mentions';
import { findUnbackedRelations } from './relations';
import { validateBrief } from './validate_brief';

/**
 * Regression tests built from a real Claude Sonnet 5 run (names mode, seeded exec-brief scenario).
 * The previous validator dropped 8 of 15 claims of that kind of output, nearly all false positives.
 */

const asId = (id: string): EvidenceId => id as EvidenceId;

const validate = (brief: ExecutiveBrief) =>
  validateBrief({ brief, snapshot: LLM_RUN_SNAPSHOT, mode: 'names' });

/** The raw brief with an owner on every decision, as prompt v1 requires. */
const WITH_OWNERS: ExecutiveBrief = {
  ...LLM_RUN_RAW_BRIEF,
  decisions: LLM_RUN_RAW_BRIEF.decisions.map((decision) => ({ ...decision, owner: 'soc' })),
};

const storylineById = (id: string) => {
  const found = LLM_RUN_SNAPSHOT.storylines.storylines.find(({ evidenceId }) => evidenceId === id);
  if (!found) {
    throw new Error(`missing ${id}`);
  }
  return found;
};

const relationsIn = (text: string, storyId: string | undefined, citedEvidence: string[] = []) =>
  findUnbackedRelations({
    text,
    edges: storyId
      ? storylineById(storyId).edges
      : LLM_RUN_SNAPSHOT.storylines.storylines.flatMap(({ edges }) => edges),
    index: buildEntityIndex(LLM_RUN_SNAPSHOT),
    catalog: LLM_RUN_SNAPSHOT.catalog,
    citedEvidence: citedEvidence.map(asId),
  });

describe('validateBrief against a real LLM run', () => {
  describe('the raw Sonnet 5 brief', () => {
    it('keeps every claim: no drops, no invented numbers, no invalid ids, no relations flagged', () => {
      const { validation } = validate(LLM_RUN_RAW_BRIEF);
      expect(validation).toMatchObject({
        droppedClaims: 0,
        invalidEvidenceIds: [],
        inventedNumbers: [],
        unbackedRelations: [],
      });
      expect(validation.totalClaims).toBe(15);
    });

    it('returns the glance, all three storylines, the conclusion, blind spots and every decision', () => {
      const { brief } = validate(LLM_RUN_RAW_BRIEF);
      expect(brief.glance).toEqual(LLM_RUN_RAW_BRIEF.glance);
      expect(
        brief.storylines.map(({ storylineId, narrative }) => [storylineId, narrative])
      ).toEqual(
        LLM_RUN_RAW_BRIEF.storylines.map(({ storylineId, narrative }) => [storylineId, narrative])
      );
      expect(brief.crossStorylineConclusion).toEqual(LLM_RUN_RAW_BRIEF.crossStorylineConclusion);
      expect(brief.blindSpots.summary).not.toBe('');
      expect(brief.decisions).toHaveLength(LLM_RUN_RAW_BRIEF.decisions.length);
    });

    it('flags only the decisions that came back without an owner (prompt v0 did not ask for it)', () => {
      const { validation } = validate(LLM_RUN_RAW_BRIEF);
      expect(validation.flags).toEqual(
        LLM_RUN_RAW_BRIEF.decisions.map(({ action }, i) => ({
          claimPath: `decisions[${i}]`,
          statement: action,
          reason: 'missing_owner',
        }))
      );
    });

    it('never blanks the glance', () => {
      const { brief } = validate(LLM_RUN_RAW_BRIEF);
      expect(brief.glance.headline.length).toBeGreaterThan(0);
      expect(brief.glance.threatNarrative.length).toBeGreaterThan(0);
    });
  });

  describe('V1: co-mention and enumeration are not relations', () => {
    it('does not check host-to-host pairs in an enumeration after "linked via an Attack Discovery"', () => {
      const text =
        'The top storyline shows a.rodriguez, a privileged high-impact user, newly flagged High risk and linked via an Attack Discovery to LAPTOP-FIN03, docker-host-prod-01, and jump-box-01, with a hunting lead active.';
      expect(relationsIn(text, 'STORY-1')).toEqual([]);
    });

    it('still checks the subject against every member of the enumeration', () => {
      // j.chen shares no Attack Discovery with LAPTOP-FIN03 or docker-host-prod-01.
      const text =
        'j.chen is linked via an Attack Discovery to LAPTOP-FIN03 and docker-host-prod-01.';
      const found = relationsIn(text, undefined);
      expect(found.map(({ from, to }) => [from, to])).toEqual([
        ['j.chen', 'LAPTOP-FIN03'],
        ['j.chen', 'docker-host-prod-01'],
      ]);
      expect(found.every(({ strength }) => strength === 'weak')).toBe(true);
    });

    it('treats a list of entities without a predicate as co-mention', () => {
      expect(
        relationsIn(
          'Investigate a.rodriguez, LAPTOP-FIN03, docker-host-prod-01 and jump-box-01 for the suspected credential theft and lateral movement into production.',
          'STORY-1'
        )
      ).toEqual([]);
      expect(relationsIn('j.chen, svc-build and a.rodriguez are all noisy.', undefined)).toEqual(
        []
      );
    });

    it('does not treat the noun "lateral movement" as a relation between entities', () => {
      expect(
        relationsIn(
          'a.rodriguez is privileged and docker-host-prod-01 is extreme impact, so a credential-theft and lateral-movement scenario reaching a production host has no owner.',
          'STORY-1'
        )
      ).toEqual([]);
    });

    it('maps "part of the same discovered attack" and "linked via an Attack Discovery" to same_ad', () => {
      expect(
        relationsIn(
          'j.chen and LAPTOP-MKT07 are part of the same discovered attack and appeared together in alerts.',
          'STORY-2'
        )
      ).toEqual([]);
      expect(
        relationsIn(
          'svc-build is part of the same discovered attack as build-runner-02.',
          'STORY-3'
        )
      ).toHaveLength(1); // STORY-3 has no Attack Discovery edge.
      expect(
        relationsIn('a.rodriguez is linked via an Attack Discovery to jump-box-01.', 'STORY-1')
      ).toEqual([]);
    });

    it('checks each predicate on its own, not every pair against every verb of the sentence', () => {
      const text =
        'a.rodriguez is part of the same discovered attack as LAPTOP-FIN03, docker-host-prod-01 and jump-box-01, and appeared together with each of them in alerts. a.rodriguez logged on to docker-host-prod-01 and jump-box-01 only rarely, and all four entities are related in an active hunting lead.';
      expect(relationsIn(text, 'STORY-1')).toEqual([]);
    });
  });

  describe('V2: "build-runner-02 and svc-build appeared together in alerts"', () => {
    const sentence =
      'build-runner-02 and svc-build appeared together in alerts, and svc-build logged on to (rarely) and regularly logs on to fileserver-03, a relationship first observed on 2026-10-05.';

    it('S3 has a co_alert edge between the golden entities, so the statement is backed', () => {
      const { edges } = storylineById('STORY-3');
      const euid = (name: string) =>
        Object.values(LLM_RUN_SNAPSHOT.entities).find((entity) => entity.name === name)?.euid;
      expect(
        edges.some(
          ({ type, from, to }) =>
            type === 'co_alert' &&
            [from, to].sort().join() === [euid('build-runner-02'), euid('svc-build')].sort().join()
        )
      ).toBe(true);
      expect(relationsIn(sentence, 'STORY-3')).toEqual([]);
    });

    it('was flagged before because every verb of the sentence was applied to every pair', () => {
      // The pair build-runner-02/svc-build only has a co_alert and a regular-logon edge, so the old
      // check rejected the sentence for using "logged on to (rarely)" about a different pair.
      const sameSentenceDifferentSubject =
        'build-runner-02 and svc-build appeared together in alerts, and svc-build owns fileserver-03.';
      const found = relationsIn(sameSentenceDifferentSubject, 'STORY-3');
      expect(found.map(({ from, to }) => [from, to])).toEqual([['svc-build', 'fileserver-03']]);
    });

    it('does not read the date as an invented number', () => {
      const { validation } = validate({
        ...LLM_RUN_RAW_BRIEF,
        storylines: [{ ...LLM_RUN_RAW_BRIEF.storylines[2], narrative: sentence }],
      });
      expect(validation.inventedNumbers).toEqual([]);
      expect(validation.unbackedRelations).toEqual([]);
    });
  });

  describe('the false positives of the first real run', () => {
    it('no longer flags any of its eight sentences when they sit in the right claim', () => {
      const [s1Glance, separately, rodriguezDocker, build, comparison] =
        LLM_RUN_FALSE_POSITIVE_STATEMENTS.filter(
          (statement, i, all) => all.indexOf(statement) === i
        );
      expect(relationsIn(s1Glance, undefined)).toEqual([]);
      expect(relationsIn(separately, undefined)).toEqual([]);
      expect(relationsIn(rodriguezDocker, 'STORY-1')).toEqual([]);
      expect(relationsIn(build, 'STORY-3')).toEqual([]);
      expect(relationsIn(comparison, undefined)).toEqual([]);
    });

    it('keeps all five distinct sentences as claims in a brief', () => {
      const [s1Glance, separately, rodriguezDocker, build, comparison] =
        LLM_RUN_FALSE_POSITIVE_STATEMENTS;
      const { brief, validation } = validate({
        ...LLM_RUN_RAW_BRIEF,
        glance: {
          headline: separately,
          threatNarrative: s1Glance,
          evidence: ['STORY-1', 'STORY-2', 'STORY-3'],
        },
        storylines: [
          {
            ...LLM_RUN_RAW_BRIEF.storylines[0],
            narrative: s1Glance,
            whyItMatters: rodriguezDocker,
          },
          { ...LLM_RUN_RAW_BRIEF.storylines[2], narrative: build },
        ],
        crossStorylineConclusion: {
          statement: comparison,
          confidence: 'medium',
          evidence: ['STORY-1', 'STORY-2'],
        },
      });
      expect(validation.droppedClaims).toBe(0);
      expect(brief.storylines).toHaveLength(2);
      expect(brief.crossStorylineConclusion?.statement).toBe(comparison);
    });
  });

  describe('V3: cross-storyline comparison', () => {
    const comparison =
      'a.rodriguez and j.chen both started with a Suspicious MS Office Child Process alert, so a shared initial-access technique is being used against several users.';

    it('is not a relation: it has no predicate between the two entities', () => {
      expect(relationsIn(comparison, undefined)).toEqual([]);
    });

    it('is kept when it cites both STORY ids', () => {
      const { brief, validation } = validate({
        ...LLM_RUN_RAW_BRIEF,
        crossStorylineConclusion: {
          statement: comparison,
          confidence: 'medium',
          evidence: ['STORY-1', 'STORY-2'],
        },
      });
      expect(brief.crossStorylineConclusion?.statement).toBe(comparison);
      expect(validation.unbackedRelations).toEqual([]);
      expect(validation.droppedClaims).toBe(0);
    });

    it('does not edge-check a weak predicate between entities of two cited storylines', () => {
      const wording =
        'a.rodriguez and j.chen both appeared together in alerts about Office child processes.';
      const cited = validate({
        ...LLM_RUN_RAW_BRIEF,
        crossStorylineConclusion: {
          statement: wording,
          confidence: 'medium',
          evidence: ['STORY-1', 'STORY-2'],
        },
      });
      expect(cited.validation.unbackedRelations).toEqual([]);
      expect(cited.brief.crossStorylineConclusion?.statement).toBe(wording);

      // Citing a single storyline does not make it a comparison.
      const single = validate({
        ...LLM_RUN_RAW_BRIEF,
        crossStorylineConclusion: {
          statement: wording,
          confidence: 'medium',
          evidence: ['STORY-1'],
        },
      });
      expect(single.validation.unbackedRelations).toHaveLength(1);
      expect(single.validation.flags).toContainEqual(
        expect.objectContaining({ claimPath: 'crossStorylineConclusion.statement' })
      );
    });

    it('still drops a strong claim between entities of two cited storylines', () => {
      const { brief, validation } = validate({
        ...LLM_RUN_RAW_BRIEF,
        crossStorylineConclusion: {
          statement: 'a.rodriguez moved laterally to j.chen.',
          confidence: 'medium',
          evidence: ['STORY-1', 'STORY-2'],
        },
      });
      expect(brief.crossStorylineConclusion).toBeUndefined();
      expect(validation.unbackedRelations).toHaveLength(1);
    });
  });

  describe('V4: UUIDs and ISO dates are not numbers', () => {
    const withNarrative = (threatNarrative: string) =>
      validate({
        ...LLM_RUN_RAW_BRIEF,
        glance: { ...LLM_RUN_RAW_BRIEF.glance, threatNarrative },
      });

    it('masks a case UUID echoed by the model', () => {
      const { validation } = withNarrative(
        'Case 6ac716c0-7062-4941-a710-3ad055ef71db is open for j.chen.'
      );
      expect(validation.inventedNumbers).toEqual([]);
    });

    it('masks ISO dates and timestamps', () => {
      const { validation } = withNarrative(
        'The first alert fired on 2026-10-04 and the case opened at 2026-10-06T14:35:12.250Z.'
      );
      expect(validation.inventedNumbers).toEqual([]);
    });

    it('masks IPv4 addresses', () => {
      expect(withNarrative('Traffic left to 203.0.113.77.').validation.inventedNumbers).toEqual([]);
    });

    it('still flags a genuinely invented number next to a UUID and a date', () => {
      const { validation, brief } = withNarrative(
        'On 2026-10-04 case 6ac716c0-7062-4941-a710-3ad055ef71db grew to 4242 alerts.'
      );
      expect(validation.inventedNumbers).toEqual(['4242']);
      // The glance was dropped, so the template glance is shown (V7).
      expect(brief.glance.threatNarrative).not.toContain('4242');
    });

    it('removes case, attack discovery, lead and anomaly UUIDs from the LLM payload', () => {
      const payload = buildBriefPayload(LLM_RUN_SNAPSHOT, 'names');
      expect(payload).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      // The evidence ids themselves stay.
      expect(payload).toContain('CASE-1');
      expect(payload).toContain('AD-1');
    });
  });

  describe('V6: weak relations flag, strong relations drop', () => {
    const withNarrative = (narrative: string, evidence?: string[]) =>
      validate({
        ...WITH_OWNERS,
        storylines: [
          {
            ...LLM_RUN_RAW_BRIEF.storylines[2],
            narrative,
            ...(evidence ? { evidence: evidence.map(asId) } : {}),
          },
        ],
      });

    it('keeps a claim with a weak unbacked relation and flags it under the storyline path', () => {
      const text = 'svc-build owns fileserver-03.';
      const { brief, validation } = withNarrative(text);
      expect(brief.storylines).toHaveLength(1);
      expect(validation.droppedClaims).toBe(0);
      expect(validation.unbackedRelations).toEqual([
        { statement: text, from: 'svc-build', to: 'fileserver-03' },
      ]);
      expect(validation.flags).toEqual([
        {
          claimPath: 'storylines[0].narrative',
          statement: text,
          reason: expect.stringContaining('svc-build'),
        },
      ]);
    });

    it('uses the index in the cleaned brief, not the index in the model output', () => {
      const { brief, validation } = validate({
        ...WITH_OWNERS,
        storylines: [
          // Dropped: every cited id is invalid.
          { ...LLM_RUN_RAW_BRIEF.storylines[0], evidence: ['RULE-404'] },
          { ...LLM_RUN_RAW_BRIEF.storylines[2], narrative: 'svc-build owns fileserver-03.' },
        ],
      });
      expect(brief.storylines.map(({ storylineId }) => storylineId)).toEqual(['STORY-3']);
      expect(validation.flags?.map(({ claimPath }) => claimPath)).toEqual([
        'storylines[0].narrative',
      ]);
    });

    it('flags a weak relation in a decision under the decision path', () => {
      const { brief, validation } = validate({
        ...WITH_OWNERS,
        decisions: [
          {
            ...LLM_RUN_RAW_BRIEF.decisions[3],
            owner: 'soc',
            action: 'Check why svc-build owns fileserver-03.',
          },
        ],
      });
      expect(brief.decisions).toHaveLength(1);
      expect(validation.flags).toEqual([expect.objectContaining({ claimPath: 'decisions[0]' })]);
    });

    it('drops a claim for a strong unbacked relation (lateral movement over a logon edge)', () => {
      const { brief, validation } = withNarrative('svc-build moved laterally to fileserver-03.');
      expect(brief.storylines).toHaveLength(0);
      expect(validation.droppedClaims).toBe(2);
      expect(validation.unbackedRelations).toHaveLength(1);
      expect(validation.flags).toBeUndefined();
    });

    it('keeps lateral movement that a TA0008 rule backs', () => {
      // RULE-9 (exfiltration, TA0010) backs exfiltration, not lateral movement.
      const exfil = withNarrative('svc-build exfiltrated data to fileserver-03.', [
        'STORY-3',
        'RULE-9',
      ]);
      expect(exfil.brief.storylines).toHaveLength(1);
      const lateral = withNarrative('svc-build moved laterally to fileserver-03.', [
        'STORY-3',
        'RULE-9',
      ]);
      expect(lateral.brief.storylines).toHaveLength(0);
    });

    it('drops compromise claims without an Attack Discovery edge', () => {
      const { brief } = withNarrative('svc-build compromised fileserver-03.');
      expect(brief.storylines).toHaveLength(0);
    });

    it('drops a claim with an invented number and no flag is written for it', () => {
      const { brief, validation } = withNarrative('svc-build owns fileserver-03 for 4242 days.');
      expect(brief.storylines).toHaveLength(0);
      expect(validation.inventedNumbers).toEqual(['4242']);
      expect(validation.flags).toBeUndefined();
    });

    it('drops a claim whose valid evidence is empty', () => {
      const { brief } = withNarrative('svc-build logged on to fileserver-03 only rarely.', [
        'ANOM placeholder',
      ]);
      expect(brief.storylines).toHaveLength(0);
    });

    it('lists the invented placeholder id but keeps the claim when other evidence is valid (V5)', () => {
      const { brief, validation } = withNarrative(
        'svc-build logged on to fileserver-03 only rarely.',
        ['STORY-3', 'ANOM placeholder']
      );
      expect(validation.invalidEvidenceIds).toEqual(['ANOM placeholder']);
      expect(brief.storylines[0].evidence).toEqual(['STORY-3']);
    });
  });

  describe('V7: the glance is never blank', () => {
    const emptied = (patch: Partial<ExecutiveBrief['glance']>) =>
      validate({ ...LLM_RUN_RAW_BRIEF, glance: { ...LLM_RUN_RAW_BRIEF.glance, ...patch } });

    it.each([
      ['has an invented number', { threatNarrative: 'There are 4242 alerts.' }],
      ['has no valid evidence', { evidence: [asId('ANOM placeholder')] }],
      ['has a strong unbacked relation', { headline: 'a.rodriguez moved laterally to j.chen.' }],
      ['has a blank headline', { headline: '   ' }],
      ['has a blank narrative', { threatNarrative: '' }],
    ])('falls back to the template glance and flags it when the glance %s', (_name, patch) => {
      const { brief, validation } = emptied(patch);
      expect(brief.glance.headline.trim().length).toBeGreaterThan(0);
      expect(brief.glance.threatNarrative.trim().length).toBeGreaterThan(0);
      expect(brief.glance.headline).toBe(
        'The top priority threat centres on a.rodriguez and no one is working this yet'
      );
      expect(validation.flags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ claimPath: 'glance.headline', reason: 'fallback' }),
          expect.objectContaining({ claimPath: 'glance.threatNarrative', reason: 'fallback' }),
        ])
      );
    });

    it('counts the model glance as dropped, even when it was only blank', () => {
      expect(emptied({ headline: '' }).validation.droppedClaims).toBe(2);
      expect(emptied({ threatNarrative: 'There are 4242 alerts.' }).validation.droppedClaims).toBe(
        2
      );
    });

    it('writes the fallback glance with entity ids in ids_only mode', () => {
      const { brief } = validateBrief({
        brief: {
          ...LLM_RUN_RAW_BRIEF,
          glance: { ...LLM_RUN_RAW_BRIEF.glance, threatNarrative: 'There are 4242 alerts.' },
        },
        snapshot: LLM_RUN_SNAPSHOT,
        mode: 'ids_only',
      });
      expect(brief.glance.headline).toContain('ENT-1');
      expect(brief.glance.headline).not.toContain('a.rodriguez');
    });

    it('the fallback glance passes the validator itself (no relations, numbers or ids)', () => {
      const { brief } = emptied({ threatNarrative: 'There are 4242 alerts.' });
      const again = validate({ ...LLM_RUN_RAW_BRIEF, glance: brief.glance });
      expect(again.validation).toMatchObject({
        inventedNumbers: [],
        invalidEvidenceIds: [],
        unbackedRelations: [],
        droppedClaims: 0,
      });
    });

    it('leaves the glance alone when a weak relation is only flagged', () => {
      const { brief, validation } = emptied({
        threatNarrative: 'svc-build owns fileserver-03.',
      });
      expect(brief.glance.threatNarrative).toBe('svc-build owns fileserver-03.');
      expect(validation.flags).toContainEqual(
        expect.objectContaining({ claimPath: 'glance.threatNarrative' })
      );
    });
  });

  describe('snapshot is not mutated', () => {
    it('does not modify the snapshot or the brief', () => {
      const before = JSON.stringify([LLM_RUN_SNAPSHOT as BriefSnapshot, LLM_RUN_RAW_BRIEF]);
      validate(LLM_RUN_RAW_BRIEF);
      validate({ ...LLM_RUN_RAW_BRIEF, glance: { ...LLM_RUN_RAW_BRIEF.glance, evidence: [] } });
      expect(JSON.stringify([LLM_RUN_SNAPSHOT, LLM_RUN_RAW_BRIEF])).toBe(before);
    });
  });
});
