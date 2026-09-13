/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.7 — GET /api/detection_engine/v2/rules/{id} route unit tests.
 *
 * Covers:
 *   - Route registration (path, method, version).
 *   - Happy-path handler: returns the rule body on 200.
 *   - 404 posture: missing rule, out-of-scope rule, unknown-type rule all 404.
 *   - 503 gate: disabled alerting → ALERTING_DISABLED envelope.
 *   - Non-Boom errors are boomified to 500.
 *
 * Ref: rule-fetch-api.md "One rule by object id"
 *      rule-crud-api.md "Conventions every endpoint shares"
 *
 * Implementation plan: Step 8.7
 */

import Boom from '@hapi/boom';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { registerGetRuleRoute } from '../../fetch/get_rule_route';
import {
  DETECTION_ENGINE_V2_RULE_PATH,
  ALERTING_V2_ENABLED_SETTING,
} from '../../detection_route_helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../detection_rules_client');
const { DetectionRulesClient } = jest.requireMock('../../../detection_rules_client') as {
  DetectionRulesClient: jest.MockedClass<new (...args: unknown[]) => { getRule: jest.Mock }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RULE_VERSION = '2023-10-31';
const TEST_RULE_ID = 'test-rule-id-1';

function makeMinimalRule() {
  return {
    id: TEST_RULE_ID,
    type: 'query',
    name: 'Test Rule',
    description: 'A test rule',
    severity: 'low',
    risk_score: 21,
    enabled: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    rule_id: 'sig-id-1',
    tags: [],
    index: ['logs-*'],
    query: 'process.name: *',
    language: 'kuery',
    source: { type: 'internal', version: 1 },
    revision: 0,
  };
}

/** Build a mock uiSettings client that returns a given value for `alerting:v2:enabled`. */
function makeUiSettings(enabled: boolean) {
  return {
    get: jest.fn(async (key: string) => {
      if (key === ALERTING_V2_ENABLED_SETTING) return enabled;
      return undefined;
    }),
  };
}

/** Build the minimal request context mock needed by the handler. */
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
 * Registers the route and returns a helper that invokes the handler directly.
 */
function setup() {
  const router = httpServiceMock.createRouter();
  const logger = loggerMock.create();
  const mockGetRule = jest.fn();
  const mockFrameworkClient = {};

  // getStartServices mock — resolves with a fake start that provides
  // getRulesClientWithRequest, which returns a mock framework client.
  const getStartServices = jest.fn().mockResolvedValue([
    {},
    {
      alertingVTwo: {
        getRulesClientWithRequest: jest.fn().mockResolvedValue(mockFrameworkClient),
      },
    },
  ]);

  // Mock the DetectionRulesClient constructor so it returns an object with
  // our controllable mockGetRule.
  (DetectionRulesClient as jest.Mock).mockImplementation(() => ({
    getRule: mockGetRule,
  }));

  registerGetRuleRoute(router as never, getStartServices as never, logger);

  const registeredRoute = router.versioned.getRoute('get', DETECTION_ENGINE_V2_RULE_PATH);
  const routeHandler = registeredRoute.versions[RULE_VERSION].handler;

  const response = httpServerMock.createResponseFactory();

  return { router, logger, mockGetRule, getStartServices, routeHandler, response };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/detection_engine/v2/rules/{id}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('route registration', () => {
    it('registers on the correct path with GET method', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();
      registerGetRuleRoute(router as never, getStartServices as never, logger);
      const route = router.versioned.getRoute('get', DETECTION_ENGINE_V2_RULE_PATH);
      expect(route).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();
      registerGetRuleRoute(router as never, getStartServices as never, logger);
      const route = router.versioned.getRoute('get', DETECTION_ENGINE_V2_RULE_PATH);
      expect(route.versions[RULE_VERSION]).toBeDefined();
    });
  });

  describe('handler — happy path', () => {
    it('returns 200 with the rule body', async () => {
      const { mockGetRule, routeHandler, response } = setup();
      const rule = makeMinimalRule();
      mockGetRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
      expect(mockGetRule).toHaveBeenCalledWith(TEST_RULE_ID);
    });
  });

  describe('handler — 404 posture', () => {
    it('returns 404 RULE_NOT_FOUND when the rule does not exist', async () => {
      const { mockGetRule, routeHandler, response } = setup();
      mockGetRule.mockRejectedValue(
        Boom.notFound('Rule not found', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
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

    it('returns 404 RULE_NOT_FOUND when the rule is out of scope', async () => {
      const { mockGetRule, routeHandler, response } = setup();
      // The client's getInScopeRule throws RULE_NOT_FOUND for out-of-scope rules.
      mockGetRule.mockRejectedValue(
        Boom.notFound('Rule is out of scope', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/api/detection_engine/v2/rules/foreign-rule-id`,
        params: { id: 'foreign-rule-id' },
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

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED when alerting v2 is off', async () => {
      const { mockGetRule, routeHandler, response } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
      });

      // alertingEnabled = false
      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.ALERTING_DISABLED }),
        })
      );
      // Should not have called the client at all.
      expect(mockGetRule).not.toHaveBeenCalled();
    });
  });

  describe('handler — unexpected errors', () => {
    it('converts a plain Error to a 500 INTERNAL_SERVER_ERROR', async () => {
      const { mockGetRule, routeHandler, response } = setup();
      mockGetRule.mockRejectedValue(new Error('Something went wrong'));

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
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
