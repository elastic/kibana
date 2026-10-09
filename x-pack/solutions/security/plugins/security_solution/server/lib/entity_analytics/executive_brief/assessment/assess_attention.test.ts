/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackStage,
  AttentionArea,
  AttentionAreaId,
  BlindSpotGap,
  BlindSpotSignalId,
  BriefEntity,
  GlanceStat,
  ResponseState,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import { LLM_RUN_SNAPSHOT } from '../validation/__fixtures__/llm_sonnet5_names_run';
import { assessAttention } from './assess_attention';
import type { AttentionInput } from './assess_attention';

const entity = (id: number, patch: Partial<BriefEntity> = {}): BriefEntity => ({
  evidenceId: `ENT-${id}`,
  euid: `user:u${id}`,
  type: 'user',
  name: `u${id}`,
  watchlists: [],
  isPrivileged: false,
  aliases: [],
  ...patch,
});

const storyline = ({
  rank = 1,
  state = 'unaddressed',
  severity = 'medium',
  entityEuids = ['user:u1'],
  tacticIds = [],
  cases = [],
}: {
  rank?: number;
  state?: ResponseState;
  severity?: Storyline['severity'];
  entityEuids?: string[];
  tacticIds?: string[];
  cases?: Storyline['response']['cases'];
} = {}): Storyline => ({
  evidenceId: `STORY-${rank}`,
  rank,
  score: 1,
  severity,
  entityEuids,
  hubEuids: [],
  seeds: [],
  edges: [],
  events: [],
  eventsTruncated: 0,
  tacticIds,
  linkStrength: 'strong',
  response: { state, cases, alerts: { open: 0, acknowledged: 0, closed: 0 } },
});

const stage = (
  tacticId: string,
  patch: Partial<AttackStage> & { name?: string } = {}
): AttackStage => {
  const { name, ...rest } = patch;
  return {
    evidenceId: `TAC-${tacticId}`,
    tacticId,
    tacticName: name ?? `Stage ${tacticId}`,
    position: Number(tacticId.slice(2)),
    observed: { alerts: 1, attackDiscoveries: 0, mlAnomalies: 0 },
    coverage: { enabled: 4, effective: 4 },
    flag: 'none',
    topRuleEvidenceIds: [],
    ...rest,
  };
};

const GROUP_BY_SIGNAL: Partial<Record<BlindSpotSignalId, BlindSpotGap['group']>> = {
  B1: 'data_not_collected',
  B4: 'attribution_gap',
  B5: 'context_missing',
  B6: 'context_missing',
  B8: 'attribution_gap',
  B9: 'data_not_collected',
  B10: 'analytics_not_running',
  B11: 'analytics_not_running',
  B12: 'analytics_not_running',
  B13: 'analytics_not_running',
  B15: 'data_not_collected',
  B16: 'detection_coverage',
  B17: 'response_gap',
};

const gap = (signal: BlindSpotSignalId, patch: Partial<BlindSpotGap> = {}): BlindSpotGap => ({
  evidenceId: `GAP-${signal}`,
  signal,
  group: GROUP_BY_SIGNAL[signal] ?? 'context_missing',
  severity: 'warning',
  title: `Title of ${signal}.`,
  ...patch,
});

const input = ({
  storylines = [],
  stages = [],
  gaps = [],
  entities = [entity(1)],
  stats = [],
}: {
  storylines?: Storyline[];
  stages?: AttackStage[];
  gaps?: BlindSpotGap[];
  entities?: BriefEntity[];
  stats?: GlanceStat[];
} = {}): AttentionInput => ({
  glance: { stats },
  storylines: { storylines },
  blindSpots: {
    attackStages: { stages, unmapped: { alerts: 0, share: 0, topRuleEvidenceIds: [] } },
    gaps,
  },
  entities: Object.fromEntries(entities.map((record) => [record.euid, record])),
});

const area = (
  assessment: ReturnType<typeof assessAttention>,
  id: AttentionAreaId
): AttentionArea => {
  const found = assessment.areas.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`area ${id} missing`);
  }
  return found;
};

