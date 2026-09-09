/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  WATCH_TAG,
} from '@kbn/pnd-common';
import { WorkflowSchema } from '@kbn/workflows';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import { workerRegistry } from './worker_registry';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

interface ExpectedWorkerSettings {
  settingsVersion: number;
  /** Present only for schedule-driven Workers. */
  scheduleInterval?: string;
  triggerType: string;
}

/**
 * Deliberately an explicit table rather than derived from the registration: bumping a Worker's
 * settings version or opting one into a schedule must be a conscious edit here, because both
 * change what already-installed spaces receive.
 */
const EXPECTED_WORKER_SETTINGS: Record<RegisteredWorkerId, ExpectedWorkerSettings> = {
  'system-security-floor-alert-triage': { settingsVersion: 1, triggerType: 'manual' },
  'system-security-floor-attack-discovery': {
    settingsVersion: 1,
    scheduleInterval: '24h',
    triggerType: 'scheduled',
  },
  'system-security-dark-continuous-threat-hunt': { settingsVersion: 1, triggerType: 'manual' },
  'system-security-detection-rule-tuning': { settingsVersion: 1, triggerType: 'manual' },
  'system-security-detection-rule-creation': { settingsVersion: 1, triggerType: 'manual' },
};

const getYamlTemplate = (workerId: RegisteredWorkerId) => {
  const definition = getManagedWorkflowDefinition(workerId);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Worker "${workerId}" is missing a yamlTemplate`);
  }
  return definition.yamlTemplate;
};

describe('workerRegistry', () => {
  it('registers every catalog Worker exactly once', () => {
    expect(workerRegistry.list().map(({ id }) => id)).toEqual([...SYSTEM_SECURITY_WORKER_IDS]);
  });

  it.each(SYSTEM_SECURITY_WORKER_CATALOG)(
    '$id exists, carries Watch tags, and renders supported values into YAML',
    (catalog) => {
      const registration = workerRegistry.get(catalog.id);
      if (!registration) {
        throw new Error(`Worker "${catalog.id}" is not registered`);
      }
      expect(registration.catalog).toEqual(catalog);

      const expected = EXPECTED_WORKER_SETTINGS[catalog.id];
      const values = registration.settings.createDefaultValues();
      const yaml = getYamlTemplate(catalog.id)(values);
      const parsed = parse(yaml) as {
        tags?: string[];
        triggers?: Array<{ type?: string; with?: { every?: string } }>;
        consts?: { worker_settings?: Record<string, unknown> };
      };

      expect(parsed.tags).toEqual(expect.arrayContaining([WATCH_TAG, catalog.watchTag]));
      expect(parsed.consts?.worker_settings).toEqual(
        expect.objectContaining({
          settingsVersion: expected.settingsVersion,
          autonomy: 'manual',
          ...(expected.scheduleInterval === undefined
            ? {}
            : { scheduleInterval: expected.scheduleInterval }),
        })
      );

      // A Worker with no schedule must not gain one by accident, and vice versa.
      expect(parsed.triggers?.map(({ type }) => type)).toEqual([expected.triggerType]);
      expect(parsed.triggers?.[0]?.with?.every).toBe(expected.scheduleInterval);
      if (expected.scheduleInterval === undefined) {
        expect(yaml).not.toContain('scheduleInterval');
      }

      expect(yaml).not.toContain('candidateLimit');
    }
  );

  it.each(SYSTEM_SECURITY_WORKER_CATALOG)(
    '$id renders YAML that passes strict workflow validation',
    (catalog) => {
      const registration = workerRegistry.get(catalog.id);
      if (!registration) {
        throw new Error(`Worker "${catalog.id}" is not registered`);
      }
      // The managed definitions test validates triggers loosely, so it cannot catch a `with.every`
      // the engine would reject. This is the assertion that does.
      const yaml = getYamlTemplate(catalog.id)(registration.settings.createDefaultValues());
      const result = parseWorkflowYamlToJSON(yaml, WorkflowSchema);

      expect(result.success ? null : result.error).toBeNull();
    }
  );

  it.each(['1m', '7d'])(
    'attack discovery renders and validates a %s schedule interval',
    (scheduleInterval) => {
      const registration = workerRegistry.get(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID);
      if (!registration) {
        throw new Error('Attack Discovery worker is not registered');
      }
      const yaml = getYamlTemplate(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID)({
        ...registration.settings.createDefaultValues(),
        scheduleInterval,
      });
      const parsed = parse(yaml) as { triggers?: Array<{ with?: { every?: string } }> };

      expect(parsed.triggers?.[0]?.with?.every).toBe(scheduleInterval);
      expect(parseWorkflowYamlToJSON(yaml, WorkflowSchema).success).toBe(true);
    }
  );
});
