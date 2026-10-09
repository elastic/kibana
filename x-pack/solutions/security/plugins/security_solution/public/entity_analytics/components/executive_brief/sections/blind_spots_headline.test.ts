/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import type {
  AttackStage,
  BriefSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { pickBlindSpotHeadline } from './blind_spots_headline';

const base = FIXTURE_JOB_SUCCEEDED.snapshot as BriefSnapshot;

const withStages = (stages: AttackStage[]): BriefSnapshot => ({
  ...base,
  blindSpots: { ...base.blindSpots, attackStages: { ...base.blindSpots.attackStages, stages } },
});

const stage = (overrides: Partial<AttackStage> & Pick<AttackStage, 'tacticId'>): AttackStage => ({
  evidenceId: `TAC-${overrides.tacticId}`,
  tacticName: overrides.tacticId,
  position: 1,
  observed: { alerts: 3, attackDiscoveries: 0, mlAnomalies: 0 },
  coverage: { enabled: 1, effective: 1 },
  flag: 'limited_coverage',
  topRuleEvidenceIds: [],
  ...overrides,
});

describe('pickBlindSpotHeadline', () => {
  it('prefers stages with rules that are not working over single-rule stages', () => {
    const headline = pickBlindSpotHeadline(
      withStages([
        stage({ tacticId: 'TA0001', tacticName: 'Initial Access' }),
        stage({
          tacticId: 'TA0008',
          tacticName: 'Lateral Movement',
          coverage: { enabled: 2, effective: 1 },
        }),
      ])
    );
    expect(headline?.reason).toBe('rules_not_working');
    expect(headline?.stage.tacticId).toBe('TA0008');
    expect(headline?.title).toContain("Lateral Movement: 1 of 2 detection rules isn't working");
  });

  it('falls back to a stage on an unaddressed storyline path', () => {
    const [first] = base.storylines.storylines;
    const snapshot = withStages([
      stage({ tacticId: 'TA9999', observed: { alerts: 50, attackDiscoveries: 0, mlAnomalies: 0 } }),
      stage({ tacticId: first.tacticIds[0] ?? 'TA0001' }),
    ]);
    const headline = pickBlindSpotHeadline({
      ...snapshot,
      storylines: {
        ...snapshot.storylines,
        storylines: [{ ...first, response: { ...first.response, state: 'unaddressed' } }],
      },
    });
    expect(headline?.reason).toBe('unaddressed_storyline');
    expect(headline?.stage.tacticId).toBe(first.tacticIds[0] ?? 'TA0001');
  });

  it('falls back to alert volume and returns nothing without activity', () => {
    const snapshot = {
      ...withStages([
        stage({ tacticId: 'TA1', observed: { alerts: 2, attackDiscoveries: 0, mlAnomalies: 0 } }),
        stage({ tacticId: 'TA2', observed: { alerts: 9, attackDiscoveries: 0, mlAnomalies: 0 } }),
      ]),
      storylines: { ...base.storylines, storylines: [] },
    };
    expect(pickBlindSpotHeadline(snapshot)?.stage.tacticId).toBe('TA2');
    expect(
      pickBlindSpotHeadline({
        ...snapshot,
        blindSpots: {
          ...snapshot.blindSpots,
          attackStages: { ...snapshot.blindSpots.attackStages, stages: [] },
        },
      })
    ).toBeUndefined();
  });
});
