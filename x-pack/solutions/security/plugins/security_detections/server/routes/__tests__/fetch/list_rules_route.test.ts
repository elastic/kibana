/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.7 — GET /api/detection_engine/v2/rules route unit tests.
 *
 * Covers:
 *   - Route registration (path, method, version).
 *   - Query schema validation:
 *       - Valid params accepted.
 *       - `sort_field: severity` rejected (the key design constraint).
 *       - `per_page` coerced from string and capped at 1000.
 *       - Array params accepted as single value or repeated.
 *   - Happy-path handler: response shape `{ page, per_page, total, data }`.
 *   - `page`/`per_page` defaults applied (1 and 20 respectively).
 *   - 503 gate.
 *   - 400 on invalid sort_field via the client.
 *
 * Ref: rule-fetch-api.md "The list endpoint", "Filtering", "Searching and
 *      sorting", "Pagination and the response shape", "Field limitation"
 *
 * Implementation plan: Step 8.7
 */

import Boom from '@hapi/boom';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { registerListRulesRoute, listRulesQuerySchema } from '../../fetch/list_rules_route';
import {
  DETECTION_ENGINE_V2_RULES_PATH,
  ALERTING_V2_ENABLED_SETTING,
} from '../../detection_route_helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../detection_rules_client');
const { DetectionRulesClient } = jest.requireMock('../../../detection_rules_client') as {
  DetectionRulesClient: jest.MockedClass<new (...args: unknown[]) => { listRules: jest.Mock }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RULE_VERSION = '2023-10-31';

function makeUiSettings(enabled: boolean) {
  return {
    get: jest.fn(async (key: string) => {
      if (key === ALERTING_V2_ENABLED_SETTING) return enabled;
      return undefined;
    }),
  };
}

function makeContext(alertingEnabled: boolean) {
  return {
    core: Promise.resolve({
      uiSettings: { globalClient: makeUiSettings(alertingEnabled) },
    }),
  };
}

function makeMinimalListResult(overrides = {}) {
  return { page: 1, per_page: 20, total: 0, data: [], ...overrides };
}

function setup() {
  const router = httpServiceMock.createRouter();
  const logger = loggerMock.create();
  const mockListRules = jest.fn();
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
    listRules: mockListRules,
  }));

  registerListRulesRoute(router as never, getStartServices as never, logger);

  const registeredRoute = router.versioned.getRoute('get', DETECTION_ENGINE_V2_RULES_PATH);
  const routeHandler = registeredRoute.versions[RULE_VERSION].handler;
  const response = httpServerMock.createResponseFactory();

  return { router, logger, mockListRules, getStartServices, routeHandler, response };
}

// ---------------------------------------------------------------------------
// Schema validation tests (pure, no HTTP)
// ---------------------------------------------------------------------------

