/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { SandboxCallContext } from './tool_utils';
import {
  buildConnectorEnv,
  createConnectorCredentialResolver,
  redactSecrets,
} from './connector_credentials';

const CONNECTOR_ID = 'github-1';
const TOKEN = 'ghp_topsecrettokenvalue';

const createCallContext = (
  allowedConnectorIds: readonly string[] = [CONNECTOR_ID]
): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
});

const createConnector = (overrides: Record<string, unknown> = {}) => ({
  id: CONNECTOR_ID,
  name: 'My GitHub',
  actionTypeId: '.github',
  config: { apiUrl: 'https://api.github.com', owner: 'elastic' },
  isPreconfigured: true,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  ...overrides,
});

const setup = ({
  connector = createConnector(),
  secrets = { token: TOKEN },
  withActions = true,
}: {
  connector?: ReturnType<typeof createConnector>;
  secrets?: Record<string, unknown>;
  withActions?: boolean;
} = {}) => {
  const actions = actionsMock.createStart();
  actions.getConnectorWithDecryptedSecrets.mockResolvedValue({
    id: connector.id,
    name: connector.name,
    actionTypeId: connector.actionTypeId,
    isPreconfigured: connector.isPreconfigured,
    config: connector.config,
    secrets,
  });

  const resolve = createConnectorCredentialResolver({
    getDeps: () => ({ actions: withActions ? actions : undefined }),
    logger: loggingSystemMock.createLogger(),
  });

  return { resolve, actions };
};

describe('buildConnectorEnv', () => {
  it('maps config and secrets to prefixed, upper-cased env vars', () => {
    const { env, secretValues } = buildConnectorEnv({
      connectorId: CONNECTOR_ID,
      actionTypeId: '.github',
      config: { apiUrl: 'https://api.github.com', 'nested-opt': { a: 1 }, port: 443, tls: true },
      secrets: { token: TOKEN, password: null, short: 'abc' },
    });

    expect(env).toEqual({
      CONNECTOR_ID,
      CONNECTOR_TYPE: '.github',
      CONNECTOR_CONFIG_APIURL: 'https://api.github.com',
      CONNECTOR_CONFIG_NESTED_OPT: '{"a":1}',
      CONNECTOR_CONFIG_PORT: '443',
      CONNECTOR_CONFIG_TLS: 'true',
      CONNECTOR_SECRET_TOKEN: TOKEN,
      CONNECTOR_SECRET_SHORT: 'abc',
    });
    // Very short values are not redacted: they would produce false positives in output.
    expect(secretValues).toEqual([TOKEN]);
  });

  it('copies an ApiKey Authorization header into CONNECTOR_SECRET_PASSWORD', () => {
    const apiKey = 'IYMYxKABgjRzD6vCgZ3Ktestkey';
    const { env, secretValues } = buildConnectorEnv({
      connectorId: 'elasticsearch-telemetry',
      actionTypeId: '.http',
      config: { url: 'https://es.example.com' },
      secrets: { secretHeaders: { Authorization: `ApiKey ${apiKey}` } },
    });

    expect(env.CONNECTOR_SECRET_PASSWORD).toBe(apiKey);
    expect(secretValues).toContain(apiKey);
  });

  it('copies an ApiKey header when secretHeaders is a JSON string', () => {
    const apiKey = 'IYMYxKABgjRzD6vCgZ3Ktestkey';
    const { env, secretValues } = buildConnectorEnv({
      connectorId: 'elasticsearch-telemetry',
      actionTypeId: '.http',
      config: { url: 'https://es.example.com' },
      secrets: { secretHeaders: JSON.stringify({ Authorization: `ApiKey ${apiKey}` }) },
    });

    expect(env.CONNECTOR_SECRET_SECRETHEADERS).toBe(
      JSON.stringify({ Authorization: `ApiKey ${apiKey}` })
    );
    expect(env.CONNECTOR_SECRET_PASSWORD).toBe(apiKey);
    expect(secretValues).toContain(apiKey);
  });

  it('leaves CONNECTOR_SECRET_PASSWORD unset when secretHeaders is not an ApiKey header', () => {
    const { env } = buildConnectorEnv({
      connectorId: 'elasticsearch-telemetry',
      actionTypeId: '.http',
      config: { url: 'https://es.example.com' },
      secrets: { secretHeaders: 'not-json' },
    });

    expect(env.CONNECTOR_SECRET_PASSWORD).toBeUndefined();
  });

  it('does not overwrite an existing CONNECTOR_SECRET_PASSWORD', () => {
    const password = 'existing-password-value';
    const { env, secretValues } = buildConnectorEnv({
      connectorId: 'elasticsearch-telemetry',
      actionTypeId: '.webhook',
      config: { url: 'https://es.example.com' },
      secrets: {
        password,
        secretHeaders: { Authorization: 'ApiKey unused-api-key-value' },
      },
    });

    expect(env.CONNECTOR_SECRET_PASSWORD).toBe(password);
    expect(secretValues).toContain(password);
    expect(secretValues).toContain('unused-api-key-value');
  });
});

