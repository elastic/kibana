/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { isEqual } from 'lodash';
import {
  SYSTEM_SECURITY_WORKER_IDS,
  WATCH_AUTONOMY_LEVELS,
  getAllowedAutonomyLevels,
  nearestLowerAutonomyLevel,
} from '@kbn/alertzero-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { readTestHelperFileAt, resolveBaseCommit } from './test_helpers/merge_base';
import {
  BREAKING_CHANGE_REMEDIES,
  SETTINGS_CONTRACT_SNAPSHOT_FILE,
  buildWorkerSettingsContracts,
  describeContractChanges,
  describeBaseBranchFailure,
  diffWorkerSettingsContracts,
  parseSettingsContractSnapshot,
} from './test_helpers/settings_contract';
import { workflowSchemaFailure } from './test_helpers/workflow_schema';
import { createWorkerSettingsRegistration, toTemplateValues } from './worker_settings';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

const TEST_HELPERS_DIR = resolve(__dirname, 'test_helpers');

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

const FIXTURE_FAILURE_HINT = `Each fixture is a document a configured Worker stores. A change that stops one from reading needs ${BREAKING_CHANGE_REMEDIES}, recorded through the settings contract snapshot. Edit the fixture only after a reset, because the old shape then no longer exists.`;

const SETTINGS_VERSION_BUMP_HINT = `A settings version bump breaks every stored document of that Worker. It needs ${BREAKING_CHANGE_REMEDIES}.`;

const STORED_VALUE_CHANGED_HINT = `A read must leave a stored value as it was. Keep the stored value and change only the label, or it needs ${BREAKING_CHANGE_REMEDIES}.`;

interface StoredFixture {
  workerId: RegisteredWorkerId;
  name: string;
  values: Record<string, unknown>;
  /**
   * Lines of `<name>.expected.txt`. Literals, not imported defaults, so a renderer and read path
   * wrong in the same way still fail.
   */
  expectedInRender: readonly string[] | undefined;
}

const EXPECTED_SUFFIX = '.expected.txt';

// Worker ids stay hyphenated. Fixture paths are snake_case so the file-casing check passes.
const fixtureDirectory = (workerId: RegisteredWorkerId): string =>
  resolve(__dirname, 'fixtures', workerId.replaceAll('-', '_'));

const loadFixtures = (workerId: RegisteredWorkerId): StoredFixture[] => {
  const dir = fixtureDirectory(workerId);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const expectedPath = resolve(dir, name.replace(/\.json$/, EXPECTED_SUFFIX));
      return {
        workerId,
        name,
        values: JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as Record<string, unknown>,
        expectedInRender: existsSync(expectedPath)
          ? readFileSync(expectedPath, 'utf8')
              .split('\n')
              .filter((line) => line.length > 0)
          : undefined,
      };
    });
};

const ALL_FIXTURES = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => loadFixtures(workerId));

