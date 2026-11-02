/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { isEqual } from 'lodash';
import {
  SYSTEM_SECURITY_WORKER_IDS,
  WATCH_AUTONOMY_LEVELS,
  getAllowedAutonomyLevels,
  getWorkerSettingsDeclaration,
  nearestLowerAutonomyLevel,
} from '@kbn/alertzero-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { readTestHelperFileAt, resolveBaseCommit } from './test_helpers/merge_base';
import {
  ACCEPT_BREAKING_CHANGE_ENV,
  BREAKING_CHANGE_REMEDIES,
  SETTINGS_CONTRACT_SNAPSHOT_FILE,
  UPDATE_SETTINGS_CONTRACT_COMMAND,
  UPDATE_SETTINGS_CONTRACT_ENV,
  buildSettingsContract,
  describeBaseBranchFailure,
  describeContractChanges,
  diffSettingsContracts,
  nextSettingsContractSnapshot,
  parseAcceptedIssue,
  parseSettingsContractSnapshot,
  type SettingsContractSnapshot,
} from './test_helpers/settings_contract';
import { createWorkerSettingsRegistration, toTemplateValues } from './worker_settings';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

const SNAPSHOT_PATH = resolve(__dirname, 'test_helpers', SETTINGS_CONTRACT_SNAPSHOT_FILE);

const FIXTURE_FAILURE_HINT = `Each fixture is a document a configured Worker stores. A change that stops one from reading needs ${BREAKING_CHANGE_REMEDIES}, recorded through the settings contract snapshot. Edit the fixture only after a reset, because the old shape then no longer exists.`;

const SETTINGS_VERSION_BUMP_HINT = `A settings version bump breaks every stored document of that Worker. It needs ${BREAKING_CHANGE_REMEDIES}.`;

const STORED_VALUE_CHANGED_HINT = `A read must leave a stored value as it was. Keep the stored value and change only the label, or it needs ${BREAKING_CHANGE_REMEDIES}.`;

interface StoredFixture {
  workerId: RegisteredWorkerId;
  name: string;
  values: Record<string, unknown>;
}

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
    .map((name) => ({
      workerId,
      name,
      values: JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as Record<string, unknown>,
    }));
};

const ALL_FIXTURES = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => loadFixtures(workerId));

const currentFixture = (workerId: RegisteredWorkerId): StoredFixture | undefined =>
  ALL_FIXTURES.find((fixture) => fixture.workerId === workerId && fixture.name === 'current.json');

