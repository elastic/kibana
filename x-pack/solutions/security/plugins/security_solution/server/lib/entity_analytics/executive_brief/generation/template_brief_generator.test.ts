/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type {
  BriefNarrationMode,
  BriefSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { validateBrief } from '../validation/validate_brief';
import { TemplateBriefGenerator } from './template_brief_generator';

const generator = new TemplateBriefGenerator();
const run = async (
  snapshot: BriefSnapshot = FIXTURE_SNAPSHOT,
  mode: BriefNarrationMode = 'names'
) => (await generator.generate({ snapshot, mode })).brief;

describe('TemplateBriefGenerator', () => {
  it.each<BriefNarrationMode>(['names', 'ids_only'])(
    'passes the validator on FIXTURE_SNAPSHOT with nothing dropped or flagged (%s)',
    async (mode) => {
      const brief = await run(FIXTURE_SNAPSHOT, mode);
      const { validation, brief: cleaned } = validateBrief({ brief, snapshot: FIXTURE_SNAPSHOT });
      expect(validation).toEqual({
        totalClaims: 13,
        droppedClaims: 0,
        invalidEvidenceIds: [],
        unbackedRelations: [],
        inventedNumbers: [],
      });
      expect(cleaned).toEqual(brief);
    }
  );

  it('is deterministic', async () => {
    expect(await run()).toEqual(await run());
  });

  it('narrates each storyline from its edges using only the allowed verbs', async () => {
    const { storylines } = await run();
    expect(storylines.map((s) => s.storylineId)).toEqual(['STORY-1', 'STORY-2', 'STORY-3']);

    expect(storylines[0].narrative).toContain(
      'a.rodriguez and docker-host-prod-01 were part of the same discovered attack'
    );
    expect(storylines[0].narrative).toContain(
      'a.rodriguez and LAPTOP-FIN03 appeared together in alerts; a.rodriguez regularly logs on to LAPTOP-FIN03.'
    );
    expect(storylines[0].narrative).toContain('a.rodriguez logged on to (rarely) jump-box-01');
    expect(storylines[1].narrative).toContain('j.chen owns LAPTOP-MKT07');
    expect(storylines[2].narrative).toContain(
      'svc-build and build-runner-02 appeared together in alerts.'
    );
    expect(storylines[2].narrative).toContain(
      'build-runner-02 regularly logs on to fileserver-03.'
    );
    storylines.forEach(({ narrative, whyItMatters }) => {
      expect(`${narrative} ${whyItMatters}`).not.toMatch(/laterally|compromis|breach|pivot/i);
    });
  });

  it('derives why-it-matters from privilege, criticality, vulnerabilities and response', async () => {
    const { storylines } = await run();
    const [first, second, third] = storylines.map((s) => s.whyItMatters);
    expect(first).toContain('a.rodriguez is privileged and on the Privileged Users watchlist.');
    expect(first).toContain(
      'docker-host-prod-01 is extreme impact and has 2 critical and 5 high vulnerabilities.'
    );
    expect(first).toContain('No case is open and no one is working this yet.');
    expect(first).toContain('23 alerts are still open.');
    expect(first).toContain('The link is strong');
    expect(second).toContain('A case is already in progress');
    expect(second).toContain('6 alerts are acknowledged.');
    expect(third).toContain('The link is moderate');
  });

  it('sets confidence from link strength and lowers it when a source failed', async () => {
    const base = (await run()).storylines.map((s) => s.confidence);
    expect(base).toEqual(['high', 'high', 'medium']);

    const degraded = await run({
      ...FIXTURE_SNAPSHOT,
      sources: { ...FIXTURE_SNAPSHOT.sources, posture: { status: 'timeout', tookMs: 10_000 } },
    });
    expect(degraded.storylines.map((s) => s.confidence)).toEqual(['medium', 'medium', 'low']);
    expect(degraded.crossStorylineConclusion?.confidence).toBe('low');
  });

  it('treats a disabled source as not a data gap', async () => {
    // The fixture's anomalies source is disabled; confidence stays high.
    expect((await run()).storylines[0].confidence).toBe('high');
  });

  it('creates decisions for unaddressed storylines and limited-coverage stages only', async () => {
    const { decisions } = await run();
    expect(decisions.map((d) => [d.relatesTo, d.urgency, d.owner])).toEqual([
      ['STORY-1', 'now', 'soc'],
      ['STORY-3', 'this_week', 'soc'],
      ['TAC-TA0008', 'this_week', 'detection_engineering'],
    ]);
    expect(decisions[0].action).toBe('Contain activity centred on a.rodriguez and open a case');
    expect(decisions[2].action).toBe('Review detection coverage for Lateral Movement');
    expect(decisions[2].rationale).toBe(
      'Activity was seen in a stage where only 1 of 2 enabled detection rules are working.'
    );
    expect(decisions.every((d) => d.agentPrompt.length > 0 && d.evidence.length > 0)).toBe(true);
    // STORY-2 is already being handled, so no containment decision for it.
    expect(decisions.some((d) => d.relatesTo === 'STORY-2')).toBe(false);
  });

  it('writes the cross-storyline conclusion about detection coverage, never "protected"', async () => {
    const { crossStorylineConclusion: conclusion } = await run();
    expect(conclusion?.statement).toBe(
      'The most serious storyline passes through Lateral Movement, a stage with limited detection coverage.'
    );
    expect(conclusion?.evidence).toEqual(['STORY-1', 'TAC-TA0008']);
    expect(JSON.stringify(await run())).not.toMatch(/protected|defended/i);
  });

  it('summarises blind spots from flagged stages and gaps, ordered by severity', async () => {
    const { blindSpots } = await run();
    expect(blindSpots.summary).toContain(
      'Lateral Movement has activity but only 1 of 2 enabled detection rules are working.'
    );
    expect(blindSpots.summary).toContain('18% of alerts have no MITRE ATT&CK mapping.');
    // Capped at three gaps: warnings first, then the first info gap (the ML-jobs gap is cut).
    expect(blindSpots.summary).toContain('No asset criticality on 1 material-risk entity.');
    expect(blindSpots.summary).toContain('14 local user accounts are not resolved to an identity.');
    expect(blindSpots.summary).not.toContain('No security ML jobs are running.');
    expect(blindSpots.evidence).toEqual(['TAC-TA0008', 'GAP-B6', 'GAP-B16', 'GAP-B5']);
  });

  it('uses the no-working-detection wording when a stage has zero effective rules', async () => {
    const stages = FIXTURE_SNAPSHOT.blindSpots.attackStages.stages.map((stage) =>
      stage.tacticId === 'TA0008'
        ? {
            ...stage,
            coverage: { enabled: 2, effective: 0 },
            flag: 'no_working_detection' as const,
          }
        : stage
    );
    const brief = await run({
      ...FIXTURE_SNAPSHOT,
      blindSpots: {
        ...FIXTURE_SNAPSHOT.blindSpots,
        attackStages: { ...FIXTURE_SNAPSHOT.blindSpots.attackStages, stages },
      },
    });
    expect(brief.blindSpots.summary).toContain('none of its 2 enabled detection rules are working');
    expect(brief.crossStorylineConclusion?.statement).toContain('no working detection coverage');
  });

  it('does not flag stages without activity', async () => {
    const stages = FIXTURE_SNAPSHOT.blindSpots.attackStages.stages.map((stage) =>
      stage.tacticId === 'TA0008'
        ? { ...stage, observed: { alerts: 0, attackDiscoveries: 0, mlAnomalies: 0 } }
        : stage
    );
    const brief = await run({
      ...FIXTURE_SNAPSHOT,
      blindSpots: {
        ...FIXTURE_SNAPSHOT.blindSpots,
        attackStages: { ...FIXTURE_SNAPSHOT.blindSpots.attackStages, stages },
      },
    });
    expect(brief.decisions.some((d) => d.relatesTo === 'TAC-TA0008')).toBe(false);
    expect(brief.crossStorylineConclusion).toBeUndefined();
  });

  it('ids_only mode never emits an entity display name', async () => {
    const brief = await run(FIXTURE_SNAPSHOT, 'ids_only');
    const text = JSON.stringify(brief);
    Object.values(FIXTURE_SNAPSHOT.entities).forEach(({ name }) => {
      expect(text.toLowerCase()).not.toContain(name.toLowerCase());
    });
    expect(brief.storylines[0].narrative).toContain(
      'ENT-1 and ENT-4 were part of the same discovered attack'
    );
  });

  it('only cites ids that exist in the catalog', async () => {
    const brief = await run();
    const cited = [
      ...brief.glance.evidence,
      ...brief.storylines.flatMap((s) => s.evidence),
      ...(brief.crossStorylineConclusion?.evidence ?? []),
      ...brief.blindSpots.evidence,
      ...brief.decisions.flatMap((d) => [...d.evidence, ...d.targets, d.relatesTo]),
    ];
    cited.forEach((id) => expect(FIXTURE_SNAPSHOT.catalog).toHaveProperty([id]));
  });

  it('caps decisions at five, most urgent first', async () => {
    const base = FIXTURE_SNAPSHOT.storylines.storylines[2];
    const many = Array.from({ length: 6 }, (_, i) => ({
      ...base,
      evidenceId: `STORY-${i + 1}` as const,
      rank: i + 1,
      severity: i === 5 ? ('critical' as const) : ('low' as const),
    }));
    const brief = await run({
      ...FIXTURE_SNAPSHOT,
      storylines: { ...FIXTURE_SNAPSHOT.storylines, storylines: many },
      catalog: {
        ...FIXTURE_SNAPSHOT.catalog,
        'STORY-4': { kind: 'story', rank: 4 },
        'STORY-5': { kind: 'story', rank: 5 },
        'STORY-6': { kind: 'story', rank: 6 },
      },
    });
    expect(brief.decisions).toHaveLength(5);
    expect(brief.decisions[0]).toMatchObject({ relatesTo: 'STORY-6', urgency: 'now' });
  });

  describe('degenerate snapshots', () => {
    const emptySnapshot: BriefSnapshot = {
      ...FIXTURE_SNAPSHOT,
      glance: { ...FIXTURE_SNAPSHOT.glance, exposureLeaders: [] },
      storylines: { storylines: [], otherNotableEntities: [], trace: [] },
      blindSpots: {
        attackStages: { stages: [], unmapped: { alerts: 0, share: 0, topRuleEvidenceIds: [] } },
        gaps: [],
      },
    };

    it('says plainly that no storyline was found and omits decisions and conclusion', async () => {
      const brief = await run(emptySnapshot);
      expect(brief.glance.headline).toBe(
        'No connected threat storylines were found in this period'
      );
      expect(brief.storylines).toEqual([]);
      expect(brief.decisions).toEqual([]);
      expect(brief.crossStorylineConclusion).toBeUndefined();
      expect(brief.blindSpots.summary).toBe('No blind spots were flagged in this period.');
    });

    it('cites exposure leaders for the empty-glance statement so it is not dropped', async () => {
      const brief = await run({
        ...emptySnapshot,
        glance: { ...emptySnapshot.glance, exposureLeaders: ['host:docker-host-prod-01'] },
      });
      expect(brief.glance.evidence).toEqual(['ENT-4']);
      const { validation } = validateBrief({ brief, snapshot: FIXTURE_SNAPSHOT });
      expect(validation.droppedClaims).toBeLessThanOrEqual(1);
    });

    it('produces uncited claims (which the validator drops) when nothing can be cited', async () => {
      const brief = await run(emptySnapshot);
      expect(brief.glance.evidence).toEqual([]);
      const { validation } = validateBrief({ brief, snapshot: emptySnapshot });
      expect(validation.droppedClaims).toBe(3);
    });

    it('handles a single-entity storyline with no edges', async () => {
      const [first] = FIXTURE_SNAPSHOT.storylines.storylines;
      const brief = await run({
        ...FIXTURE_SNAPSHOT,
        storylines: {
          ...FIXTURE_SNAPSHOT.storylines,
          storylines: [
            { ...first, entityEuids: ['user:a.rodriguez@acme.com@okta'], edges: [], hubEuids: [] },
          ],
        },
      });
      expect(brief.storylines[0].narrative).toContain('Activity progressed through');
      const { validation } = validateBrief({
        brief,
        snapshot: {
          ...FIXTURE_SNAPSHOT,
          storylines: {
            ...FIXTURE_SNAPSHOT.storylines,
            storylines: [
              {
                ...first,
                entityEuids: ['user:a.rodriguez@acme.com@okta'],
                edges: [],
                hubEuids: [],
              },
            ],
          },
        },
      });
      expect(validation.unbackedRelations).toEqual([]);
    });

    it('describes shared infrastructure when two storylines attach the same hub', async () => {
      const [first, second] = FIXTURE_SNAPSHOT.storylines.storylines;
      const snapshot: BriefSnapshot = {
        ...FIXTURE_SNAPSHOT,
        storylines: {
          ...FIXTURE_SNAPSHOT.storylines,
          storylines: [
            { ...first, tacticIds: ['TA0006'] },
            { ...second, hubEuids: ['host:DC01'] },
          ],
        },
      };
      const brief = await run(snapshot);
      expect(brief.crossStorylineConclusion?.statement).toBe(
        'DC01 is shared infrastructure attached to two storylines, so a problem there would affect all of them.'
      );
      expect(validateBrief({ brief, snapshot }).validation.droppedClaims).toBe(0);
    });
  });
});
