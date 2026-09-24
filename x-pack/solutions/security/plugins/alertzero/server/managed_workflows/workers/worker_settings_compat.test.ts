/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SYSTEM_SECURITY_WORKER_IDS } from '@kbn/alertzero-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { createWorkerSettingsRegistration } from './worker_settings';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

const MIGRATION_ISSUE = 'https://github.com/elastic/security-team/issues/19312';

const FIXTURE_FAILURE_HINT = `A rename, removal, or retype of a stored Worker settings field needs the migration chain and pre-ready() pass from ${MIGRATION_ISSUE}. Until that lands, the other exit is the pre-customer reset (plugin README, "Pre-customer state"). Edit this fixture only as the deliberate acknowledgement that stored development documents will be reset.`;

const VERSION_TRIPWIRE_HINT = `A settings version bump needs the migration chain and pre-ready() pass from ${MIGRATION_ISSUE}. The PR that lands them deletes this test.`;

/**
 * Version-1 `templateValues` as persisted on each per-space Worker document. Committed literals so
 * a rename in code does not move the fixture; non-default values so a renamed field that happens
 * to match a default still fails.
 */
const loadV1Fixture = (workerId: RegisteredWorkerId): Record<string, unknown> =>
  JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures', 'v1', `${workerId}.json`), 'utf8')
  ) as Record<string, unknown>;

const getYamlTemplate = (workerId: RegisteredWorkerId) => {
  const definition = getManagedWorkflowDefinition(workerId);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Worker "${workerId}" is missing a yamlTemplate`);
  }
  return definition.yamlTemplate;
};

describe('stored Worker settings compatibility', () => {
  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s v1 fixture parses through toSettings and renders without leftover tokens',
    (workerId) => {
      const fixture = loadV1Fixture(workerId);
      const registration = createWorkerSettingsRegistration(workerId);

      try {
        registration.toSettings(fixture);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `toSettings rejected the v1 fixture for "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }

      let yaml: string;
      try {
        yaml = getYamlTemplate(workerId)(fixture);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `yamlTemplate threw for the v1 fixture of "${workerId}": ${detail}\n\n${FIXTURE_FAILURE_HINT}`
        );
      }

      if (yaml.includes('undefined')) {
        throw new Error(
          `Rendered YAML for "${workerId}" contains "undefined".\n\n${FIXTURE_FAILURE_HINT}\n\n${yaml}`
        );
      }

      const leftoverTokens = yaml.match(UNREPLACED_TOKEN_PATTERN) ?? [];
      if (leftoverTokens.length > 0) {
        throw new Error(
          `Rendered YAML for "${workerId}" still has unreplaced tokens: ${leftoverTokens.join(
            ', '
          )}.\n\n${FIXTURE_FAILURE_HINT}\n\n${yaml}`
        );
      }
    }
  );

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s settings version is 1 until the migration chain lands',
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
