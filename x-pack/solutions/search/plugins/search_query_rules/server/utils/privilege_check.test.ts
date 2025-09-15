/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreRequestHandlerContext, KibanaResponseFactory } from '@kbn/core/server';
import { checkPrivileges } from './privilege_check';

const MOCK_CORE = {
  elasticsearch: {
    client: {
      asCurrentUser: {
        security: {
          hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: false }),
        },
      },
    },
  },
  security: {
    authc: {
      getCurrentUser: jest.fn().mockReturnValue(null),
    },
  },
} as unknown as CoreRequestHandlerContext;

const MOCK_RESPONSE = {
  customError: jest.fn(),
  forbidden: jest.fn(),
} as unknown as KibanaResponseFactory;

describe('privilege check util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 502 error if user is not available', async () => {
    const mockCore = { ...MOCK_CORE };
    const mockResponse = { ...MOCK_RESPONSE };
    await checkPrivileges(mockCore, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: expect.stringContaining(
        'Could not retrieve current user, security plugin is not ready'
      ),
    });
  });
  it('should return forbidden error if user does not have required privileges', async () => {
    const mockCore = { ...MOCK_CORE };
    mockCore.security.authc.getCurrentUser = jest.fn().mockReturnValue({ username: 'test_user' });
    const mockResponse = { ...MOCK_RESPONSE };
    await checkPrivileges(mockCore, mockResponse);

    expect(mockResponse.forbidden).toHaveBeenCalledWith({
      body: "You don't have manage_search_query_rules privileges",
    });
  });
  it('should not return an error if all checks are passed', async () => {
    const mockCore = { ...MOCK_CORE };
    mockCore.security.authc.getCurrentUser = jest.fn().mockReturnValue({ username: 'test_user' });
    mockCore.elasticsearch.client.asCurrentUser.security.hasPrivileges = jest
      .fn()
      .mockResolvedValue({ has_all_requested: true });

    const mockResponse = { ...MOCK_RESPONSE };
    await checkPrivileges(mockCore, mockResponse);
    expect(mockResponse.forbidden).not.toHaveBeenCalled();
    expect(mockResponse.customError).not.toHaveBeenCalled();
  });
});
