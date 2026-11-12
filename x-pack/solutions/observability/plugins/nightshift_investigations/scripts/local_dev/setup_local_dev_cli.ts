/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { chmod, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { ensureVaultAuth, getKbnEvalsVaultPath, readVaultSecret } from '@kbn/evals';
import {
  LOCAL_DEV_VAULT_SECRET,
  ORCA_CONNECTOR_ID,
  ORCA_INDEX_PATTERNS,
  ORCA_VAULT_SECRET,
} from './constants';
import {
  getLocalDevSettings,
  planManagedBlock,
  redactManagedBlock,
  removeManagedBlock,
} from './managed_block';
import {
  createRedactor,
  parseLocalDevSecret,
  parseOrcaSecret,
  type OrcaConnection,
  type Redactor,
  type SandboxConnection,
} from './secrets';
import { probeSandboxCredential } from './sandbox_probe';
import { createJsonClient, resolveKibanaBaseUrl } from './http_client';
import {
  assertEnterpriseLicense,
  deleteOrcaConnector,
  enableNightshiftSpace,
  isServerless,
  saveOrcaConnector,
  updateInvestigatorConnectors,
  verifySetup,
  waitForKibana,
} from './kibana_steps';

const DEFAULT_KIBANA_CONFIG = Path.join(REPO_ROOT, 'config', 'kibana.dev.yml');

interface Flags {
  kibanaUrl: string;
  kibanaAuth: string;
  esUrl: string;
  kibanaConfig: string;
}

const readSecrets = async (
  log: ToolingLog,
  redactor: Redactor
): Promise<{ sandbox: SandboxConnection; orca: OrcaConnection }> => {
  await ensureVaultAuth(log);
  const sandboxPath = getKbnEvalsVaultPath('dev', LOCAL_DEV_VAULT_SECRET);
  const orcaPath = getKbnEvalsVaultPath('dev', ORCA_VAULT_SECRET);
  const sandbox = parseLocalDevSecret(await readVaultSecret('dev', sandboxPath), sandboxPath);
  const orca = parseOrcaSecret(await readVaultSecret('dev', orcaPath), orcaPath);
  redactor.add(sandbox.apiKey, orca.apiKey);
  log.success(`Read the sandbox credential (${sandboxPath}) and the ORCA key (${orcaPath})`);
  return { sandbox, orca };
};

const readConfigFile = async (path: string): Promise<string> =>
  existsSync(path) ? readFile(path, 'utf-8') : '';

const writeConfigFile = async (path: string, content: string): Promise<void> => {
  await writeFile(path, content, { mode: 0o600 });
  // `mode` only applies to a new file, and the file now holds the sandbox key.
  await chmod(path, 0o600);
};

/** Writes the managed block; returns whether the file changed. */
const writeKibanaConfig = async (
  log: ToolingLog,
  configPath: string,
  sandbox: SandboxConnection,
  { dryRun }: { dryRun: boolean }
): Promise<boolean> => {
  const current = await readConfigFile(configPath);
  const { content, alreadySet, addsEncryptionKey } = planManagedBlock(
    current,
    getLocalDevSettings(sandbox)
  );
  const relativePath = Path.relative(REPO_ROOT, configPath);
  if (alreadySet.length > 0) {
    log.info(`Already set in ${relativePath}, left out of the block: ${alreadySet.join(', ')}`);
  }
  if (dryRun) {
    log.info(`Would write this block to ${relativePath}:\n${redactManagedBlock(content)}`);
    return false;
  }
  if (content === current) {
    log.success(`${relativePath} is up to date`);
    return false;
  }
  await writeConfigFile(configPath, content);
  log.success(
    `Wrote the Nightshift block to ${relativePath}${
      addsEncryptionKey ? ', with an encryption key so saved connectors survive restarts' : ''
    }`
  );
  return true;
};

const checkSandboxCredential = async (log: ToolingLog, sandbox: SandboxConnection) => {
  const result = await probeSandboxCredential(sandbox);
  if (result === 'authenticated') {
    log.success(`The sandbox credential works on ${sandbox.host}:${sandbox.port}`);
  } else if (result === 'unauthenticated') {
    throw new Error(
      'sandbox-api rejects the credential in Vault (Unauthenticated). A maintainer must rotate it with rotate_local_dev_sandbox_credential.js.'
    );
  } else {
    log.warning(
      `Could not reach ${sandbox.host}:${sandbox.port} to check the sandbox credential; continuing`
    );
  }
};

const setUpKibana = async ({
  log,
  flags,
  orca,
  redactor,
  configChangedAt,
}: {
  log: ToolingLog;
  flags: Flags;
  orca: OrcaConnection;
  redactor: Redactor;
  configChangedAt?: number;
}) => {
  const kibanaUrl = await resolveKibanaBaseUrl(flags.kibanaUrl).catch(() => flags.kibanaUrl);
  const kibana = createJsonClient({ baseUrl: kibanaUrl, auth: flags.kibanaAuth, redactor });
  const status = await waitForKibana(kibana, log, { startedAfter: configChangedAt });
  log.success(`Kibana ${status.version?.number} is available on ${kibanaUrl}`);
  await assertEnterpriseLicense(kibana);

  if (isServerless(status)) {
    log.warning(
      'Serverless Kibana: open the Nightshift app and finish its setup to bind the space to the service accounts.'
    );
  } else {
    const elasticsearch = createJsonClient({
      baseUrl: flags.esUrl.replace(/\/+$/, ''),
      auth: flags.kibanaAuth,
      redactor,
    });
    await enableNightshiftSpace({ kibana, elasticsearch, log });
  }

  const saved = await saveOrcaConnector(kibana, orca);
  log.success(`ORCA connector ${ORCA_CONNECTOR_ID} ${saved}`);
  if (await updateInvestigatorConnectors(kibana, 'add')) {
    log.success(`Saved ${ORCA_CONNECTOR_ID} on the investigator agent`);
  }

  const { available, connectorListed, connectorOnInvestigator, orcaLogCount } = await verifySetup({
    kibana,
    orca,
  });
  const problems = [
    ...(available
      ? []
      : [
          'Investigations are not available (GET /internal/nightshift/investigations/availability). Check that Kibana has an LLM connector, and the Kibana log for sandbox errors.',
        ]),
    ...(connectorListed ? [] : [`${ORCA_CONNECTOR_ID} is not among the sandbox connectors.`]),
    ...(connectorOnInvestigator
      ? []
      : [`${ORCA_CONNECTOR_ID} is not saved on the investigator agent's connectors.`]),
    ...(orcaLogCount === undefined ? ['The ORCA key could not count ORCA logs.'] : []),
  ];
  if (problems.length > 0) {
    throw new Error(`Setup finished, but:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  log.success(
    [
      'Nightshift is ready for ORCA investigations:',
      `  - investigations available on ${kibanaUrl}`,
      `  - connector ${ORCA_CONNECTOR_ID} on the investigator, reading ${ORCA_INDEX_PATTERNS.join(
        ', '
      )}`,
      `  - ${orcaLogCount} ORCA log documents readable`,
    ].join('\n')
  );
};

const remove = async ({
  log,
  flags,
  redactor,
}: {
  log: ToolingLog;
  flags: Flags;
  redactor: Redactor;
}) => {
  try {
    const kibanaUrl = await resolveKibanaBaseUrl(flags.kibanaUrl);
    const kibana = createJsonClient({ baseUrl: kibanaUrl, auth: flags.kibanaAuth, redactor });
    await updateInvestigatorConnectors(kibana, 'remove').then(
      (removed) => removed && log.info(`Removed ${ORCA_CONNECTOR_ID} from the investigator agent`),
      (error: Error) => log.warning(`Could not update the investigator agent: ${error.message}`)
    );
    log.info(
      (await deleteOrcaConnector(kibana))
        ? `Deleted connector ${ORCA_CONNECTOR_ID}`
        : `Connector ${ORCA_CONNECTOR_ID} does not exist`
    );
  } catch (error) {
    log.warning(
      `Could not reach Kibana to delete ${ORCA_CONNECTOR_ID}; delete it in Stack Management: ${
        (error as Error).message
      }`
    );
  }
  const current = await readConfigFile(flags.kibanaConfig);
  const next = removeManagedBlock(current);
  if (next === current) {
    log.info('No managed block to remove');
    return;
  }
  await writeConfigFile(flags.kibanaConfig, next);
  log.success(`Removed the Nightshift block from ${Path.relative(REPO_ROOT, flags.kibanaConfig)}`);
};

run(
  async ({ log, flags: rawFlags }) => {
    const flags: Flags = {
      kibanaUrl: String(rawFlags['kibana-url']),
      kibanaAuth: String(rawFlags['kibana-auth']),
      esUrl: String(rawFlags['es-url']),
      kibanaConfig: Path.resolve(String(rawFlags['kibana-config'])),
    };
    const redactor = createRedactor();
    redactor.add(flags.kibanaAuth);
    try {
      if (rawFlags.remove) {
        await remove({ log, flags, redactor });
        return;
      }
      const { sandbox, orca } = await readSecrets(log, redactor);
      if (rawFlags['dry-run']) {
        await writeKibanaConfig(log, flags.kibanaConfig, sandbox, { dryRun: true });
        return;
      }
      await checkSandboxCredential(log, sandbox);

      let configChangedAt: number | undefined;
      if (!rawFlags['connector-only']) {
        const writtenAt = Date.now();
        const changed = await writeKibanaConfig(log, flags.kibanaConfig, sandbox, {
          dryRun: false,
        });
        configChangedAt = changed ? writtenAt : undefined;
      }
      if (rawFlags['skip-connector']) {
        log.info(
          'Start Kibana (yarn start), then finish with: node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js --connector-only'
        );
        return;
      }
      await setUpKibana({ log, flags, orca, redactor, configChangedAt });
    } catch (error) {
      // Messages of subprocess, HTTP and parse errors can carry a secret.
      throw createFailError(redactor.redact((error as Error).message));
    }
  },
  {
    description: `
      Sets up a local Kibana for Nightshift investigations against the ORCA telemetry cluster, with
      the shared eval sandbox. Reads the credentials from the dev Vault (and logs in when needed),
      writes a managed block to config/kibana.dev.yml, waits for Kibana to restart, binds the default
      space to the Nightshift service accounts and saves the ORCA connector on the investigator.
      Re-run it to pick up a rotated credential.
    `,
    flags: {
      boolean: ['dry-run', 'skip-connector', 'connector-only', 'remove'],
      string: ['kibana-url', 'kibana-auth', 'es-url', 'kibana-config'],
      default: {
        'kibana-url': 'http://localhost:5601',
        'kibana-auth': 'elastic:changeme',
        'es-url': 'http://localhost:9200',
        'kibana-config': DEFAULT_KIBANA_CONFIG,
      },
      help: `
        --dry-run         Print the config block, secrets redacted, and change nothing
        --skip-connector  Only write the config block, for when Kibana is not running yet
        --connector-only  Only set Kibana up (space, connector), for after --skip-connector
        --remove          Delete the ORCA connector and remove the config block
        --kibana-url      Kibana URL; a dev base path is detected (default: http://localhost:5601)
        --kibana-auth     user:password of a superuser (default: elastic:changeme)
        --es-url          Elasticsearch URL, for the service account roles (default: http://localhost:9200)
        --kibana-config   Kibana config to write (default: config/kibana.dev.yml)
      `,
    },
  }
);