const getYamlTemplate = (workerId: RegisteredWorkerId) => {
  const definition = getManagedWorkflowDefinition(workerId);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Worker "${workerId}" is missing a yamlTemplate`);
  }
  return definition.yamlTemplate;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A number literal must not be followed by another digit, so `"fpCountThreshold":10` does not match 100. */
const containsLiteral = (rendered: string, literal: string): boolean => {
  if (!/\d$/.test(literal)) {
    return rendered.includes(literal);
  }
  for (
    let index = rendered.indexOf(literal);
    index !== -1;
    index = rendered.indexOf(literal, index + 1)
  ) {
    if (!/\d/.test(rendered.charAt(index + literal.length))) {
      return true;
    }
  }
  return false;
};

/**
 * The stored values as the Worker is expected to run them: identical, except that an autonomy
 * level the Worker no longer allows becomes the nearest allowed level below it.
 */
const expectedAfterUpgrade = (
  workerId: RegisteredWorkerId,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  const { autonomyLevel } = stored;
  const allowed = getAllowedAutonomyLevels(workerId);
  const level = WATCH_AUTONOMY_LEVELS.find((candidate) => candidate === autonomyLevel);
  if (level === undefined || allowed.includes(level)) {
    return stored;
  }
  const lowered = nearestLowerAutonomyLevel(allowed, level);
  return lowered === undefined ? stored : { ...stored, autonomyLevel: lowered };
};

/** Keys the document did not store may be filled. A key it did store must survive the read. */
const changedStoredValues = (
  stored: Record<string, unknown>,
  readBack: Record<string, unknown>
): string[] => {
  const lines: string[] = [];
  for (const [key, storedValue] of Object.entries(stored)) {
    const readValue = readBack[key];
    if (isRecord(storedValue) && isRecord(readValue)) {
      for (const nested of changedStoredValues(storedValue, readValue)) {
        lines.push(`${key}.${nested}`);
      }
      continue;
    }
    if (!isEqual(readValue, storedValue)) {
      lines.push(`${key} stored ${JSON.stringify(storedValue)}, read ${JSON.stringify(readValue)}`);
    }
  }
  return lines;
};

/** Paths the renderer and the read path fill from the Worker's defaults when a document lacks them. */
const filledDefaultPaths = (defaults: Record<string, unknown>): string[][] => [
  ...(Object.hasOwn(defaults, 'scheduleInterval') ? [['scheduleInterval']] : []),
  ...(isRecord(defaults.extras)
    ? [['extras'], ...Object.keys(defaults.extras).map((key) => ['extras', key])]
    : []),
];

const valueAt = (values: Record<string, unknown>, path: readonly string[]): unknown =>
  path.reduce<unknown>((cursor, key) => (isRecord(cursor) ? cursor[key] : undefined), values);

const withStoredKey = (
  values: Record<string, unknown>,
  path: readonly string[],
  value: unknown
): Record<string, unknown> => {
  const next = structuredClone(values);
  const parent = path.length === 1 ? next : valueAt(next, path.slice(0, -1));
  if (!isRecord(parent)) {
    throw new Error(`Cannot set stored key ${path.join('.')}`);
  }
  const leaf = path[path.length - 1];
  if (value === undefined) {
    delete parent[leaf];
  } else {
    parent[leaf] = value;
  }
  return next;
};

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
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

/** Any different value of the same kind. The render test needs a change, not a valid setting. */
const alternateStoredValue = (value: unknown): unknown => {
  if (typeof value === 'number') {
    return value + 1;
  }
  if (typeof value === 'boolean') {
    return !value;
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
  if (Array.isArray(value)) {
    return value.length > 0 ? value.slice(1) : ['changed'];
  }
  if (isRecord(value)) {
    return { ...value, changed: true };
  }
  return 'changed';
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
  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s has a current.json fixture with expected rendered values',
    (workerId) => {
      const dir = fixtureDirectory(workerId);
      const current = loadFixtures(workerId).find(({ name }) => name === 'current.json');
      if (current === undefined) {
        throw new Error(
          `Worker "${workerId}" has no current.json fixture. Add ${dir}/current.json with the settings a configured space stores for it today, and ${dir}/current${EXPECTED_SUFFIX} with lines its rendered workflow must contain (plugin README, "Changing Worker settings safely").`
        );
      }
      if (current.expectedInRender === undefined) {
        throw new Error(
          `Worker "${workerId}" has no ${dir}/current${EXPECTED_SUFFIX}. Add lines its rendered workflow must contain, such as autonomy: "assisted".`
        );
      }
    }
  );

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s has no expected values without a fixture',
    (workerId) => {
      const dir = fixtureDirectory(workerId);
      const orphans = existsSync(dir)
        ? readdirSync(dir).filter(
            (name) =>
              name.endsWith(EXPECTED_SUFFIX) &&
              !existsSync(resolve(dir, name.replace(EXPECTED_SUFFIX, '.json')))
          )
        : [];
      expect(orphans).toEqual([]);
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name parses, and renders without undefined or leftover tokens',
    ({ workerId, name, values, expectedInRender }) => {
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
        rendered = yamlTemplate(values);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `yamlTemplate threw for the fixture "${name}" of "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
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

      if (expectedInRender) {
        const { autonomyLevel: runsAt } = expectedAfterUpgrade(workerId, values);
        const expected = expectedInRender.map((literal) =>
          literal === `autonomy: "${String(values.autonomyLevel)}"`
            ? `autonomy: "${String(runsAt)}"`
            : literal
        );
        const missing = expected.filter((literal) => !containsLiteral(rendered, literal));
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
    '$workerId $name renders a workflow that passes the workflow schema',
    ({ workerId, name, values }) => {
      const invalid = workflowSchemaFailure(getYamlTemplate(workerId)(values));
      if (invalid) {
        throw new Error(
          `This stored shape renders a workflow that fails the workflow schema (${workerId} ${name}): ${invalid}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name: changing any single stored key changes the rendered YAML',
    ({ workerId, name, values }) => {
      const yamlTemplate = getYamlTemplate(workerId);
      const baseline = yamlTemplate(values);
      // A disallowed level renders as a lower allowed one, so the changed level must be allowed.
      const otherAllowedLevel = getAllowedAutonomyLevels(workerId).find(
        (level) => level !== expectedAfterUpgrade(workerId, values).autonomyLevel
      );
      const changed = (path: readonly string[]) =>
        path.join('.') === 'autonomyLevel'
          ? withStoredKey(values, path, otherAllowedLevel)
          : withStoredKeyChanged(values, path);
      const unchanged = storedKeyPaths(values).filter(
        (path) => yamlTemplate(changed(path)) === baseline
      );
      if (unchanged.length > 0) {
        throw new Error(
          `Changing ${unchanged
            .map((path) => path.join('.'))
            .join(
              ', '
            )} on "${workerId}" fixture "${name}" left the rendered YAML unchanged, so the running workflow never sees it. Forward the key in the Worker's yamlTemplate and bump the definition version, or stop storing it.`
        );
      }
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name: a read returns the stored value',
    ({ workerId, name, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      let settings: ReturnType<typeof registration.toSettings>;
      try {
        settings = registration.toSettings(values);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `toSettings rejected "${name}" for "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }

      const readBack = toTemplateValues(workerId, settings);
      const changed = changedStoredValues(expectedAfterUpgrade(workerId, values), readBack);
      if (changed.length > 0) {
        throw new Error(
          `Reading "${workerId}" document "${name}" changed a stored value: ${changed.join(
            '; '
          )}.\n\n${STORED_VALUE_CHANGED_HINT}`
        );
      }
    }
  );

  const DISALLOWED_LEVEL_DOCUMENTS = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => {
    const current = ALL_FIXTURES.find(
      (fixture) => fixture.workerId === workerId && fixture.name === 'current.json'
    );
    const allowed = getAllowedAutonomyLevels(workerId);
    return current === undefined
      ? []
      : WATCH_AUTONOMY_LEVELS.filter((level) => !allowed.includes(level)).map((level) => ({
          workerId,
          level,
          lowered: nearestLowerAutonomyLevel(allowed, level),
          values: { ...current.values, autonomyLevel: level },
        }));
  });

  it.each(DISALLOWED_LEVEL_DOCUMENTS)(
    '$workerId: a stored $level is read and rendered as the same lower level',
    ({ workerId, level, lowered, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      if (lowered === undefined) {
        expect(() => registration.toSettings(values)).toThrow(/settings are invalid: autonomy/);
        return;
      }
      expect(registration.toSettings(values).autonomy).toBe(lowered);
      const rendered = getYamlTemplate(workerId)(values);
      if (
        !rendered.includes(`autonomy: "${lowered}"`) ||
        rendered.includes(`autonomy: "${level}"`)
      ) {
        throw new Error(
          `The workflow for "${workerId}" rendered from a stored "${level}" does not run at "${lowered}", so the settings page and the running workflow disagree.`
        );
      }
    }
  );

  /** Each key a Worker fills from its defaults, removed from its current.json. */
  const MISSING_DEFAULT_DOCUMENTS = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => {
    const current = ALL_FIXTURES.find(
      (fixture) => fixture.workerId === workerId && fixture.name === 'current.json'
    );
    const defaults = createWorkerSettingsRegistration(workerId).createDefaultValues();
    return current === undefined
      ? []
      : filledDefaultPaths(defaults).map((path) => ({
          workerId,
          key: path.join('.'),
          missing: withStoredKey(current.values, path, undefined),
          withDefault: withStoredKey(current.values, path, valueAt(defaults, path)),
        }));
  });

  it.each(MISSING_DEFAULT_DOCUMENTS)(
    '$workerId: a stored document without $key reads and renders its default',
    ({ workerId, key, missing, withDefault }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const yamlTemplate = getYamlTemplate(workerId);
      expect(registration.toSettings(missing)).toEqual(registration.toSettings(withDefault));
      if (yamlTemplate(missing) !== yamlTemplate(withDefault)) {
        throw new Error(
          `The workflow for "${workerId}" rendered from a document without ${key} differs from one that stores the default, so a setting added with a default does not reach configured spaces.`
        );
      }
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name renders without changing the stored values it was given',
    ({ workerId, values }) => {
      const before = JSON.stringify(values);
      const frozen = deepFreeze(structuredClone(values));
      getYamlTemplate(workerId)(frozen);
      createWorkerSettingsRegistration(workerId).toSettings(frozen);
      expect(JSON.stringify(frozen)).toBe(before);
    }
  );

  describe('settings contract', () => {
    const committed = parseSettingsContractSnapshot(
      readFileSync(resolve(TEST_HELPERS_DIR, SETTINGS_CONTRACT_SNAPSHOT_FILE), 'utf8')
    );
    const current = buildWorkerSettingsContracts();

    it('matches the committed snapshot', () => {
      const changes = diffWorkerSettingsContracts(committed.workers, current);
      if (changes.length > 0) {
        throw new Error(describeContractChanges(changes));
      }
    });

    it('records a decision for any change that breaks documents stored by the base branch', () => {
      const baseCommit = resolveBaseCommit();
      const baseText =
        baseCommit === undefined
          ? undefined
          : readTestHelperFileAt(baseCommit, SETTINGS_CONTRACT_SNAPSHOT_FILE);
      if (baseText === undefined) {
        return;
      }
      const failure = describeBaseBranchFailure(
        parseSettingsContractSnapshot(baseText),
        committed,
        current
      );
      if (failure) {
        throw new Error(failure);
      }
    });
  });

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s settings version is 1 until a breaking change is decided',
    (workerId) => {
      const { settingsVersion } = createWorkerSettingsRegistration(workerId).createDefaultValues();
      if (settingsVersion !== 1) {
        throw new Error(
          `Worker "${workerId}" settings version is ${String(
            settingsVersion
          )}, not 1. ${SETTINGS_VERSION_BUMP_HINT}`
        );
      }
    }
  );
});
