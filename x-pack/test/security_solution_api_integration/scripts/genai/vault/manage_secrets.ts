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

const SECURITY_GEN_AI_CONNECTORS_ENV_VAR = 'KIBANA_SECURITY_TESTING_AI_CONNECTORS';
const SECURITY_GEN_AI_LANGSMITH_KEY_ENV_VAR = 'KIBANA_SECURITY_TESTING_LANGSMITH_KEY';

// siem-team secrets discussed w/ operations and we will mirror them here
// const SECURITY_GEN_AI_VAULT = 'secret/siem-team/security-gen-ai';

// CI Vault
const SECURITY_GEN_AI_VAULT = 'secret/ci/elastic-kibana/security-gen-ai';
const SECURITY_GEN_AI_VAULT_CONNECTORS = `${SECURITY_GEN_AI_VAULT}/connectors`;
const SECURITY_GEN_AI_VAULT_LANGSMITH = `${SECURITY_GEN_AI_VAULT}/langsmith`;
const SECURITY_GEN_AI_CONNECTORS_FIELD = 'config';
const SECURITY_GEN_AI_LANGSMITH_FIELD = 'key';
const CONNECTOR_FILE = Path.join(
  REPO_ROOT,
  'x-pack/test/security_solution_api_integration/scripts/genai/vault/connector_config.json'
);
const LANGSMITH_FILE = Path.join(
  REPO_ROOT,
  'x-pack/test/security_solution_api_integration/scripts/genai/vault/langsmith_key.txt'
);

const connectorsSchema = schema.recordOf(
  schema.string(),
  schema.object({
    name: schema.string(),
    actionTypeId: schema.string(),
    config: schema.recordOf(schema.string(), schema.any()),
    secrets: schema.recordOf(schema.string(), schema.any()),
  })
);

export interface AvailableConnector {
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export const retrieveFromVault = async (
  vault: string,
  filePath: string,
  field: string,
  isJson = true
) => {
  const { stdout } = await execa('vault', ['read', `-field=${field}`, vault], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  const value = Buffer.from(stdout, 'base64').toString('utf-8').trim();
  const config = isJson ? JSON.stringify(JSON.parse(value), null, 2) : value;

  await writeFile(filePath, config);

  // eslint-disable-next-line no-console
  console.log(`Config dumped into ${filePath}`);
};

export const retrieveConnectorConfig = async () => {
  await retrieveFromVault(
    SECURITY_GEN_AI_VAULT_CONNECTORS,
    CONNECTOR_FILE,
    SECURITY_GEN_AI_CONNECTORS_FIELD
  );
};

export const retrieveLangsmithKey = async () => {
  await retrieveFromVault(
    SECURITY_GEN_AI_VAULT_LANGSMITH,
    LANGSMITH_FILE,
    SECURITY_GEN_AI_LANGSMITH_FIELD,
    false
  );
};

export const formatCurrentConfig = async (filePath: string) => {
  const config = await readFile(filePath, 'utf-8');
  const asB64 = Buffer.from(config).toString('base64');
  // eslint-disable-next-line no-console
  console.log(asB64);
};

export const uploadToVault = async (vault: string, filePath: string, field: string) => {
  const config = await readFile(filePath, 'utf-8');
  const asB64 = Buffer.from(config).toString('base64');

  await execa('vault', ['write', vault, `${field}=${asB64}`], {
    cwd: REPO_ROOT,
    buffer: true,
  });
};

export const uploadConnectorConfigToVault = async () => {
  await uploadToVault(
    SECURITY_GEN_AI_VAULT_CONNECTORS,
    CONNECTOR_FILE,
    SECURITY_GEN_AI_CONNECTORS_FIELD
  );
};

export const uploadLangsmithKeyToVault = async () => {
  await uploadToVault(
    SECURITY_GEN_AI_VAULT_LANGSMITH,
    LANGSMITH_FILE,
    SECURITY_GEN_AI_LANGSMITH_FIELD
  );
};

/**
 * FOR LOCAL USE ONLY! Export connectors and langsmith secrets from vault to env vars before manually
 * running evaluations. CI env vars are set by .buildkite/scripts/common/setup_job_env.sh
 */
export const exportToEnvVars = async () => {
  const { stdout: connectors } = await execa(
    'vault',
    ['read', `-field=${SECURITY_GEN_AI_CONNECTORS_FIELD}`, SECURITY_GEN_AI_VAULT_CONNECTORS],
    {
      cwd: REPO_ROOT,
      buffer: true,
    }
  );
  const { stdout: langsmithKey } = await execa(
    'vault',
    ['read', `-field=${SECURITY_GEN_AI_LANGSMITH_FIELD}`, SECURITY_GEN_AI_VAULT_LANGSMITH],
    {
      cwd: REPO_ROOT,
      buffer: true,
    }
  );
  process.env[SECURITY_GEN_AI_CONNECTORS_ENV_VAR] = connectors;
  process.env[SECURITY_GEN_AI_LANGSMITH_KEY_ENV_VAR] = langsmithKey;
};

export const loadConnectorsFromEnvVar = (): Record<string, AvailableConnector> => {
  const connectorsValue = process.env[SECURITY_GEN_AI_CONNECTORS_ENV_VAR];
  if (!connectorsValue) {
    return {};
  }

  let connectors: Record<string, AvailableConnector>;
  try {
    connectors = JSON.parse(Buffer.from(connectorsValue, 'base64').toString('utf-8'));
  } catch (e) {
    throw new Error(
      `Error trying to parse value from ${SECURITY_GEN_AI_CONNECTORS_ENV_VAR} environment variable: ${e.message}`
    );
  }
  return connectorsSchema.validate(connectors);
};

export const loadLangSmithKeyFromEnvVar = (): string | undefined => {
  const langsmithKeyValue = process.env[SECURITY_GEN_AI_LANGSMITH_KEY_ENV_VAR];
  if (!langsmithKeyValue) {
    return undefined;
  }

  return Buffer.from(langsmithKeyValue, 'base64').toString('utf-8').trim();
};