describe('redactSecrets', () => {
  it('replaces every occurrence of each secret value', () => {
    expect(redactSecrets(`token=${TOKEN} again ${TOKEN}`, [TOKEN])).toBe(
      'token=[REDACTED] again [REDACTED]'
    );
  });

  it('leaves text untouched when there is nothing to redact', () => {
    expect(redactSecrets('hello', [])).toBe('hello');
  });
});

describe('createConnectorCredentialResolver', () => {
  it('injects the decrypted config and secrets of an allow-listed connector', async () => {
    const { resolve, actions } = setup();
    const callContext = createCallContext();

    const result = await resolve(CONNECTOR_ID, callContext);

    expect(result).toEqual({
      env: {
        CONNECTOR_ID,
        CONNECTOR_TYPE: '.github',
        CONNECTOR_CONFIG_APIURL: 'https://api.github.com',
        CONNECTOR_CONFIG_OWNER: 'elastic',
        CONNECTOR_SECRET_TOKEN: TOKEN,
      },
      secretValues: [TOKEN],
    });
    expect(actions.getConnectorWithDecryptedSecrets).toHaveBeenCalledWith(
      callContext.request,
      CONNECTOR_ID
    );
  });

  it('exposes the bare API key of a saved External Elasticsearch connector', async () => {
    const apiKey = 'c29tZS1pZDpzb21lLXNlY3JldC1rZXk=';
    const { resolve } = setup({
      connector: createConnector({
        actionTypeId: '.elasticsearch',
        isPreconfigured: false,
        config: { url: 'https://es.example.com', kibanaUrl: 'https://kb.example.com' },
      }),
      secrets: { authType: 'api_key_header', Authorization: `ApiKey ${apiKey}` },
    });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toMatchObject({
      env: {
        CONNECTOR_CONFIG_URL: 'https://es.example.com',
        CONNECTOR_CONFIG_KIBANAURL: 'https://kb.example.com',
        CONNECTOR_SECRET_PASSWORD: apiKey,
      },
      secretValues: expect.arrayContaining([apiKey]),
    });
  });

  it('denies connectors outside the agent allow-list before any lookup', async () => {
    const { resolve, actions } = setup();

    const result = await resolve('other-connector', createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(
        "Connector 'other-connector' is not assigned to this agent"
      ),
    });
    expect(actions.getConnectorWithDecryptedSecrets).not.toHaveBeenCalled();
  });

  it('denies by default when the agent has no connectors', async () => {
    const { resolve } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext([]));

    expect(result).toEqual({ errorMessage: expect.stringContaining('Assigned connectors: none') });
  });

  it('fails when the user may not read or execute the connector', async () => {
    const { resolve, actions } = setup();
    actions.getConnectorWithDecryptedSecrets.mockRejectedValue(
      new Error('Unauthorized to execute')
    );

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(`Not authorized to use connector '${CONNECTOR_ID}'`),
    });
  });

  it('fails when actions is unavailable', async () => {
    const { resolve } = setup({ withActions: false });

    expect(await resolve(CONNECTOR_ID, createCallContext())).toEqual({
      errorMessage: 'Connectors are not available in this deployment',
    });
  });
});
