/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  actionsMock,
  actionsClientMock,
  actionsAuthorizationMock,
} from '@kbn/actions-plugin/server/mocks';
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
  inMemory = true,
  withActions = true,
}: {
  connector?: ReturnType<typeof createConnector>;
  secrets?: Record<string, unknown>;
  inMemory?: boolean;
  withActions?: boolean;
} = {}) => {
  const actionsClient = actionsClientMock.create();
  actionsClient.get.mockResolvedValue(connector as any);
  const authorization = actionsAuthorizationMock.create();
  const actions = actionsMock.createStart();
  actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
  actions.getActionsAuthorizationWithRequest.mockReturnValue(authorization);
  actions.inMemoryConnectors = inMemory ? [{ ...connector, secrets } as any] : [];

  const resolve = createConnectorCredentialResolver({
    getDeps: () => ({ actions: withActions ? actions : undefined }),
    logger: loggingSystemMock.createLogger(),
  });

  return { resolve, actions, actionsClient, authorization };
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
  it('injects in-memory secrets and config for an allow-listed preconfigured connector', async () => {
    const { resolve, authorization } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext());

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
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: 'execute',
      actionTypeId: '.github',
    });
  });

  it('rejects connectors that are not preconfigured', async () => {
    const { resolve } = setup({
      connector: createConnector({ isPreconfigured: false }),
      inMemory: false,
    });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(
        `Connector '${CONNECTOR_ID}' is not a preconfigured connector`
      ),
    });
  });

  it('denies connectors outside the agent allow-list before any lookup', async () => {
    const { resolve, actionsClient } = setup();

    const result = await resolve('other-connector', createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(
        "Connector 'other-connector' is not assigned to this agent"
      ),
    });
    expect(actionsClient.get).not.toHaveBeenCalled();
  });

  it('denies by default when the agent has no connectors', async () => {
    const { resolve } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext([]));

    expect(result).toEqual({ errorMessage: expect.stringContaining('Assigned connectors: none') });
  });

  it('fails when the user cannot read the connector', async () => {
    const { resolve, actionsClient } = setup();
    actionsClient.get.mockRejectedValue(new Error('Unauthorized to get actions'));

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(`Failed to resolve connector '${CONNECTOR_ID}'`),
    });
  });

  it('fails when the user is not allowed to execute the connector type', async () => {
    const { resolve, authorization } = setup();
    authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to execute'));

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(`Not authorized to use connector '${CONNECTOR_ID}'`),
    });
  });

  it('rejects system connectors', async () => {
    const { resolve } = setup({ connector: createConnector({ isSystemAction: true }) });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({ errorMessage: expect.stringContaining('system connector') });
  });

  it('fails when actions is unavailable', async () => {
    const { resolve } = setup({ withActions: false });

    expect(await resolve(CONNECTOR_ID, createCallContext())).toEqual({
      errorMessage: 'Connectors are not available in this deployment',
    });
  });
});
