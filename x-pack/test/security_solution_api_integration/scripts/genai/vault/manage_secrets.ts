/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import Path from 'path';
import { writeFile, readFile } from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { schema } from '@kbn/config-schema';

// Environment variable set within BuildKite and read from in FTR tests
// CI env vars are set by .buildkite/scripts/common/setup_job_env.sh
const KIBANA_SECURITY_GEN_AI_CONFIG = 'KIBANA_SECURITY_GEN_AI_CONFIG';

// Vault paths
// siem-team users (secrets.elastic.co vault) do not have access to the ci-prod vault, so secrets
// are mirrored between the two vaults
type VaultType = 'siem-team' | 'ci-prod';
const VAULT_PATHS: Record<VaultType, string> = {
  'siem-team': 'secret/siem-team/security-gen-ai',
  'ci-prod': 'secret/ci/elastic-kibana/security-gen-ai',
};

const getVaultPath = (vault: VaultType = 'siem-team') => {
  return VAULT_PATHS[vault];
};

const SECURITY_GEN_AI_CONFIG_FIELD = 'config';
const SECURITY_GEN_AI_CONFIG_FILE = Path.join(
  REPO_ROOT,
  'x-pack/test/security_solution_api_integration/scripts/genai/vault/config.json'
);

const configSchema = schema.object({
  evaluatorConnectorId: schema.string(),
  langsmithKey: schema.string(),
  connectors: schema.recordOf(
    schema.string(),
    schema.object({
      name: schema.string(),
      actionTypeId: schema.string(),
      config: schema.recordOf(schema.string(), schema.any()),
      secrets: schema.recordOf(schema.string(), schema.any()),
    })
  ),
});

export interface AvailableConnector {
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

/**
 * Retrieve generic value from vault and write to file
 *
 * @param vault
 * @param filePath
 * @param field
 */
export const retrieveFromVault = async (vault: string, filePath: string, field: string) => {
  const { stdout } = await execa('vault', ['read', `-field=${field}`, vault], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  const value = Buffer.from(stdout, 'base64').toString('utf-8').trim();
  const config = JSON.stringify(JSON.parse(value), null, 2);

  await writeFile(filePath, config);

  // eslint-disable-next-line no-console
  console.log(`Config written to: ${filePath}`);
};

/**
 * Retrieve Security Gen AI secrets config from vault and write to file
 * @param vault
 */
export const retrieveConfigFromVault = async (vault: VaultType = 'siem-team') => {
  await retrieveFromVault(
    getVaultPath(vault),
    SECURITY_GEN_AI_CONFIG_FILE,
    SECURITY_GEN_AI_CONFIG_FIELD
  );
};

/**
 * Returns command for manually working with secrets from `config.json`.
 * Format can be either 'vault-write' (for vault command) or 'env-var' (for environment variable).
 * Run this command and share with @kibana-ops via https://p.elstc.co to make updating secrets easier, or for pasting
 * custom configs into the BuildKite pipeline: https://buildkite.com/elastic/kibana-ess-security-solution-gen-ai-evals

 * Alternatively, have @kibana-ops run the following to update the secrets for CI:
 *
 * node retrieve_secrets.js --vault siem-team
 * node upload_secrets.js --vault ci-prod
 *
 * @param format - The format of the command to return ('vault-write' or 'env-var')
 * @param vault - The vault to use (only applicable for 'vault-write' format)
 */
export const getCommand = async (
  format: 'vault-write' | 'env-var' = 'vault-write',
  vault: VaultType = 'ci-prod'
) => {
  const config = await readFile(SECURITY_GEN_AI_CONFIG_FILE, 'utf-8');
  const asB64 = Buffer.from(config).toString('base64');

  if (format === 'vault-write') {
    return `vault write ${getVaultPath(vault)} ${SECURITY_GEN_AI_CONFIG_FIELD}=${asB64}`;
  } else {
    return `${KIBANA_SECURITY_GEN_AI_CONFIG}=${asB64}`;
  }
};

/**
 * Write generic value to vault from a file
 *
 * @param vault
 * @param filePath
 * @param field
 */
export const uploadToVault = async (vault: string, filePath: string, field: string) => {
  const config = await readFile(filePath, 'utf-8');
  const asB64 = Buffer.from(config).toString('base64');

  await execa('vault', ['write', vault, `${field}=${asB64}`], {
    cwd: REPO_ROOT,
    buffer: true,
  });
};

/**
 * Read Security Gen AI secrets from `config.json` and upload to vault
 * @param vault
 */
export const uploadConfigToVault = async (vault: VaultType = 'siem-team') => {
  await uploadToVault(
    getVaultPath(vault),
    SECURITY_GEN_AI_CONFIG_FILE,
    SECURITY_GEN_AI_CONFIG_FIELD
  );
};

/**
 * Returns parsed config from environment variable
 */
export const getSecurityGenAIConfigFromEnvVar = () => {
  const configValue = process.env[KIBANA_SECURITY_GEN_AI_CONFIG];
  if (!configValue) {
    throw new Error(`Environment variable ${KIBANA_SECURITY_GEN_AI_CONFIG} does not exist!`);
  }

  let config: typeof configSchema;
  try {
    config = JSON.parse(Buffer.from(configValue, 'base64').toString('utf-8'));
  } catch (e) {
    throw new Error(
      `Error trying to parse value from ${KIBANA_SECURITY_GEN_AI_CONFIG} environment variable: ${e.message}`
    );
  }

  return configSchema.validate(config);
};
