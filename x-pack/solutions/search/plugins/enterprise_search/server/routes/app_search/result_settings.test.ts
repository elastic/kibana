/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerResultSettingsRoutes } from './result_settings';

const resultFields = {
  id: {
    raw: {},
  },
  hp: {
    raw: {},
  },
  name: {
    raw: {},
  },
};

describe('result settings routes', () => {
  describe('GET /internal/app_search/engines/{name}/result_settings/details', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/app_search/engines/{engineName}/result_settings/details',
    });

    beforeEach(() => {
      registerResultSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', async () => {
      await mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/result_settings/details',
      });
    });
  });

  describe('PUT /internal/app_search/engines/{name}/result_settings', () => {
    const mockRouter = new MockRouter({
      method: 'put',
      path: '/internal/app_search/engines/{engineName}/result_settings',
    });

    beforeEach(() => {
      registerResultSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', async () => {
      await mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: {
          result_settings: resultFields,
        },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/result_settings',
      });
    });
  });
});
