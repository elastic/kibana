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
import { MAX_ENDPOINT_FANOUT } from '../../../../../common/detection_emulation/schemas/constants';

const FEATURE_ENABLED_CONFIG = {
  experimentalFeatures: { detectionEmulationRealExecution: true },
} as unknown as ConfigType;

const FEATURE_DISABLED_CONFIG = {
  experimentalFeatures: { detectionEmulationRealExecution: false },
} as unknown as ConfigType;

/**
 * PROD-6: static feature flag is ON, but the operator has flipped the
 * runtime kill switch (`xpack.securitySolution.detectionEmulation.realExecutionEnabled`
 * = false). The route must still 403 the request and the body must
 * surface the kill-switch reason so operators flip the right knob.
 */
const RUNTIME_KILL_SWITCH_CONFIG = {
  experimentalFeatures: { detectionEmulationRealExecution: true },
  detectionEmulation: { realExecutionEnabled: false },
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
    // PROD-6: error body must surface which knob blocked so operators
    // do not have to grep logs to know whether the static flag or the
    // runtime kill switch is the cause.
    expect((response.body as { message: string }).message).toMatch(
      /detectionEmulationRealExecution/
    );
  });

  it('PROD-6: returns 403 with kill-switch likely_cause when realExecutionEnabled is false at runtime', async () => {
    runEmulationCommandRoute(server.router, RUNTIME_KILL_SWITCH_CONFIG, logger);
    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
        body: {
          emulationId: 'emu-killswitch-test',
          agentType: 'endpoint',
          endpointIds: ['agent-1'],
          command: 'isolate',
        },
      }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ status_code: 403 });
    expect((response.body as { message: string }).message).toMatch(/realExecutionEnabled/);
    // The kill-switch path must NOT mention the static flag — that would
    // mislead operators into restarting Kibana when a config reload is
    // all that's needed.
    expect((response.body as { message: string }).message).not.toMatch(
      /detectionEmulationRealExecution/
    );
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

  // PROD-1: the route now defaults to deny when no operator allowlist is
  // supplied, so the rate-limit branch must opt out of the allowlist gate
  // explicitly. This factory injects a permissive allowlist alongside the
  // exhausted rate limiter so the rate-limit branch is reachable from tests
  // whose intent is to exercise that gate (not the allowlist).
  const makePermissiveAllowlist = () =>
    new EmulationAllowlist(createRestrictiveAllowlistConfig(['agent-1']), logger);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const allowlist = makePermissiveAllowlist();
    const rateLimiter = makeExhaustedRateLimiter();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, {
      allowlist,
      rateLimiter,
    });

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
    const allowlist = makePermissiveAllowlist();
    const rateLimiter = makeExhaustedRateLimiter();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, {
      allowlist,
      rateLimiter,
    });

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
    const allowlist = makePermissiveAllowlist();
    const rateLimiter = makeExhaustedRateLimiter();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, {
      allowlist,
      rateLimiter,
    });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    await server.inject(buildIsolateRequest(), requestContextMock.convertContext(context));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rate limiter'));
  });
});

// ─── PROD-4: per-host rate-limiter gate ──────────────────────────────────────

