/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvidenceRegistry } from '../snapshot/evidence_registry';
import type { AlertsByTactic } from './alerts_by_tactic';
import { buildAttackStages, computeStageFlag } from './attack_stages';
import type { StageFlagInput } from './attack_stages';
import type { DetectionCoverage } from './detection_coverage';
import { createTestLookup } from './test_helpers';

const base: StageFlagInput = {
  alerts: 0,
  attackDiscoveries: 0,
  mlAnomalies: 0,
  alertsViaRule: 0,
  enabled: 10,
  effective: 10,
};

describe('computeStageFlag', () => {
  it('is none without activity, whatever the coverage', () => {
    expect(computeStageFlag({ ...base, enabled: 0, effective: 0 })).toBe('none');
  });

  it('is none for healthy coverage', () => {
    expect(computeStageFlag({ ...base, alerts: 5, alertsViaRule: 5 })).toBe('none');
  });

  it('is limited_coverage when effective rules are at or below the threshold', () => {
    expect(
      computeStageFlag({ ...base, alerts: 5, alertsViaRule: 5, enabled: 2, effective: 2 })
    ).toBe('limited_coverage');
    expect(
      computeStageFlag({ ...base, alerts: 5, alertsViaRule: 5, enabled: 2, effective: 1 })
    ).toBe('limited_coverage');
    expect(
      computeStageFlag({ ...base, alerts: 5, alertsViaRule: 5, enabled: 3, effective: 3 })
    ).toBe('none');
  });

  it('is limited_coverage when under half of the enabled rules are effective', () => {
    expect(
      computeStageFlag({ ...base, alerts: 5, alertsViaRule: 5, enabled: 20, effective: 9 })
    ).toBe('limited_coverage');
    expect(
      computeStageFlag({ ...base, alerts: 5, alertsViaRule: 5, enabled: 20, effective: 10 })
    ).toBe('none');
  });

  it('counts ML-only or AD-only activity', () => {
    expect(computeStageFlag({ ...base, mlAnomalies: 1, enabled: 2, effective: 1 })).toBe(
      'limited_coverage'
    );
    expect(computeStageFlag({ ...base, attackDiscoveries: 1, enabled: 2, effective: 1 })).toBe(
      'limited_coverage'
    );
  });

  it('is no_working_detection when activity is not rule-mapped and nothing works', () => {
    expect(computeStageFlag({ ...base, mlAnomalies: 2, enabled: 0, effective: 0 })).toBe(
      'no_working_detection'
    );
    expect(
      computeStageFlag({ ...base, alerts: 3, alertsViaRule: 0, enabled: 2, effective: 0 })
    ).toBe('no_working_detection');
  });

  it('is only limited_coverage when rule-mapped alerts exist but no rule is effective', () => {
    expect(
      computeStageFlag({ ...base, alerts: 3, alertsViaRule: 3, enabled: 2, effective: 0 })
    ).toBe('limited_coverage');
  });
});

const alerts: AlertsByTactic = {
  totalAlerts: 50,
  byTactic: new Map([
    ['TA0008', { viaRule: 5, viaEcs: 1, topRuleIds: ['rule-rdp', 'rule-edr'] }],
    ['TA0006', { viaRule: 19, viaEcs: 0, topRuleIds: ['rule-lsass'] }],
  ]),
  unmapped: { alerts: 9, topRuleIds: ['rule-edr'] },
  rules: new Map([
    ['rule-rdp', { ruleId: 'rule-rdp', name: 'RDP', severity: 'high' as const, alertCount: 5 }],
    [
      'rule-edr',
      { ruleId: 'rule-edr', name: 'EDR', severity: 'critical' as const, alertCount: 10 },
    ],
    [
      'rule-lsass',
      { ruleId: 'rule-lsass', name: 'LSASS', severity: 'critical' as const, alertCount: 19 },
    ],
  ]),
};

const coverage: DetectionCoverage = {
  byTactic: new Map([
    ['TA0008', { enabled: 2, effective: 1 }],
    ['TA0006', { enabled: 11, effective: 10 }],
    ['TA0001', { enabled: 9, effective: 8 }],
  ]),
  rulesById: new Map([
    [
      'rule-rdp',
      {
        ruleId: 'rule-rdp',
        name: 'RDP',
        tacticIds: ['TA0008'],
        techniquesByTactic: new Map([
          ['TA0008', [{ id: 'T1021.001', name: 'Remote Desktop Protocol' }]],
        ]),
        techniqueIds: ['T1021.001'],
        effective: true,
      },
    ],
  ]),
  enabledRules: 22,
  unmappedRules: 0,
  integrationsChecked: true,
};

describe('buildAttackStages', () => {
  it('merges activity and coverage per tactic in managed order and registers evidence', () => {
    const registry = new EvidenceRegistry();
    const summary = buildAttackStages(
      {
        lookup: createTestLookup(),
        alerts,
        coverage,
        attackDiscovery: { indexExists: true, byTactic: new Map([['TA0008', 1]]) },
        anomalies: {
          jobsInstalled: 3,
          jobsOpened: 3,
          totalAnomalies: 4,
          byTactic: new Map([['TA0008', 2]]),
        },
      },
      registry
    );

    expect(summary.stages.map(({ tacticId }) => tacticId)).toEqual(['TA0001', 'TA0006', 'TA0008']);
    const lateral = summary.stages.find(({ tacticId }) => tacticId === 'TA0008');
    expect(lateral).toEqual({
      evidenceId: 'TAC-TA0008',
      tacticId: 'TA0008',
      tacticName: 'Lateral Movement',
      position: 10,
      topTechnique: { id: 'T1021.001', name: 'Remote Desktop Protocol' },
      observed: { alerts: 6, attackDiscoveries: 1, mlAnomalies: 2 },
      coverage: { enabled: 2, effective: 1 },
      flag: 'limited_coverage',
      topRuleEvidenceIds: ['RULE-2', 'RULE-3'],
    });
    // Coverage without activity still gets a stage, with no flag.
    expect(summary.stages[0]).toMatchObject({
      tacticId: 'TA0001',
      observed: { alerts: 0, attackDiscoveries: 0, mlAnomalies: 0 },
      flag: 'none',
    });
    expect(summary.unmapped).toEqual({ alerts: 9, share: 0.18, topRuleEvidenceIds: ['RULE-3'] });
    expect(registry.has('TAC-TA0008')).toBe(true);
    expect(registry.has('RULE-3')).toBe(true);
  });

  it('flags activity seen only through ML as no_working_detection', () => {
    const summary = buildAttackStages(
      {
        lookup: createTestLookup(),
        anomalies: {
          jobsInstalled: 1,
          jobsOpened: 1,
          totalAnomalies: 3,
          byTactic: new Map([['TA0010', 3]]),
        },
      },
      new EvidenceRegistry()
    );
    expect(summary.stages).toHaveLength(1);
    expect(summary.stages[0].flag).toBe('no_working_detection');
    expect(summary.unmapped).toEqual({ alerts: 0, share: 0, topRuleEvidenceIds: [] });
  });
});