describe('assessAttention', () => {
  describe('empty snapshot', () => {
    it('is clear in every area, in a fixed area order, without a trend', () => {
      const assessment = assessAttention(input());
      expect(assessment).toEqual({
        level: 'clear',
        areas: [
          {
            id: 'threats',
            level: 'clear',
            summary: 'No priority threats',
            rule: expect.any(String),
            evidence: [],
          },
          {
            id: 'response',
            level: 'clear',
            summary: 'Nothing to respond to',
            rule: expect.any(String),
            evidence: [],
          },
          {
            id: 'coverage',
            level: 'clear',
            summary: 'No stages with activity',
            rule: expect.any(String),
            evidence: [],
          },
          {
            id: 'visibility',
            level: 'clear',
            summary: 'All analytics running',
            rule: expect.any(String),
            evidence: [],
          },
        ],
      });
      expect(assessment).not.toHaveProperty('trend');
    });
  });

  describe('threats', () => {
    it.each(['critical', 'high'] as const)(
      'is urgent for an unaddressed %s threat, whoever is in it',
      (severity) => {
        const result = area(
          assessAttention(input({ storylines: [storyline({ severity })] })),
          'threats'
        );
        expect(result.level).toBe('urgent');
        expect(result.summary).toBe(
          severity === 'critical'
            ? '1 critical threat unaddressed'
            : '1 high-severity threat unaddressed'
        );
        expect(result.rule).toBe(`unaddressed ${severity} threat`);
        expect(result.evidence).toEqual(['STORY-1']);
      }
    );

    it('is urgent for an unaddressed medium threat that includes an extreme-impact asset', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ entityEuids: ['host:h2'] })],
            entities: [entity(2, { euid: 'host:h2', type: 'host', criticality: 'extreme_impact' })],
          })
        ),
        'threats'
      );
      expect(result.level).toBe('urgent');
      expect(result.summary).toBe('1 threat unaddressed');
      expect(result.rule).toBe('unaddressed threat involves an extreme-impact asset');
    });

    it('is urgent for an unaddressed medium threat touching a privileged user', () => {
      const assessment = assessAttention(
        input({
          storylines: [storyline({ severity: 'medium', entityEuids: ['user:u1', 'user:u2'] })],
          entities: [entity(1), entity(2, { isPrivileged: true })],
        })
      );
      expect(assessment.level).toBe('urgent');
      expect(area(assessment, 'threats')).toMatchObject({
        level: 'urgent',
        rule: 'unaddressed threat involves a privileged identity',
      });
    });

    it('names every reason that applies to the same threat', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ severity: 'critical', entityEuids: ['user:u1', 'host:h2'] })],
            entities: [
              entity(1, { isPrivileged: true }),
              entity(2, { euid: 'host:h2', criticality: 'extreme_impact' }),
            ],
          })
        ),
        'threats'
      );
      expect(result.rule).toBe(
        'unaddressed critical threat involves a privileged identity and an extreme-impact asset'
      );
    });

    it('does not mix reasons across different threats', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [
              storyline({ rank: 1, severity: 'critical', entityEuids: ['user:u1'] }),
              storyline({ rank: 2, severity: 'medium', entityEuids: ['user:u2'] }),
            ],
            entities: [entity(1), entity(2, { isPrivileged: true })],
          })
        ),
        'threats'
      );
      expect(result.summary).toBe('2 threats unaddressed');
      expect(result.rule).toBe(
        'unaddressed critical threat; unaddressed threat involves a privileged identity'
      );
      expect(result.evidence).toEqual(['STORY-1', 'STORY-2']);
    });

    it('labels a mix of critical and high threats and counts only the urgent ones', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [
              storyline({ rank: 1, severity: 'critical' }),
              storyline({ rank: 2, severity: 'high' }),
              storyline({ rank: 3, severity: 'low' }),
            ],
          })
        ),
        'threats'
      );
      expect(result.summary).toBe('2 critical/high threats unaddressed');
      expect(result.evidence).toEqual(['STORY-1', 'STORY-2']);
    });

    it('drops the severity label when an urgent threat is only urgent through its entities', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [
              storyline({ rank: 1, severity: 'critical' }),
              storyline({ rank: 2, severity: 'medium', entityEuids: ['user:u2'] }),
            ],
            entities: [entity(1), entity(2, { isPrivileged: true })],
          })
        ),
        'threats'
      );
      expect(result.summary).toBe('2 threats unaddressed');
    });

    it('is action for an unaddressed medium or low threat with ordinary entities', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [
              storyline({ rank: 1, severity: 'medium' }),
              storyline({ rank: 2, severity: 'low' }),
            ],
            entities: [entity(1, { criticality: 'high_impact' })],
          })
        ),
        'threats'
      );
      expect(result).toMatchObject({
        level: 'action',
        summary: '2 threats unaddressed',
        evidence: ['STORY-1', 'STORY-2'],
      });
    });

    it('uses the singular for one unaddressed threat', () => {
      expect(area(assessAttention(input({ storylines: [storyline()] })), 'threats').summary).toBe(
        '1 threat unaddressed'
      );
    });

    it('is watch, not urgent, for a handled critical threat that touches a privileged user', () => {
      const assessment = assessAttention(
        input({
          storylines: [
            storyline({ rank: 1, severity: 'critical', state: 'in_progress' }),
            storyline({ rank: 2, severity: 'high', state: 'in_progress' }),
          ],
          entities: [entity(1, { isPrivileged: true, criticality: 'extreme_impact' })],
        })
      );
      expect(area(assessment, 'threats')).toMatchObject({
        level: 'watch',
        summary: '2 threats being handled',
        evidence: ['STORY-1', 'STORY-2'],
      });
      expect(assessment.level).not.toBe('urgent');
    });

    it('describes contained and mixed threats accurately', () => {
      const summary = (...states: ResponseState[]) =>
        area(
          assessAttention(
            input({
              storylines: states.map((state, index) => storyline({ rank: index + 1, state })),
            })
          ),
          'threats'
        ).summary;
      expect(summary('contained')).toBe('1 threat contained');
      expect(summary('contained', 'contained')).toBe('2 threats contained');
      expect(summary('in_progress', 'contained')).toBe('1 threat being handled, 1 contained');
    });

    it('does not escalate through entities that are not part of the threat or hubs', () => {
      const result = area(
        assessAttention({
          ...input({
            storylines: [storyline({ entityEuids: ['user:u1'] })],
            entities: [entity(1), entity(2, { isPrivileged: true })],
          }),
        }),
        'threats'
      );
      expect(result.level).toBe('action');
    });

    it('states missing entity records instead of silently ignoring them', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ entityEuids: ['user:u1', 'user:ghost', 'user:ghost2'] })],
          })
        ),
        'threats'
      );
      expect(result.level).toBe('action');
      expect(result.rule).toContain('details missing for 2 entities');
    });

    it('does not mention missing entities for handled threats', () => {
      const result = area(
        assessAttention(
          input({ storylines: [storyline({ state: 'contained', entityEuids: ['user:ghost'] })] })
        ),
        'threats'
      );
      expect(result.rule).not.toContain('missing');
    });
  });

  describe('response', () => {
    it('is action when B17 is present, using its value', () => {
      const result = area(
        assessAttention(input({ gaps: [gap('B17', { value: 9, group: 'response_gap' })] })),
        'response'
      );
      expect(result).toMatchObject({
        level: 'action',
        summary: '9 high/critical alerts have no case',
        evidence: ['GAP-B17'],
      });
    });

    it('uses the singular for one alert, and survives a missing value', () => {
      expect(
        area(assessAttention(input({ gaps: [gap('B17', { value: 1 })] })), 'response').summary
      ).toBe('1 high/critical alert has no case');
      expect(area(assessAttention(input({ gaps: [gap('B17')] })), 'response').summary).toBe(
        'High/critical alerts have no case'
      );
    });

    it('is never urgent, even with a critical unaddressed threat and a danger gap', () => {
      const assessment = assessAttention(
        input({
          storylines: [storyline({ severity: 'critical' })],
          gaps: [gap('B17', { value: 12, severity: 'danger' })],
        })
      );
      expect(area(assessment, 'response').level).toBe('action');
      expect(area(assessment, 'threats').level).toBe('urgent');
    });

    it('is watch when a threat is in progress, counting open cases once', () => {
      const caseRef = (n: number, status: 'open' | 'in-progress' | 'closed') => ({
        evidenceId: `CASE-${n}` as const,
        caseId: `case-${n}`,
        title: `Case ${n}`,
        status,
      });
      const result = area(
        assessAttention(
          input({
            storylines: [
              storyline({ rank: 1, state: 'in_progress', cases: [caseRef(1, 'in-progress')] }),
              storyline({
                rank: 2,
                state: 'in_progress',
                cases: [caseRef(1, 'in-progress'), caseRef(2, 'closed')],
              }),
            ],
          })
        ),
        'response'
      );
      expect(result).toMatchObject({
        level: 'watch',
        summary: '1 case in progress',
        evidence: ['STORY-1', 'STORY-2'],
      });
    });

    it('says so when a threat is in progress only through acknowledged alerts', () => {
      const result = area(
        assessAttention(input({ storylines: [storyline({ state: 'in_progress' })] })),
        'response'
      );
      expect(result).toMatchObject({
        level: 'watch',
        summary: '1 threat acknowledged, no case',
      });
    });

    it('is clear with "All threats have an owner" when every threat is handled or contained', () => {
      const result = area(
        assessAttention(input({ storylines: [storyline({ state: 'contained' })] })),
        'response'
      );
      expect(result).toMatchObject({ level: 'clear', summary: 'All threats have an owner' });
    });

    it('B17 outranks in-progress threats', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ state: 'in_progress' })],
            gaps: [gap('B17', { value: 2 })],
          })
        ),
        'response'
      );
      expect(result.level).toBe('action');
    });

    it('is action with "no owner" for an unaddressed threat that has no B17 gap', () => {
      const result = area(
        assessAttention(input({ storylines: [storyline({ rank: 1 }), storyline({ rank: 2 })] })),
        'response'
      );
      expect(result).toMatchObject({
        level: 'action',
        summary: '2 threats have no owner',
        evidence: ['STORY-1', 'STORY-2'],
      });
    });
  });

  describe('coverage', () => {
    it('is action for a stage with no working detection, whatever the threats', () => {
      const result = area(
        assessAttention(
          input({
            stages: [
              stage('TA0001', {
                name: 'Initial Access',
                flag: 'no_working_detection',
                coverage: { enabled: 2, effective: 0 },
              }),
            ],
          })
        ),
        'coverage'
      );
      expect(result).toMatchObject({
        level: 'action',
        summary: 'Initial Access: 2 of 2 rules not working',
        evidence: ['TAC-TA0001'],
      });
    });

    it('says no rules enabled, and a single rule, accurately', () => {
      const summary = (enabled: number, effective: number) =>
        area(
          assessAttention(
            input({
              stages: [
                stage('TA0008', {
                  name: 'Lateral Movement',
                  flag: 'no_working_detection',
                  coverage: { enabled, effective },
                }),
              ],
            })
          ),
          'coverage'
        ).summary;
      expect(summary(0, 0)).toBe('Lateral Movement: no rules enabled');
      expect(summary(1, 0)).toBe('Lateral Movement: 1 of 1 rule not working');
      expect(summary(3, 3)).toBe('Lateral Movement: no working detection');
    });

    it('is action when rules are not working in a stage of an unaddressed threat', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ tacticIds: ['TA0008'] })],
            stages: [
              stage('TA0008', {
                name: 'Lateral Movement',
                flag: 'limited_coverage',
                coverage: { enabled: 2, effective: 1 },
              }),
            ],
          })
        ),
        'coverage'
      );
      expect(result).toMatchObject({
        level: 'action',
        summary: 'Lateral Movement: 1 of 2 rules not working',
        evidence: ['TAC-TA0008'],
      });
    });

    it('is only watch when the degraded stage belongs to a handled threat', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ state: 'in_progress', tacticIds: ['TA0008'] })],
            stages: [
              stage('TA0008', {
                flag: 'limited_coverage',
                coverage: { enabled: 2, effective: 1 },
              }),
            ],
          })
        ),
        'coverage'
      );
      expect(result.level).toBe('watch');
    });

    it('is not action when the degraded stage is in no threat, or when its rules all work', () => {
      const degraded = stage('TA0008', { coverage: { enabled: 2, effective: 1 } });
      expect(
        area(
          assessAttention(
            input({ storylines: [storyline({ tacticIds: ['TA0001'] })], stages: [degraded] })
          ),
          'coverage'
        ).level
      ).toBe('clear');
      expect(
        area(
          assessAttention(
            input({
              storylines: [storyline({ tacticIds: ['TA0008'] })],
              stages: [stage('TA0008', { flag: 'limited_coverage' })],
            })
          ),
          'coverage'
        ).level
      ).toBe('watch');
    });

    it('leads with the stage that has the most broken rules and counts the rest', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ tacticIds: ['TA0002', 'TA0003', 'TA0004'] })],
            stages: [
              stage('TA0002', { name: 'Execution', coverage: { enabled: 3, effective: 2 } }),
              stage('TA0003', { name: 'Persistence', coverage: { enabled: 5, effective: 2 } }),
              stage('TA0004', {
                name: 'Privilege Escalation',
                coverage: { enabled: 2, effective: 1 },
              }),
            ],
          })
        ),
        'coverage'
      );
      expect(result.summary).toBe('Persistence: 3 of 5 rules not working · +2 more stages');
      expect(result.evidence).toEqual(['TAC-TA0003', 'TAC-TA0002', 'TAC-TA0004']);
    });

    it('puts a stage with no working detection ahead of a degraded one', () => {
      const result = area(
        assessAttention(
          input({
            storylines: [storyline({ tacticIds: ['TA0002'] })],
            stages: [
              stage('TA0002', { name: 'Execution', coverage: { enabled: 9, effective: 1 } }),
              stage('TA0009', {
                name: 'Collection',
                flag: 'no_working_detection',
                coverage: { enabled: 1, effective: 0 },
              }),
            ],
          })
        ),
        'coverage'
      );
      expect(result.summary).toBe('Collection: 1 of 1 rule not working · +1 more stage');
    });

    it('is watch for limited coverage, counting stages', () => {
      const result = area(
        assessAttention(
          input({
            stages: [
              stage('TA0001', { flag: 'limited_coverage' }),
              stage('TA0002', { flag: 'limited_coverage' }),
              stage('TA0003', { flag: 'limited_coverage' }),
              stage('TA0004'),
            ],
          })
        ),
        'coverage'
      );
      expect(result).toMatchObject({
        level: 'watch',
        summary: 'Limited coverage on 3 stages with activity',
        evidence: ['TAC-TA0001', 'TAC-TA0002', 'TAC-TA0003'],
      });
      expect(
        area(
          assessAttention(input({ stages: [stage('TA0001', { flag: 'limited_coverage' })] })),
          'coverage'
        ).summary
      ).toBe('Limited coverage on 1 stage with activity');
    });

    it('is clear when every active stage works', () => {
      expect(area(assessAttention(input({ stages: [stage('TA0001')] })), 'coverage')).toMatchObject(
        {
          level: 'clear',
          summary: 'Working coverage on all active stages',
          evidence: [],
        }
      );
    });
  });

  describe('visibility', () => {
    it('is watch with the top two phrases ordered by severity, then signal number', () => {
      const result = area(
        assessAttention(
          input({
            gaps: [
              gap('B5', { severity: 'info', value: 173 }),
              gap('B12', { severity: 'info' }),
              gap('B6', { severity: 'warning', value: 3 }),
              gap('B10', { severity: 'warning' }),
            ],
          })
        ),
        'visibility'
      );
      expect(result.level).toBe('watch');
      // warning first (B6, B10), then info (B5, B12): the top two are the two warnings.
      expect(result.summary).toBe(
        '3 key assets without criticality · Attack Discovery not running'
      );
      expect(result.evidence).toEqual(['GAP-B6', 'GAP-B10', 'GAP-B5', 'GAP-B12']);
      expect(result.rule).toBe('analytics not running; context missing');
    });

    it('orders the same severity by signal number, numerically', () => {
      const result = area(
        assessAttention(
          input({
            gaps: [gap('B12', { severity: 'info' }), gap('B5', { severity: 'info', value: 173 })],
          })
        ),
        'visibility'
      );
      expect(result.summary).toBe('173 identities unresolved · ML off');
    });

    it('puts a danger gap before warnings regardless of signal number', () => {
      const result = area(
        assessAttention(
          input({
            gaps: [gap('B1', { severity: 'warning' }), gap('B15', { severity: 'danger' })],
          })
        ),
        'visibility'
      );
      expect(result.summary).toBe('No vulnerability data · No identity provider data');
    });

    it.each<[BlindSpotSignalId, string, number | undefined]>([
      ['B12', 'ML off', undefined],
      ['B10', 'Attack Discovery not running', undefined],
      ['B11', 'Hunting leads stale', undefined],
      ['B13', 'Risk scoring stale', undefined],
      ['B5', '173 identities unresolved', 173],
      ['B5', '1 identity unresolved', 1],
      ['B5', 'Identities unresolved', undefined],
      ['B6', '2 key assets without criticality', 2],
      ['B6', '1 key asset without criticality', 1],
      ['B1', 'No identity provider data', undefined],
      ['B9', 'Some entity types not monitored', undefined],
      ['B15', 'No vulnerability data', undefined],
    ])('maps %s to its short phrase', (signal, phrase, value) => {
      expect(
        area(assessAttention(input({ gaps: [gap(signal, { value })] })), 'visibility').summary
      ).toBe(phrase);
    });

    it('uses the gap title for a visibility signal without a short phrase', () => {
      expect(
        area(
          assessAttention(
            input({
              gaps: [gap('B3', { group: 'data_not_collected', title: 'Something is off.' })],
            })
          ),
          'visibility'
        ).summary
      ).toBe('Something is off');
    });

    it('does not repeat a phrase when a signal reports twice', () => {
      expect(
        area(
          assessAttention(
            input({
              gaps: [
                gap('B10', { severity: 'warning' }),
                gap('B10', { severity: 'info' }),
                gap('B12'),
              ],
            })
          ),
          'visibility'
        ).summary
      ).toBe('Attack Discovery not running · ML off');
    });

    it.each<BlindSpotGap['group']>([
      'analytics_not_running',
      'data_not_collected',
      'context_missing',
    ])('a gap in %s makes it watch', (group) => {
      expect(
        area(assessAttention(input({ gaps: [gap('B3', { group })] })), 'visibility').level
      ).toBe('watch');
    });

    it.each<BlindSpotGap['group']>(['detection_coverage', 'attribution_gap', 'response_gap'])(
      'a gap in %s does not count for visibility',
      (group) => {
        expect(
          area(assessAttention(input({ gaps: [gap('B3', { group })] })), 'visibility')
        ).toMatchObject({ level: 'clear', summary: 'All analytics running' });
      }
    );

    it('is never above watch, even with many danger gaps', () => {
      const assessment = assessAttention(
        input({
          gaps: (['B1', 'B5', 'B6', 'B9', 'B10', 'B11', 'B12', 'B13', 'B15'] as const).map((s) =>
            gap(s, { severity: 'danger', value: 50 })
          ),
        })
      );
      expect(area(assessment, 'visibility').level).toBe('watch');
      expect(assessment.level).toBe('watch');
    });
  });

  describe('overall level', () => {
    it('is the most severe area level', () => {
      const levels = (patch: Parameters<typeof input>[0]) => assessAttention(input(patch)).level;
      expect(levels({ gaps: [gap('B12')] })).toBe('watch');
      expect(levels({ stages: [stage('TA0001', { flag: 'limited_coverage' })] })).toBe('watch');
      expect(levels({ gaps: [gap('B17', { value: 1 })] })).toBe('action');
      expect(levels({ storylines: [storyline()] })).toBe('action');
      expect(levels({ storylines: [storyline({ severity: 'high' })], gaps: [gap('B12')] })).toBe(
        'urgent'
      );
      // Existing threats keep the threats area at watch even when contained.
      expect(levels({ storylines: [storyline({ state: 'contained' })] })).toBe('watch');
      expect(levels({})).toBe('clear');
    });
  });

  describe('trend', () => {
    const trend = (stat: Partial<GlanceStat> | undefined) =>
      assessAttention(
        input({
          stats: stat
            ? [{ id: 'activeSignals', value: 10, upIsBad: true, ...stat }]
            : [{ id: 'postureScore', value: 1, delta: 5, upIsBad: true }],
        })
      ).trend;

    it('follows the sign of the activeSignals delta', () => {
      expect(trend({ delta: 12 })).toBe('more');
      expect(trend({ delta: -3 })).toBe('less');
      expect(trend({ delta: 0 })).toBe('same');
    });

    it('is undefined without an activeSignals delta, and ignores other stats', () => {
      expect(trend({ delta: undefined })).toBeUndefined();
      expect(trend(undefined)).toBeUndefined();
    });

    it('never changes the level', () => {
      const withTrend = assessAttention(
        input({ stats: [{ id: 'activeSignals', value: 99, delta: 90, upIsBad: true }] })
      );
      expect(withTrend.level).toBe('clear');
      expect(withTrend.trend).toBe('more');
    });
  });

  describe('determinism', () => {
    it('returns equal output for equal input, and leaves the input untouched', () => {
      const parts = input({
        storylines: [storyline({ severity: 'high' })],
        stages: [
          stage('TA0002', { coverage: { enabled: 3, effective: 1 } }),
          stage('TA0001', { coverage: { enabled: 3, effective: 1 } }),
        ],
        gaps: [gap('B12'), gap('B5', { value: 4 }), gap('B17', { value: 1 })],
      });
      const before = JSON.parse(JSON.stringify(parts));
      expect(assessAttention(parts)).toEqual(assessAttention(parts));
      expect(parts).toEqual(before);
    });

    it('does not depend on the order of gaps or stages', () => {
      const gaps = [gap('B12'), gap('B5', { value: 4 }), gap('B6', { value: 2 })];
      const stages = [
        stage('TA0002', { coverage: { enabled: 3, effective: 1 } }),
        stage('TA0001', { coverage: { enabled: 3, effective: 1 } }),
      ];
      const storylines = [storyline({ tacticIds: ['TA0001', 'TA0002'] })];
      expect(
        assessAttention(
          input({ gaps: [...gaps].reverse(), stages: [...stages].reverse(), storylines })
        )
      ).toEqual(assessAttention(input({ gaps, stages, storylines })));
    });
  });

  describe('FIXTURE_SNAPSHOT', () => {
    it('is deterministic and produces valid evidence ids from the snapshot catalog', () => {
      const assessment = assessAttention(FIXTURE_SNAPSHOT);
      expect(assessAttention(FIXTURE_SNAPSHOT)).toEqual(assessment);
      assessment.areas
        .flatMap(({ evidence }) => evidence)
        .forEach((id) => expect(FIXTURE_SNAPSHOT.catalog).toHaveProperty([id]));
    });
  });

  describe('real LLM run snapshot (names run)', () => {
    const assessment = assessAttention(LLM_RUN_SNAPSHOT);

    it('is urgent overall', () => {
      expect(assessment.level).toBe('urgent');
      expect(assessment.areas.map(({ id }) => id)).toEqual([
        'threats',
        'response',
        'coverage',
        'visibility',
      ]);
      expect(assessment.trend).toBe('more');
    });

    it('threats are urgent: the unaddressed critical threat with a privileged, extreme-impact entity', () => {
      expect(area(assessment, 'threats')).toMatchObject({
        level: 'urgent',
        summary: '1 critical threat unaddressed',
        evidence: ['STORY-1'],
      });
    });

    it('response is action because of B17', () => {
      expect(area(assessment, 'response')).toEqual({
        id: 'response',
        level: 'action',
        summary: '9 high/critical alerts have no case',
        rule: expect.any(String),
        evidence: ['GAP-B17'],
      });
    });

    it('coverage is action because of Lateral Movement', () => {
      expect(area(assessment, 'coverage')).toMatchObject({
        level: 'action',
        summary: 'Lateral Movement: 1 of 2 rules not working',
        evidence: ['TAC-TA0008'],
      });
    });

    it('visibility is watch with the two highest-severity phrases', () => {
      expect(area(assessment, 'visibility')).toMatchObject({
        level: 'watch',
        summary: '1 key asset without criticality · 173 identities unresolved',
        evidence: ['GAP-B6', 'GAP-B5', 'GAP-B12'],
      });
    });

    it('only cites evidence ids that exist in the snapshot catalog', () => {
      assessment.areas
        .flatMap(({ evidence }) => evidence)
        .forEach((id) => expect(LLM_RUN_SNAPSHOT.catalog).toHaveProperty([id]));
    });
  });
});
