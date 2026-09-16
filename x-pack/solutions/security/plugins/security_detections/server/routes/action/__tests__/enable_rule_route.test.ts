/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.8 — POST /api/detection_engine/v2/rules/{id}/_enable route unit tests.
 *
 * Covers:
 *   - Route registration: path, method, version, privilege.
 *   - Happy-path handler: returns the updated rule body on 200.
 *   - 404 posture: missing id and out-of-scope rule both return 404 RULE_NOT_FOUND.
 *   - Redundant toggle: re-enabling an already-enabled rule succeeds (no short-circuit).
 *   - 503 gate: disabled `alerting:v2:enabled` → ALERTING_DISABLED envelope.
 *   - Non-Boom errors are boomified to 500.
 *
 * Ref: rule-actions-api.md "The endpoints", "Semantics",
 *      "What is deliberately absent"
 *      rule-crud-api.md "Conventions every endpoint shares"
 *
 * Implementation plan: Step 8.8
 */

import Boom from '@hapi/boom';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import {
  registerEnableRuleRoute,
  DETECTION_ENGINE_V2_RULE_ENABLE_PATH,
} from '../enable_rule_route';
import { ALERTING_V2_ENABLED_SETTING } from '../../detection_route_helpers';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../detection_rules_client');
const { DetectionRulesClient } = jest.requireMock('../../../detection_rules_client') as {
  DetectionRulesClient: jest.MockedClass<new (...args: unknown[]) => { enableRule: jest.Mock }>;
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const ROUTE_VERSION = '2023-10-31';
const TEST_RULE_ID = 'rule-object-id-1';

/** Minimal DetectionRuleResponse-shaped object for happy-path assertions. */
function makeEnabledRule() {
  return {
    id: TEST_RULE_ID,
    type: 'query',
    name: 'Test Rule',
    enabled: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    revision: 0,
  };
}

/** Builds a mock uiSettings client that returns `enabled` for the alerting v2 key. */
function makeUiSettings(enabled: boolean) {
  return {
    get: jest.fn(async (key: string) => {
      if (key === ALERTING_V2_ENABLED_SETTING) return enabled;
      return undefined;
    }),
  };
}

/** Builds the minimal request context for the handler. */
function makeContext(alertingEnabled: boolean) {
  return {
    core: Promise.resolve({
      uiSettings: {
        globalClient: makeUiSettings(alertingEnabled),
      },
    }),
  };
}

/**
 * Registers the route and returns the captured handler plus test doubles.
 *
 * The router is a Kibana mock router from `httpServiceMock.createRouter()`.
 * The `getRoute` call on the mock lets us reach the registered handler
 * without starting Kibana.
 */
function setup() {
  const router = httpServiceMock.createRouter();
  const logger = loggerMock.create();
  const mockEnableRule = jest.fn();
  const mockFrameworkClient = {};

  const getStartServices = jest.fn().mockResolvedValue([
    {},
    {
      alertingVTwo: {
        getRulesClientWithRequest: jest.fn().mockResolvedValue(mockFrameworkClient),
      },
    },
  ]);

  (DetectionRulesClient as jest.Mock).mockImplementation(() => ({
    enableRule: mockEnableRule,
  }));

  registerEnableRuleRoute(
    router as unknown as Parameters<typeof registerEnableRuleRoute>[0],
    getStartServices as never,
    logger
  );

  const registeredRoute = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULE_ENABLE_PATH);
  const routeHandler = registeredRoute.versions[ROUTE_VERSION].handler;
  const response = httpServerMock.createResponseFactory();

  return { router, logger, mockEnableRule, getStartServices, routeHandler, response };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/detection_engine/v2/rules/{id}/_enable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Route registration
  // -------------------------------------------------------------------------

  describe('route registration', () => {
    it('registers on the correct path with POST method', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();

      registerEnableRuleRoute(
        router as unknown as Parameters<typeof registerEnableRuleRoute>[0],
        getStartServices as never,
        logger
      );

      const route = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULE_ENABLE_PATH);
      expect(route).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();

      registerEnableRuleRoute(
        router as unknown as Parameters<typeof registerEnableRuleRoute>[0],
        getStartServices as never,
        logger
      );

      const route = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULE_ENABLE_PATH);
      expect(route.versions[ROUTE_VERSION]).toBeDefined();
    });

    it('requires the rules-all privilege', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();

      registerEnableRuleRoute(
        router as unknown as Parameters<typeof registerEnableRuleRoute>[0],
        getStartServices as never,
        logger
      );

      // httpServiceMock.createRouter() stores route config so we can verify privileges.
      const versionedPost = router.versioned.post as jest.Mock;
      const [routeConfig] = versionedPost.mock.calls[0];
      expect(routeConfig.security.authz.requiredPrivileges).toContain('rules-all');
    });
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('handler — happy path', () => {
    it('returns 200 with the updated rule body', async () => {
      const { mockEnableRule, routeHandler, response } = setup();
      const rule = makeEnabledRule();
      mockEnableRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_enable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
      expect(mockEnableRule).toHaveBeenCalledWith(TEST_RULE_ID);
    });

    it('passes the rule id to client.enableRule', async () => {
      const { mockEnableRule, routeHandler, response } = setup();
      mockEnableRule.mockResolvedValue(makeEnabledRule());

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/specific-rule-id/_enable`,
        params: { id: 'specific-rule-id' },
      });

      await routeHandler(makeContext(true), request, response);

      expect(mockEnableRule).toHaveBeenCalledWith('specific-rule-id');
    });
  });

  // -------------------------------------------------------------------------
  // Redundant toggle (re-enabling already-enabled rule)
  // -------------------------------------------------------------------------

  describe('handler — redundant toggle', () => {
    it('succeeds when re-enabling an already-enabled rule (no short-circuit)', async () => {
      const { mockEnableRule, routeHandler, response } = setup();
      // The client returns the still-enabled rule without error — same as
      // enabling a disabled one.  The route must not add a short-circuit.
      const alreadyEnabledRule = { ...makeEnabledRule(), enabled: true };
      mockEnableRule.mockResolvedValue(alreadyEnabledRule);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_enable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      // No error thrown — the redundant enable returns 200 like any enable.
      expect(response.ok).toHaveBeenCalledWith({ body: alreadyEnabledRule });
      expect(mockEnableRule).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 404 posture
  // -------------------------------------------------------------------------

  describe('handler — 404 posture', () => {
    it('returns 404 RULE_NOT_FOUND when the rule does not exist', async () => {
      const { mockEnableRule, routeHandler, response } = setup();
      mockEnableRule.mockRejectedValue(
        Boom.notFound('Detection rule with id "missing" not found', {
          code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/missing/_enable`,
        params: { id: 'missing' },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_NOT_FOUND }),
          bypassErrorFormat: true,
        })
      );
    });

    it('returns 404 RULE_NOT_FOUND for a rule outside the API scope', async () => {
      const { mockEnableRule, routeHandler, response } = setup();
      // The client's scope check treats foreign rules as non-existent.
      mockEnableRule.mockRejectedValue(
        Boom.notFound('Detection rule with id "foreign" not found', {
          code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/foreign/_enable`,
        params: { id: 'foreign' },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_NOT_FOUND }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // 503 gate
  // -------------------------------------------------------------------------

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED when alerting:v2:enabled is off', async () => {
      const { mockEnableRule, routeHandler, response } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_enable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.ALERTING_DISABLED }),
        })
      );
      // The client must not be called when alerting is disabled.
      expect(mockEnableRule).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Unexpected errors
  // -------------------------------------------------------------------------

  describe('handler — unexpected errors', () => {
    it('converts a plain Error to a 500 INTERNAL_SERVER_ERROR', async () => {
      const { mockEnableRule, routeHandler, response } = setup();
      mockEnableRule.mockRejectedValue(new Error('Unexpected failure'));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_enable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          body: expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' }),
        })
      );
    });
  });
});
