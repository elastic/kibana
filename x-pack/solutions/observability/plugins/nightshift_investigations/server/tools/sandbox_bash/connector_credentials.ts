/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { RunCommandParams } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { createOutputRedactor, MIN_REDACTABLE_SECRET_LENGTH } from './output_redactor';
import { authorizeConnector } from './connector_authorization';
import {
  REQUEST_SCOPED_CONNECTOR,
  REQUEST_SCOPED_CONNECTOR_ID,
  checkRequestScopedConnector,
} from './request_scoped_connector';

/** Env var prefix under which connector material is exposed to a single sandbox command. */
export const CONNECTOR_ENV_PREFIX = 'CONNECTOR_';

/**
 * Env vars of the request-scoped Elasticsearch connector, the same in both modes. In UIAM mode
 * sandbox-api sets the URL (its egress proxy) and the authorization is absent.
 */
export const ELASTICSEARCH_URL_ENV = 'ELASTICSEARCH_URL';
export const ELASTICSEARCH_AUTHORIZATION_ENV = 'ELASTICSEARCH_AUTHORIZATION';

export interface ConnectorCredentialEnv {
  /** Environment variables to inject into the command. */
  env: Record<string, string>;
  /** Secret values that must be redacted from command output before it leaves Kibana. */
  secretValues: string[];
  /** gRPC metadata for this command's sandbox-api call. Carries identifiers, never secrets. */
  metadata?: RunCommandParams['metadata'];
}

export type ConnectorCredentialResolution = ConnectorCredentialEnv | { errorMessage: string };

export interface ConnectorCredentialDeps {
  actions?: ActionsPluginStart;
  /** Elasticsearch URL the sandbox reaches this cluster at; enables the request-scoped connector. */
  elasticsearchUrl?: string;
  /** Set in UIAM mode: the service account sandbox-api assumes for the request-scoped connector. */
  getSandboxServiceAccountId?: () => Promise<string | undefined>;
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
  }
  secretValues.push(...deriveConnectorCredentialSecretValues(secrets));

  return { env, secretValues };
};

/** Redacts injected secret values (and their common encodings) from command output. */
export const redactSecrets = (text: string, secretValues: readonly string[]): string =>
  createOutputRedactor(secretValues).redact(text);

/**
 * Creates the resolver that turns a connector id into a one-command credential environment.
 * Deny by default: the connector must be on the agent allow-list. The request-scoped
 * Elasticsearch connector either asks sandbox-api to assume the UIAM service account (UIAM mode)
 * or exposes the API key of the current run; any other connector must be preconfigured
 * (kibana.yml), with its secrets held in memory by the actions plugin, and the current user must
 * be allowed to read and execute it in the current space.
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
    const { actions, elasticsearchUrl, getSandboxServiceAccountId } = getDeps();

    if (connectorId === REQUEST_SCOPED_CONNECTOR_ID) {
      const checked = await checkRequestScopedConnector(
        callContext,
        elasticsearchUrl,
        getSandboxServiceAccountId
      );
      if ('errorMessage' in checked) return checked;

      const env: Record<string, string> = {
        [`${CONNECTOR_ENV_PREFIX}ID`]: connectorId,
        [`${CONNECTOR_ENV_PREFIX}TYPE`]: REQUEST_SCOPED_CONNECTOR.actionTypeId,
      };

      if (checked.mode === 'uiam') {
        logger.debug(
          `Asking sandbox-api to assume service account [${checked.serviceAccountId}] for a single command`
        );
        return {
          env,
          secretValues: [],
          metadata: {
            'x-uiam-service-account-id': checked.serviceAccountId,
            'x-elasticsearch-url': checked.url,
          },
        };
      }

      logger.debug(`Injecting the run's API key into a single sandbox command`);
      return {
        env: {
          ...env,
          [ELASTICSEARCH_URL_ENV]: checked.url,
          [ELASTICSEARCH_AUTHORIZATION_ENV]: `ApiKey ${checked.encoded}`,
        },
        secretValues: [checked.encoded, checked.secret],
      };
    }

    const authorized = await authorizeConnector(connectorId, callContext, actions);
    if ('errorMessage' in authorized) return authorized;
    const { connector, inMemoryConnector } = authorized;

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