const getYamlTemplate = (workerId: RegisteredWorkerId) => {
  const definition = getManagedWorkflowDefinition(workerId);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Worker "${workerId}" is missing a yamlTemplate`);
  }
  return definition.yamlTemplate;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The stored values as the Worker is expected to run them: identical, except that an autonomy
 * level the Worker no longer allows becomes the nearest allowed level below it, and extras are
 * dropped once the Worker declares none.
 */
const expectedAfterUpgrade = (
  workerId: RegisteredWorkerId,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  const { extras: _extras, ...withoutExtras } = stored;
  const kept = getWorkerSettingsDeclaration(workerId).extras === undefined ? withoutExtras : stored;
  const { autonomyLevel } = kept;
  const allowed = getAllowedAutonomyLevels(workerId);
  const level = WATCH_AUTONOMY_LEVELS.find((candidate) => candidate === autonomyLevel);
  if (level === undefined || allowed.includes(level)) {
    return kept;
  }
  const lowered = nearestLowerAutonomyLevel(allowed, level);
  return lowered === undefined ? kept : { ...kept, autonomyLevel: lowered };
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

const readBaseSnapshot = (): SettingsContractSnapshot | undefined => {
  const baseCommit = resolveBaseCommit();
  const text =
    baseCommit === undefined
      ? undefined
      : readTestHelperFileAt(baseCommit, SETTINGS_CONTRACT_SNAPSHOT_FILE);
  return text === undefined ? undefined : parseSettingsContractSnapshot(text);
};

describe('stored Worker settings compatibility', () => {
  it.each([...SYSTEM_SECURITY_WORKER_IDS])('%s has a current.json fixture', (workerId) => {
    if (currentFixture(workerId) === undefined) {
      throw new Error(
        `Worker "${workerId}" has no current.json fixture. Add ${fixtureDirectory(
          workerId
        )}/current.json with the settings a configured space stores for it today (plugin README, "Changing Worker settings safely").`
      );
    }
  });

  it.each(ALL_FIXTURES)('$workerId $name reads and renders', ({ workerId, name, values }) => {
    try {
      createWorkerSettingsRegistration(workerId).toSettings(values);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `toSettings rejected the fixture "${name}" for "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
      );
    }
    try {
      getYamlTemplate(workerId)(values);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `yamlTemplate threw for the fixture "${name}" of "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
      );
    }
  });

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
    const current = currentFixture(workerId);
    const allowed = getAllowedAutonomyLevels(workerId);
    return current === undefined
      ? []
      : WATCH_AUTONOMY_LEVELS.filter((level) => !allowed.includes(level)).map((level) => {
          const lowered = nearestLowerAutonomyLevel(allowed, level);
          return {
            workerId,
            level,
            lowered,
            stored: { ...current.values, autonomyLevel: level },
            storedLowered: { ...current.values, autonomyLevel: lowered },
          };
        });
  });

  it.each(DISALLOWED_LEVEL_DOCUMENTS)(
    '$workerId: a stored $level is read and rendered as the same lower level',
    ({ workerId, level, lowered, stored, storedLowered }) => {
      const registration = createWorkerSettingsRegistration(workerId);
      if (lowered === undefined) {
        expect(() => registration.toSettings(stored)).toThrow(/settings are invalid: autonomy/);
        return;
      }
      expect(registration.toSettings(stored).autonomy).toBe(lowered);
      const yamlTemplate = getYamlTemplate(workerId);
      if (yamlTemplate(stored) !== yamlTemplate(storedLowered)) {
        throw new Error(
          `The workflow for "${workerId}" rendered from a stored "${level}" differs from one rendered from "${lowered}", so the settings page and the running workflow disagree.`
        );
      }
    }
  );

  /** Each key a Worker fills from its defaults, removed from its current.json. */
  const MISSING_DEFAULT_DOCUMENTS = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => {
    const current = currentFixture(workerId);
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
    const current = buildSettingsContract();
    const acceptedIssue = process.env[ACCEPT_BREAKING_CHANGE_ENV];

    if (process.env[UPDATE_SETTINGS_CONTRACT_ENV] === 'true') {
      it('updates the committed snapshot', () => {
        if (process.env.CI) {
          throw new Error(
            `${UPDATE_SETTINGS_CONTRACT_ENV} rewrites ${SETTINGS_CONTRACT_SNAPSHOT_FILE}; run it locally and commit the result.`
          );
        }
        const committed: SettingsContractSnapshot = existsSync(SNAPSHOT_PATH)
          ? parseSettingsContractSnapshot(readFileSync(SNAPSHOT_PATH, 'utf8'))
          : { acceptedBreakingChanges: [], shared: current.shared, workers: {} };
        const next = nextSettingsContractSnapshot({
          committed,
          current,
          base: readBaseSnapshot(),
          acceptedIssue: parseAcceptedIssue(acceptedIssue),
        });
        writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(next, null, 2)}\n`);
      });
      return;
    }

    const committed = parseSettingsContractSnapshot(readFileSync(SNAPSHOT_PATH, 'utf8'));

    it(`ignores ${ACCEPT_BREAKING_CHANGE_ENV} unless the snapshot is being updated`, () => {
      if (acceptedIssue) {
        throw new Error(
          `${ACCEPT_BREAKING_CHANGE_ENV} only takes effect together with ${UPDATE_SETTINGS_CONTRACT_ENV}=true:\n${UPDATE_SETTINGS_CONTRACT_COMMAND}`
        );
      }
    });

    it('matches the committed snapshot', () => {
      const changes = diffSettingsContracts(committed, current);
      if (changes.length > 0) {
        throw new Error(describeContractChanges(changes));
      }
    });

    it('records a decision for any change that breaks documents stored by the base branch', () => {
      const base = readBaseSnapshot();
      if (base === undefined) {
        return;
      }
      const failure = describeBaseBranchFailure(base, committed, current);
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
