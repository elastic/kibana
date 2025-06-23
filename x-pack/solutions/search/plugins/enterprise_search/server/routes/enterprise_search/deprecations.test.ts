/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/search-connectors', () => ({
  deleteConnectorById: jest.fn(),
  putUpdateNative: jest.fn(),
}));

const mockGetEnterpriseSearchAccountCleanupAccounts = jest.fn();

jest.mock('../../deprecations', () => ({
  ...jest.requireActual('../../deprecations'),
  getEnterpriseSearchAccountCleanupAccounts: () => mockGetEnterpriseSearchAccountCleanupAccounts(),
}));

import { mockDependencies, MockRouter } from '../../__mocks__';

import {
  SecurityDeleteServiceTokenRequest,
  SecurityDeleteUserRequest,
  SecurityInvalidateApiKeyRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { deleteConnectorById, putUpdateNative } from '@kbn/search-connectors';

import { IEnterpriseSearchAccountCleanupAccounts } from '../../deprecations';

import { registerDeprecationRoutes } from './deprecations';

describe('deprecation routes', () => {
  describe('POST /internal/enterprise_search/deprecations/delete_crawler_connectors', () => {
    const mockClient = {};
    let mockRouter: MockRouter;
    const deleteByIdMock: jest.Mock = deleteConnectorById as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: mockClient } } }),
      } as jest.Mocked<RequestHandlerContext>;
      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/deprecations/delete_crawler_connectors',
      });

      registerDeprecationRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates, deletes, and 200s correctly in happy path', async () => {
      const request = {
        body: { ids: ['foo'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
      deleteByIdMock.mockResolvedValue({});

      await mockRouter.callRoute(request);
      expect(deleteByIdMock).toHaveBeenCalledWith(mockClient, 'foo');
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: { deleted: ['foo'] },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('fails validation without ids', () => {
      const request = { body: { deprecationDetails: { domainId: 'enterpriseSearch' } } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without deprecation context', () => {
      const request = { body: { ids: ['foo'] } };
      mockRouter.shouldThrow(request);
    });

    it('raises an error if delete fails', async () => {
      const request = {
        body: { ids: ['foo'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
      (deleteConnectorById as jest.Mock).mockImplementation(async () => {
        throw new Error('mock delete failed (on purpose)');
      });

      await mockRouter.callRoute(request);
      expect(mockRouter.response.customError).toHaveBeenCalled();
    });

    it('raises an error if any ids fail to delete', async () => {
      const request = {
        body: { ids: ['foo', 'bar', 'baz'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
      deleteByIdMock.mockResolvedValueOnce({}); // one success
      deleteByIdMock.mockImplementationOnce(async () => {
        throw new Error('mock delete failed (on purpose)');
      });
      deleteByIdMock.mockResolvedValueOnce({}); // another success

      await mockRouter.callRoute(request);
      expect(mockRouter.response.customError).toHaveBeenCalled();
      expect(deleteByIdMock).toHaveBeenCalledTimes(3);
      expect(deleteByIdMock).toHaveBeenCalledWith(mockClient, 'foo');
      expect(deleteByIdMock).toHaveBeenCalledWith(mockClient, 'bar');
      expect(deleteByIdMock).toHaveBeenCalledWith(mockClient, 'baz');
    });
  });

  describe('POST /internal/enterprise_search/deprecations/convert_connectors_to_client', () => {
    const mockClient = {};
    let mockRouter: MockRouter;
    const updateNativeMock: jest.Mock = putUpdateNative as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: mockClient } } }),
      } as jest.Mocked<RequestHandlerContext>;
      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
      });

      registerDeprecationRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates, updates, and 200s correctly in happy path', async () => {
      const request = {
        body: { ids: ['foo'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
      updateNativeMock.mockResolvedValue({});

      await mockRouter.callRoute(request);
      expect(updateNativeMock).toHaveBeenCalledWith(mockClient, 'foo', false);
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: { converted_to_client: ['foo'] },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('fails validation without ids', () => {
      const request = { body: { deprecationDetails: { domainId: 'enterpriseSearch' } } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without deprecation context', () => {
      const request = { body: { ids: ['foo'] } };
      mockRouter.shouldThrow(request);
    });

    it('raises an error if update fails', async () => {
      const request = {
        body: { ids: ['foo'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
      updateNativeMock.mockImplementation(async () => {
        throw new Error('mock update failed (on purpose)');
      });

      await mockRouter.callRoute(request);
      expect(updateNativeMock).toHaveBeenCalledWith(mockClient, 'foo', false);
      expect(mockRouter.response.customError).toHaveBeenCalled();
    });

    it('raises an error if any update fails', async () => {
      const request = {
        body: { ids: ['foo', 'bar', 'baz'], deprecationDetails: { domainId: 'enterpriseSearch' } },
      };
      mockRouter.shouldValidate(request);
      updateNativeMock.mockResolvedValueOnce({}); // one success
      updateNativeMock.mockImplementationOnce(async () => {
        throw new Error('mock delete failed (on purpose)');
      });
      updateNativeMock.mockResolvedValueOnce({}); // another success

      await mockRouter.callRoute(request);
      expect(mockRouter.response.customError).toHaveBeenCalled();
      expect(updateNativeMock).toHaveBeenCalledTimes(3);
      expect(updateNativeMock).toHaveBeenCalledWith(mockClient, 'foo', false);
      expect(updateNativeMock).toHaveBeenCalledWith(mockClient, 'bar', false);
      expect(updateNativeMock).toHaveBeenCalledWith(mockClient, 'baz', false);
    });
  });
});

describe('POST /internal/enterprise_search/deprecations/clean_ent_search_accounts', () => {
  let mockRouter: MockRouter;
  const mockedDeleteUser = jest.fn();
  const mockedDeleteServiceCredentials = jest.fn();
  const mockedInvalidateApiKey = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const currentUserMock = {
      security: {
        deleteUser: (request: SecurityDeleteUserRequest) => mockedDeleteUser(request),
        deleteServiceToken: (request: SecurityDeleteServiceTokenRequest) =>
          mockedDeleteServiceCredentials(request),
        invalidateApiKey: (request: SecurityInvalidateApiKeyRequest) =>
          mockedInvalidateApiKey(request),
      },
    };

    const context = {
      core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: currentUserMock } } }),
    } as jest.Mocked<RequestHandlerContext>;
    mockRouter = new MockRouter({
      context,
      method: 'post',
      path: '/internal/enterprise_search/deprecations/clean_ent_search_accounts',
    });

    registerDeprecationRoutes({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  it('should return OK with no items to clean up', async () => {
    const request = {
      body: { deprecationDetails: { domainId: 'enterpriseSearch' } },
    };

    mockRouter.shouldValidate(request);
    mockGetEnterpriseSearchAccountCleanupAccounts.mockResolvedValue({
      esUser: undefined,
      credentialTokenIds: [],
      esCloudApiKeys: [],
    });

    await mockRouter.callRoute(request);
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: { success: true },
      headers: { 'content-type': 'application/json' },
    });
  });

  interface AccountCleanupExpected {
    hasUser: boolean;
    hasCredentials: boolean;
    hasApiKeys: boolean;
  }

  const cleanupTestCases: Array<[IEnterpriseSearchAccountCleanupAccounts, AccountCleanupExpected]> =
    [
      [
        {
          esUser: {
            enterprise_search: {
              username: 'enterprise_search',
              metadata: {},
              enabled: true,
              roles: [],
            },
          },
          credentialTokenIds: ['test_token_id'],
          esCloudApiKeys: ['test_api_key'],
        },
        {
          hasUser: true,
          hasCredentials: true,
          hasApiKeys: true,
        },
      ],
      [
        {
          esUser: undefined,
          credentialTokenIds: ['test_token_id'],
          esCloudApiKeys: ['test_api_key'],
        },
        {
          hasUser: false,
          hasCredentials: true,
          hasApiKeys: true,
        },
      ],
      [
        {
          esUser: undefined,
          credentialTokenIds: [],
          esCloudApiKeys: ['test_api_key'],
        },
        {
          hasUser: false,
          hasCredentials: false,
          hasApiKeys: true,
        },
      ],
      [
        {
          esUser: undefined,
          credentialTokenIds: [],
          esCloudApiKeys: [],
        },
        {
          hasUser: false,
          hasCredentials: false,
          hasApiKeys: false,
        },
      ],
      [
        {
          esUser: {
            enterprise_search: {
              username: 'enterprise_search',
              metadata: {},
              enabled: true,
              roles: [],
            },
          },
          credentialTokenIds: [],
          esCloudApiKeys: ['test_api_key'],
        },
        {
          hasUser: true,
          hasCredentials: false,
          hasApiKeys: true,
        },
      ],
      [
        {
          esUser: {
            enterprise_search: {
              username: 'enterprise_search',
              metadata: {},
              enabled: true,
              roles: [],
            },
          },
          credentialTokenIds: [],
          esCloudApiKeys: [],
        },
        {
          hasUser: true,
          hasCredentials: false,
          hasApiKeys: false,
        },
      ],
      [
        {
          esUser: {
            enterprise_search: {
              username: 'enterprise_search',
              metadata: {},
              enabled: true,
              roles: [],
            },
          },
          credentialTokenIds: ['test_token_id'],
          esCloudApiKeys: [],
        },
        {
          hasUser: true,
          hasCredentials: true,
          hasApiKeys: false,
        },
      ],
    ];

  test.each(cleanupTestCases)(
    'should clean up accounts, credentials, and tokens for (%p): %p',
    async (mockData: IEnterpriseSearchAccountCleanupAccounts, expected: AccountCleanupExpected) => {
      const request = {
        body: { deprecationDetails: { domainId: 'enterpriseSearch' } },
      };

      mockRouter.shouldValidate(request);
      mockGetEnterpriseSearchAccountCleanupAccounts.mockResolvedValue(mockData);

      await mockRouter.callRoute(request);

      expect(mockGetEnterpriseSearchAccountCleanupAccounts).toHaveBeenCalled();

      if (expected.hasUser) {
        expect(mockedDeleteUser).toHaveBeenCalledWith({ username: 'enterprise_search' });
      } else {
        expect(mockedDeleteUser).not.toHaveBeenCalled();
      }

      if (expected.hasCredentials) {
        expect(mockedDeleteServiceCredentials).toHaveBeenCalledWith({
          namespace: 'elastic',
          service: 'enterprise-search-server',
          name: 'test_token_id',
        });
      } else {
        expect(mockedDeleteServiceCredentials).not.toHaveBeenCalled();
      }

      if (expected.hasApiKeys) {
        expect(mockedInvalidateApiKey).toHaveBeenCalledWith({ id: 'test_api_key' });
      } else {
        expect(mockedInvalidateApiKey).not.toHaveBeenCalled();
      }

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: { success: true },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
});
