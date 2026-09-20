/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '../../constants';
import { WorkerSettings } from '../schemas';
import {
  applyWorkerSettingsWrite,
  buildCompleteWorkerSettingsSchema,
  buildDefaultWorkerSettings,
  diffWorkerSettings,
  formatWorkerSettingsIssues,
  projectStoredAutonomyLevel,
} from './contract';
import {
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

  it('nests Rule Tuning fields under extras and omits extras elsewhere', () => {
    expect(createDefaultWorkerSettings(RULE_TUNING)).toEqual({
      workerId: RULE_TUNING,
      autonomy: 'manual',
      scheduleInterval: '2h',
      extras: { analysisWindowDays: 14 },
    });
    expect(createDefaultWorkerSettings(TRIAGE)).toEqual({ workerId: TRIAGE, autonomy: 'manual' });
    expect(createDefaultWorkerSettings(ATTACK_DISCOVERY)).not.toHaveProperty('extras');
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
    expect(
      issuesOf(TRIAGE, { workerId: TRIAGE, autonomy: 'manual', scheduleInterval: '2h' })
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
        extras: { analysisWindowDays: 14, previewDepth: 3 },
      })
    ).toMatch(/extras.*previewDepth/);
  });

  it.each([0, 31, 7.5])('rejects analysisWindowDays %s', (analysisWindowDays) => {
    expect(
      issuesOf(RULE_TUNING, {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays },
      })
    ).toContain('extras.analysisWindowDays');
  });
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
    expect(getAllowedAutonomyLevels(ATTACK_DISCOVERY)).toEqual(['manual', 'supervised']);
    expect(getAllowedAutonomyLevels(RULE_TUNING)).toEqual(['manual', 'assisted']);
    expect(getAllowedAutonomyLevels(SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID)).toEqual([
      'manual',
      'assisted',
    ]);
    // Triage and threat hunt keep the full dial.
    expect(getAllowedAutonomyLevels(TRIAGE)).toEqual(['manual', 'assisted', 'supervised']);
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
});

describe('projectStoredAutonomyLevel', () => {
  const ruleTuning: WorkerSettingsDeclaration = {
    workerId: 'test-worker',
    allowedAutonomyLevels: ['manual', 'assisted'],
  };
  const attackDiscovery: WorkerSettingsDeclaration = {
    workerId: 'test-worker',
    allowedAutonomyLevels: ['manual', 'supervised'],
  };

  it('keeps a stored level the Worker still offers', () => {
    expect(projectStoredAutonomyLevel(ruleTuning, 'assisted')).toBe('assisted');
    expect(projectStoredAutonomyLevel(attackDiscovery, 'supervised')).toBe('supervised');
  });

  it('reads a level the Worker dropped as the most autonomous level it still offers', () => {
    // The narrowing in this PR: Rule Tuning has no unattended level, Attack Discovery no assisted.
    expect(projectStoredAutonomyLevel(ruleTuning, 'supervised')).toBe('assisted');
    expect(projectStoredAutonomyLevel(attackDiscovery, 'assisted')).toBe('manual');
  });

  it('falls back to the least autonomous level offered when nothing sits at or below', () => {
    const supervisedOnly: WorkerSettingsDeclaration = {
      workerId: 'test-worker',
      allowedAutonomyLevels: ['supervised'],
    };
    expect(projectStoredAutonomyLevel(supervisedOnly, 'assisted')).toBe('supervised');
  });

  it('passes values outside the shared scale through, so validation still reports them', () => {
    expect(projectStoredAutonomyLevel(ruleTuning, 'yolo')).toBe('yolo');
    expect(projectStoredAutonomyLevel(ruleTuning, undefined)).toBeUndefined();
    expect(projectStoredAutonomyLevel(ruleTuning, 3)).toBe(3);
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
