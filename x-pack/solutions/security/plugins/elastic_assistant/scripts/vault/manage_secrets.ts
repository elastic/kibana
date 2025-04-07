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

const SECURITY_GEN_AI_VAULT = 'secret/siem-team/security-gen-ai';
const SECURITY_GEN_AI_VAULT_CONNECTORS = `${SECURITY_GEN_AI_VAULT}/connectors`;
const SECURITY_GEN_AI_VAULT_LANGSMITH = `${SECURITY_GEN_AI_VAULT}/langsmith`;
const SECURITY_GEN_AI_CONNECTORS_FIELD = 'config';
const SECURITY_GEN_AI_LANGSMITH_FIELD = 'key';
const CONNECTOR_FILE = Path.join(
  REPO_ROOT,
  'x-pack/solutions/security/plugins/elastic_assistant/scripts/vault/connector_config.json'
);
const LANGSMITH_FILE = Path.join(
  REPO_ROOT,
  'x-pack/solutions/security/plugins/elastic_assistant/scripts/vault/langsmith_key.txt'
);

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

  const value = Buffer.from(stdout, 'base64').toString('utf-8');
  const config = isJson ? JSON.parse(value) : value;

  await writeFile(filePath, JSON.stringify(config, undefined, 2));

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
