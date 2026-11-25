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
import { getKbnServerlessUiamCert } from '@kbn/dev-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import { ensureVaultAuth, getKbnEvalsVaultPath, readVaultSecret } from '@kbn/evals';
import {
  DEFAULT_KIBANA_AUTH,
  LOCAL_DEV_VAULT_SECRET,
  ORCA_CONNECTOR_ID,
  ORCA_INDEX_PATTERNS,
  ORCA_SANDBOX_ALLOWED_HOSTS,
  ORCA_VAULT_SECRET,
  RELAY_DEV_HOST_NAME,
  RELAY_DEV_URL,
  RELAY_UIAM_PROJECT_TYPE,
} from './constants';
import {
  getLocalDevSettings,
  hasRelayConfig,
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
import { getRelayDevRunArgs, startRelayDev, stopRelayDev } from './relay_dev';
import { createJsonClient, resolveKibanaBaseUrl } from './http_client';
import { connectSlackStub, disconnectSlack } from './slack_stub';
import { createServerlessAdminCookie } from './serverless_session';
import {
  addOrcaSpaceContext,
  assertEnterpriseLicense,
  deleteOrcaConnector,
  enableNightshiftSpace,
  getKibanaStatus,
  removeOrcaSpaceContext,
  isServerless,
  saveOrcaConnector,
  updateInvestigatorConnectors,
  verifySetup,
  waitForKibana,
} from './kibana_steps';

const DEFAULT_KIBANA_CONFIG = Path.join(REPO_ROOT, 'config', 'kibana.dev.yml');

interface Flags {
  kibanaUrl: string;
  kibanaAuth?: string;
  esUrl: string;
  kibanaConfig: string;
  skipRelay: boolean;
}

const getKibanaAuths = ({ kibanaAuth }: Flags): readonly string[] =>
  kibanaAuth ? [kibanaAuth] : DEFAULT_KIBANA_AUTH;

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

interface RelayMode {
  uiam: boolean;
  kibanaUrl: string;
}

/**
 * Kibana's URL, with the Docker host name in place of localhost. Kibana sends it to the Relay when
 * Slack is connected (`xpack.actions.relay.kibanaUrl`), and the Relay calls it back from inside its
 * container.
 */
const getKibanaUrlForRelay = async ({ kibanaUrl }: Flags): Promise<string> => {
  const base = await resolveKibanaBaseUrl(kibanaUrl).catch(() => kibanaUrl);
  const url = new URL(base);
  url.hostname = RELAY_DEV_HOST_NAME;
  return url.href.replace(/\/+$/, '');
};

/**
 * The Relay's mode, or undefined with --skip-relay. UIAM goes with Serverless, whose Nightshift
 * service accounts (always enabled by the managed block) the Relay then assumes through UIAM; it is
 * detected from the running Kibana, so start Kibana first.
 */
const getRelayMode = async (
  log: ToolingLog,
  flags: Flags,
  redactor: Redactor
): Promise<RelayMode | undefined> => {
  if (flags.skipRelay) return undefined;
  const uiam = await isServerlessKibana(flags, redactor);
  const kibanaUrl = await getKibanaUrlForRelay(flags);
  log.info(
    uiam
      ? 'Kibana is Serverless: the Relay will authenticate it with UIAM'
      : 'No Serverless Kibana found on the Kibana URL: the Relay will use API keys (start Kibana first and re-run for UIAM)'
  );
  return { uiam, kibanaUrl };
};

const getUiamSettings = (uiam: boolean) => {
  if (!uiam) return undefined;
  const { certPath, keyPath } = getKbnServerlessUiamCert(RELAY_UIAM_PROJECT_TYPE);
  return { certificate: certPath, key: keyPath };
};

/** Whether the running Kibana is a Serverless project, where the Relay authenticates it with UIAM. */
const isServerlessKibana = async (flags: Flags, redactor: Redactor): Promise<boolean> => {
  try {
    const kibanaUrl = await resolveKibanaBaseUrl(flags.kibanaUrl);
    const { status } = await getKibanaStatus(
      getKibanaAuths(flags).map((basic) =>
        createJsonClient({ baseUrl: kibanaUrl, credentials: { basic }, redactor })
      )
    );
    return isServerless(status);
  } catch {
    return false;
  }
};

/** Writes the managed block; returns whether the file changed. */
const writeKibanaConfig = async (
  log: ToolingLog,
  configPath: string,
  sandbox: SandboxConnection,
  { dryRun, relay }: { dryRun: boolean; relay?: RelayMode }
): Promise<boolean> => {
  const current = await readConfigFile(configPath);
  const relativePath = Path.relative(REPO_ROOT, configPath);
  const relayConfigured = relay !== undefined && hasRelayConfig(current);
  if (relayConfigured) {
    log.info(`xpack.actions.relay is already set in ${relativePath}; left as is`);
  }
  const { content, alreadySet } = planManagedBlock(
    current,
    getLocalDevSettings(
      sandbox,
      relay && !relayConfigured
        ? {
            url: RELAY_DEV_URL,
            kibanaUrl: relay.kibanaUrl,
            uiam: getUiamSettings(relay.uiam),
          }
        : undefined
    )
  );
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
  log.success(`Wrote the Nightshift block to ${relativePath}`);
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
  const auths = getKibanaAuths(flags);
  const clients = auths.map((basic) =>
    createJsonClient({ baseUrl: kibanaUrl, credentials: { basic }, redactor })
  );
  const { status, kibana: basicKibana } = await waitForKibana(clients, log, {
    startedAfter: configChangedAt,
  });
  log.success(`Kibana ${status.version?.number} is available on ${kibanaUrl}`);
  await assertEnterpriseLicense(basicKibana);

  const isServerlessProject = isServerless(status);
  const kibana = isServerlessProject
    ? createJsonClient({
        baseUrl: kibanaUrl,
        credentials: { cookie: await createServerlessAdminCookie(kibanaUrl, log) },
        redactor,
      })
    : basicKibana;
  const elasticsearch = createJsonClient({
    baseUrl: flags.esUrl.replace(/\/+$/, ''),
    credentials: { basic: auths[clients.indexOf(basicKibana)] },
    redactor,
  });
  await enableNightshiftSpace({ kibana, elasticsearch, isServerlessProject, log });

  const saved = await saveOrcaConnector(kibana, orca);
  log.success(`ORCA connector ${ORCA_CONNECTOR_ID} ${saved}`);
  if (await updateInvestigatorConnectors(kibana, 'add')) {
    log.success(`Saved ${ORCA_CONNECTOR_ID} on the investigator agent`);
  }

  await connectSlackStub(kibana, log).catch((error: Error) =>
    log.warning(`Could not set up Slack: ${redactor.redact(error.message)}`)
  );

  const { addedContext, addedHosts } = await addOrcaSpaceContext(kibana);
  if (addedContext) log.success('Added the ORCA source code snippet to the space custom context');
  if (addedHosts.length > 0) {
    log.success(`Added ${addedHosts.join(', ')} to the space sandbox egress allowlist`);
  }

  const { available, connectorListed, connectorOnInvestigator, spaceContext, orcaLogCount } =
    await verifySetup({ kibana, orca });
  const problems = [
    ...(available
      ? []
      : [
          'Investigations are not available (GET /internal/nightshift/investigations/availability). The default model is an EIS endpoint: start Elasticsearch with `pnpm es snapshot --eis`. Otherwise check the Kibana log for model and sandbox errors.',
        ]),
    ...(connectorListed ? [] : [`${ORCA_CONNECTOR_ID} is not among the sandbox connectors.`]),
    ...(connectorOnInvestigator
      ? []
      : [`${ORCA_CONNECTOR_ID} is not saved on the investigator agent's connectors.`]),
    ...(spaceContext
      ? []
      : ['The space lacks the ORCA source code context or its sandbox egress allowlist entry.']),
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
      `  - ORCA source code context and ${ORCA_SANDBOX_ALLOWED_HOSTS.join(
        ', '
      )} egress in the space`,
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
    const { kibana } = await getKibanaStatus(
      getKibanaAuths(flags).map((basic) =>
        createJsonClient({ baseUrl: kibanaUrl, credentials: { basic }, redactor })
      )
    );
    if (!kibana) throw new Error('Kibana rejects the --kibana-auth credentials');
    await disconnectSlack(kibana).then(
      (disconnected) => disconnected && log.info('Disconnected the Slack workspace'),
      (error: Error) => log.warning(`Could not disconnect Slack: ${error.message}`)
    );
    await removeOrcaSpaceContext(kibana).then(
      () => log.info('Removed the ORCA source code context and its egress from the space'),
      (error: Error) => log.warning(`Could not update the space context: ${error.message}`)
    );
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
  } else {
    await writeConfigFile(flags.kibanaConfig, next);
    log.success(
      `Removed the Nightshift block from ${Path.relative(REPO_ROOT, flags.kibanaConfig)}`
    );
  }
  if (!flags.skipRelay) await stopRelayDev(log);
};

run(
  async ({ log, flags: rawFlags }) => {
    const flags: Flags = {
      kibanaUrl: String(rawFlags['kibana-url']),
      kibanaAuth: typeof rawFlags['kibana-auth'] === 'string' ? rawFlags['kibana-auth'] : undefined,
      esUrl: String(rawFlags['es-url']),
      kibanaConfig: Path.resolve(String(rawFlags['kibana-config'])),
      skipRelay: Boolean(rawFlags['skip-relay']),
    };
    const redactor = createRedactor();
    if (flags.kibanaAuth) redactor.add(flags.kibanaAuth);
    try {
      if (rawFlags.remove) {
        await remove({ log, flags, redactor });
        return;
      }
      const { sandbox, orca } = await readSecrets(log, redactor);
      if (rawFlags['dry-run']) {
        const relay = await getRelayMode(log, flags, redactor);
        await writeKibanaConfig(log, flags.kibanaConfig, sandbox, { dryRun: true, relay });
        if (relay) log.info(`Would run: docker ${getRelayDevRunArgs(relay).join(' ')}`);
        return;
      }
      await checkSandboxCredential(log, sandbox);

      let configChangedAt: number | undefined;
      if (!rawFlags['connector-only']) {
        const relay = await getRelayMode(log, flags, redactor);
        if (relay) await startRelayDev(log, relay);
        const writtenAt = Date.now();
        const changed = await writeKibanaConfig(log, flags.kibanaConfig, sandbox, {
          dryRun: false,
          relay,
        });
        configChangedAt = changed ? writtenAt : undefined;
      }
      if (rawFlags['skip-connector']) {
        log.info(
          'Start Kibana (pnpm start), then finish with: node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js --connector-only'
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
      It also runs the Relay dev container (Docker) with a Slack stub and points Kibana at it,
      unless xpack.actions.relay is already configured, then connects the stub's Slack workspace and
      binds its #general channel.
      On a local Serverless project it binds the space as an admin of the mock IdP.
      Re-run it to pick up a rotated credential.
    `,
    flags: {
      boolean: ['dry-run', 'skip-connector', 'connector-only', 'remove', 'skip-relay'],
      string: ['kibana-url', 'kibana-auth', 'es-url', 'kibana-config'],
      default: {
        'kibana-url': 'http://localhost:5601',
        'es-url': 'http://localhost:9200',
        'kibana-config': DEFAULT_KIBANA_CONFIG,
      },
      help: `
        --dry-run         Print the config block, secrets redacted, and change nothing
        --skip-connector  Only write the config block, for when Kibana is not running yet
        --connector-only  Only set Kibana up (space, connector), for after --skip-connector
        --skip-relay      Do not run the Relay dev container or set xpack.actions.relay.url
        --remove          Delete the ORCA connector, remove the config block and stop the Relay container
        --kibana-url      Kibana URL; a dev base path is detected (default: http://localhost:5601)
        --kibana-auth     user:password of a superuser (default: elastic:changeme, then elastic_serverless:changeme)
        --es-url          Elasticsearch URL, for the service account roles (default: http://localhost:9200)
        --kibana-config   Kibana config to write (default: config/kibana.dev.yml)
      `,
    },
  }
);
