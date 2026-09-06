/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import { mitreAttackDataClientMock } from '../services/mitre_attack_data_client/__mocks__/mitre_attack_data_client';
import {
  getMockMitreTactic,
  getMockMitreTechnique,
  getMockMitreSubtechnique,
} from '../mocks/mitre_entities.mock';
import { registerGetEntitiesRoute } from './get_entities';

describe('registerGetEntitiesRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: ReturnType<typeof mitreAttackDataClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    mockDataClient = mitreAttackDataClientMock.create();
    logger = loggerMock.create();
  });

  const registerRoute = () => {
    registerGetEntitiesRoute(router as any, logger);
  };

  const createContext = (
    getMitreDataClient: () => typeof mockDataClient | undefined = () => mockDataClient
  ) =>
    ({
      mitreAttack: Promise.resolve({ getMitreDataClient }),
    } as any);

  const getHandler = () =>
    router.versioned.getRoute('get', GET_MITRE_ENTITIES_URL).versions['1'].handler;

  describe('route registration', () => {
    it('registers GET at the correct path', () => {
      registerRoute();
      const routeConfig = router.versioned.get.mock.calls[0][0];
      expect(routeConfig.path).toBe(GET_MITRE_ENTITIES_URL);
    });

    it('registers with access: internal', () => {
      registerRoute();
      const routeConfig = router.versioned.get.mock.calls[0][0];
      expect(routeConfig.access).toBe('internal');
    });

    it('requires securitySolution privilege', () => {
      registerRoute();
      const routeConfig = router.versioned.get.mock.calls[0][0];
      expect(routeConfig.security?.authz).toEqual({
        requiredPrivileges: ['securitySolution'],
      });
    });
  });

  describe('handler', () => {
    it('returns 503 when getMitreDataClient returns undefined (start() not yet complete)', async () => {
      registerRoute();
      const handler = getHandler();
      const context = createContext(() => undefined);
      const request = httpServerMock.createKibanaRequest({ query: {} });

      await handler(context, request, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });

    it('happy path: strips description from all entity types, returns framework metadata', async () => {
      registerRoute();
      const handler = getHandler();
      const context = createContext();

      const tactic = getMockMitreTactic();
      const technique = getMockMitreTechnique();
      const subtechnique = getMockMitreSubtechnique();

      mockDataClient.list.mockResolvedValue({
        framework: 'enterprise',
        frameworkVersion: '15.1',
        tactics: [tactic],
        techniques: [technique],
        subtechniques: [subtechnique],
      });

      const request = httpServerMock.createKibanaRequest({ query: {} });
      await handler(context, request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledTimes(1);
      const { body } = (mockResponse.ok as jest.Mock).mock.calls[0][0];

      expect(body.framework).toBe('enterprise');
      expect(body.framework_version).toBe('15.1');

      expect(body.tactics).toHaveLength(1);
      expect(body.tactics[0]).not.toHaveProperty('description');
      expect(body.tactics[0].id).toBe(tactic.id);
      expect(body.tactics[0].name).toBe(tactic.name);

      expect(body.techniques).toHaveLength(1);
      expect(body.techniques[0]).not.toHaveProperty('description');
      expect(body.techniques[0].id).toBe(technique.id);

      expect(body.subtechniques).toHaveLength(1);
      expect(body.subtechniques[0]).not.toHaveProperty('description');
      expect(body.subtechniques[0].id).toBe(subtechnique.id);
    });

    it('omits framework_version from response body when collection has no version', async () => {
      registerRoute();
      const handler = getHandler();
      const context = createContext();

      mockDataClient.list.mockResolvedValue({
        framework: 'enterprise',
        frameworkVersion: undefined,
        tactics: [],
        techniques: [],
        subtechniques: [],
      });

      const request = httpServerMock.createKibanaRequest({ query: {} });
      await handler(context, request, mockResponse);

      const { body } = (mockResponse.ok as jest.Mock).mock.calls[0][0];
      expect(body.framework_version).toBeUndefined();
    });

    it('maps query params correctly to list() params (framework_version → frameworkVersion)', async () => {
      registerRoute();
      const handler = getHandler();
      const context = createContext();

      mockDataClient.list.mockResolvedValue({
        framework: 'enterprise',
        frameworkVersion: '14.0',
        tactics: [],
        techniques: [],
        subtechniques: [],
      });

      const request = httpServerMock.createKibanaRequest({
        query: {
          framework: 'enterprise',
          framework_version: '14.0',
          types: ['technique'],
          status: 'all',
        },
      });

      await handler(context, request, mockResponse);

      expect(mockDataClient.list).toHaveBeenCalledWith({
        framework: 'enterprise',
        frameworkVersion: '14.0',
        types: ['technique'],
        status: 'all',
      });
    });

    it('returns 500 customError when list() throws an unexpected error', async () => {
      registerRoute();
      const handler = getHandler();
      const context = createContext();

      mockDataClient.list.mockRejectedValue(new Error('index shard unavailable'));

      const request = httpServerMock.createKibanaRequest({ query: {} });
      await handler(context, request, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });
  });
});
