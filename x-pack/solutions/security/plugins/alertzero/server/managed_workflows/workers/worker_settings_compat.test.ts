/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getAllowedAutonomyLevels,
  SYSTEM_SECURITY_WORKER_IDS,
  type WatchAutonomyLevel,
} from '@kbn/alertzero-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { createWorkerSettingsRegistration, toTemplateValues } from './worker_settings';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

const MIGRATION_ISSUE = 'https://github.com/elastic/security-team/issues/19312';

const BREAKING_CHANGE_EXITS = `a migration under ${MIGRATION_ISSUE}, or a coordinated pre-customer reset (plugin README, "Pre-customer state")`;

const FIXTURE_FAILURE_HINT = `A deliberate breaking change to stored Worker settings needs an explicit decision: ${BREAKING_CHANGE_EXITS}. Edit this fixture only as that acknowledgement.`;

const VERSION_TRIPWIRE_HINT = `A deliberate breaking change to stored Worker settings needs an explicit decision: ${BREAKING_CHANGE_EXITS}. A settings version bump is one such change.`;

/**
 * Every autonomy level each Worker has ever allowed. Add, never remove. Generated from the
 * declaration, this list would shrink with a narrowing and the removed level would disappear.
 */
const STORED_AUTONOMY_LEVELS = {
  'system-security-detection-rule-creation': ['manual', 'assisted'],
  'system-security-detection-rule-tuning': ['manual', 'assisted'],
  'system-security-floor-alert-triage': ['manual', 'assisted', 'supervised'],
  'system-security-floor-attack-discovery': ['manual', 'supervised'],
  'system-security-forensics-endpoint-analysis': ['manual'],
  'system-security-hunt-continuous-threat-hunt': ['manual', 'assisted', 'supervised'],
} as const satisfies Record<RegisteredWorkerId, readonly WatchAutonomyLevel[]>;

const STORED_VALUE_EXITS = `Narrowing the allowed levels breaks documents that stored the removed level. The exits are: keep the stored value and change only the label, a migration under ${MIGRATION_ISSUE}, or a coordinated pre-customer reset (plugin README, "Pre-customer state").`;

interface StoredFixture {
  workerId: RegisteredWorkerId;
  name: string;
  values: Record<string, unknown>;
}

const loadFixtures = (workerId: RegisteredWorkerId): StoredFixture[] => {
  // Worker ids stay hyphenated. Fixture paths are snake_case so the file-casing check passes.
  const dir = resolve(__dirname, 'fixtures', workerId.replaceAll('-', '_'));
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

const currentFixture = (workerId: RegisteredWorkerId): StoredFixture => {
  const current = ALL_FIXTURES.find(
    (fixture) => fixture.workerId === workerId && fixture.name === 'current.json'
  );
  if (!current) {
    throw new Error(`Worker "${workerId}" is missing current.json`);
  }
  return current;
};

/** One document per recorded level, copied from current.json with only the level swapped. */
const STORED_AUTONOMY_DOCUMENTS: StoredFixture[] = SYSTEM_SECURITY_WORKER_IDS.flatMap(
  (workerId) => {
    const current = currentFixture(workerId);
    return STORED_AUTONOMY_LEVELS[workerId].map((autonomyLevel) => ({
      workerId,
      name: `stored autonomy ${autonomyLevel}`,
      values: { ...current.values, autonomyLevel },
    }));
  }
);

const DOCUMENTS_THAT_MUST_READ = [...ALL_FIXTURES, ...STORED_AUTONOMY_DOCUMENTS];

/**
 * Substrings the rendered YAML must contain. Literals, not values imported from the defaults
 * module: a renderer and a read path that are both wrong in the same way would still agree.
 */
const LITERAL_RENDERED_VALUES: Record<string, readonly string[]> = {
  'system-security-floor-alert-triage/current.json': ['settingsVersion: 1', 'autonomy: "assisted"'],
  'system-security-floor-attack-discovery/autonomy_only.json': [
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
  'system-security-detection-rule-tuning/qa_schedule_only.json': [
    'every: "2h"',
    'scheduleInterval: "2h"',
    '"analysisWindowDays":7',
    '"fpCountThreshold":10',
    '"fpRateThresholdPct":50',
  ],
  'system-security-detection-rule-tuning/analysis_window_only.json': [
    'every: "2h"',
    '"analysisWindowDays":14',
    '"fpCountThreshold":10',
    '"fpRateThresholdPct":50',
  ],
  'system-security-detection-rule-tuning/current.json': [
    'every: "6h"',
    'autonomy: "assisted"',
    '"analysisWindowDays":21',
    '"fpCountThreshold":4',
    '"fpRateThresholdPct":80',
  ],
  // Edges of each bounded Rule Tuning field. A tightened bound moves one of these out of range.
  // The trailing delimiter keeps `"analysisWindowDays":1` from matching `14`.
  'system-security-detection-rule-tuning/bounds_minimum.json': [
    '"analysisWindowDays":1,',
    '"fpCountThreshold":2,',
    '"fpRateThresholdPct":0}',
  ],
  'system-security-detection-rule-tuning/bounds_maximum.json': [
    '"analysisWindowDays":30,',
    '"fpCountThreshold":100,',
    '"fpRateThresholdPct":100}',
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => Object.hasOwn(right, key) && valuesEqual(left[key], right[key]))
    );
  }
  return false;
};

/**
 * Keys the document did not store may be filled. A key it did store must survive both the read
 * (what the page shows and a save would write) and the startup fill (what the workflow runs).
 */
