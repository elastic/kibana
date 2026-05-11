/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConfigType } from '../../../../config';
import { runEmulationCommandRoute } from './route';
import { serverMock } from '../../../detection_engine/routes/__mocks__/server';
import { requestContextMock } from '../../../detection_engine/routes/__mocks__/request_context';
import { requestMock } from '../../../detection_engine/routes/__mocks__/request';
import { DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL } from '../../../../../common/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';
import { EmulationAllowlist, createRestrictiveAllowlistConfig } from '../../execution/allowlist';
import { EmulationRateLimiter } from '../../execution/rate_limiter';

const FEATURE_ENABLED_CONFIG = {
  experimentalFeatures: { detectionEmulationRealExecution: true },
} as unknown as ConfigType;

const FEATURE_DISABLED_CONFIG = {
  experimentalFeatures: { detectionEmulationRealExecution: false },
} as unknown as ConfigType;

/**
 * The route's N5 gate (added with this PR) refuses to dispatch when no
 * authenticated user is present. The default `requestContextMock` does
 * not stub `getCurrentUser`, so tests targeting later gates (RBAC,
 * allowlist, rate limiter) must opt in to an authenticated identity to
 * skip past N5. Any test that wants to exercise N5 itself just *omits*
 * this call (or overrides it explicitly).
 */
const stubAuthenticatedUser = (
  context: ReturnType<typeof requestContextMock.createTools>['context'],
  username = 'test-user'
) => {
  (context.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue({ username });
};

// ─── Feature-flag gate ────────────────────────────────────────────────────────

describe('runEmulationCommandRoute — feature-flag gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
  });

  it('returns 403 when realExecution is disabled', async () => {
    runEmulationCommandRoute(server.router, FEATURE_DISABLED_CONFIG, logger);
    const { context } = requestContextMock.createTools();
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
        body: {
          emulationId: 'emu-flag-test',
          agentType: 'endpoint',
          endpointIds: ['agent-1'],
          command: 'isolate',
        },
      }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ status_code: 403 });
  });
});

// ─── RBAC gate negative tests ─────────────────────────────────────────────────

describe('runEmulationCommandRoute — RBAC gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger);
  });

  it.each<[string, string, Partial<EndpointAuthz>, Record<string, unknown>?]>([
    [
      'execute',
      'canWriteExecuteOperations',
      { canWriteExecuteOperations: false },
      { command: 'whoami' },
    ],
    ['isolate', 'canIsolateHost', { canIsolateHost: false }, undefined],
    [
      'runscript',
      'canWriteExecuteOperations',
      { canWriteExecuteOperations: false },
      { scriptId: 'echo-hi' },
    ],
    ['scan', 'canWriteScanOperations', { canWriteScanOperations: false }, { path: '/tmp' }],
    ['get-file', 'canWriteFileOperations', { canWriteFileOperations: false }, { path: '/tmp' }],
  ])(
    'returns 403 when command [%s] is blocked because caller lacks [%s]',
    async (command, expectedAuthzKey, authzOverride, parameters) => {
      const { context } = requestContextMock.createTools();
      stubAuthenticatedUser(context);
      context.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock(authzOverride)
      );

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
        body: {
          emulationId: 'emu-rbac-test',
          agentType: 'endpoint',
          endpointIds: ['agent-1'],
          command,
          ...(parameters ? { parameters } : {}),
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toBe(403);
      expect(response.body.message).toContain(expectedAuthzKey);
    }
  );

  it('includes the missing privilege name in the 403 response body', async () => {
    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: false })
    );

    const request = requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      body: {
        emulationId: 'emu-rbac-msg-test',
        agentType: 'endpoint',
        endpointIds: ['agent-1'],
        command: 'execute',
        parameters: { command: 'whoami' },
      },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      message: expect.stringContaining('canWriteExecuteOperations'),
      status_code: 403,
    });
  });

  it('logs a warning that names the missing privilege when the RBAC gate blocks', async () => {
    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: false })
    );

    const request = requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      body: {
        emulationId: 'emu-rbac-warn-test',
        agentType: 'endpoint',
        endpointIds: ['agent-1'],
        command: 'execute',
        parameters: { command: 'whoami' },
      },
    });

    await server.inject(request, requestContextMock.convertContext(context));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('canWriteExecuteOperations'));
  });
});

// ─── Allowlist gate negative tests ───────────────────────────────────────────

describe('runEmulationCommandRoute — allowlist gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const buildRequestForHost = (endpointIds: string[]) =>
    requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      body: {
        emulationId: 'emu-allowlist-test',
        agentType: 'endpoint',
        endpointIds,
        command: 'isolate',
      },
    });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
  });

  it('returns 403 with blocked_endpoints when the host is not in the allowlist', async () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(['allowed-host']),
      logger
    );
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildRequestForHost(['blocked-host']),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toMatchObject({
      blocked_endpoints: ['blocked-host'],
    });
  });

  it('lists all blocked hosts when multiple endpoints are not in the allowlist', async () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(['allowed-host']),
      logger
    );
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildRequestForHost(['allowed-host', 'blocked-1', 'blocked-2']),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toMatchObject({
      blocked_endpoints: ['blocked-1', 'blocked-2'],
    });
  });

  it('logs a warning naming the blocked endpoints when the allowlist gate blocks', async () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(['allowed-host']),
      logger
    );
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    await server.inject(
      buildRequestForHost(['blocked-host']),
      requestContextMock.convertContext(context)
    );

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('blocked-host'));
  });
});

// ─── Rate limiter gate negative tests ────────────────────────────────────────

describe('runEmulationCommandRoute — rate limiter gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const buildIsolateRequest = () =>
    requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      body: {
        emulationId: 'emu-rate-limit-test',
        agentType: 'endpoint',
        endpointIds: ['agent-1'],
        command: 'isolate',
      },
    });

  // maxCommands: 0 immediately exhausts the limit regardless of spaceId — 0 >= 0 is
  // always true, so acquire() always returns { allowed: false }.
  const makeExhaustedRateLimiter = () =>
    new EmulationRateLimiter({ maxCommands: 0, windowMs: 60_000, disabled: false }, logger);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const rateLimiter = makeExhaustedRateLimiter();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { rateLimiter });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildIsolateRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(429);
  });

  it('response body includes current_count and max_commands when rate-limited', async () => {
    const rateLimiter = makeExhaustedRateLimiter();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { rateLimiter });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildIsolateRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(429);
    expect(response.body.message).toMatchObject({
      current_count: 0,
      max_commands: 0,
    });
  });

  it('logs a warning naming the space when the rate limit gate blocks', async () => {
    const rateLimiter = makeExhaustedRateLimiter();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { rateLimiter });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    await server.inject(buildIsolateRequest(), requestContextMock.convertContext(context));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rate limiter'));
  });
});

// ─── N5: missing user gate ────────────────────────────────────────────────────

describe('runEmulationCommandRoute — missing user gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger);
  });

  it('returns 401 when no current user is available (does not fall back to "unknown")', async () => {
    const { context } = requestContextMock.createTools();
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());
    // Force getCurrentUser to return null — destructive emulation actions must not
    // proceed under an unauthenticated identity.
    (context.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue(null);

    const response = await server.inject(
      requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
        body: {
          emulationId: 'emu-no-user',
          agentType: 'endpoint',
          endpointIds: ['agent-1'],
          command: 'isolate',
        },
      }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(401);
  });
});
