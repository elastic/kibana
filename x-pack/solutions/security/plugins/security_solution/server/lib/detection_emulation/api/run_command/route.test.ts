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
  detectionEmulation: { realExecution: true, logInjection: false },
} as unknown as ConfigType;

// ─── RBAC gate negative tests ─────────────────────────────────────────────────

describe('runEmulationCommandRoute — RBAC gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger);
  });

  it.each<[string, string, Partial<EndpointAuthz>]>([
    ['execute', 'canWriteExecuteOperations', { canWriteExecuteOperations: false }],
    ['isolate', 'canIsolateHost', { canIsolateHost: false }],
    ['runscript', 'canWriteExecuteOperations', { canWriteExecuteOperations: false }],
    ['scan', 'canWriteScanOperations', { canWriteScanOperations: false }],
    ['get-file', 'canWriteFileOperations', { canWriteFileOperations: false }],
  ])(
    'returns 403 when command [%s] is blocked because caller lacks [%s]',
    async (command, expectedAuthzKey, authzOverride) => {
      const { context } = requestContextMock.createTools();
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
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toBe(403);
      expect(response.body.message).toContain(expectedAuthzKey);
    }
  );

  it('includes the missing privilege name in the 403 response body', async () => {
    const { context } = requestContextMock.createTools();
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

  // maxCommands: 0 immediately exhausts the limit regardless of spaceId —
  // 0 >= 0 is always true so check() always returns { allowed: false }.
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
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    await server.inject(buildIsolateRequest(), requestContextMock.convertContext(context));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rate limiter'));
  });
});
