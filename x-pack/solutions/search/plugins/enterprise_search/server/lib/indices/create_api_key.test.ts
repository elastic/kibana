/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityServiceMock } from '@kbn/core-security-server-mocks';

import { createApiKey } from './create_api_key';

describe('createApiKey lib function', () => {
  const security = securityServiceMock.createRequestHandlerContext();

  const indexName = 'my-index';
  const keyName = '{indexName}-key';

  const createResponse = {
    api_key: 'ui2lp2axTNmsyakw9tvNnw',
    encoded: 'VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==',
    id: 'VuaCfGcBCdbkQm-e5aOx',
    name: keyName,
  };

  security.authc.apiKeys.create = jest.fn().mockReturnValue(createResponse);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an api key via the security plugin', async () => {
    await expect(createApiKey(security, indexName, keyName)).resolves.toEqual(createResponse);

    expect(security.authc.apiKeys.create).toHaveBeenCalledWith({
      name: keyName,
      role_descriptors: {
        [`${indexName}-key-role`]: {
          cluster: [],
          index: [
            {
              names: [indexName],
              privileges: ['all'],
            },
          ],
        },
      },
    });
  });
});
