/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { MockRouter, mockDependencies } from '../../__mocks__';

import { registerConfigDataRoute } from './config_data';

describe('Enterprise Search Config Data API', () => {
  let mockRouter: MockRouter;

  beforeEach(() => {
    jest.resetAllMocks();

    mockDependencies.getStartServices.mockResolvedValue([{}, {}]);
  });

  describe('GET /internal/enterprise_search/config_data', () => {
    it('returns an initial set of config data', async () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/config_data',
      });

      registerConfigDataRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: DEFAULT_INITIAL_APP_DATA,
        headers: { 'content-type': 'application/json' },
      });
    });

    it('return config features when changed', async () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/config_data',
      });

      registerConfigDataRoute({
        ...mockDependencies,
        config: {
          ...mockDependencies.config,
          hasDocumentLevelSecurityEnabled: false,
          hasIncrementalSyncEnabled: false,
        },
        router: mockRouter.router,
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          ...DEFAULT_INITIAL_APP_DATA,
          features: {
            ...DEFAULT_INITIAL_APP_DATA.features,
            hasDocumentLevelSecurityEnabled: false,
            hasIncrementalSyncEnabled: false,
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('has native connectors enabled when agentless is available', async () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/config_data',
      });

      registerConfigDataRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
      mockDependencies.getStartServices.mockResolvedValue([
        {},
        {
          cloud: { isCloudEnabled: true },
          fleet: {
            agentless: { enabled: true },
          },
        },
      ]);

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          ...DEFAULT_INITIAL_APP_DATA,
          features: {
            ...DEFAULT_INITIAL_APP_DATA.features,
            hasNativeConnectors: true,
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
