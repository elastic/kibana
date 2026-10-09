/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { createOutputRedactor, MIN_REDACTABLE_SECRET_LENGTH } from './output_redactor';

/** Env var prefix under which connector material is exposed to a single sandbox command. */
export const CONNECTOR_ENV_PREFIX = 'CONNECTOR_';

export interface ConnectorCredentialEnv {
  /** Environment variables to inject into the command. */
  env: Record<string, string>;
  /** Secret values that must be redacted from command output before it leaves Kibana. */
  secretValues: string[];
}

export type ConnectorCredentialResolution = ConnectorCredentialEnv | { errorMessage: string };

export interface ConnectorCredentialDeps {
  actions?: ActionsPluginStart;
}

export type ResolveConnectorCredentials = (
  connectorId: string,
  callContext: SandboxCallContext
) => Promise<ConnectorCredentialResolution>;

const toEnvKey = (segment: string): string =>
  segment
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const toEnvValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

/** Reads Authorization from a header record or from the JSON string preconfigured connectors store. */
const readAuthorizationHeader = (secretHeaders: unknown): string | undefined => {
  let record = secretHeaders;
  if (typeof record === 'string') {
    try {
      record = JSON.parse(record);
    } catch {
      return undefined;
    }
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) return undefined;

  const authorization = Object.entries(record).find(
    ([key]) => key.toLowerCase() === 'authorization'
  )?.[1];
  return typeof authorization === 'string' ? authorization : undefined;
};

/**
 * Secret values derived from a connector's raw `secrets`, beyond its own top-level leaves — e.g.
 * the bare API key `buildConnectorEnv` extracts out of an `Authorization: ApiKey …` header and
 * injects as `CONNECTOR_SECRET_PASSWORD`. Anything derived here must also reach every redactor
 * that guards this connector's secrets, not just the one covering a single command's own output:
 * a bare derived value never appears verbatim in the raw `secrets` object, so a redactor built
 * only from `collectSecretLeaves`-style traversal of `secrets` would miss it.
 */
export const deriveConnectorCredentialSecretValues = (
  secrets: Record<string, unknown>
): string[] => {
  const secretValues: string[] = [];
  // HTTP ES connectors store `Authorization: ApiKey …` in secretHeaders, not `password`.
  const authorization = readAuthorizationHeader(secrets.secretHeaders);
  if (authorization?.startsWith('ApiKey ')) {
    const apiKey = authorization.slice('ApiKey '.length);
    if (apiKey.length >= MIN_REDACTABLE_SECRET_LENGTH) secretValues.push(apiKey);
  }
  return secretValues;
};

/**
 * Builds the CONNECTOR_* environment from framework-resolved config and auth headers.
 * Config keys map to CONNECTOR_CONFIG_<KEY>; header names map to CONNECTOR_HEADER_<NAME>.
 */
export const buildConnectorEnv = ({
  connectorId,
  actionTypeId,
  config,
  headers,
}: {
  connectorId: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  headers: Record<string, string>;
}): ConnectorCredentialEnv => {
  const env: Record<string, string> = {
    [`${CONNECTOR_ENV_PREFIX}ID`]: connectorId,
    [`${CONNECTOR_ENV_PREFIX}TYPE`]: actionTypeId,
  };
  const secretValues: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    const envValue = toEnvValue(value);
    if (envValue !== undefined) env[`${CONNECTOR_ENV_PREFIX}CONFIG_${toEnvKey(key)}`] = envValue;
  }
  for (const [key, value] of Object.entries(headers)) {
    const envValue = toEnvValue(value);
    if (envValue === undefined) continue;
    env[`${CONNECTOR_ENV_PREFIX}HEADER_${toEnvKey(key)}`] = envValue;
    if (envValue.length >= MIN_REDACTABLE_SECRET_LENGTH) secretValues.push(envValue);
  }

  return { env, secretValues };
};

/** Redacts injected secret values (and their common encodings) from command output. */
export const redactSecrets = (text: string, secretValues: readonly string[]): string =>
  createOutputRedactor(secretValues).redact(text);

/**
 * Creates the resolver that turns a connector id into a one-command credential environment.
 * Deny by default: the connector must be on the agent allow-list. Actions authorizes execute
 * access and resolves config plus auth headers without exposing stored secrets.
 */
export const createConnectorCredentialResolver =
  ({
    getDeps,
    logger,
  }: {
    getDeps: () => ConnectorCredentialDeps;
    logger: Logger;
  }): ResolveConnectorCredentials =>
  async (connectorId, callContext) => {
    const { actions } = getDeps();

    if (!actions) {
      return { errorMessage: 'Connectors are not available in this deployment' };
    }

    if (!callContext.allowedConnectorIds.includes(connectorId)) {
      return {
        errorMessage:
          `Connector '${connectorId}' is not assigned to this agent. ` +
          `Assigned connectors: ${callContext.allowedConnectorIds.join(', ') || 'none'}. ` +
          `Check /workspace/connectors.md.`,
      };
    }

    try {
      const actionsClient = await actions.getActionsClientWithRequest(callContext.request);
      const credentials = await actionsClient.getConnectorCredentials({ id: connectorId });

      logger.debug(
        `Injecting credentials for connector ${connectorId} into a single sandbox command`
      );

      return buildConnectorEnv(credentials);
    } catch (err) {
      return { errorMessage: `Failed to resolve connector '${connectorId}': ${err}` };
    }
  };
