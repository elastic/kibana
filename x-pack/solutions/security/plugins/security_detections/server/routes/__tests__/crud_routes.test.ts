/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.6 — CRUD route unit tests.
 *
 * Covers registration (method, path, version, access, stability, privileges)
 * and handler behaviour (happy paths, each named error code, and the 503 gate)
 * for:
 *   POST   /api/detection_engine/v2/rules          createRule
 *   PUT    /api/detection_engine/v2/rules/{id}     replaceRule
 *   PATCH  /api/detection_engine/v2/rules/{id}     patchRule
 *   DELETE /api/detection_engine/v2/rules/{id}     deleteRule
 *
 * All framework and client calls are mocked.  No Kibana boot required.
 *
 * Ref: rule-crud-api.md "The endpoints", "Conventions every endpoint shares",
 *      "Create a rule", "Replace a rule with PUT", "Patch a rule with PATCH",
 *      "Delete a rule", "Validation layering"
 *
 * Implementation plan: Step 8.6
 */

import Boom from '@hapi/boom';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { DETECTION_ERROR_CODES } from '../../detection_rules_client';
import {
  registerCreateRuleRoute,
  registerReplaceRuleRoute,
  registerPatchRuleRoute,
  registerDeleteRuleRoute,
} from '../crud_routes';
import {
  DETECTION_ENGINE_V2_RULES_PATH,
  DETECTION_ENGINE_V2_RULE_PATH,
  ALERTING_V2_ENABLED_SETTING,
  detectionOnRequestValidationError,
} from '../detection_route_helpers';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock('../../detection_rules_client');
const { DetectionRulesClient } = jest.requireMock('../../detection_rules_client') as {
  DetectionRulesClient: jest.MockedClass<
    new (...args: unknown[]) => {
      createRule: jest.Mock;
      replaceRule: jest.Mock;
      patchRule: jest.Mock;
      deleteRule: jest.Mock;
    }
  >;
};

// ---------------------------------------------------------------------------
// Common constants
// ---------------------------------------------------------------------------

const API_VERSION = '2023-10-31';
const TEST_RULE_ID = 'test-rule-id-abc123';

// ---------------------------------------------------------------------------
// Shared builder helpers
// ---------------------------------------------------------------------------

/** Minimal query rule create payload that passes the route schema. */
function makeCreateBody() {
  return {
    type: 'query' as const,
    name: 'My Detection Rule',
    description: 'Detects something suspicious.',
    severity: 'medium' as const,
    risk_score: 47,
    index: ['logs-*'],
    query: 'process.name: suspicious',
    language: 'kuery' as const,
  };
}

/** Minimal query rule update payload (PUT). */
function makeUpdateBody() {
  return { ...makeCreateBody() };
}

/** Minimal patch payload (PATCH). */
function makePatchBody() {
  return { name: 'Renamed Rule' };
}

/** A minimal response rule as returned by the client. */
function makeMinimalRule() {
  return {
    id: TEST_RULE_ID,
    type: 'query',
    name: 'My Detection Rule',
    description: 'Detects something suspicious.',
    severity: 'medium',
    risk_score: 47,
    enabled: false,
    tags: [],
    index: ['logs-*'],
    query: 'process.name: suspicious',
    language: 'kuery',
    source: { type: 'internal', version: 1 },
    revision: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  };
}

/** Mock uiSettings client. When `enabled` is false the 503 gate fires. */
function makeUiSettings(enabled: boolean) {
  return {
    get: jest.fn(async (key: string) => {
      if (key === ALERTING_V2_ENABLED_SETTING) return enabled;
      return undefined;
    }),
  };
}

/** Minimal request handler context with controllable alerting gate. */
function makeContext(alertingEnabled: boolean) {
  return {
    core: Promise.resolve({
      uiSettings: { globalClient: makeUiSettings(alertingEnabled) },
    }),
  };
}

/**
 * Build a `getStartServices` mock that returns a mock alertingVTwo start
 * contract exposing `getRulesClientWithRequest`.
 */