describe('listRulesQuerySchema', () => {
  describe('sort_field', () => {
    it('accepts name', () => {
      const result = listRulesQuerySchema.safeParse({ sort_field: 'name' });
      expect(result.success).toBe(true);
    });

    it('accepts enabled', () => {
      const result = listRulesQuerySchema.safeParse({ sort_field: 'enabled' });
      expect(result.success).toBe(true);
    });

    it('accepts risk_score', () => {
      const result = listRulesQuerySchema.safeParse({ sort_field: 'risk_score' });
      expect(result.success).toBe(true);
    });

    it('rejects severity — the key design constraint from rule-fetch-api.md', () => {
      const result = listRulesQuerySchema.safeParse({ sort_field: 'severity' });
      expect(result.success).toBe(false);
    });

    it('rejects an arbitrary unknown string', () => {
      const result = listRulesQuerySchema.safeParse({ sort_field: 'created_at' });
      expect(result.success).toBe(false);
    });
  });

  describe('per_page', () => {
    it('accepts 20 (default)', () => {
      const result = listRulesQuerySchema.safeParse({ per_page: 20 });
      expect(result.success).toBe(true);
    });

    it('accepts the maximum 1000', () => {
      const result = listRulesQuerySchema.safeParse({ per_page: 1000 });
      expect(result.success).toBe(true);
    });

    it('rejects 1001 (over the cap)', () => {
      const result = listRulesQuerySchema.safeParse({ per_page: 1001 });
      expect(result.success).toBe(false);
    });

    it('coerces the string "100" to number 100', () => {
      const result = listRulesQuerySchema.safeParse({ per_page: '100' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.per_page).toBe(100);
      }
    });

    it('rejects per_page: 0', () => {
      const result = listRulesQuerySchema.safeParse({ per_page: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('type (array param)', () => {
    it('accepts a single type string', () => {
      const result = listRulesQuerySchema.safeParse({ type: 'query' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toEqual(['query']);
      }
    });

    it('accepts an array of types', () => {
      const result = listRulesQuerySchema.safeParse({ type: ['query', 'threshold'] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toEqual(['query', 'threshold']);
      }
    });

    it('rejects an unknown type', () => {
      const result = listRulesQuerySchema.safeParse({ type: 'eql' });
      expect(result.success).toBe(false);
    });
  });

  describe('severity (array param)', () => {
    it('accepts a single severity string', () => {
      const result = listRulesQuerySchema.safeParse({ severity: 'high' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toEqual(['high']);
      }
    });

    it('accepts an array of severities', () => {
      const result = listRulesQuerySchema.safeParse({ severity: ['low', 'critical'] });
      expect(result.success).toBe(true);
    });

    it('rejects an unknown severity', () => {
      const result = listRulesQuerySchema.safeParse({ severity: 'extreme' });
      expect(result.success).toBe(false);
    });
  });

  describe('enabled (boolean coercion)', () => {
    it('coerces the string "true" to boolean true', () => {
      const result = listRulesQuerySchema.safeParse({ enabled: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });

    it('coerces the string "false" to boolean false', () => {
      const result = listRulesQuerySchema.safeParse({ enabled: 'false' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });

    it('passes through a boolean true', () => {
      const result = listRulesQuerySchema.safeParse({ enabled: true });
      expect(result.success).toBe(true);
    });
  });

  it('accepts an empty object (all params optional)', () => {
    const result = listRulesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Route registration tests
// ---------------------------------------------------------------------------

describe('GET /api/detection_engine/v2/rules — registration', () => {
  it('registers on the correct path with GET method', () => {
    const router = httpServiceMock.createRouter();
    const logger = loggerMock.create();
    const getStartServices = jest.fn();
    registerListRulesRoute(router as never, getStartServices as never, logger);
    const route = router.versioned.getRoute('get', DETECTION_ENGINE_V2_RULES_PATH);
    expect(route).toBeDefined();
  });

  it('registers version 2023-10-31', () => {
    const router = httpServiceMock.createRouter();
    const logger = loggerMock.create();
    const getStartServices = jest.fn();
    registerListRulesRoute(router as never, getStartServices as never, logger);
    const route = router.versioned.getRoute('get', DETECTION_ENGINE_V2_RULES_PATH);
    expect(route.versions[RULE_VERSION]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Handler tests
// ---------------------------------------------------------------------------

describe('GET /api/detection_engine/v2/rules — handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('returns 200 with { page, per_page, total, data }', async () => {
      const { mockListRules, routeHandler, response } = setup();
      const listResult = makeMinimalListResult({
        page: 1,
        per_page: 20,
        total: 3,
        data: [{ id: 'r1' }],
      });
      mockListRules.mockResolvedValue(listResult);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        query: {},
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: listResult });
    });

    it('passes defaults page=1 and per_page=20 when not supplied', async () => {
      const { mockListRules, routeHandler, response } = setup();
      mockListRules.mockResolvedValue(makeMinimalListResult());

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        query: {},
      });

      await routeHandler(makeContext(true), request, response);

      const callArgs = mockListRules.mock.calls[0][0];
      expect(callArgs.page).toBe(1);
      expect(callArgs.per_page).toBe(20);
    });

    it('passes through custom page and per_page', async () => {
      const { mockListRules, routeHandler, response } = setup();
      mockListRules.mockResolvedValue(makeMinimalListResult({ page: 3, per_page: 50 }));

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        query: { page: 3, per_page: 50 },
      });

      await routeHandler(makeContext(true), request, response);

      const callArgs = mockListRules.mock.calls[0][0];
      expect(callArgs.page).toBe(3);
      expect(callArgs.per_page).toBe(50);
    });

    it('passes structured filter params to the client', async () => {
      const { mockListRules, routeHandler, response } = setup();
      mockListRules.mockResolvedValue(makeMinimalListResult());

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        query: {
          enabled: true,
          type: ['query'],
          severity: ['high', 'critical'],
          tags: ['os:windows'],
          rule_ids: ['sig-id-1'],
          search: 'powershell',
          sort_field: 'name',
          sort_order: 'asc',
        },
      });

      await routeHandler(makeContext(true), request, response);

      const callArgs = mockListRules.mock.calls[0][0];
      expect(callArgs.enabled).toBe(true);
      expect(callArgs.type).toEqual(['query']);
      expect(callArgs.severity).toEqual(['high', 'critical']);
      expect(callArgs.tags).toEqual(['os:windows']);
      expect(callArgs.rule_ids).toEqual(['sig-id-1']);
      expect(callArgs.search).toBe('powershell');
      expect(callArgs.sort_field).toBe('name');
      expect(callArgs.sort_order).toBe('asc');
    });
  });

  describe('503 gate', () => {
    it('returns 503 ALERTING_DISABLED when alerting v2 is off', async () => {
      const { mockListRules, routeHandler, response } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        query: {},
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.ALERTING_DISABLED }),
        })
      );
      expect(mockListRules).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('converts a Boom 400 with INVALID_RULE_DATA to the error envelope', async () => {
      // The client rejects severity-as-sort-field with Boom.badRequest.
      const { mockListRules, routeHandler, response } = setup();
      mockListRules.mockRejectedValue(
        Boom.badRequest("'severity' is not a valid sort field.", {
          code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        query: { sort_field: 'name' }, // valid at schema level, client rejects
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_RULE_DATA }),
        })
      );
    });
  });
});