describe('runEmulationCommandRoute — PROD-4 per-host rate limiter', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  // Wide per-space cap (so the per-space bucket never trips first), tight
  // per-host cap so a single prior call saturates it. This isolates the
  // per-host rejection path from the per-space rejection path so the test
  // unambiguously proves PROD-4 is wired.
  const makePerHostBoundedLimiter = () =>
    new EmulationRateLimiter(
      {
        maxCommands: 100,
        windowMs: 60_000,
        disabled: false,
        perHost: { capacity: 1, windowMs: 60_000 },
      },
      logger
    );

  const makePermissiveAllowlist = () =>
    new EmulationAllowlist(createRestrictiveAllowlistConfig(['agent-1', 'agent-2']), logger);

  const buildIsolateRequest = (endpointIds: string[]) =>
    requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      body: {
        emulationId: 'emu-per-host',
        agentType: 'endpoint',
        endpointIds,
        command: 'isolate',
      },
    });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
  });

  it('returns 429 with blocked_endpoints naming the saturated host', async () => {
    const allowlist = makePermissiveAllowlist();
    const rateLimiter = makePerHostBoundedLimiter();
    // Pre-saturate ep-A's per-host bucket directly via the limiter — going
    // through the route would trip the dispatch-failure rollback path,
    // releasing the slot before the second call can observe it.
    rateLimiter.acquire('default', 'pre-existing-emu', 'isolate', ['agent-1']);

    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, {
      allowlist,
      rateLimiter,
    });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildIsolateRequest(['agent-1']),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(429);
    expect(response.body.message).toMatchObject({
      blocked_endpoints: ['agent-1'],
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Per-host rate limit exceeded')
    );
  });

  it('does not record a per-space slot when the per-host bucket rejects (atomic rollback)', async () => {
    const allowlist = makePermissiveAllowlist();
    const rateLimiter = makePerHostBoundedLimiter();
    // Pre-saturate ep-A.
    rateLimiter.acquire('default', 'pre-existing-emu', 'isolate', ['agent-1']);
    const beforeRejected = rateLimiter.getCurrentCount('default');

    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, {
      allowlist,
      rateLimiter,
    });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildIsolateRequest(['agent-1']),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toBe(429);

    // Per-space count must NOT have advanced beyond the seed: the rejected
    // call atomically rolled back its would-be reservation.
    expect(rateLimiter.getCurrentCount('default')).toBe(beforeRejected);
  });

  it('still allows requests targeting different (non-saturated) endpoints', async () => {
    const allowlist = makePermissiveAllowlist();
    const rateLimiter = makePerHostBoundedLimiter();
    // Saturate agent-1 only.
    rateLimiter.acquire('default', 'pre-existing-emu', 'isolate', ['agent-1']);

    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger, {
      allowlist,
      rateLimiter,
    });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    // Targeting agent-2 (not saturated) should pass the rate-limit gate.
    // Whatever happens downstream is fine — we just need to confirm the
    // 429 wasn't returned. Status 502 (downstream dispatch fail) confirms
    // we got past every gate including PROD-4 per-host.
    const response = await server.inject(
      buildIsolateRequest(['agent-2']),
      requestContextMock.convertContext(context)
    );
    expect(response.status).not.toBe(429);
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

// ─── PROD-3: endpoint fanout cap ─────────────────────────────────────────────
//
// Mirrors the validate_rule cap regression. The schema is shared, so the cap
// must fire here too — the test exists to catch a regression where the route
// switches to a less-strict schema or pre-validates fields manually. The mock
// server raises on `badRequest` rather than returning a 400 Kibana response,
// so we assert the throw + that the message names the constant.
describe('runEmulationCommandRoute — endpoint fanout cap (PROD-3)', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const generateAgentIds = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `agent-${i + 1}`);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    runEmulationCommandRoute(server.router, FEATURE_ENABLED_CONFIG, logger);
  });

  it('rejects at the validation layer when endpointIds exceeds MAX_ENDPOINT_FANOUT', async () => {
    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    await expect(
      server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
          body: {
            emulationId: 'emu-cap-test',
            agentType: 'endpoint',
            endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT + 1),
            command: 'isolate',
          },
        }),
        requestContextMock.convertContext(context)
      )
    ).rejects.toThrow(/MAX_ENDPOINT_FANOUT/);
  });

  it('accepts exactly MAX_ENDPOINT_FANOUT endpointIds (boundary value)', async () => {
    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canIsolateHost: true })
    );

    // Should NOT throw at the validation layer — exactly MAX_ENDPOINT_FANOUT
    // is at the boundary and accepted. Downstream gates (default-deny
    // allowlist) will surface a 403, which is the expected response shape.
    await expect(
      server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
          body: {
            emulationId: 'emu-cap-test',
            agentType: 'endpoint',
            endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT),
            command: 'isolate',
          },
        }),
        requestContextMock.convertContext(context)
      )
    ).resolves.toEqual(expect.objectContaining({ status: expect.any(Number) }));
  });
});