function makeGetStartServices() {
  return jest.fn().mockResolvedValue([
    {},
    {
      alertingVTwo: {
        getRulesClientWithRequest: jest.fn().mockResolvedValue({}),
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// POST /rules — create a rule
// ---------------------------------------------------------------------------

describe('POST /api/detection_engine/v2/rules — create rule', () => {
  function setup() {
    const router = httpServiceMock.createRouter();
    const logger = loggerMock.create();
    const getStartServices = makeGetStartServices();
    const mockCreateRule = jest.fn();

    (DetectionRulesClient as jest.Mock).mockImplementation(() => ({
      createRule: mockCreateRule,
    }));

    registerCreateRuleRoute(
      router as unknown as Parameters<typeof registerCreateRuleRoute>[0],
      getStartServices as never,
      logger
    );

    const registeredRoute = router.versioned.getRoute('post', DETECTION_ENGINE_V2_RULES_PATH);
    const routeHandler = registeredRoute.versions[API_VERSION].handler;
    const response = httpServerMock.createResponseFactory();

    return { router, registeredRoute, routeHandler, response, mockCreateRule };
  }

  describe('route registration', () => {
    it('registers on the correct path with POST method', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.versions[API_VERSION]).toBeDefined();
    });

    it('declares access: public', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.access).toBe('public');
    });

    it('declares stability: experimental', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.options?.availability?.stability).toBe('experimental');
    });

    it('requires rules-all privilege', () => {
      const { registeredRoute } = setup();
      // RouteAuthz is a union (AuthzEnabled | AuthzDisabled); cast to access requiredPrivileges.
      const authz = registeredRoute.config.security?.authz as { requiredPrivileges?: string[] };
      expect(authz?.requiredPrivileges).toContain('rules-all');
    });

    it('wires detectionOnRequestValidationError into the validate config', () => {
      const { registeredRoute } = setup();
      const versionConfig = registeredRoute.versions[API_VERSION].config as {
        validate?: { onRequestValidationError?: unknown };
      };
      expect(versionConfig.validate?.onRequestValidationError).toBe(
        detectionOnRequestValidationError
      );
    });
  });

  describe('handler — happy path', () => {
    it('returns 201 with the created rule', async () => {
      const { routeHandler, response, mockCreateRule } = setup();
      const rule = makeMinimalRule();
      mockCreateRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        body: makeCreateBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.created).toHaveBeenCalledWith({ body: rule });
      expect(mockCreateRule).toHaveBeenCalledWith(request.body);
    });
  });

  describe('handler — 409 on duplicate rule_id', () => {
    it('returns 409 RULE_ALREADY_EXISTS when the signature id is taken', async () => {
      const { routeHandler, response, mockCreateRule } = setup();
      mockCreateRule.mockRejectedValue(
        Boom.conflict('Rule already exists', { code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        body: { ...makeCreateBody(), rule_id: 'existing-sig-id' },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS }),
        })
      );
    });
  });

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED and does not call the client', async () => {
      const { routeHandler, response, mockCreateRule } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        body: makeCreateBody(),
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.ALERTING_DISABLED }),
        })
      );
      expect(mockCreateRule).not.toHaveBeenCalled();
    });
  });

  describe('handler — generic error', () => {
    it('boomifies a plain Error to 500', async () => {
      const { routeHandler, response, mockCreateRule } = setup();
      mockCreateRule.mockRejectedValue(new Error('Unexpected failure'));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: DETECTION_ENGINE_V2_RULES_PATH,
        body: makeCreateBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// PUT /rules/{id} — replace a rule
// ---------------------------------------------------------------------------

describe('PUT /api/detection_engine/v2/rules/{id} — replace rule', () => {
  function setup() {
    const router = httpServiceMock.createRouter();
    const logger = loggerMock.create();
    const getStartServices = makeGetStartServices();
    const mockReplaceRule = jest.fn();

    (DetectionRulesClient as jest.Mock).mockImplementation(() => ({
      replaceRule: mockReplaceRule,
    }));

    registerReplaceRuleRoute(
      router as unknown as Parameters<typeof registerReplaceRuleRoute>[0],
      getStartServices as never,
      logger
    );

    const registeredRoute = router.versioned.getRoute('put', DETECTION_ENGINE_V2_RULE_PATH);
    const routeHandler = registeredRoute.versions[API_VERSION].handler;
    const response = httpServerMock.createResponseFactory();

    return { router, registeredRoute, routeHandler, response, mockReplaceRule };
  }

  describe('route registration', () => {
    it('registers on the correct path with PUT method', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.versions[API_VERSION]).toBeDefined();
    });

    it('declares access: public', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.access).toBe('public');
    });

    it('declares stability: experimental', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.options?.availability?.stability).toBe('experimental');
    });

    it('requires rules-all privilege', () => {
      const { registeredRoute } = setup();
      // RouteAuthz is a union (AuthzEnabled | AuthzDisabled); cast to access requiredPrivileges.
      const authz = registeredRoute.config.security?.authz as { requiredPrivileges?: string[] };
      expect(authz?.requiredPrivileges).toContain('rules-all');
    });

    it('wires detectionOnRequestValidationError into the validate config', () => {
      const { registeredRoute } = setup();
      const versionConfig = registeredRoute.versions[API_VERSION].config as {
        validate?: { onRequestValidationError?: unknown };
      };
      expect(versionConfig.validate?.onRequestValidationError).toBe(
        detectionOnRequestValidationError
      );
    });
  });

  describe('handler — happy path', () => {
    it('returns 200 with the replaced rule', async () => {
      const { routeHandler, response, mockReplaceRule } = setup();
      const rule = makeMinimalRule();
      mockReplaceRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makeUpdateBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
      expect(mockReplaceRule).toHaveBeenCalledWith(TEST_RULE_ID, request.body);
    });
  });

  describe('handler — 404 on missing or out-of-scope rule', () => {
    it('returns 404 RULE_NOT_FOUND when the rule does not exist', async () => {
      const { routeHandler, response, mockReplaceRule } = setup();
      mockReplaceRule.mockRejectedValue(
        Boom.notFound('Rule not found', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makeUpdateBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_NOT_FOUND }),
        })
      );
    });

    it('returns 404 for an out-of-scope rule (not a Detection rule)', async () => {
      const { routeHandler, response, mockReplaceRule } = setup();
      mockReplaceRule.mockRejectedValue(
        Boom.notFound('Rule is out of scope', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: `/api/detection_engine/v2/rules/foreign-id`,
        params: { id: 'foreign-id' },
        body: makeUpdateBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('handler — 409 on type change', () => {
    it('returns 409 RULE_TYPE_IMMUTABLE when the client rejects a type-change PUT', async () => {
      // The client throws RULE_TYPE_IMMUTABLE for a type change (not
      // RULE_VERSION_CONFLICT, which is reserved for OCC conflicts).
      // The route is thin: it passes any 409 through unchanged.
      const { routeHandler, response, mockReplaceRule } = setup();
      mockReplaceRule.mockRejectedValue(
        Boom.conflict('Cannot change rule type', {
          code: DETECTION_ERROR_CODES.RULE_TYPE_IMMUTABLE,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makeUpdateBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          body: expect.objectContaining({ code: DETECTION_ERROR_CODES.RULE_TYPE_IMMUTABLE }),
        })
      );
    });
  });

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED and skips the client', async () => {
      const { routeHandler, response, mockReplaceRule } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makeUpdateBody(),
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
      expect(mockReplaceRule).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// PATCH /rules/{id} — patch a rule
// ---------------------------------------------------------------------------

describe('PATCH /api/detection_engine/v2/rules/{id} — patch rule', () => {
  function setup() {
    const router = httpServiceMock.createRouter();
    const logger = loggerMock.create();
    const getStartServices = makeGetStartServices();
    const mockPatchRule = jest.fn();

    (DetectionRulesClient as jest.Mock).mockImplementation(() => ({
      patchRule: mockPatchRule,
    }));

    registerPatchRuleRoute(
      router as unknown as Parameters<typeof registerPatchRuleRoute>[0],
      getStartServices as never,
      logger
    );

    const registeredRoute = router.versioned.getRoute('patch', DETECTION_ENGINE_V2_RULE_PATH);
    const routeHandler = registeredRoute.versions[API_VERSION].handler;
    const response = httpServerMock.createResponseFactory();

    return { router, registeredRoute, routeHandler, response, mockPatchRule };
  }

  describe('route registration', () => {
    it('registers on the correct path with PATCH method', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.versions[API_VERSION]).toBeDefined();
    });

    it('declares access: public', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.access).toBe('public');
    });

    it('declares stability: experimental', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.options?.availability?.stability).toBe('experimental');
    });

    it('requires rules-all privilege', () => {
      const { registeredRoute } = setup();
      // RouteAuthz is a union (AuthzEnabled | AuthzDisabled); cast to access requiredPrivileges.
      const authz = registeredRoute.config.security?.authz as { requiredPrivileges?: string[] };
      expect(authz?.requiredPrivileges).toContain('rules-all');
    });

    it('wires detectionOnRequestValidationError into the validate config', () => {
      const { registeredRoute } = setup();
      const versionConfig = registeredRoute.versions[API_VERSION].config as {
        validate?: { onRequestValidationError?: unknown };
      };
      expect(versionConfig.validate?.onRequestValidationError).toBe(
        detectionOnRequestValidationError
      );
    });
  });

  describe('handler — happy path', () => {
    it('returns 200 with the patched rule', async () => {
      const { routeHandler, response, mockPatchRule } = setup();
      const rule = { ...makeMinimalRule(), name: 'Renamed Rule' };
      mockPatchRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'patch',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makePatchBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
      expect(mockPatchRule).toHaveBeenCalledWith(TEST_RULE_ID, request.body);
    });

    it('accepts an empty body (no-op patch)', async () => {
      const { routeHandler, response, mockPatchRule } = setup();
      const rule = makeMinimalRule();
      mockPatchRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'patch',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: {},
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
    });
  });

  describe('handler — 400 on merged validation failure', () => {
    it('returns 400 INVALID_RULE_DATA when a field belongs to the wrong type', async () => {
      const { routeHandler, response, mockPatchRule } = setup();
      mockPatchRule.mockRejectedValue(
        Boom.badRequest('Patch validation failed: threshold: unrecognized_keys', {
          code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'patch',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: { name: 'New Name', threshold: { field: ['host.name'], value: 5 } },
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

  describe('handler — 404', () => {
    it('returns 404 RULE_NOT_FOUND when the rule does not exist', async () => {
      const { routeHandler, response, mockPatchRule } = setup();
      mockPatchRule.mockRejectedValue(
        Boom.notFound('Rule not found', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'patch',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makePatchBody(),
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED and skips the client', async () => {
      const { routeHandler, response, mockPatchRule } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'patch',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
        body: makePatchBody(),
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
      expect(mockPatchRule).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /rules/{id} — delete a rule
// ---------------------------------------------------------------------------

describe('DELETE /api/detection_engine/v2/rules/{id} — delete rule', () => {
  function setup() {
    const router = httpServiceMock.createRouter();
    const logger = loggerMock.create();
    const getStartServices = makeGetStartServices();
    const mockDeleteRule = jest.fn();

    (DetectionRulesClient as jest.Mock).mockImplementation(() => ({
      deleteRule: mockDeleteRule,
    }));

    registerDeleteRuleRoute(
      router as unknown as Parameters<typeof registerDeleteRuleRoute>[0],
      getStartServices as never,
      logger
    );

    const registeredRoute = router.versioned.getRoute('delete', DETECTION_ENGINE_V2_RULE_PATH);
    const routeHandler = registeredRoute.versions[API_VERSION].handler;
    const response = httpServerMock.createResponseFactory();

    return { router, registeredRoute, routeHandler, response, mockDeleteRule };
  }

  describe('route registration', () => {
    it('registers on the correct path with DELETE method', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.versions[API_VERSION]).toBeDefined();
    });

    it('declares access: public', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.access).toBe('public');
    });

    it('declares stability: experimental', () => {
      const { registeredRoute } = setup();
      expect(registeredRoute.config.options?.availability?.stability).toBe('experimental');
    });

    it('requires rules-all privilege', () => {
      const { registeredRoute } = setup();
      // RouteAuthz is a union (AuthzEnabled | AuthzDisabled); cast to access requiredPrivileges.
      const authz = registeredRoute.config.security?.authz as { requiredPrivileges?: string[] };
      expect(authz?.requiredPrivileges).toContain('rules-all');
    });

    it('wires detectionOnRequestValidationError into the validate config', () => {
      const { registeredRoute } = setup();
      const versionConfig = registeredRoute.versions[API_VERSION].config as {
        validate?: { onRequestValidationError?: unknown };
      };
      expect(versionConfig.validate?.onRequestValidationError).toBe(
        detectionOnRequestValidationError
      );
    });
  });

  describe('handler — happy path', () => {
    it("returns 200 with the deleted rule's last state", async () => {
      const { routeHandler, response, mockDeleteRule } = setup();
      const rule = makeMinimalRule();
      mockDeleteRule.mockResolvedValue(rule);

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: rule });
      expect(mockDeleteRule).toHaveBeenCalledWith(TEST_RULE_ID);
    });
  });

  describe('handler — 404', () => {
    it('returns 404 RULE_NOT_FOUND when the rule does not exist', async () => {
      const { routeHandler, response, mockDeleteRule } = setup();
      mockDeleteRule.mockRejectedValue(
        Boom.notFound('Rule not found', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_NOT_FOUND }),
        })
      );
    });

    it('returns 404 for an out-of-scope rule (not a Detection rule)', async () => {
      const { routeHandler, response, mockDeleteRule } = setup();
      mockDeleteRule.mockRejectedValue(
        Boom.notFound('Rule is out of scope', { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND })
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/api/detection_engine/v2/rules/foreign-id`,
        params: { id: 'foreign-id' },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED and skips the client', async () => {
      const { routeHandler, response, mockDeleteRule } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
      expect(mockDeleteRule).not.toHaveBeenCalled();
    });
  });

  describe('handler — generic error', () => {
    it('boomifies a plain Error to 500', async () => {
      const { routeHandler, response, mockDeleteRule } = setup();
      mockDeleteRule.mockRejectedValue(new Error('Unexpected failure'));

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/api/detection_engine/v2/rules/${TEST_RULE_ID}`,
        params: { id: TEST_RULE_ID },
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});
