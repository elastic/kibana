/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsMock, actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { SandboxCallContext } from './tool_utils';
import {
  buildConnectorEnv,
  createConnectorCredentialResolver,
  redactSecrets,
} from './connector_credentials';

const CONNECTOR_ID = 'github-1';
const BASIC_AUTHORIZATION = 'Basic dXNlcjpwYXNz';
const BEARER_AUTHORIZATION = 'Bearer ghp_topsecrettokenvalue';

const createCallContext = (
  allowedConnectorIds: readonly string[] = [CONNECTOR_ID]
): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
});

const setup = ({
  credentials = {
    connectorId: CONNECTOR_ID,
    actionTypeId: '.github',
    config: { apiUrl: 'https://api.github.com', owner: 'elastic' },
    headers: { Authorization: BEARER_AUTHORIZATION },
  },
  withActions = true,
  credentialsError,
}: {
  credentials?: {
    connectorId: string;
    actionTypeId: string;
    config: Record<string, unknown>;
    headers: Record<string, string>;
  };
  withActions?: boolean;
  credentialsError?: Error;
} = {}) => {
  const actionsClient = actionsClientMock.create();
  if (credentialsError) {
    actionsClient.getConnectorCredentials.mockRejectedValue(credentialsError);
  } else {
    actionsClient.getConnectorCredentials.mockResolvedValue(credentials);
  }
  const actions = actionsMock.createStart();
  actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);

  const resolve = createConnectorCredentialResolver({
    getDeps: () => ({ actions: withActions ? actions : undefined }),
    logger: loggingSystemMock.createLogger(),
  });

  return { resolve, actions, actionsClient };
};

describe('buildConnectorEnv', () => {
  it('maps config and auth headers to prefixed, upper-cased env vars', () => {
    const { env, secretValues } = buildConnectorEnv({
      connectorId: CONNECTOR_ID,
      actionTypeId: '.github',
      config: { apiUrl: 'https://api.github.com', 'nested-opt': { a: 1 }, port: 443, tls: true },
      headers: { Authorization: BEARER_AUTHORIZATION, 'X-Api-Key': 'abc' },
    });

    expect(env).toEqual({
      CONNECTOR_ID,
      CONNECTOR_TYPE: '.github',
      CONNECTOR_CONFIG_APIURL: 'https://api.github.com',
      CONNECTOR_CONFIG_NESTED_OPT: '{"a":1}',
      CONNECTOR_CONFIG_PORT: '443',
      CONNECTOR_CONFIG_TLS: 'true',
      CONNECTOR_HEADER_AUTHORIZATION: BEARER_AUTHORIZATION,
      CONNECTOR_HEADER_X_API_KEY: 'abc',
    });
    expect(secretValues).toEqual([BEARER_AUTHORIZATION]);
  });

  it('redacts basic-auth header values without exposing the password separately', () => {
    const { env, secretValues } = buildConnectorEnv({
      connectorId: CONNECTOR_ID,
      actionTypeId: '.http',
      config: { url: 'https://es.example.com' },
      headers: { Authorization: BASIC_AUTHORIZATION },
    });

    expect(env.CONNECTOR_HEADER_AUTHORIZATION).toBe(BASIC_AUTHORIZATION);
    expect(env.CONNECTOR_SECRET_PASSWORD).toBeUndefined();
    expect(secretValues).toEqual([BASIC_AUTHORIZATION]);
  });
});

describe('redactSecrets', () => {
  it('replaces every occurrence of each secret value', () => {
    expect(
      redactSecrets(`token=${BEARER_AUTHORIZATION} again ${BEARER_AUTHORIZATION}`, [
        BEARER_AUTHORIZATION,
      ])
    ).toBe('token=[REDACTED] again [REDACTED]');
  });

  it('leaves text untouched when there is nothing to redact', () => {
    expect(redactSecrets('hello', [])).toBe('hello');
  });
});

describe('createConnectorCredentialResolver', () => {
  it('injects framework-resolved config and auth headers for an allow-listed connector', async () => {
    const { resolve, actionsClient } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      env: {
        CONNECTOR_ID,
        CONNECTOR_TYPE: '.github',
        CONNECTOR_CONFIG_APIURL: 'https://api.github.com',
        CONNECTOR_CONFIG_OWNER: 'elastic',
        CONNECTOR_HEADER_AUTHORIZATION: BEARER_AUTHORIZATION,
      },
      secretValues: [BEARER_AUTHORIZATION],
    });
    expect(actionsClient.getConnectorCredentials).toHaveBeenCalledWith({ id: CONNECTOR_ID });
    expect(actionsClient.get).not.toHaveBeenCalled();
  });

  it('does not read in-memory connector storage', async () => {
    const { resolve, actions } = setup();
    actions.inMemoryConnectors = [
      {
        id: CONNECTOR_ID,
        secrets: { token: 'should-not-leak', clientSecret: 'oauth-client-secret' },
      } as any,
    ];

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual(
      expect.objectContaining({
        env: expect.not.objectContaining({
          CONNECTOR_SECRET_TOKEN: 'should-not-leak',
          CONNECTOR_SECRET_CLIENTSECRET: 'oauth-client-secret',
        }),
      })
    );
    expect(JSON.stringify(result)).not.toContain('should-not-leak');
    expect(JSON.stringify(result)).not.toContain('oauth-client-secret');
  });

  it('denies connectors outside the agent allow-list before any lookup', async () => {
    const { resolve, actionsClient } = setup();

    const result = await resolve('other-connector', createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(
        "Connector 'other-connector' is not assigned to this agent"
      ),
    });
    expect(actionsClient.getConnectorCredentials).not.toHaveBeenCalled();
  });

  it('denies by default when the agent has no connectors', async () => {
    const { resolve } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext([]));

    expect(result).toEqual({ errorMessage: expect.stringContaining('Assigned connectors: none') });
  });

  it('fails when Actions denies execute access', async () => {
    const { resolve } = setup({
      credentialsError: new Error('Unauthorized to execute a ".github" action'),
    });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringMatching(
        /Failed to resolve connector 'github-1': Error: Unauthorized to execute/
      ),
    });
  });

  it('fails when the connector is a system connector', async () => {
    const { resolve } = setup({
      credentialsError: new Error(
        'Unable to get connector credentials for .cases: system connectors are not supported'
      ),
    });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining('system connectors are not supported'),
    });
  });

  it('fails when actions is unavailable', async () => {
    const { resolve } = setup({ withActions: false });

    expect(await resolve(CONNECTOR_ID, createCallContext())).toEqual({
      errorMessage: 'Connectors are not available in this deployment',
    });
  });
});
