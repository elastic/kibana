/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { load } from 'js-yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { v5 } from 'uuid';
import type { KbnClient } from '@kbn/scout-security';

const AI_CONNECTORS_ENV_VAR = 'KIBANA_TESTING_AI_CONNECTORS';

export interface LLMConnector {
  id: string;
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}

/**
 * Parse the base64-encoded JSON connector map from the CI environment variable.
 */
function getConnectorsFromEnv(): Record<string, Omit<LLMConnector, 'id'>> {
  const envValue = process.env[AI_CONNECTORS_ENV_VAR];
  if (!envValue) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(envValue, 'base64').toString('utf-8'));
  } catch {
    return {};
  }
}

/**
 * Read connectors from `config/kibana.dev.yml` (`xpack.actions.preconfigured` section).
 * Only used for local development - skipped in CI.
 */
function getConnectorsFromKibanaDevYml(): Record<string, Omit<LLMConnector, 'id'>> {
  if (process.env.CI) {
    return {};
  }

  try {
    const configPath = Path.join(REPO_ROOT, 'config', 'kibana.dev.yml');
    if (!Fs.existsSync(configPath)) {
      return {};
    }

    const parsed = (load(Fs.readFileSync(configPath, 'utf8')) || {}) as Record<string, unknown>;
    const preconfigured = (parsed['xpack.actions.preconfigured'] || {}) as Record<
      string,
      {
        name: string;
        actionTypeId: string;
        config: Record<string, unknown>;
        secrets?: Record<string, unknown>;
      }
    >;

    const result: Record<string, Omit<LLMConnector, 'id'>> = {};
    for (const [key, val] of Object.entries(preconfigured)) {
      result[key] = {
        actionTypeId: val.actionTypeId,
        config: val.config,
        name: val.name,
        secrets: val.secrets,
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Discover available LLM connectors.
 *
 * Sources (in priority order):
 * 1. `KIBANA_TESTING_AI_CONNECTORS` env var (CI – set by `FTR_GEN_AI=1`)
 * 2. `config/kibana.dev.yml` `xpack.actions.preconfigured` section (local dev)
 */
export function getAvailableLLMConnectors(): LLMConnector[] {
  const fromEnv = getConnectorsFromEnv();
  const fromConfig = getConnectorsFromKibanaDevYml();
  const merged = { ...fromConfig, ...fromEnv };

  return Object.entries(merged).map(([id, connector]) => ({
    id,
    ...connector,
  }));
}

/**
 * Generate a deterministic UUID from a logical connector id so that
 * dynamically created connectors are stable across test runs.
 */
export function connectorIdAsUuid(connectorId: string): string {
  return v5(connectorId, v5.DNS);
}

/**
 * Create a real LLM connector via the Kibana API from a discovered connector config.
 * Returns the connector with its Kibana-assigned UUID.
 */
export async function createLLMConnector(
  kbnClient: KbnClient,
  connector: LLMConnector
): Promise<LLMConnector & { id: string }> {
  const uuid = connectorIdAsUuid(connector.id);

  // Delete existing connector (idempotent)
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/actions/connector/${uuid}`,
    });
  } catch {
    // Ignore - connector may not exist
  }

  await kbnClient.request({
    method: 'POST',
    path: `/api/actions/connector/${uuid}`,
    body: {
      connector_type_id: connector.actionTypeId,
      name: connector.name,
      config: connector.config,
      secrets: connector.secrets ?? {},
    },
  });

  return { ...connector, id: uuid };
}

/**
 * Delete a dynamically created LLM connector.
 */
export async function deleteLLMConnector(
  kbnClient: KbnClient,
  connector: LLMConnector
): Promise<void> {
  const uuid = connectorIdAsUuid(connector.id);
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/actions/connector/${uuid}`,
    });
  } catch {
    // Ignore - connector may not exist
  }
}
