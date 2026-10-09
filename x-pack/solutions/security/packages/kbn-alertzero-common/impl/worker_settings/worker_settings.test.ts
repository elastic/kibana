/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '../../constants';
import { WorkerSettings } from '../schemas';
import {
  applyWorkerSettingsWrite,
  buildCompleteWorkerSettingsSchema,
  buildDefaultWorkerSettings,
  diffWorkerSettings,
  formatWorkerSettingsIssues,
} from './contract';
import {
  RULE_TUNING_DEFAULT_EXTRAS,
  WORKER_SETTINGS_DECLARATIONS,
  createDefaultWorkerSettings,
  getAllowedAutonomyLevels,
  getCompleteWorkerSettingsSchema,
} from '.';
import type { WorkerSettingsDeclaration } from './types';

const RULE_TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;
const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const ATTACK_DISCOVERY = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

const issuesOf = (workerId: string, candidate: unknown): string => {
  const result = getCompleteWorkerSettingsSchema(workerId).safeParse(candidate);
  if (result.success) {
    throw new Error('Expected the candidate to be rejected');
  }
  return formatWorkerSettingsIssues(result.error);
};

describe('Worker settings declarations', () => {
  it('cover every registered Worker exactly once', () => {
    expect(WORKER_SETTINGS_DECLARATIONS.map(({ workerId }) => workerId).sort()).toEqual(
      [...SYSTEM_SECURITY_WORKER_IDS].sort()
    );
  });

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s defaults pass both the generic and the complete schema',
    (workerId) => {
      const defaults = createDefaultWorkerSettings(workerId);

      expect(WorkerSettings.parse(defaults)).toEqual(defaults);
      expect(getCompleteWorkerSettingsSchema(workerId).parse(defaults)).toEqual(defaults);
      expect(defaults).toEqual(expect.objectContaining({ workerId, autonomy: 'manual' }));
    }
  );

  it('nests Worker-specific fields under extras', () => {
    expect(createDefaultWorkerSettings(RULE_TUNING)).toEqual({
      workerId: RULE_TUNING,
      autonomy: 'manual',
      scheduleInterval: '2h',
      extras: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 },
    });
    expect(createDefaultWorkerSettings(TRIAGE)).toEqual({
      workerId: TRIAGE,
      autonomy: 'manual',
      scheduleInterval: '15m',
      extras: {
        autoCloseConfidenceScoreMinThreshold: 0.85,
        budgetPerHour: 1300,
        lookbackHours: 24,
      },
    });
    expect(createDefaultWorkerSettings(ATTACK_DISCOVERY)).not.toHaveProperty('extras');
  });

  it('gives Continuous Threat Hunt a 4h schedule and no extras: only autonomy and schedule are configurable', () => {
    expect(
      createDefaultWorkerSettings(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)
    ).toEqual({
      workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
      autonomy: 'manual',
      scheduleInterval: '4h',
    });
  });

  it('allows only Manual autonomy for Continuous Threat Hunt', () => {
    expect(getAllowedAutonomyLevels(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)).toEqual(
      ['manual']
    );
  });

  it('rejects Assisted autonomy for Continuous Threat Hunt', () => {
    expect(
      issuesOf(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID, {
        workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
        autonomy: 'assisted',
        scheduleInterval: '4h',
      })
    ).toContain('autonomy');
  });

  it('rejects an extras field on Continuous Threat Hunt, which owns no dials', () => {
    expect(
      issuesOf(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID, {
        workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
        autonomy: 'manual',
        scheduleInterval: '4h',
        extras: { tier2When: 'always' },
      })
    ).toMatch(/extras/);
  });

  it('rejects an unknown top-level key by name', () => {
    expect(issuesOf(TRIAGE, { workerId: TRIAGE, autonomy: 'manual', candidateLimit: 5 })).toContain(
      'candidateLimit'
    );
  });

  it("rejects another Worker's extras field by name", () => {
    expect(
      issuesOf(TRIAGE, { workerId: TRIAGE, autonomy: 'manual', extras: { analysisWindowDays: 7 } })
    ).toMatch(/extras/);
  });

  it('rejects a schedule interval on a Worker that owns no schedule', () => {
    const endpointAnalysis = SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;
    expect(
      issuesOf(endpointAnalysis, {
        workerId: endpointAnalysis,
        autonomy: 'manual',
        scheduleInterval: '2h',
      })
    ).toContain('scheduleInterval');
  });

  it('rejects an extras replacement missing a required field, naming it', () => {
    expect(
      issuesOf(RULE_TUNING, {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: {},
      })
    ).toContain('extras.analysisWindowDays');
  });

  it('rejects an unknown extras key on the owning Worker, naming it', () => {
    expect(
      issuesOf(RULE_TUNING, {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: {
          analysisWindowDays: 7,
          fpCountThreshold: 10,
          fpRateThresholdPct: 50,
          previewDepth: 3,
        },
      })
    ).toMatch(/extras.*previewDepth/);
  });

  it.each([0, 31, 7.5])('rejects analysisWindowDays %s', (analysisWindowDays) => {
    expect(
      issuesOf(RULE_TUNING, {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays },
      })
    ).toContain('extras.analysisWindowDays');
  });

  it.each([1, 101, 10.5])('rejects fpCountThreshold %s', (fpCountThreshold) => {
    expect(
      issuesOf(RULE_TUNING, {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { ...RULE_TUNING_DEFAULT_EXTRAS, fpCountThreshold },
      })
    ).toContain('extras.fpCountThreshold');
  });

  it.each([-1, 101, 50.5])('rejects fpRateThresholdPct %s', (fpRateThresholdPct) => {
    expect(
      issuesOf(RULE_TUNING, {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { ...RULE_TUNING_DEFAULT_EXTRAS, fpRateThresholdPct },
      })
    ).toContain('extras.fpRateThresholdPct');
  });

  it.each(['fpCountThreshold', 'fpRateThresholdPct'] as const)(
    'rejects an extras replacement missing %s, naming it',
    (missing) => {
      const extras: Record<string, number> = { ...RULE_TUNING_DEFAULT_EXTRAS };
      delete extras[missing];

      expect(
        issuesOf(RULE_TUNING, {
          workerId: RULE_TUNING,
          autonomy: 'manual',
          scheduleInterval: '2h',
          extras,
        })
      ).toContain(`extras.${missing}`);
    }
  );
});

