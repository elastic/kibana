/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIXTURE_BRIEF,
  FIXTURE_JOB_SUCCEEDED,
  INVALID_BRIEF_CASES,
} from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type {
  BriefSnapshot,
  EvidenceId,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { validateBrief } from './validate_brief';

const asId = (id: string): EvidenceId => id as EvidenceId;

const validate = (brief: ExecutiveBrief, snapshot: BriefSnapshot = FIXTURE_SNAPSHOT) =>
  validateBrief({ brief, snapshot });

const withStoryline = (index: number, patch: Partial<ExecutiveBrief['storylines'][number]>) => ({
  ...FIXTURE_BRIEF,
  storylines: [{ ...FIXTURE_BRIEF.storylines[index], ...patch }],
});

describe('validateBrief', () => {
  describe('FIXTURE_BRIEF', () => {
    it('validates clean and is returned unchanged', () => {
      const { brief, validation } = validate(FIXTURE_BRIEF);
      expect(validation).toEqual({
        totalClaims: 13,
        droppedClaims: 0,
        invalidEvidenceIds: [],
        unbackedRelations: [],
        inventedNumbers: [],
      });
      expect(brief).toEqual(FIXTURE_BRIEF);
    });

    it('matches the validation recorded on the fixture job', () => {
      expect(validate(FIXTURE_BRIEF).validation).toEqual(FIXTURE_JOB_SUCCEEDED.validation);
    });
  });

  describe('INVALID_BRIEF_CASES', () => {
    const byName = (name: string) => {
      const found = INVALID_BRIEF_CASES.find((c) => c.name === name);
      if (!found) {
        throw new Error(`missing case ${name}`);
      }
      return found;
    };

    it('catches a non-existent evidence id and strips it', () => {
      const { brief, validation } = validate(byName('cites a non-existent evidence id').brief);
      expect(validation.invalidEvidenceIds).toEqual(['RULE-99']);
      // ENT-1 is still valid, so the storyline stays with the bad id removed.
      expect(brief.storylines[0].evidence).toEqual(['ENT-1']);
    });

    it('catches lateral movement claimed over a regular-logon edge', () => {
      const { brief, validation } = validate(
        byName('claims lateral movement between entities linked only by regular logons').brief
      );
      expect(validation.unbackedRelations).toEqual([
        {
          statement: 'build-runner-02 moved laterally to fileserver-03.',
          from: 'build-runner-02',
          to: 'fileserver-03',
        },
      ]);
      expect(brief.storylines).toHaveLength(0);
      expect(validation.droppedClaims).toBeGreaterThanOrEqual(2);
    });

    it('catches two entities with no computed edge, keeps the claim and flags it', () => {
      // Policy change (V6): a weak unbacked relation no longer drops the claim; it is flagged.
      const { brief, validation } = validate(
        byName('links two entities with no computed edge').brief
      );
      expect(validation.unbackedRelations).toEqual([
        {
          statement: 'a.rodriguez appeared together in alerts with j.chen.',
          from: 'a.rodriguez',
          to: 'j.chen',
        },
      ]);
      expect(brief.storylines).toHaveLength(1);
      expect(validation.droppedClaims).toBe(0);
      expect(validation.flags).toEqual([
        {
          claimPath: 'storylines[0].narrative',
          statement: 'a.rodriguez appeared together in alerts with j.chen.',
          reason: expect.stringContaining('no computed link between them'),
        },
      ]);
    });

    it('catches an invented number, drops the claim and shows the template glance instead', () => {
      // Policy change (V7): a dropped glance is replaced by the template glance, never blanked.
      const { brief, validation } = validate(byName('invents a number').brief);
      expect(validation.inventedNumbers).toEqual(['57']);
      expect(brief.glance.threatNarrative).not.toContain('57');
      expect(brief.glance.headline).toBe(
        'The most serious storyline centres on a.rodriguez and no one is working this yet'
      );
      expect(validation.droppedClaims).toBe(2);
      expect(validation.flags).toEqual([
        expect.objectContaining({ claimPath: 'glance.headline', reason: 'fallback' }),
        expect.objectContaining({ claimPath: 'glance.threatNarrative', reason: 'fallback' }),
      ]);
    });

    it('drops an uncited decision', () => {
      const { brief, validation } = validate(byName('uncited decision').brief);
      expect(validation.droppedClaims).toBe(1);
      expect(brief.decisions).toHaveLength(0);
      expect(validation.invalidEvidenceIds).toEqual([]);
    });

    it('covers every contract case', () => {
      INVALID_BRIEF_CASES.forEach(({ name, brief }) => {
        const { validation } = validate(brief);
        const caught =
          validation.invalidEvidenceIds.length > 0 ||
          validation.unbackedRelations.length > 0 ||
          validation.inventedNumbers.length > 0 ||
          validation.droppedClaims > 0;
        expect({ name, caught }).toEqual({ name, caught: true });
      });
    });
  });

  describe('evidence rules', () => {
    it('drops a claim when every cited id is invalid', () => {
      const { brief, validation } = validate(
        withStoryline(0, { evidence: ['RULE-98', 'RULE-99'] })
      );
      expect(validation.invalidEvidenceIds).toEqual(['RULE-98', 'RULE-99']);
      expect(brief.storylines).toHaveLength(0);
      expect(validation.droppedClaims).toBe(2);
    });

    it('treats malformed ids and prototype keys as invalid', () => {
      const { validation } = validate(
        withStoryline(0, {
          evidence: ['ENT-1', 'toString', 'constructor', '', 'ent-1'].map(asId),
        })
      );
      expect(validation.invalidEvidenceIds).toEqual(['toString', 'constructor', '', 'ent-1']);
    });

    it('lists a repeated invalid id once and de-duplicates valid ids', () => {
      const { brief, validation } = validate(
        withStoryline(0, { evidence: ['ENT-1', 'ENT-1', 'RULE-99', 'RULE-99'] })
      );
      expect(validation.invalidEvidenceIds).toEqual(['RULE-99']);
      expect(brief.storylines[0].evidence).toEqual(['ENT-1']);
    });

    it('drops and lists a storyline that is not in the snapshot', () => {
      const { brief, validation } = validate(
        withStoryline(0, { storylineId: 'STORY-9', evidence: ['ENT-1'] })
      );
      expect(brief.storylines).toHaveLength(0);
      expect(validation.invalidEvidenceIds).toContain('STORY-9');
      expect(validation.droppedClaims).toBe(2);
    });

    it('drops a decision whose relatesTo is missing from the catalog', () => {
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [{ ...FIXTURE_BRIEF.decisions[0], relatesTo: 'STORY-9' }],
      });
      expect(brief.decisions).toHaveLength(0);
      expect(validation.invalidEvidenceIds).toEqual(['STORY-9']);
      expect(validation.droppedClaims).toBe(1);
    });

    it('drops a decision whose relatesTo is a real id of the wrong kind', () => {
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [{ ...FIXTURE_BRIEF.decisions[0], relatesTo: 'ENT-1' }],
      });
      expect(brief.decisions).toHaveLength(0);
      expect(validation.droppedClaims).toBe(1);
    });

    it('strips invalid decision targets but keeps the decision', () => {
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [{ ...FIXTURE_BRIEF.decisions[0], targets: ['ENT-4', 'ENT-404'] }],
      });
      expect(brief.decisions[0].targets).toEqual(['ENT-4']);
      expect(validation.invalidEvidenceIds).toEqual(['ENT-404']);
      expect(validation.droppedClaims).toBe(0);
    });

    it('drops the cross-storyline conclusion and blind-spot summary when uncited', () => {
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        crossStorylineConclusion: { ...FIXTURE_BRIEF.crossStorylineConclusion!, evidence: [] },
        blindSpots: { ...FIXTURE_BRIEF.blindSpots, evidence: [] },
      });
      expect(brief.crossStorylineConclusion).toBeUndefined();
      expect(brief.blindSpots.summary).toBe('');
      expect(validation.droppedClaims).toBe(2);
    });

    it('drops an uncited glance as two claims and falls back to the template glance', () => {
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        glance: { ...FIXTURE_BRIEF.glance, evidence: [] },
      });
      expect(brief.glance.headline).not.toBe(FIXTURE_BRIEF.glance.headline);
      expect(brief.glance.headline.length).toBeGreaterThan(0);
      expect(brief.glance.evidence).toEqual(['STORY-1', 'STORY-2', 'STORY-3']);
      expect(validation.droppedClaims).toBe(2);
    });

    it('drops changeSummary because it cannot carry evidence', () => {
      const { brief, validation } = validate({ ...FIXTURE_BRIEF, changeSummary: 'Worse.' });
      expect(brief).not.toHaveProperty('changeSummary');
      expect(validation.totalClaims).toBe(14);
      expect(validation.droppedClaims).toBe(1);
    });
  });

  describe('invented numbers', () => {
    const withNarrative = (text: string) =>
      validate({ ...FIXTURE_BRIEF, glance: { ...FIXTURE_BRIEF.glance, threatNarrative: text } });

    it('accepts numbers from the snapshot, including percentages and counts', () => {
      expect(
        withNarrative('6 entities, 18% unmapped, 12 signals, 7 days.').validation
      ).toMatchObject({ inventedNumbers: [], droppedClaims: 0 });
    });

    it('does not read digits inside entity names, evidence ids or MITRE ids as numbers', () => {
      expect(
        withNarrative('LAPTOP-FIN03 and jump-box-01 (ENT-3, TA0008, T1021.001) are noisy.')
          .validation.inventedNumbers
      ).toEqual([]);
    });

    it('does not read digits inside rule names as numbers', () => {
      const snapshot: BriefSnapshot = {
        ...FIXTURE_SNAPSHOT,
        catalog: {
          ...FIXTURE_SNAPSHOT.catalog,
          'RULE-1': {
            kind: 'rule',
            ruleId: 'r',
            name: 'Windows 11 Defender Tamper',
            severity: 'high',
            alertCount: 1,
            tacticIds: [],
            techniqueIds: [],
          },
        },
      };
      const { validation } = validate(
        {
          ...FIXTURE_BRIEF,
          glance: { ...FIXTURE_BRIEF.glance, threatNarrative: 'Windows 11 Defender Tamper fired.' },
        },
        snapshot
      );
      expect(validation.inventedNumbers).toEqual([]);
    });

    it('reports each invented number as written, including decimals and thousands', () => {
      const { validation } = withNarrative('57 hosts, 1,200 alerts and 3.7 percent drift.');
      expect(validation.inventedNumbers).toEqual(['57', '1,200', '3.7']);
    });

    it('checks decision rationale and agent prompts, not only narratives', () => {
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [
          { ...FIXTURE_BRIEF.decisions[0], agentPrompt: 'Look at the last 91 days.' },
          { ...FIXTURE_BRIEF.decisions[1], rationale: 'Because 88 rules failed.' },
        ],
      });
      expect(validation.inventedNumbers).toEqual(['91', '88']);
      expect(brief.decisions).toHaveLength(0);
    });

    it('lists an invented number even when the claim is also uncited', () => {
      const { validation } = validate({
        ...FIXTURE_BRIEF,
        glance: { ...FIXTURE_BRIEF.glance, headline: '57 compromised', evidence: [] },
      });
      expect(validation.inventedNumbers).toEqual(['57']);
      expect(validation.droppedClaims).toBe(2);
    });
  });

  describe('relation rules', () => {
    const narrativeOf = (narrative: string, index = 0, evidence?: string[]) =>
      validate(
        withStoryline(index, {
          narrative,
          ...(evidence
            ? { evidence: evidence as ExecutiveBrief['storylines'][number]['evidence'] }
            : {}),
        })
      ).validation.unbackedRelations;

    it('rejects a verb that belongs to a different edge type', () => {
      // a.rodriguez and LAPTOP-FIN03 are linked by co_alert and accesses_frequently, not ownership.
      expect(narrativeOf('a.rodriguez owns LAPTOP-FIN03.')).toHaveLength(1);
    });

    it('rejects rarely/regularly mix-ups between the two logon edge types', () => {
      expect(narrativeOf('a.rodriguez logged on to (rarely) LAPTOP-FIN03.')).toHaveLength(1);
      expect(narrativeOf('a.rodriguez regularly logs on to jump-box-01.')).toHaveLength(1);
    });

    it('accepts the exact verb for every edge between the pair', () => {
      expect(
        narrativeOf(
          'a.rodriguez appeared together in alerts with LAPTOP-FIN03; a.rodriguez regularly logs on to LAPTOP-FIN03.'
        )
      ).toEqual([]);
    });

    it('rejects stronger paraphrases of an access edge', () => {
      expect(narrativeOf('build-runner-02 compromised fileserver-03.', 2)).toHaveLength(1);
      expect(narrativeOf('build-runner-02 pivoted to fileserver-03.', 2)).toHaveLength(1);
    });

    it('allows attack language only when an attack discovery edge backs the pair', () => {
      expect(narrativeOf('a.rodriguez attacked docker-host-prod-01.')).toEqual([]);
      expect(narrativeOf('a.rodriguez attacked LAPTOP-FIN03.')).toHaveLength(1);
    });

    it('allows lateral movement when the claim cites a TA0008 rule', () => {
      const text = 'a.rodriguez moved laterally to LAPTOP-FIN03.';
      expect(narrativeOf(text, 0, ['ENT-1', 'RULE-2'])).toEqual([]);
      expect(narrativeOf(text, 0, ['ENT-1', 'RULE-1'])).toHaveLength(1);
    });

    it('allows lateral movement when the connecting edge itself carries a TA0008 rule', () => {
      // The a.rodriguez -> jump-box-01 co_alert edge is backed by RULE-2 (Lateral Movement).
      expect(narrativeOf('a.rodriguez moved laterally to jump-box-01.', 0, ['ENT-1'])).toEqual([]);
    });

    it('does not accept a bare TAC-TA0008 citation as lateral movement backing', () => {
      expect(
        narrativeOf('a.rodriguez moved laterally to LAPTOP-FIN03.', 0, ['ENT-1', 'TAC-TA0008'])
      ).toHaveLength(1);
    });

    it('allows a pair without a direct edge when both hang off a common storyline entity', () => {
      // jump-box-01 and docker-host-prod-01 are both linked to a.rodriguez (the fixture's own prose).
      expect(
        narrativeOf('a.rodriguez logged on to (rarely) jump-box-01 and docker-host-prod-01.')
      ).toEqual([]);
      expect(narrativeOf('jump-box-01 and docker-host-prod-01 were hit.')).toEqual([]);
    });

    it('still rejects a common-neighbour pair when the verb is not backed by the spokes', () => {
      expect(narrativeOf('jump-box-01 owns docker-host-prod-01.')).toHaveLength(1);
    });

    it('rejects an entity from another storyline', () => {
      expect(narrativeOf('a.rodriguez and j.chen are related.')).toHaveLength(1);
    });

    it('matches entities by euid and alias, case-insensitively', () => {
      expect(narrativeOf('a.rodriguez owns user:j.chen@acme.com@okta.')).toHaveLength(1);
      expect(narrativeOf('A.RODRIGUEZ appeared together in alerts with laptop-fin03.')).toEqual([]);
      expect(narrativeOf('user:a.rodriguez@LAPTOP-FIN03@local owns j.chen.')).toHaveLength(1);
    });

    it('matches ENT ids so ids_only prose is checked too', () => {
      expect(narrativeOf('ENT-1 appeared together in alerts with ENT-5.')).toHaveLength(1);
      expect(narrativeOf('ENT-1 appeared together in alerts with ENT-2.')).toEqual([]);
    });

    it('does not confuse ENT-1 with ENT-10 or a name with a longer name', () => {
      expect(narrativeOf('ENT-10 appeared together in alerts.')).toEqual([]);
      expect(narrativeOf('a.rodriguez2 and j.chen3 are related.')).toEqual([]);
    });

    it('ignores sentences that mention fewer than two entities', () => {
      expect(
        narrativeOf('docker-host-prod-01 moved laterally and compromised everything.')
      ).toEqual([]);
    });

    it('treats each sentence on its own', () => {
      expect(
        narrativeOf('a.rodriguez appeared together in alerts on LAPTOP-FIN03. j.chen is elsewhere.')
      ).toEqual([]);
    });

    it('checks relations in whyItMatters and titles, not only the narrative', () => {
      const { validation } = validate(
        withStoryline(0, { whyItMatters: 'a.rodriguez owns j.chen.' })
      );
      expect(validation.unbackedRelations).toHaveLength(1);
      expect(validation.flags).toEqual([
        expect.objectContaining({ claimPath: 'storylines[0].whyItMatters' }),
      ]);
      const titled = validate(withStoryline(0, { title: 'a.rodriguez owns j.chen' }));
      expect(titled.validation.unbackedRelations).toHaveLength(1);
      expect(titled.validation.flags).toEqual([
        expect.objectContaining({ claimPath: 'storylines[0].title' }),
      ]);
    });

    it('does not count co-mention in a title or a decision as a relation (V1)', () => {
      const titled = validate(withStoryline(0, { title: 'a.rodriguez and j.chen' }));
      expect(titled.validation.unbackedRelations).toEqual([]);
      const { validation, brief } = validate({
        ...FIXTURE_BRIEF,
        decisions: [
          {
            ...FIXTURE_BRIEF.decisions[2],
            relatesTo: 'STORY-3',
            action: 'Isolate svc-build and docker-host-prod-01',
          },
        ],
      });
      expect(validation.unbackedRelations).toEqual([]);
      expect(brief.decisions).toHaveLength(1);
    });

    it('checks decision text against the storyline it relates to, and flags instead of dropping', () => {
      const { validation, brief } = validate({
        ...FIXTURE_BRIEF,
        decisions: [
          {
            ...FIXTURE_BRIEF.decisions[2],
            relatesTo: 'STORY-3',
            action: 'Isolate svc-build, which owns docker-host-prod-01',
          },
        ],
      });
      expect(validation.unbackedRelations).toHaveLength(1);
      expect(brief.decisions).toHaveLength(1);
      expect(validation.flags).toEqual([expect.objectContaining({ claimPath: 'decisions[0]' })]);
    });

    it('drops a decision that makes a strong unbacked claim', () => {
      const { validation, brief } = validate({
        ...FIXTURE_BRIEF,
        decisions: [
          {
            ...FIXTURE_BRIEF.decisions[2],
            relatesTo: 'STORY-3',
            rationale: 'svc-build moved laterally to docker-host-prod-01.',
          },
        ],
      });
      expect(validation.unbackedRelations).toHaveLength(1);
      expect(brief.decisions).toHaveLength(0);
      expect(validation.droppedClaims).toBe(1);
    });

    it('does not apply relation checks to agent prompts', () => {
      const { validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [
          {
            ...FIXTURE_BRIEF.decisions[2],
            agentPrompt: 'Compare svc-build with docker-host-prod-01 and j.chen.',
          },
        ],
      });
      expect(validation.unbackedRelations).toEqual([]);
    });

    it('lists the same statement once', () => {
      const { validation } = validate({
        ...FIXTURE_BRIEF,
        storylines: [
          {
            ...FIXTURE_BRIEF.storylines[0],
            narrative: 'a.rodriguez owns j.chen.',
            whyItMatters: 'a.rodriguez owns j.chen.',
          },
        ],
      });
      expect(validation.unbackedRelations).toHaveLength(1);
    });
  });

  describe('flags', () => {
    it('are absent on a clean brief', () => {
      expect(validate(FIXTURE_BRIEF).validation).not.toHaveProperty('flags');
    });

    it('flag a decision without an owner and keep it', () => {
      const { owner: _owner, ...withoutOwner } = FIXTURE_BRIEF.decisions[0];
      const { brief, validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [FIXTURE_BRIEF.decisions[1], withoutOwner],
      });
      expect(brief.decisions).toHaveLength(2);
      expect(validation.flags).toEqual([
        {
          claimPath: 'decisions[1]',
          statement: FIXTURE_BRIEF.decisions[0].action,
          reason: 'missing_owner',
        },
      ]);
    });

    it('use the output index of a decision even when an earlier one was dropped', () => {
      const { validation } = validate({
        ...FIXTURE_BRIEF,
        decisions: [
          { ...FIXTURE_BRIEF.decisions[0], evidence: [] },
          { ...FIXTURE_BRIEF.decisions[1], owner: undefined },
        ],
      });
      expect(validation.flags).toEqual([
        expect.objectContaining({ claimPath: 'decisions[0]', reason: 'missing_owner' }),
      ]);
    });

    it('are written for the cross-storyline conclusion and the blind-spot summary', () => {
      const { validation } = validate({
        ...FIXTURE_BRIEF,
        crossStorylineConclusion: {
          ...FIXTURE_BRIEF.crossStorylineConclusion!,
          statement: 'j.chen owns docker-host-prod-01.',
        },
        blindSpots: { ...FIXTURE_BRIEF.blindSpots, summary: 'j.chen owns docker-host-prod-01.' },
      });
      expect(validation.flags?.map(({ claimPath }) => claimPath)).toEqual([
        'crossStorylineConclusion.statement',
        'blindSpots.summary',
      ]);
    });

    it('are not written for a claim that is dropped', () => {
      const { validation } = validate({
        ...FIXTURE_BRIEF,
        storylines: [
          { ...FIXTURE_BRIEF.storylines[0], narrative: 'j.chen owns jump-box-01 for 4242 days.' },
        ],
      });
      expect(validation.flags).toBeUndefined();
      expect(validation.unbackedRelations).toHaveLength(1);
    });

    it('list the same statement once per path', () => {
      const text = 'j.chen owns jump-box-01 and administers jump-box-01.';
      const { validation } = validate(withStoryline(0, { narrative: text }));
      expect(validation.flags).toHaveLength(1);
    });
  });

  describe('blank prose', () => {
    it('drops a storyline with a blank title or narrative', () => {
      expect(validate(withStoryline(0, { narrative: '  ' })).brief.storylines).toHaveLength(0);
      expect(validate(withStoryline(0, { title: '' })).brief.storylines).toHaveLength(0);
    });

    it('drops a decision with a blank action and a conclusion with a blank statement', () => {
      const { brief } = validate({
        ...FIXTURE_BRIEF,
        decisions: [{ ...FIXTURE_BRIEF.decisions[0], action: '' }],
        crossStorylineConclusion: { ...FIXTURE_BRIEF.crossStorylineConclusion!, statement: ' ' },
      });
      expect(brief.decisions).toHaveLength(0);
      expect(brief.crossStorylineConclusion).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles an empty snapshot and an empty brief without throwing', () => {
      const emptySnapshot: BriefSnapshot = {
        ...FIXTURE_SNAPSHOT,
        storylines: { storylines: [], otherNotableEntities: [], trace: [] },
        entities: {},
        catalog: {},
        blindSpots: {
          attackStages: { stages: [], unmapped: { alerts: 0, share: 0, topRuleEvidenceIds: [] } },
          gaps: [],
        },
      };
      const { validation, brief } = validate(
        {
          glance: { headline: '', threatNarrative: '', evidence: [] },
          storylines: [],
          blindSpots: { summary: '', evidence: [] },
          decisions: [],
        },
        emptySnapshot
      );
      expect(validation.totalClaims).toBe(3);
      expect(brief.storylines).toEqual([]);
    });

    it('does not mutate its inputs', () => {
      const before = JSON.stringify(INVALID_BRIEF_CASES);
      INVALID_BRIEF_CASES.forEach(({ brief }) => validate(brief));
      expect(JSON.stringify(INVALID_BRIEF_CASES)).toBe(before);
    });
  });
});
