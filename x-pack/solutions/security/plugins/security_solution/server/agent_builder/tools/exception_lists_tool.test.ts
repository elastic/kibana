/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { exceptionListsTool } from './exception_lists_tool';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-1'),
}));

describe('exceptionListsTool', () => {
  const { mockCore, mockRequest, mockEsClient, mockLogger } = createToolTestMocks();

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  it('create uses ExceptionListClient.createExceptionListItem with camelCase params', async () => {
    const exceptionsClient = {
      createExceptionListItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
      createEndpointListItem: jest.fn(),
      findExceptionListItem: jest.fn(),
      getExceptionListItem: jest.fn(),
      updateExceptionListItem: jest.fn(),
      updateEndpointListItem: jest.fn(),
    };

    const soClient = {} as any;
    const [coreStart] = await mockCore.getStartServices();
    coreStart.savedObjects.getScopedClient = jest.fn().mockReturnValue(soClient);
    mockCore.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const lists = {
      getExceptionListClient: jest.fn().mockReturnValue(exceptionsClient),
    } as any;

    const tool = exceptionListsTool({ core: mockCore as any, lists });
    await tool.handler(
      {
        operation: 'create',
        params: {
          listId: 'my_list',
          confirm: true,
          item: {
            name: 'n',
            description: 'd',
            entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'h' }],
            tags: [],
          },
        },
      } as any,
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(exceptionsClient.createExceptionListItem).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: 'my_list',
        namespaceType: 'single',
        itemId: 'uuid-1',
        type: 'simple',
      })
    );
    expect(exceptionsClient.createEndpointListItem).not.toHaveBeenCalled();
  });

  it('create routes endpoint_list to ExceptionListClient.createEndpointListItem (agnostic)', async () => {
    const exceptionsClient = {
      createExceptionListItem: jest.fn(),
      createEndpointListItem: jest.fn().mockResolvedValue({ id: 'endpoint-item-1' }),
      findExceptionListItem: jest.fn(),
      getExceptionListItem: jest.fn(),
      updateExceptionListItem: jest.fn(),
      updateEndpointListItem: jest.fn(),
    };

    const soClient = {} as any;
    const [coreStart] = await mockCore.getStartServices();
    coreStart.savedObjects.getScopedClient = jest.fn().mockReturnValue(soClient);
    mockCore.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const lists = {
      getExceptionListClient: jest.fn().mockReturnValue(exceptionsClient),
    } as any;

    const tool = exceptionListsTool({ core: mockCore as any, lists });
    await tool.handler(
      {
        operation: 'create',
        params: {
          listId: ENDPOINT_LIST_ID,
          confirm: true,
          item: {
            name: 'n',
            description: 'd',
            entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'h' }],
            tags: [],
          },
        },
      } as any,
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(exceptionsClient.createEndpointListItem).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'uuid-1',
        type: 'simple',
      })
    );
    expect(exceptionsClient.createExceptionListItem).not.toHaveBeenCalled();
  });
});


