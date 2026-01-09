/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { casesTool } from './cases_tool';

describe('casesTool', () => {
  const { mockCore, mockRequest, mockEsClient, mockLogger } = createToolTestMocks();

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  it('create_case supplies required owner/connector/settings', async () => {
    const mockCasesCreate = jest.fn().mockResolvedValue({ id: 'case-1' });
    const mockCasesClient = {
      cases: {
        create: mockCasesCreate,
        get: jest.fn(),
        bulkUpdate: jest.fn(),
      },
      attachments: {
        add: jest.fn(),
      },
    };

    const [mockCoreStart] = await mockCore.getStartServices();
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        cases: {
          getCasesClientWithRequest: jest.fn().mockResolvedValue(mockCasesClient),
        },
      } as any,
      {},
    ]);

    const tool = casesTool(mockCore);
    await tool.handler(
      {
        operation: 'create_case',
        params: {
          title: 'Test case',
          description: 'Test description',
          tags: ['tag-1'],
          confirm: true,
        },
      } as any,
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(mockCasesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'securitySolution',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: true, extractObservables: true },
      })
    );
  });

  it('add_comment calls attachments.add with the expected user-comment shape', async () => {
    const mockAttachmentsAdd = jest.fn().mockResolvedValue({ id: 'comment-1' });
    const mockCasesClient = {
      cases: {
        create: jest.fn(),
        get: jest.fn(),
        bulkUpdate: jest.fn(),
      },
      attachments: {
        add: mockAttachmentsAdd,
      },
    };

    const [mockCoreStart] = await mockCore.getStartServices();
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        cases: {
          getCasesClientWithRequest: jest.fn().mockResolvedValue(mockCasesClient),
        },
      } as any,
      {},
    ]);

    const tool = casesTool(mockCore);
    await tool.handler(
      {
        operation: 'add_comment',
        params: {
          caseId: 'de0343d4-dacc-4197-83db-08dd252d9719',
          comment: 'blah',
          confirm: true,
        },
      } as any,
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(mockAttachmentsAdd).toHaveBeenCalledWith({
      caseId: 'de0343d4-dacc-4197-83db-08dd252d9719',
      comment: {
        comment: 'blah',
        type: 'user',
        owner: 'securitySolution',
      },
    });
  });
});


