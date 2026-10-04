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
import { renderedWorkflowInstallFailure } from '../test_utils';
import { readTestHelperFileAt, resolveBaseCommit } from './test_helpers/merge_base';
import {
  BREAKING_CHANGE_EXITS,
  SETTINGS_CONTRACT_SNAPSHOT_FILE,
  buildWorkerSettingsContracts,
  describeContractChanges,
  diffWorkerSettingsContracts,
  parseSettingsContractSnapshot,
  unrecordedBreakingChange,
} from './test_helpers/settings_contract';
import { createWorkerSettingsRegistration, toTemplateValues } from './worker_settings';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

const TEST_HELPERS_DIR = resolve(__dirname, 'test_helpers');

const BASE_COMMIT = resolveBaseCommit();

const readAtBase = (fileName: string): string | undefined =>
  BASE_COMMIT === undefined ? undefined : readTestHelperFileAt(BASE_COMMIT, fileName);

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

const FIXTURE_FAILURE_HINT = `Each fixture is a document a configured Worker stores. A change that stops one from reading needs ${BREAKING_CHANGE_EXITS}, recorded through the settings contract snapshot. Edit the fixture only after a reset, because the old shape then no longer exists.`;

const VERSION_TRIPWIRE_HINT = `A settings version bump breaks every stored document of that Worker. It needs ${BREAKING_CHANGE_EXITS}.`;

const STORED_VALUE_EXITS = `A read must leave a stored value as it was. Keep the stored value and change only the label, or it needs ${BREAKING_CHANGE_EXITS}.`;

interface StoredFixture {
  workerId: RegisteredWorkerId;
  name: string;
  values: Record<string, unknown>;
  /**
   * Lines of `<name>.expected.txt`: text the rendered YAML must contain, for values the fixture
   * stores. Literals, not values imported from the defaults module: a renderer and a read path that
   * are both wrong in the same way would still agree. Filled defaults are left out, because changing
   * a default is safe.
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
    if (!isEqual(readBack[key], storedValue) || !isEqual(kept[key], storedValue)) {
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
    '%s has a stored fixture with expected rendered values',
    (workerId) => {
      const dir = `fixtures/${workerId.replaceAll('-', '_')}`;
      const fixtures = loadFixtures(workerId);
      if (fixtures.length === 0) {
        throw new Error(
          `Worker "${workerId}" has no stored-shape fixture. Add ${dir}/current.json with the settings a configured space stores for it, and ${dir}/current${EXPECTED_SUFFIX} with lines its rendered workflow must contain (plugin README, "Changing Worker settings safely").`
        );
      }
      if (fixtures.every(({ expectedInRender }) => expectedInRender === undefined)) {
        throw new Error(
          `No fixture of Worker "${workerId}" has expected rendered values. Add ${dir}/current${EXPECTED_SUFFIX} with lines its rendered workflow must contain, such as autonomy: "assisted".`
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
    '$workerId $name parses, and the filled values render without undefined or leftover tokens',
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
        rendered = yamlTemplate(registration.upgradeStoredValues(values));
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

      if (expectedInRender) {
        // A stored level the Worker no longer allows runs at the lower level it is moved to.
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
    '$workerId $name would install as a valid workflow',
    ({ workerId, name, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const rendered = getYamlTemplate(workerId)(registration.upgradeStoredValues(values));
      const invalid = renderedWorkflowInstallFailure(rendered);
      if (invalid) {
        throw new Error(
          `This stored shape would install as an invalid workflow (${workerId} ${name}): ${invalid}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }
    }
  );

  it.each(ALL_FIXTURES)(
    '$workerId $name: changing any single stored key changes the rendered YAML',
    ({ workerId, name, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const filled = registration.upgradeStoredValues(values);
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
      const kept = registration.upgradeStoredValues(values);
      const changed = changedStoredValues(expectedAfterUpgrade(workerId, values), readBack, kept);
      if (changed.length > 0) {
        throw new Error(
          `Reading "${workerId}" document "${name}" changed a stored value: ${changed.join(
            '; '
          )}.\n\n${STORED_VALUE_EXITS}`
        );
      }
    }
  );

  /** Every level on the shared scale a Worker does not allow, stored on its current.json. */
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
    '$workerId: a stored $level is read, written at startup and rendered as the same lower level',
    ({ workerId, level, lowered, values }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      if (lowered === undefined) {
        expect(() => registration.toSettings(values)).toThrow(/settings are invalid: autonomy/);
        return;
      }
      const upgraded = registration.upgradeStoredValues(values);
      expect(registration.toSettings(values).autonomy).toBe(lowered);
      expect(upgraded.autonomyLevel).toBe(lowered);
      const rendered = getYamlTemplate(workerId)(upgraded);
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
      const baseText = readAtBase(SETTINGS_CONTRACT_SNAPSHOT_FILE);
      if (baseText === undefined) {
        return;
      }
      const failure = unrecordedBreakingChange(
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
          )}, not 1. ${VERSION_TRIPWIRE_HINT}`
        );
      }
    }
  );
});
