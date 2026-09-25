/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { SYSTEM_SECURITY_WORKER_IDS } from '@kbn/alertzero-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { createWorkerSettingsRegistration } from './worker_settings';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

const MIGRATION_ISSUE = 'https://github.com/elastic/security-team/issues/19312';

const BREAKING_CHANGE_EXITS = `a migration under ${MIGRATION_ISSUE}, or a coordinated pre-customer reset (plugin README, "Pre-customer state")`;

const FIXTURE_FAILURE_HINT = `A deliberate breaking change to stored Worker settings needs an explicit decision: ${BREAKING_CHANGE_EXITS}. Edit this fixture only as that acknowledgement.`;

const VERSION_TRIPWIRE_HINT = `A deliberate breaking change to stored Worker settings needs an explicit decision: ${BREAKING_CHANGE_EXITS}. A settings version bump is one such change.`;

interface StoredFixture {
  workerId: RegisteredWorkerId;
  name: string;
  values: Record<string, unknown>;
}

const loadFixtures = (workerId: RegisteredWorkerId): StoredFixture[] => {
  const dir = resolve(__dirname, 'fixtures', workerId);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({
      workerId,
      name,
      values: JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as Record<string, unknown>,
    }));
};

const ALL_FIXTURES = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => loadFixtures(workerId));

/**
 * Substrings the rendered YAML must contain. Literals, not values imported from the defaults
 * module: a renderer and a read path that are both wrong in the same way would still agree.
 */
const LITERAL_RENDERED_VALUES: Record<string, readonly string[]> = {
  'system-security-floor-alert-triage/current.json': ['settingsVersion: 1', 'autonomy: "assisted"'],
  'system-security-floor-attack-discovery/autonomy-only.json': [
    'every: "24h"',
    'scheduleInterval: "24h"',
    'autonomy: "manual"',
  ],
  'system-security-floor-attack-discovery/current.json': [
    'every: "5d"',
    'scheduleInterval: "5d"',
    'autonomy: "supervised"',
  ],
  'system-security-hunt-continuous-threat-hunt/current.json': [
    'settingsVersion: 1',
    'autonomy: "assisted"',
  ],
  'system-security-detection-rule-tuning/qa-schedule-only.json': [
    'every: "2h"',
    'scheduleInterval: "2h"',
    'extras: {"analysisWindowDays":7,"fpCountThreshold":10,"fpRateThresholdPct":50}',
  ],
  'system-security-detection-rule-tuning/analysis-window-only.json': [
    'every: "2h"',
    'extras: {"analysisWindowDays":14,"fpCountThreshold":10,"fpRateThresholdPct":50}',
  ],
  'system-security-detection-rule-tuning/current.json': [
    'every: "6h"',
    'autonomy: "assisted"',
    'extras: {"analysisWindowDays":21,"fpCountThreshold":4,"fpRateThresholdPct":80}',
  ],
  'system-security-detection-rule-creation/current.json': [
    'settingsVersion: 1',
    'autonomy: "assisted"',
  ],
  'system-security-forensics-endpoint-analysis/current.json': [
    'settingsVersion: 1',
    'autonomy: "manual"',
    'every: "1m"',
  ],
};

const getYamlTemplate = (workerId: RegisteredWorkerId) => {
  const definition = getManagedWorkflowDefinition(workerId);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Worker "${workerId}" is missing a yamlTemplate`);
  }
  return definition.yamlTemplate;
};

const filledTemplateValues = (
  workerId: RegisteredWorkerId,
  values: Record<string, unknown>
): Record<string, unknown> => {
  const applied = createWorkerSettingsRegistration(workerId).applyPatch(values, {});
  if ('invalid' in applied) {
    throw new Error(`applyPatch rejected "${workerId}" fixture: ${applied.invalid}`);
  }
  return applied.values;
};

describe('stored Worker settings compatibility', () => {
  it.each([...SYSTEM_SECURITY_WORKER_IDS])('%s has at least one stored fixture', (workerId) => {
    expect(loadFixtures(workerId).length).toBeGreaterThan(0);
  });

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s has a fixture asserted against literal rendered values',
    (workerId) => {
      const asserted = loadFixtures(workerId).some(
        (fixture) => LITERAL_RENDERED_VALUES[`${workerId}/${fixture.name}`] !== undefined
      );
      expect(asserted).toBe(true);
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name parses, and rendering it equals rendering the filled values',
    ({ workerId, name, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      try {
        registration.toSettings(values);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `toSettings rejected the fixture "${name}" for "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }

      const yamlTemplate = getYamlTemplate(workerId);
      let storedYaml: string;
      let filledYaml: string;
      try {
        storedYaml = yamlTemplate(values);
        filledYaml = yamlTemplate(filledTemplateValues(workerId, values));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `yamlTemplate threw for the fixture "${name}" of "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }

      if (storedYaml !== filledYaml) {
        throw new Error(
          `Rendered YAML for "${workerId}" fixture "${name}" differs from the filled values.\n\n${FIXTURE_FAILURE_HINT}\n\nstored:\n${storedYaml}\n\nfilled:\n${filledYaml}`
        );
      }

      if (storedYaml.includes('undefined')) {
        throw new Error(
          `Rendered YAML for "${workerId}" fixture "${name}" contains "undefined".\n\n${FIXTURE_FAILURE_HINT}\n\n${storedYaml}`
        );
      }

      const leftoverTokens = storedYaml.match(UNREPLACED_TOKEN_PATTERN) ?? [];
      if (leftoverTokens.length > 0) {
        throw new Error(
          `Rendered YAML for "${workerId}" fixture "${name}" still has unreplaced tokens: ${leftoverTokens.join(
            ', '
          )}.\n\n${FIXTURE_FAILURE_HINT}\n\n${storedYaml}`
        );
      }

      const literals = LITERAL_RENDERED_VALUES[`${workerId}/${name}`];
      if (literals) {
        const missing = literals.filter((literal) => !storedYaml.includes(literal));
        if (missing.length > 0) {
          throw new Error(
            `Rendered YAML for "${workerId}" fixture "${name}" is missing ${missing.join(
              ', '
            )}.\n\n${FIXTURE_FAILURE_HINT}\n\n${storedYaml}`
          );
        }
      }
    }
  );

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s settings version is 1 until a breaking change is decided',
    (workerId) => {
      const { settingsVersion } = createWorkerSettingsRegistration(workerId).createDefaultValues();
      if (settingsVersion !== 1) {
        throw new Error(
          `Worker "${workerId}" settings version is ${String(
            settingsVersion
          )}, not 1. ${VERSION_TRIPWIRE_HINT}`
        );
      }
    }
  );
});
