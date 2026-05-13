/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConfigType } from '../../../../config';
import { validateRuleRoute } from './route';
import { serverMock } from '../../../detection_engine/routes/__mocks__/server';
import { requestContextMock } from '../../../detection_engine/routes/__mocks__/request_context';
import { requestMock } from '../../../detection_engine/routes/__mocks__/request';
import { DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL } from '../../../../../common/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { EmulationAllowlist, createRestrictiveAllowlistConfig } from '../../execution/allowlist';
import { EmulationRateLimiter } from '../../execution/rate_limiter';
import { generateScenario } from '../../scenario_generator';
import { MAX_ENDPOINT_FANOUT } from '../../../../../common/detection_emulation/schemas/constants';

// Stub the scenario generator so log_injection requests that pass the safety
// gates short-circuit at scenario generation instead of dragging in the full
// rules-client + payload-library + telemetry chain. The real scenario logic
// has its own unit tests; here we only care that the gates fire (or don't).
jest.mock('../../scenario_generator', () => ({
  generateScenario: jest.fn(),
}));

const FEATURE_ENABLED_CONFIG = {
  experimentalFeatures: {
    detectionEmulationRealExecution: true,
    detectionEmulationLogInjection: true,
  },
} as unknown as ConfigType;

/**
 * Validate-rule's auth gate (Step 2) refuses to dispatch when no
 * authenticated user is present. Tests targeting later gates must opt in
 * to an authenticated identity.
 */
const stubAuthenticatedUser = (
  context: ReturnType<typeof requestContextMock.createTools>['context'],
  username = 'test-user'
) => {
  (context.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue({ username });
};

const buildRealExecutionRequest = (overrides: Partial<Record<string, unknown>> = {}) =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL,
    body: {
      ruleId: 'rule-under-test',
      endpointIds: ['agent-1'],
      mode: 'real_execution',
      ...overrides,
    },
  });

const buildLogInjectionRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL,
    body: {
      ruleId: 'rule-under-test',
      endpointIds: ['blocked-host', 'another-blocked-host'],
      mode: 'log_injection',
    },
  });

// ─── Allowlist gate ──────────────────────────────────────────────────────────

describe('validateRuleRoute — allowlist gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    (generateScenario as jest.Mock).mockReset();
  });

  it('returns 403 with blocked_endpoints when real_execution targets a non-allowlisted host', async () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(['allowed-host']),
      logger
    );
    validateRuleRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
    );

    const response = await server.inject(
      buildRealExecutionRequest({ endpointIds: ['blocked-host'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toMatchObject({
      blocked_endpoints: ['blocked-host'],
    });
    // The allowlist gate must fire BEFORE scenario generation runs — otherwise
    // a blocked request would still consume rules-client / payload-library work.
    expect(generateScenario as jest.Mock).not.toHaveBeenCalled();
  });
});

// ─── Rate-limit gate ─────────────────────────────────────────────────────────

describe('validateRuleRoute — rate limiter gate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  // maxCommands: 0 immediately exhausts the limit regardless of spaceId — 0 >= 0 is
  // always true, so acquire() always returns { allowed: false }.
  const makeExhaustedRateLimiter = () =>
    new EmulationRateLimiter({ maxCommands: 0, windowMs: 60_000, disabled: false }, logger);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    (generateScenario as jest.Mock).mockReset();
  });

  it('returns 429 when real_execution exceeds the per-space rate limit', async () => {
    // PROD-1: the route now defaults to deny when no operator allowlist is
    // supplied, so the rate-limit branch must opt out of the allowlist gate
    // explicitly. Inject a permissive allowlist alongside the exhausted
    // rate limiter so the rate-limit branch is reachable.
    const allowlist = new EmulationAllowlist(createRestrictiveAllowlistConfig(['agent-1']), logger);
    const rateLimiter = makeExhaustedRateLimiter();
    validateRuleRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist, rateLimiter });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
    );

    const response = await server.inject(
      buildRealExecutionRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(429);
    expect(response.body.message).toMatchObject({
      current_count: 0,
      max_commands: 0,
    });
    // The rate-limit gate must fire BEFORE scenario generation runs so an
    // exhausted window doesn't waste payload-library work on a request that
    // will be rejected.
    expect(generateScenario as jest.Mock).not.toHaveBeenCalled();
  });
});

// ─── log_injection bypasses the safety gates ─────────────────────────────────