const changedStoredValues = (
  stored: Record<string, unknown>,
  readBack: Record<string, unknown>,
  kept: Record<string, unknown>
): string[] => {
  const lines: string[] = [];
  for (const [key, storedValue] of Object.entries(stored)) {
    if (isRecord(storedValue)) {
      const readChild = readBack[key];
      const keptChild = kept[key];
      if (!isRecord(readChild) || !isRecord(keptChild)) {
        lines.push(
          `${key} stored ${JSON.stringify(storedValue)}, read ${JSON.stringify(
            readBack[key]
          )}, startup ${JSON.stringify(kept[key])}`
        );
        continue;
      }
      for (const nested of changedStoredValues(storedValue, readChild, keptChild)) {
        lines.push(`${key}.${nested}`);
      }
      continue;
    }
    if (!valuesEqual(readBack[key], storedValue) || !valuesEqual(kept[key], storedValue)) {
      lines.push(
        `${key} stored ${JSON.stringify(storedValue)}, read ${JSON.stringify(
          readBack[key]
        )}, startup ${JSON.stringify(kept[key])}`
      );
    }
  }
  return lines;
};

const storedKeyPaths = (values: Record<string, unknown>): string[][] => {
  const paths: string[][] = [];
  for (const [key, value] of Object.entries(values)) {
    if (key === 'extras' && isRecord(value)) {
      for (const extraKey of Object.keys(value)) {
        paths.push(['extras', extraKey]);
      }
      continue;
    }
    paths.push([key]);
  }
  return paths;
};

const alternateStoredValue = (value: unknown): unknown => {
  if (typeof value === 'number') {
    return value + 1;
  }
  if (value === 'manual' || value === 'supervised') {
    return 'assisted';
  }
  if (value === 'assisted') {
    return 'manual';
  }
  if (typeof value === 'string') {
    return `${value}-changed`;
  }
  throw new Error(`No alternate for stored value ${String(value)}`);
};

const withStoredKeyChanged = (
  values: Record<string, unknown>,
  path: readonly string[]
): Record<string, unknown> => {
  const next = structuredClone(values);
  let cursor = next;
  for (const key of path.slice(0, -1)) {
    const child = cursor[key];
    if (!isRecord(child)) {
      throw new Error(`Cannot change stored key ${path.join('.')}`);
    }
    cursor = child;
  }
  const leaf = path[path.length - 1];
  cursor[leaf] = alternateStoredValue(cursor[leaf]);
  return next;
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
    '$workerId $name parses, and the filled values render without undefined or leftover tokens',
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
      let rendered: string;
      try {
        rendered = yamlTemplate(registration.withMissingDefaults(values));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `yamlTemplate threw for the filled fixture "${name}" of "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }

      if (rendered.includes('undefined')) {
        throw new Error(
          `Rendered YAML for "${workerId}" fixture "${name}" contains "undefined".\n\n${FIXTURE_FAILURE_HINT}\n\n${rendered}`
        );
      }

      const leftoverTokens = rendered.match(UNREPLACED_TOKEN_PATTERN) ?? [];
      if (leftoverTokens.length > 0) {
        throw new Error(
          `Rendered YAML for "${workerId}" fixture "${name}" still has unreplaced tokens: ${leftoverTokens.join(
            ', '
          )}.\n\n${FIXTURE_FAILURE_HINT}\n\n${rendered}`
        );
      }

      const literals = LITERAL_RENDERED_VALUES[`${workerId}/${name}`];
      if (literals) {
        const missing = literals.filter((literal) => !rendered.includes(literal));
        if (missing.length > 0) {
          throw new Error(
            `Rendered YAML for "${workerId}" fixture "${name}" is missing ${missing.join(
              ', '
            )}.\n\n${FIXTURE_FAILURE_HINT}\n\n${rendered}`
          );
        }
      }
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name: changing any single stored key changes the rendered YAML',
    ({ workerId, name, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const filled = registration.withMissingDefaults(values);
      const yamlTemplate = getYamlTemplate(workerId);
      const baseline = yamlTemplate(filled);
      const unchanged = storedKeyPaths(filled).filter(
        (path) => yamlTemplate(withStoredKeyChanged(filled, path)) === baseline
      );
      if (unchanged.length > 0) {
        throw new Error(
          `Changing ${unchanged
            .map((path) => path.join('.'))
            .join(
              ', '
            )} on "${workerId}" fixture "${name}" left the rendered YAML unchanged. Skipping a startup fill when the document version moved is safe only when every stored key reaches the YAML.`
        );
      }
    }
  );

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s records every autonomy level its declaration allows',
    (workerId) => {
      const missing = getAllowedAutonomyLevels(workerId).filter(
        (level) => !(STORED_AUTONOMY_LEVELS[workerId] as readonly string[]).includes(level)
      );
      if (missing.length > 0) {
        throw new Error(
          `Worker "${workerId}" allows ${missing.join(
            ', '
          )}, which STORED_AUTONOMY_LEVELS does not list. Add it here.`
        );
      }
    }
  );

  it.each(DOCUMENTS_THAT_MUST_READ)(
    '$workerId $name: a read returns the stored value',
    ({ workerId, name, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      let settings: ReturnType<typeof registration.toSettings>;
      try {
        settings = registration.toSettings(values);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        // A removed autonomy level fails here. Any other rejection is the stored-shape check.
        const hint = detail.includes('autonomy') ? STORED_VALUE_EXITS : FIXTURE_FAILURE_HINT;
        throw new Error(`toSettings rejected "${name}" for "${workerId}": ${detail}\n\n${hint}`);
      }

      const readBack = toTemplateValues(workerId, settings);
      const kept = registration.withMissingDefaults(values);
      const changed = changedStoredValues(values, readBack, kept);
      if (changed.length > 0) {
        throw new Error(
          `Reading "${workerId}" document "${name}" changed a stored value: ${changed.join(
            '; '
          )}.\n\n${STORED_VALUE_EXITS}`
        );
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
