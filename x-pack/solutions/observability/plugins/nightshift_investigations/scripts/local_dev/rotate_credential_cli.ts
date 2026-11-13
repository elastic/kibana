/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { setTimeout as sleep } from 'timers/promises';
import execa from 'execa';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ensureVaultAuth,
  getKbnEvalsVaultPath,
  readVaultSecret,
  writeVaultSecret,
} from '@kbn/evals';
import { LOCAL_DEV_SANDBOX_USERNAME, LOCAL_DEV_VAULT_SECRET } from './constants';
import {
  buildLocalDevSecret,
  createRedactor,
  parseLocalDevSecret,
  type Redactor,
  type SandboxConnection,
} from './secrets';
import { probeSandboxCredential } from './sandbox_probe';

interface Credential {
  username: string;
  password: string;
}

const parseCredential = (text: string, source: string): Credential => {
  let parsed: Partial<Credential>;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fixed message: the parser would quote the password.
    throw new Error(`${source} is not a JSON object`);
  }
  const { username, password } = parsed;
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error(`${source} has no password`);
  }
  if (username !== LOCAL_DEV_SANDBOX_USERNAME) {
    throw new Error(`${source} is for "${username}", not "${LOCAL_DEV_SANDBOX_USERNAME}"`);
  }
  return { username, password };
};

/** Mints a new password on the eval cluster: Secret Manager, cluster sync, sandbox-api restart. */
const mintCredential = async (log: ToolingLog, sandboxServiceDir: string): Promise<Credential> => {
  const script = Path.join(sandboxServiceDir, 'scripts', 'add-dev-credential.py');
  if (!existsSync(script)) {
    throw new Error(
      `${script} not found; pass the sandbox-service checkout with --sandbox-service-dir`
    );
  }
  log.info(`Rotating ${LOCAL_DEV_SANDBOX_USERNAME} on the eval cluster...`);
  try {
    // Progress goes to stderr, shown as is; stdout holds only the credential.
    const { stdout } = await execa(script, ['eval', LOCAL_DEV_SANDBOX_USERNAME, '--json'], {
      cwd: sandboxServiceDir,
      stdin: 'inherit',
      stderr: 'inherit',
    });
    return parseCredential(stdout, 'The output of add-dev-credential.py');
  } catch (error) {
    // `shortMessage` holds the command and exit code, never the output.
    const { shortMessage } = error as { shortMessage?: string };
    throw new Error(shortMessage ?? (error as Error).message);
  }
};

const waitUntilAuthenticated = async (
  log: ToolingLog,
  sandbox: SandboxConnection
): Promise<void> => {
  // add-dev-credential.py restarts sandbox-api, which may still be rolling out.
  for (let attempt = 0; attempt < 12; attempt++) {
    const result = await probeSandboxCredential(sandbox);
    if (result === 'authenticated') {
      log.success(`sandbox-api accepts the credential on ${sandbox.host}:${sandbox.port}`);
      return;
    }
    log.info(`sandbox-api answered ${result}; retrying in 10s...`);
    await sleep(10_000);
  }
  throw new Error(
    'sandbox-api still rejects the credential. Check the sandbox-api rollout on the eval cluster; Vault already holds the new credential.'
  );
};

const storeInVault = async (
  log: ToolingLog,
  credential: Credential,
  redactor: Redactor
): Promise<SandboxConnection> => {
  const vaultPath = getKbnEvalsVaultPath('dev', LOCAL_DEV_VAULT_SECRET);
  const secret = buildLocalDevSecret(credential);
  try {
    await writeVaultSecret('dev', vaultPath, secret);
  } catch (error) {
    throw new Error(
      [
        `Writing ${vaultPath} failed: ${redactor.redact((error as Error).message)}`,
        'The eval cluster already has the new password and Vault still has the old one, so local Kibanas fail with Unauthenticated.',
        'Fix the Vault access and re-run; a re-run rotates again and retries the write.',
      ].join('\n')
    );
  }
  const stored = parseLocalDevSecret(await readVaultSecret('dev', vaultPath), vaultPath);
  if (stored.apiKey !== secret.sandbox.apiKey) {
    throw new Error(`${vaultPath} does not read back as the credential just written`);
  }
  log.success(`Stored the ${credential.username} credential in ${vaultPath}`);
  return stored;
};

run(
  async ({ log, flags }) => {
    const redactor = createRedactor();
    try {
      await ensureVaultAuth(log);
      const fromFile = flags['from-file'] ? String(flags['from-file']) : undefined;
      let credential: Credential;
      if (fromFile) {
        credential = parseCredential(await readFile(fromFile, 'utf-8'), fromFile);
        log.info(`Uploading the credential in ${fromFile}, without rotating it`);
      } else {
        const sandboxServiceDir = String(
          flags['sandbox-service-dir'] ?? process.env.SANDBOX_SERVICE_DIR ?? ''
        );
        if (!sandboxServiceDir) {
          throw new Error('Pass --sandbox-service-dir or set SANDBOX_SERVICE_DIR');
        }
        credential = await mintCredential(log, Path.resolve(sandboxServiceDir));
      }
      redactor.add(credential.password);
      await waitUntilAuthenticated(log, await storeInVault(log, credential, redactor));
      log.info(
        'Developers pick the new credential up by re-running setup_local_dev.js; until then their sandbox calls fail with Unauthenticated.'
      );
    } catch (error) {
      throw createFailError(redactor.redact((error as Error).message));
    }
  },
  {
    description: `
      Rotates the shared kibana-local-dev sandbox credential that setup_local_dev.js reads: mints a
      new password on the eval cluster with sandbox-service's add-dev-credential.py, writes it to the
      dev Vault, reads it back and checks that sandbox-api accepts it. Never prints the password.
      Needs a dev Vault login, gcloud access to elastic-observability, kubectl, and a sandbox-service
      checkout.
    `,
    flags: {
      string: ['sandbox-service-dir', 'from-file'],
      help: `
        --sandbox-service-dir  sandbox-service checkout (default: $SANDBOX_SERVICE_DIR)
        --from-file            Upload a minted {"username","password"} JSON file instead of rotating,
                               e.g. the output of add-dev-credential.py --json
      `,
    },
  }
);
