/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.8 — POST /api/detection_engine/v2/rules/{id}/_disable route unit tests.
 *
 * Covers:
 *   - Route registration: path, method, version, privilege.
 *   - Happy-path handler: returns the updated rule body on 200.
 *   - 404 posture: missing id and out-of-scope rule both return 404 RULE_NOT_FOUND.
 *   - Redundant toggle: re-disabling an already-disabled rule succeeds (no short-circuit).
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
  registerDisableRuleRoute,
  DETECTION_ENGINE_V2_RULE_DISABLE_PATH,
} from '../disable_rule_route';
import { ALERTING_V2_ENABLED_SETTING } from '../../detection_route_helpers';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../detection_rules_client');
const { DetectionRulesClient } = jest.requireMock('../../../detection_rules_client') as {
  DetectionRulesClient: jest.MockedClass<new (...args: unknown[]) => { disableRule: jest.Mock }>;
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const ROUTE_VERSION = '2023-10-31';
const TEST_RULE_ID = 'rule-object-id-2';

/** Minimal DetectionRuleResponse-shaped object for happy-path assertions. */
function makeDisabledRule() {
  return {
    id: TEST_RULE_ID,
    type: 'query',
    name: 'Test Rule',
    enabled: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-03T00:00:00.000Z',
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
        client: makeUiSettings(alertingEnabled),
      },
    }),
  };
}

/**
 * Registers the route and returns the captured handler plus test doubles.
 */
function setup() {
  const router = httpServiceMock.createRouter();
  const logger = loggerMock.create();
  const mockDisableRule = jest.fn();
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
    disableRule: mockDisableRule,
  }));

  registerDisableRuleRoute(
    router as unknown as Parameters<typeof registerDisableRuleRoute>[0],
    getStartServices as never,
    logger
  );

  const registeredRoute = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULE_DISABLE_PATH);
  const routeHandler = registeredRoute.versions[ROUTE_VERSION].handler;
  const response = httpServerMock.createResponseFactory();

  return { router, logger, mockDisableRule, getStartServices, routeHandler, response };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/detection_engine/v2/rules/{id}/_disable', () => {
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

      registerDisableRuleRoute(
        router as unknown as Parameters<typeof registerDisableRuleRoute>[0],
        getStartServices as never,
        logger
      );

      const route = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULE_DISABLE_PATH);
      expect(route).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();

      registerDisableRuleRoute(
        router as unknown as Parameters<typeof registerDisableRuleRoute>[0],
        getStartServices as never,
        logger
      );

      const route = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULE_DISABLE_PATH);
      expect(route.versions[ROUTE_VERSION]).toBeDefined();
    });

    it('requires the rules-all privilege', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();

      registerDisableRuleRoute(
        router as unknown as Parameters<typeof registerDisableRuleRoute>[0],
        getStartServices as never,
        logger
      );

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
      const { mockDisableRule, routeHandler, response } = setup();
      const rule = makeDisabledRule();
      mockDisableRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_disable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
      expect(mockDisableRule).toHaveBeenCalledWith(TEST_RULE_ID);
    });

    it('passes the rule id to client.disableRule', async () => {
      const { mockDisableRule, routeHandler, response } = setup();
      mockDisableRule.mockResolvedValue(makeDisabledRule());

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/another-rule-id/_disable`,
        params: { id: 'another-rule-id' },
      });

      await routeHandler(makeContext(true), request, response);

      expect(mockDisableRule).toHaveBeenCalledWith('another-rule-id');
    });
  });

  // -------------------------------------------------------------------------
  // Redundant toggle (re-disabling already-disabled rule)
  // -------------------------------------------------------------------------

  describe('handler — redundant toggle', () => {
    it('succeeds when re-disabling an already-disabled rule (no short-circuit)', async () => {
      const { mockDisableRule, routeHandler, response } = setup();
      // The client returns the still-disabled rule without error.
      // The route must not add a short-circuit or a 409.
      const alreadyDisabledRule = { ...makeDisabledRule(), enabled: false };
      mockDisableRule.mockResolvedValue(alreadyDisabledRule);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_disable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: alreadyDisabledRule });
      expect(mockDisableRule).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 404 posture
  // -------------------------------------------------------------------------

  describe('handler — 404 posture', () => {
    it('returns 404 RULE_NOT_FOUND when the rule does not exist', async () => {
      const { mockDisableRule, routeHandler, response } = setup();
      mockDisableRule.mockRejectedValue(
        Boom.notFound('Detection rule with id "missing" not found', {
          code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/missing/_disable`,
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
      const { mockDisableRule, routeHandler, response } = setup();
      mockDisableRule.mockRejectedValue(
        Boom.notFound('Detection rule with id "foreign" not found', {
          code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/foreign/_disable`,
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
      const { mockDisableRule, routeHandler, response } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_disable`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.ALERTING_DISABLED }),
        })
      );
      expect(mockDisableRule).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Unexpected errors
  // -------------------------------------------------------------------------

  describe('handler — unexpected errors', () => {
    it('converts a plain Error to a 500 INTERNAL_SERVER_ERROR', async () => {
      const { mockDisableRule, routeHandler, response } = setup();
      mockDisableRule.mockRejectedValue(new Error('Unexpected failure'));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}/_disable`,
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
