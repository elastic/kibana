/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ActionsClient } from './agent_connectors';
import type { SandboxCallContext } from './tool_utils';
import { createOutputRedactor, MIN_REDACTABLE_SECRET_LENGTH } from './output_redactor';

export type ResolvedSandboxCredentials = Awaited<
  ReturnType<ActionsClient['getSandboxCredentials']>
>;

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

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

const hasControlCharacter = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });

const decodeBasicCredentials = (encoded: string): string | undefined => {
  if (!BASE64_PATTERN.test(encoded)) return undefined;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  return decoded.length > 0 && !hasControlCharacter(decoded) ? decoded : undefined;
};

/**
 * Returns the redactable values inside an `Authorization` header (the fragment after the scheme and,
 * for Basic, the decoded credentials with their user and password) that an agent could print alone.
 */
export const deriveAuthorizationSecretValues = (authorization: string): string[] => {
  const separatorIndex = authorization.indexOf(' ');
  if (separatorIndex === -1) return [];

  const scheme = authorization.slice(0, separatorIndex);
  const fragment = authorization.slice(separatorIndex + 1);
  const candidates = [fragment];

  if (scheme.toLowerCase() === 'basic') {
    const decoded = decodeBasicCredentials(fragment);
    if (decoded !== undefined) {
      const colonIndex = decoded.indexOf(':');
      candidates.push(
        decoded,
        ...(colonIndex === -1 ? [] : [decoded.slice(0, colonIndex), decoded.slice(colonIndex + 1)])
      );
    }
  }

  return [...new Set(candidates)].filter((value) => value.length >= MIN_REDACTABLE_SECRET_LENGTH);
};

/**
 * Secret values derived from a connector's raw `secrets`, beyond its own top-level leaves, e.g.
 * the bare API key, token, or decoded Basic credentials inside an `Authorization` header in
 * `secretHeaders`. Anything derived here must also reach every redactor that guards this
 * connector's secrets, since a bare derived value never appears verbatim in the raw `secrets`.
 */
export const deriveConnectorCredentialSecretValues = (
  secrets: Record<string, unknown>
): string[] => {
  const authorization = readAuthorizationHeader(secrets.secretHeaders);
  return authorization === undefined ? [] : deriveAuthorizationSecretValues(authorization);
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

  // Every case variant maps to the same env var, so derive values from all of them.
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      secretValues.push(...deriveAuthorizationSecretValues(value));
    }
  }

  return { env, secretValues: [...new Set(secretValues)] };
};

/**
 * Resolves a connector's sandbox credentials through Actions at most once per call context
 * (`callContext.resolvedCredentials`): the output redactor and the command that injects them
 * share the lookup, so both see the same values. Failures are memoized too, so a connector that
 * cannot be resolved fails the same way.
 */
export const resolveSandboxCredentials = ({
  actions,
  callContext,
  connectorId,
}: {
  actions: Pick<ActionsPluginStart, 'getActionsClientWithRequest'>;
  callContext: SandboxCallContext;
  connectorId: string;
}): Promise<ResolvedSandboxCredentials> => {
  const { resolvedCredentials } = callContext;
  let credentials = resolvedCredentials.get(connectorId);
  if (!credentials) {
    credentials = actions
      .getActionsClientWithRequest(callContext.request)
      .then((actionsClient) => actionsClient.getSandboxCredentials({ id: connectorId }));
    resolvedCredentials.set(connectorId, credentials);
  }
  return credentials;
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
          `Check /workspace/connectors.md for available connectors.`,
      };
    }

    try {
      const credentials = await resolveSandboxCredentials({ actions, callContext, connectorId });

      logger.debug(
        `Injecting credentials for connector ${connectorId} into a single sandbox command`
      );

      return buildConnectorEnv(credentials);
    } catch (err) {
      return { errorMessage: `Failed to resolve connector '${connectorId}': ${err}` };
    }
  };
