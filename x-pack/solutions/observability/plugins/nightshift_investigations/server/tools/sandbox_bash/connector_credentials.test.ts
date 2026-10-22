/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsMock, actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import {
  buildConnectorEnv,
  createConnectorCredentialResolver,
  deriveAuthorizationSecretValues,
  redactSecrets,
} from './connector_credentials';

const CONNECTOR_ID = 'github-1';
const BASIC_AUTHORIZATION = 'Basic ZWxhc3RpYy11c2VyOnA0c3M=';
const BEARER_AUTHORIZATION = 'Bearer ghp_topsecrettokenvalue';

const createCallContext = (
  allowedConnectorIds: readonly string[] = [CONNECTOR_ID]
): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
  resolvedCredentials: new Map(),
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
    actionsClient.getSandboxCredentials.mockRejectedValue(credentialsError);
  } else {
    actionsClient.getSandboxCredentials.mockResolvedValue(credentials);
  }
  const actions = actionsMock.createStart();
  actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
  actions.inMemoryConnectors = [
    { id: CONNECTOR_ID, isPreconfigured: true } as ActionsPluginStart['inMemoryConnectors'][number],
  ];

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
    expect(secretValues).toEqual([BEARER_AUTHORIZATION, 'ghp_topsecrettokenvalue']);
  });

  it('adds the values derived from the Authorization header to secretValues', () => {
    const { secretValues } = buildConnectorEnv({
      connectorId: CONNECTOR_ID,
      actionTypeId: '.http',
      config: {},
      headers: { authorization: BASIC_AUTHORIZATION },
    });

    expect(secretValues).toEqual([
      BASIC_AUTHORIZATION,
      ...deriveAuthorizationSecretValues(BASIC_AUTHORIZATION),
    ]);
  });

  it.each(['Basic', 'basic', 'BASIC', 'bAsIc'])(
    'redacts decoded Basic credentials when the scheme is %s and preserves the header env value',
    (scheme) => {
      const encodedCredentials = Buffer.from('elastic-user:p4ssword').toString('base64');
      const authorization = `${scheme} ${encodedCredentials}`;
      const { env, secretValues } = buildConnectorEnv({
        connectorId: CONNECTOR_ID,
        actionTypeId: '.http',
        config: {},
        headers: { Authorization: authorization },
      });

      expect(env.CONNECTOR_HEADER_AUTHORIZATION).toBe(authorization);
      expect(secretValues).toEqual(
        expect.arrayContaining([
          encodedCredentials,
          'elastic-user:p4ssword',
          'elastic-user',
          'p4ssword',
        ])
      );
      expect(redactSecrets('user=elastic-user password=p4ssword', secretValues)).toBe(
        'user=[REDACTED] password=[REDACTED]'
      );
    }
  );

  it('derives values from every case variant of Authorization and keeps the later one in env', () => {
    const { env, secretValues } = buildConnectorEnv({
      connectorId: CONNECTOR_ID,
      actionTypeId: '.http',
      config: {},
      headers: { Authorization: BEARER_AUTHORIZATION, authorization: 'ApiKey override-api-key-1' },
    });

    expect(env.CONNECTOR_HEADER_AUTHORIZATION).toBe('ApiKey override-api-key-1');
    expect(secretValues).toEqual(
      expect.arrayContaining(['ghp_topsecrettokenvalue', 'override-api-key-1'])
    );
  });
});

describe('deriveAuthorizationSecretValues', () => {
  const encode = (value: string) => Buffer.from(value).toString('base64');

  it.each([
    ['ApiKey', 'ApiKey super-secret-key', ['super-secret-key']],
    ['Bearer', BEARER_AUTHORIZATION, ['ghp_topsecrettokenvalue']],
    [
      'Basic with decoded user and password',
      `Basic ${encode('elastic-user:p4ss:word')}`,
      [encode('elastic-user:p4ss:word'), 'elastic-user:p4ss:word', 'elastic-user', 'p4ss:word'],
    ],
    [
      'Basic with a non-ASCII password',
      `Basic ${encode('elastic-user:pässword123')}`,
      [
        encode('elastic-user:pässword123'),
        'elastic-user:pässword123',
        'elastic-user',
        'pässword123',
      ],
    ],
    ['Basic with invalid base64', 'Basic not*base64!value', ['not*base64!value']],
    ['too-short value', 'Bearer abc', []],
    ['no scheme', 'justatokenvalue', []],
  ])('%s', (_name, authorization, expected) => {
    expect(deriveAuthorizationSecretValues(authorization)).toEqual(expected);
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
      secretValues: [BEARER_AUTHORIZATION, 'ghp_topsecrettokenvalue'],
    });
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledWith({ id: CONNECTOR_ID });
    expect(actionsClient.get).not.toHaveBeenCalled();
  });

  it('does not read in-memory connector storage', async () => {
    const { resolve, actions } = setup();
    actions.inMemoryConnectors = [
      {
        id: CONNECTOR_ID,
        isPreconfigured: true,
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
    const { resolve, actions, actionsClient } = setup();

    const result = await resolve('other-connector', createCallContext([CONNECTOR_ID, 'jira-1']));

    expect(result).toEqual({
      errorMessage:
        "Connector 'other-connector' is not assigned to this agent. " +
        'Check /workspace/connectors.md for available connectors.',
    });
    expect(actions.getActionsClientWithRequest).not.toHaveBeenCalled();
    expect(actionsClient.getSandboxCredentials).not.toHaveBeenCalled();
  });

  it('injects credentials for a saved connector that is not held in memory', async () => {
    const { resolve, actions, actionsClient } = setup({
      credentials: {
        connectorId: 'saved-object-1',
        actionTypeId: '.http',
        config: { url: 'https://api.example.com' },
        headers: { Authorization: BEARER_AUTHORIZATION },
      },
    });
    actions.inMemoryConnectors = [];

    const result = await resolve('saved-object-1', createCallContext(['saved-object-1']));

    expect(result).toEqual({
      env: {
        CONNECTOR_ID: 'saved-object-1',
        CONNECTOR_TYPE: '.http',
        CONNECTOR_CONFIG_URL: 'https://api.example.com',
        CONNECTOR_HEADER_AUTHORIZATION: BEARER_AUTHORIZATION,
      },
      secretValues: [BEARER_AUTHORIZATION, 'ghp_topsecrettokenvalue'],
    });
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledWith({ id: 'saved-object-1' });
    // The same call redacts the full header and the bare token from the command output.
    expect(
      redactSecrets(
        `header=${BEARER_AUTHORIZATION} token=ghp_topsecrettokenvalue`,
        (result as { secretValues: string[] }).secretValues
      )
    ).toBe('header=[REDACTED] token=[REDACTED]');
  });

  it('resolves a connector once per call context', async () => {
    const { resolve, actionsClient } = setup();
    const callContext = createCallContext();

    await resolve(CONNECTOR_ID, callContext);
    await resolve(CONNECTOR_ID, { ...callContext });
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledTimes(1);

    await resolve(CONNECTOR_ID, createCallContext());
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledTimes(2);
  });

  it('denies by default when the agent has no connectors', async () => {
    const { resolve } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext([]));

    expect(result).toEqual({
      errorMessage:
        `Connector '${CONNECTOR_ID}' is not assigned to this agent. ` +
        'Check /workspace/connectors.md for available connectors.',
    });
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
