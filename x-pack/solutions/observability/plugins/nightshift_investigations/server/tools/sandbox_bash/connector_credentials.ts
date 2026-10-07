/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxCallContext } from './tool_utils';

/** Env var prefix under which connector material is exposed to a single sandbox command. */
export const CONNECTOR_ENV_PREFIX = 'CONNECTOR_';

/** Minimum length for a secret value to be redacted from command output. */
const MIN_REDACTABLE_SECRET_LENGTH = 6;

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

const getSecretsFromHeaders = (headers: Record<string, string>): Record<string, string> => {
  const secrets: Record<string, string> = {};
  const entries = Object.entries(headers);
  for (const [name, header] of entries) {
    if (name.toLowerCase() === 'authorization') {
      const bearer = /^Bearer\s+(.+)$/i.exec(header);
      if (bearer) {
        secrets.token = bearer[1];
        continue;
      }
      const apiKey = /^ApiKey\s+(.+)$/i.exec(header);
      if (apiKey) {
        secrets.password = apiKey[1];
        continue;
      }
      const basic = /^Basic\s+(.+)$/i.exec(header);
      if (basic) {
        const decoded = Buffer.from(basic[1], 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator >= 0) {
          secrets.username = decoded.slice(0, separator);
          secrets.password = decoded.slice(separator + 1);
          continue;
        }
      }
      secrets.authorization = header;
      continue;
    }
    const isApiKey = entries.length === 1 || /^(x-)?api-?key$/i.test(name);
    secrets[isApiKey ? 'apiKey' : name] = header;
  }
  return secrets;
};

/**
 * Builds the CONNECTOR_* environment from framework-resolved config and auth headers.
 * Config keys map to CONNECTOR_CONFIG_<KEY>; resolved credentials use CONNECTOR_SECRET_<KEY>.
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
  for (const value of Object.values(headers)) {
    if (value.length >= MIN_REDACTABLE_SECRET_LENGTH) secretValues.push(value);
  }
  for (const [key, value] of Object.entries(getSecretsFromHeaders(headers))) {
    const envValue = toEnvValue(value);
    if (envValue === undefined) continue;
    env[`${CONNECTOR_ENV_PREFIX}SECRET_${toEnvKey(key)}`] = envValue;
    if (envValue.length >= MIN_REDACTABLE_SECRET_LENGTH) secretValues.push(envValue);
  }

  return { env, secretValues };
};

/** Replaces every occurrence of an injected secret value in command output. */
export const redactSecrets = (text: string, secretValues: readonly string[]): string =>
  secretValues.reduce((acc, secret) => acc.split(secret).join('[REDACTED]'), text);

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
