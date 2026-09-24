/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  ActionsClient,
  PluginStartContract as ActionsPluginStart,
  SandboxEnvVars,
} from '@kbn/actions-plugin/server';
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
 * Builds the CONNECTOR_* environment for a connector. Config keys map to CONNECTOR_CONFIG_<KEY>,
 * secret keys to CONNECTOR_SECRET_<KEY>; nested values are JSON-encoded.
 */
export const buildConnectorEnv = ({
  connectorId,
  actionTypeId,
  config,
  secrets,
}: {
  connectorId: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
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
  for (const [key, value] of Object.entries(secrets)) {
    const envValue = toEnvValue(value);
    if (envValue === undefined) continue;
    env[`${CONNECTOR_ENV_PREFIX}SECRET_${toEnvKey(key)}`] = envValue;
    if (envValue.length >= MIN_REDACTABLE_SECRET_LENGTH) secretValues.push(envValue);
  }

  // HTTP ES connectors store `Authorization: ApiKey …` in secretHeaders, not `password`.
  const authorization = readAuthorizationHeader(secrets.secretHeaders);
  if (authorization?.startsWith('ApiKey ')) {
    const apiKey = authorization.slice('ApiKey '.length);
    if (env.CONNECTOR_SECRET_PASSWORD === undefined) {
      env.CONNECTOR_SECRET_PASSWORD = apiKey;
    }
    if (apiKey.length >= MIN_REDACTABLE_SECRET_LENGTH) secretValues.push(apiKey);
  }

  return { env, secretValues };
};

/** Adds the connector identity to the env vars a sandbox-enabled connector type returned. */
export const buildSandboxConnectorEnv = ({
  connectorId,
  actionTypeId,
  sandboxEnvVars: { env, sensitiveValues },
}: {
  connectorId: string;
  actionTypeId: string;
  sandboxEnvVars: SandboxEnvVars;
}): ConnectorCredentialEnv => ({
  env: {
    ...env,
    [`${CONNECTOR_ENV_PREFIX}ID`]: connectorId,
    [`${CONNECTOR_ENV_PREFIX}TYPE`]: actionTypeId,
  },
  secretValues: sensitiveValues.filter((value) => value.length >= MIN_REDACTABLE_SECRET_LENGTH),
});

/** Replaces every occurrence of an injected secret value in command output. */
export const redactSecrets = (text: string, secretValues: readonly string[]): string =>
  secretValues.reduce((acc, secret) => acc.split(secret).join('[REDACTED]'), text);

/**
 * Creates the resolver that turns a connector id into a one-command credential environment.
 * Deny by default: the connector must be on the agent allow-list and the current user must be
 * allowed to read and execute it in the current space. Connectors whose type supports the
 * `sandbox` feature get the env vars that type declares; other connectors are only supported
 * when preconfigured (kibana.yml), whose secrets the actions plugin holds in memory.
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

    const { request } = callContext;

    let actionsClient: ActionsClient;
    let connector: Awaited<ReturnType<ActionsClient['get']>>;
    try {
      actionsClient = await actions.getActionsClientWithRequest(request);
      connector = await actionsClient.get({ id: connectorId });
    } catch (err) {
      return { errorMessage: `Failed to resolve connector '${connectorId}': ${err}` };
    }

    if (connector.isSystemAction) {
      return {
        errorMessage: `Connector '${connectorId}' is a system connector and cannot be used`,
      };
    }

    if (actions.getSandboxEnvVarDefinitions(connector.actionTypeId)) {
      let sandboxEnvVars: SandboxEnvVars;
      try {
        sandboxEnvVars = await actionsClient.getSandboxEnvVars(connectorId);
      } catch (err) {
        return {
          errorMessage: `Failed to get sandbox env vars for connector '${connectorId}': ${err}`,
        };
      }

      logger.debug(`Injecting sandbox env vars for connector ${connectorId} into a single command`);

      return buildSandboxConnectorEnv({
        connectorId,
        actionTypeId: connector.actionTypeId,
        sandboxEnvVars,
      });
    }

    try {
      await actions.getActionsAuthorizationWithRequest(request).ensureAuthorized({
        operation: 'execute',
        actionTypeId: connector.actionTypeId,
      });
    } catch (err) {
      return { errorMessage: `Not authorized to use connector '${connectorId}': ${err}` };
    }

    const inMemoryConnector = actions.inMemoryConnectors.find(({ id }) => id === connectorId);
    if (!inMemoryConnector) {
      return {
        errorMessage:
          `Connector '${connectorId}' cannot be used from the sandbox: its type ` +
          `'${connector.actionTypeId}' does not support sandboxes and it is not a preconfigured ` +
          `connector (xpack.actions.preconfigured in kibana.yml).`,
      };
    }

    logger.debug(
      `Injecting credentials for connector ${connectorId} into a single sandbox command`
    );

    // Config comes from the in-memory connector, not from `get()`: the actions client omits
    // config for preconfigured connectors unless they opt in with `exposeConfig`, which would
    // also publish it over the HTTP API. Authorization above already gated this read.
    return buildConnectorEnv({
      connectorId,
      actionTypeId: connector.actionTypeId,
      config: inMemoryConnector.config ?? connector.config ?? {},
      secrets: inMemoryConnector.secrets ?? {},
    });
  };