describe('validateRuleRoute — log_injection mode', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    (generateScenario as jest.Mock).mockReset();
    // Short-circuit: scenario generation reports rule-not-found so the request
    // returns 404 from the scenario-failure path. We assert the response is
    // anything *but* 403/429, which would mean a safety gate blocked.
    (generateScenario as jest.Mock).mockResolvedValue({
      ok: false,
      reason: 'rule_not_found',
    });
  });

  it('passes through the safety gates even when allowlist + rate limiter would block real_execution', async () => {
    // Both safety primitives configured to block: a restrictive allowlist that
    // permits no hosts, and an exhausted rate limiter. log_injection must
    // ignore both — the destructive-action safeguards do not apply to the
    // synthetic-document path.
    const allowlist = new EmulationAllowlist(createRestrictiveAllowlistConfig([]), logger);
    const rateLimiter = new EmulationRateLimiter(
      { maxCommands: 0, windowMs: 60_000, disabled: false },
      logger
    );
    validateRuleRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist, rateLimiter });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(getEndpointAuthzInitialStateMock());

    const response = await server.inject(
      buildLogInjectionRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(429);
    // Scenario generation was reached (the gates didn't short-circuit it),
    // and the route surfaced the scenario-not-found failure.
    expect(generateScenario as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'rule-under-test',
        mode: 'log_injection',
      }),
      expect.anything()
    );
    expect(response.status).toBe(404);
  });
});

// ─── PROD-3: endpoint fanout cap ─────────────────────────────────────────────
//
// The cap is enforced by the central Zod schema (`ValidateRuleInputSchema`)
// via `buildRouteValidationWithZod`, so an oversized fanout is rejected at
// the request-validation layer BEFORE any handler logic runs — before flag
// checks, before auth, before allowlist. The local mock server raises on
// `badRequest` (instead of returning a 400 Kibana response), so we assert
// the throw + that the message names the constant. The test covers both
// modes to prove the cap is mode-agnostic (log_injection cannot be used
// to escape the limit).
describe('validateRuleRoute — endpoint fanout cap (PROD-3)', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const generateAgentIds = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `agent-${i + 1}`);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
    (generateScenario as jest.Mock).mockReset();
  });

  it.each([{ mode: 'real_execution' as const }, { mode: 'log_injection' as const }])(
    'rejects at the validation layer when $mode targets MAX_ENDPOINT_FANOUT + 1 endpoints',
    async ({ mode }) => {
      // Inject a permissive allowlist so a 403 can't shadow the validation
      // rejection; the cap must fire at the request-validation layer,
      // before any gate runs.
      const allowlist = new EmulationAllowlist(
        createRestrictiveAllowlistConfig(generateAgentIds(MAX_ENDPOINT_FANOUT + 1)),
        logger
      );
      validateRuleRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist });

      const { context } = requestContextMock.createTools();
      stubAuthenticatedUser(context);
      context.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
      );

      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL,
            body: {
              ruleId: 'rule-under-test',
              endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT + 1),
              mode,
            },
          }),
          requestContextMock.convertContext(context)
        )
      ).rejects.toThrow(/MAX_ENDPOINT_FANOUT/);

      // The route handler must NOT have been entered: scenario generator
      // is the first thing past the gates and is mocked to throw if hit.
      expect(generateScenario as jest.Mock).not.toHaveBeenCalled();
    }
  );

  it('accepts exactly MAX_ENDPOINT_FANOUT endpoints (boundary value)', async () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(generateAgentIds(MAX_ENDPOINT_FANOUT)),
      logger
    );
    // Short-circuit downstream so we only assert the validation layer
    // doesn't fire — anything past it is fine for a boundary check.
    (generateScenario as jest.Mock).mockResolvedValue({ ok: false, reason: 'rule_not_found' });
    validateRuleRoute(server.router, FEATURE_ENABLED_CONFIG, logger, { allowlist });

    const { context } = requestContextMock.createTools();
    stubAuthenticatedUser(context);
    context.securitySolution.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
    );

    // Should NOT throw — exactly MAX_ENDPOINT_FANOUT is at the boundary
    // and accepted by the schema. The downstream short-circuit returns
    // a 404 from the scenario-failure path; that's fine.
    await expect(
      server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_VALIDATE_RULE_URL,
          body: {
            ruleId: 'rule-under-test',
            endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT),
            mode: 'real_execution',
          },
        }),
        requestContextMock.convertContext(context)
      )
    ).resolves.toMatchObject({ status: 404 });
  });
});