describe('allowed autonomy levels', () => {
  const twoLevels: WorkerSettingsDeclaration = {
    workerId: 'test-worker',
    allowedAutonomyLevels: ['manual', 'assisted'],
  };
  const noManual: WorkerSettingsDeclaration = {
    workerId: 'test-worker',
    allowedAutonomyLevels: ['supervised'],
  };

  it('accepts a declared level and rejects one outside the set', () => {
    const schema = buildCompleteWorkerSettingsSchema(twoLevels);

    expect(schema.safeParse({ workerId: 'test-worker', autonomy: 'assisted' }).success).toBe(true);
    const rejected = schema.safeParse({ workerId: 'test-worker', autonomy: 'supervised' });
    expect(rejected.success).toBe(false);
    if (!rejected.success) {
      expect(formatWorkerSettingsIssues(rejected.error)).toContain('autonomy');
    }
  });

  it('defaults to manual when allowed, otherwise the first declared level', () => {
    expect(buildDefaultWorkerSettings(twoLevels).autonomy).toBe('manual');
    expect(buildDefaultWorkerSettings(noManual).autonomy).toBe('supervised');
  });

  // The real catalog narrows per Worker: what a Worker's gate can honour is a fact about the
  // Worker, not a UI choice. Asserting the registered sets keeps a later "allow everything"
  // edit from silently re-opening a level the gate cannot run.
  it('narrows the registered Workers to the levels their gates support', () => {
    // One skippable gate each, so one level that gates it and one that does not.
    expect(getAllowedAutonomyLevels(ATTACK_DISCOVERY)).toEqual(['manual', 'supervised']);
    expect(getAllowedAutonomyLevels(SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID)).toEqual(
      ['manual', 'supervised']
    );
    expect(getAllowedAutonomyLevels(TRIAGE)).toEqual(['manual', 'supervised']);
    // Review-gated throughout, so no unattended level at all.
    expect(getAllowedAutonomyLevels(RULE_TUNING)).toEqual(['manual', 'assisted']);
    expect(getAllowedAutonomyLevels(SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID)).toEqual([
      'manual',
      'assisted',
    ]);
  });

  it('rejects a PATCH naming a level the Worker does not allow', () => {
    expect(
      issuesOf(ATTACK_DISCOVERY, {
        workerId: ATTACK_DISCOVERY,
        autonomy: 'assisted',
        scheduleInterval: '24h',
      })
    ).toContain('autonomy');
  });

  // Attack Discovery takes two of the three shared levels: it gates exactly one thing —
  // the forensics handoff its verdicts propose — so it needs one level that gates that
  // and one that does not. `assisted` sits between them and would be indistinguishable
  // from `manual` here, which is why it is rejected rather than merely unused.
  it.each(['manual', 'supervised'] as const)('accepts Attack Discovery autonomy %s', (autonomy) => {
    const defaults = createDefaultWorkerSettings(ATTACK_DISCOVERY);

    expect(
      getCompleteWorkerSettingsSchema(ATTACK_DISCOVERY).safeParse({ ...defaults, autonomy }).success
    ).toBe(true);
  });
});

describe('applyWorkerSettingsWrite and diffWorkerSettings', () => {
  const saved = createDefaultWorkerSettings(RULE_TUNING);

  it('keeps stored extras when the patch omits them and replaces them whole when supplied', () => {
    expect(applyWorkerSettingsWrite(saved, { autonomy: 'assisted' })).toEqual({
      ...saved,
      autonomy: 'assisted',
    });
    expect(applyWorkerSettingsWrite(saved, { extras: { analysisWindowDays: 7 } })).toEqual({
      ...saved,
      extras: { analysisWindowDays: 7 },
    });
    // Whole-object: a partial replacement does not merge with the stored extras.
    expect(applyWorkerSettingsWrite(saved, { extras: {} }).extras).toEqual({});
  });

  it('emits per-field shared changes and the whole extras object', () => {
    expect(diffWorkerSettings(saved, saved)).toBeUndefined();
    expect(diffWorkerSettings(saved, { ...saved, autonomy: 'assisted' })).toEqual({
      autonomy: 'assisted',
    });
    expect(
      diffWorkerSettings(saved, {
        ...saved,
        scheduleInterval: '6h',
        extras: { analysisWindowDays: 7 },
      })
    ).toEqual({ scheduleInterval: '6h', extras: { analysisWindowDays: 7 } });
  });
});

describe('formatWorkerSettingsIssues', () => {
  it('prefixes each issue with its field path', () => {
    const result = z
      .object({ extras: z.object({ analysisWindowDays: z.number().max(30) }).strict() })
      .strict()
      .safeParse({ extras: { analysisWindowDays: 31, other: 1 }, stray: true });
    if (result.success) {
      throw new Error('Expected issues');
    }

    const formatted = formatWorkerSettingsIssues(result.error);
    expect(formatted).toContain('extras.analysisWindowDays:');
    expect(formatted).toContain('other');
    expect(formatted).toContain('stray');
  });
});
