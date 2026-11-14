/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.7 — GET /api/detection_engine/v2/tags route unit tests.
 *
 * Covers:
 *   - Route registration (path, method, version).
 *   - Happy-path handler: response shape `{ tags: string[] }`.
 *   - Tags are scoped to detection rules only (via DetectionRulesClient).
 *   - 503 gate.
 *   - Error envelope on client failure.
 *
 * Ref: rule-fetch-api.md "The tags endpoint"
 *      rule-crud-api.md "Conventions every endpoint shares"
 *
 * Implementation plan: Step 8.7
 */

import Boom from '@hapi/boom';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { registerGetTagsRoute } from '../../fetch/get_tags_route';
import {
  DETECTION_ENGINE_V2_TAGS_PATH,
  ALERTING_V2_ENABLED_SETTING,
} from '../../detection_route_helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../detection_rules_client');
const { DetectionRulesClient } = jest.requireMock('../../../detection_rules_client') as {
  DetectionRulesClient: jest.MockedClass<
    new (...args: unknown[]) => { getDetectionTags: jest.Mock }
  >;
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

function setup() {
  const router = httpServiceMock.createRouter();
  const logger = loggerMock.create();
  const mockGetDetectionTags = jest.fn();
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
    getDetectionTags: mockGetDetectionTags,
  }));

  registerGetTagsRoute(router as never, getStartServices as never, logger);

  const registeredRoute = router.versioned.getRoute('get', DETECTION_ENGINE_V2_TAGS_PATH);
  const routeHandler = registeredRoute.versions[RULE_VERSION].handler;
  const response = httpServerMock.createResponseFactory();

  return { router, logger, mockGetDetectionTags, getStartServices, routeHandler, response };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/detection_engine/v2/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('route registration', () => {
    it('registers on the correct path with GET method', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();
      registerGetTagsRoute(router as never, getStartServices as never, logger);
      const route = router.versioned.getRoute('get', DETECTION_ENGINE_V2_TAGS_PATH);
      expect(route).toBeDefined();
    });

    it('registers version 2023-10-31', () => {
      const router = httpServiceMock.createRouter();
      const logger = loggerMock.create();
      const getStartServices = jest.fn();
      registerGetTagsRoute(router as never, getStartServices as never, logger);
      const route = router.versioned.getRoute('get', DETECTION_ENGINE_V2_TAGS_PATH);
      expect(route.versions[RULE_VERSION]).toBeDefined();
    });
  });

  describe('handler — happy path', () => {
    it('returns 200 with { tags: string[] }', async () => {
      const { mockGetDetectionTags, routeHandler, response } = setup();
      mockGetDetectionTags.mockResolvedValue(['os:windows', 'os:linux', 'team:threat-intel']);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_TAGS_PATH,
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { tags: ['os:windows', 'os:linux', 'team:threat-intel'] },
      });
    });

    it('returns 200 with { tags: [] } when there are no detection rules', async () => {
      const { mockGetDetectionTags, routeHandler, response } = setup();
      mockGetDetectionTags.mockResolvedValue([]);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_TAGS_PATH,
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: { tags: [] } });
    });

    it('delegates to DetectionRulesClient.getDetectionTags for scoped aggregation', async () => {
      // The scoping (ownership fragment) lives entirely inside DetectionRulesClient;
      // the route just calls the method and wraps the result.
      const { mockGetDetectionTags, routeHandler, response } = setup();
      mockGetDetectionTags.mockResolvedValue(['tag-a']);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_TAGS_PATH,
      });

      await routeHandler(makeContext(true), request, response);

      expect(mockGetDetectionTags).toHaveBeenCalledTimes(1);
    });
  });

  describe('handler — 503 gate', () => {
    it('returns 503 ALERTING_DISABLED when alerting v2 is off', async () => {
      const { mockGetDetectionTags, routeHandler, response } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_TAGS_PATH,
      });

      await routeHandler(makeContext(false), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: expect.objectContaining({ code: ALERTING_ERROR_CODES.ALERTING_DISABLED }),
        })
      );
      expect(mockGetDetectionTags).not.toHaveBeenCalled();
    });
  });

  describe('handler — error envelope', () => {
    it('maps a Boom error to the Alerting v2 error envelope', async () => {
      const { mockGetDetectionTags, routeHandler, response } = setup();
      mockGetDetectionTags.mockRejectedValue(Boom.internal('Aggregation failed'));

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_TAGS_PATH,
      });

      await routeHandler(makeContext(true), request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          body: expect.objectContaining({
            code: expect.any(String),
            error: expect.any(String),
            message: expect.any(String),
          }),
          bypassErrorFormat: true,
        })
      );
    });

    it('converts a plain Error to a 500 response', async () => {
      const { mockGetDetectionTags, routeHandler, response } = setup();
      mockGetDetectionTags.mockRejectedValue(new Error('Unexpected failure'));

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: DETECTION_ENGINE_V2_TAGS_PATH,
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
