/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, MockRouter } from '../../__mocks__';

import { registerDeprecationRoutes } from './deprecations';

describe('deprecation routes', () => {
  describe('POST /internal/enterprise_search/deprecations/delete_crawler_connectors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/deprecations/delete_crawler_connectors',
      });

      registerDeprecationRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates correctly with ids and deprecation context', () => {
      const request = {
        body: { ids: ['foo'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without ids', () => {
      const request = { body: { deprecationDetails: { domainId: 'enterpriseSearch' } } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without deprecation context', () => {
      const request = { body: { ids: ['foo'] } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/deprecations/convert_connectors_to_client', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
      });

      registerDeprecationRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates correctly with ids and deprecation context', () => {
      const request = {
        body: { ids: ['foo'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without ids', () => {
      const request = { body: { deprecationDetails: { domainId: 'enterpriseSearch' } } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without deprecation context', () => {
      const request = { body: { ids: ['foo'] } };
      mockRouter.shouldThrow(request);
    });
  });
});
