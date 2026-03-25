/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { caseManageTool } from './case_manage_tool';

describe('caseManageTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = caseManageTool(mockCore, mockLogger);

  const mockCasesClient = {
    cases: {
      create: jest.fn().mockResolvedValue({
        id: 'case-1',
        title: 'Test Case',
        status: 'open',
        severity: 'low',
      }),
      get: jest.fn().mockResolvedValue({
        id: 'case-1',
        title: 'Test Case',
        description: 'Test description',
        version: 'v1',
        status: 'open',
        severity: 'low',
        tags: ['security'],
        totalComment: 2,
        totalAlerts: 3,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T11:00:00Z',
        created_by: { username: 'test-user' },
      }),
      update: jest.fn().mockResolvedValue([
        {
          id: 'case-1',
          title: 'Updated Case',
          status: 'open',
          severity: 'low',
        },
      ]),
    },
    attachments: {
      add: jest.fn().mockResolvedValue({
        id: 'case-1',
        title: 'Test Case',
        totalComment: 3,
      }),
      bulkCreate: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock core.getStartServices to return cases plugin
    mockCore.getStartServices.mockResolvedValue([
      {} as never,
      {
        cases: {
          getCasesClientWithRequest: jest.fn().mockReturnValue(mockCasesClient),
        },
      } as never,
      {} as never,
    ]);
  });

  describe('schema', () => {
    it('validates correct create action', () => {
      const validInput = {
        action: 'create',
        title: 'New Security Case',
        description: 'Investigating suspicious activity',
        severity: 'high',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct update action with case_id', () => {
      const validInput = {
        action: 'update',
        case_id: 'case-1',
        title: 'Updated Title',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates action enum values', () => {
      const validActions = [
        'create',
        'update',
        'add_comment',
        'attach_alerts',
        'get',
        'change_status',
      ];
      for (const action of validActions) {
        const result = tool.schema.safeParse({ action, case_id: 'case-1' });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid action', () => {
      const invalidInput = {
        action: 'delete',
        case_id: 'case-1',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing action', () => {
      const invalidInput = {
        case_id: 'case-1',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('validates optional tags array', () => {
      const validInput = {
        action: 'create',
        title: 'Tagged Case',
        tags: ['malware', 'critical'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates status enum values', () => {
      for (const status of ['open', 'in-progress', 'closed']) {
        const result = tool.schema.safeParse({
          action: 'change_status',
          case_id: 'case-1',
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it('validates severity enum values', () => {
      for (const severity of ['low', 'medium', 'high', 'critical']) {
        const result = tool.schema.safeParse({
          action: 'create',
          title: 'Test',
          severity,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('handler', () => {
    describe('create action', () => {
      it('creates case via casesClient', async () => {
        const result = (await tool.handler(
          {
            action: 'create',
            title: 'New Case',
            description: 'Case description',
            tags: ['security'],
            severity: 'high',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual(
          expect.objectContaining({
            case_id: 'case-1',
            title: 'Test Case',
            status: 'open',
            severity: 'low',
          })
        );
        expect(mockCasesClient.cases.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Case',
            description: 'Case description',
            tags: ['security'],
            severity: 'high',
            owner: 'securitySolution',
          })
        );
      });

      it('requires title for create action', async () => {
        const result = (await tool.handler(
          { action: 'create' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errorResult = result.results[0] as ErrorResult;
        expect(errorResult.type).toBe(ToolResultType.error);
        expect(errorResult.data.message).toContain('Title is required');
      });

      it('returns case URL', async () => {
        const result = (await tool.handler(
          { action: 'create', title: 'URL Test Case' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].data.url).toBe('/app/security/cases/case-1');
      });

      it('defaults optional fields when not provided', async () => {
        await tool.handler(
          { action: 'create', title: 'Minimal Case' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockCasesClient.cases.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description: '',
            tags: [],
            severity: 'low',
          })
        );
      });
    });

    describe('update action', () => {
      it('updates case with version', async () => {
        mockCasesClient.cases.update.mockResolvedValue([
          { id: 'case-1', title: 'Updated Title', status: 'open', severity: 'high' },
        ]);

        const result = (await tool.handler(
          {
            action: 'update',
            case_id: 'case-1',
            title: 'Updated Title',
            severity: 'high',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual(
          expect.objectContaining({
            case_id: 'case-1',
            title: 'Updated Title',
          })
        );

        // Verify version was fetched and used
        expect(mockCasesClient.cases.get).toHaveBeenCalledWith({ id: 'case-1' });
        expect(mockCasesClient.cases.update).toHaveBeenCalledWith({
          cases: [
            expect.objectContaining({
              id: 'case-1',
              version: 'v1',
              title: 'Updated Title',
              severity: 'high',
            }),
          ],
        });
      });

      it('requires case_id for update', async () => {
        const result = (await tool.handler(
          { action: 'update', title: 'No ID' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'case_id is required'
        );
      });
    });

    describe('add_comment action', () => {
      it('adds comment via casesClient', async () => {
        const result = (await tool.handler(
          {
            action: 'add_comment',
            case_id: 'case-1',
            comment: 'Investigation update: found additional indicators.',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual(
          expect.objectContaining({
            case_id: 'case-1',
            total_comments: 3,
          })
        );
        expect(mockCasesClient.attachments.add).toHaveBeenCalledWith({
          caseId: 'case-1',
          comment: expect.objectContaining({
            type: 'user',
            comment: 'Investigation update: found additional indicators.',
            owner: 'securitySolution',
          }),
        });
      });

      it('requires case_id for add_comment', async () => {
        const result = (await tool.handler(
          { action: 'add_comment', comment: 'No case id' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'case_id is required'
        );
      });

      it('requires comment for add_comment', async () => {
        const result = (await tool.handler(
          { action: 'add_comment', case_id: 'case-1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'comment is required'
        );
      });
    });

    describe('attach_alerts action', () => {
      it('attaches alerts via bulkCreate', async () => {
        const result = (await tool.handler(
          {
            action: 'attach_alerts',
            case_id: 'case-1',
            alert_ids: ['alert-1', 'alert-2'],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual(
          expect.objectContaining({
            case_id: 'case-1',
            attached_alerts: 2,
          })
        );
        expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledWith({
          caseId: 'case-1',
          attachments: [
            expect.objectContaining({
              type: 'alert',
              alertId: 'alert-1',
              owner: 'securitySolution',
            }),
            expect.objectContaining({
              type: 'alert',
              alertId: 'alert-2',
              owner: 'securitySolution',
            }),
          ],
        });
      });

      it('requires case_id for attach_alerts', async () => {
        const result = (await tool.handler(
          { action: 'attach_alerts', alert_ids: ['alert-1'] },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'case_id is required'
        );
      });

      it('requires alert_ids for attach_alerts', async () => {
        const result = (await tool.handler(
          { action: 'attach_alerts', case_id: 'case-1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'alert_ids is required'
        );
      });

      it('requires non-empty alert_ids for attach_alerts', async () => {
        const result = (await tool.handler(
          { action: 'attach_alerts', case_id: 'case-1', alert_ids: [] },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'alert_ids is required'
        );
      });
    });

    describe('get action', () => {
      it('returns case details', async () => {
        const result = (await tool.handler(
          { action: 'get', case_id: 'case-1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual(
          expect.objectContaining({
            case_id: 'case-1',
            title: 'Test Case',
            description: 'Test description',
            status: 'open',
            severity: 'low',
            tags: ['security'],
            total_comments: 2,
            total_alerts: 3,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T11:00:00Z',
            url: '/app/security/cases/case-1',
          })
        );
        expect(mockCasesClient.cases.get).toHaveBeenCalledWith({ id: 'case-1' });
      });

      it('requires case_id for get', async () => {
        const result = (await tool.handler(
          { action: 'get' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'case_id is required'
        );
      });
    });

    describe('change_status action', () => {
      it('changes status with version', async () => {
        mockCasesClient.cases.update.mockResolvedValue([
          { id: 'case-1', title: 'Test Case', status: 'closed', severity: 'low' },
        ]);

        const result = (await tool.handler(
          { action: 'change_status', case_id: 'case-1', status: 'closed' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual(
          expect.objectContaining({
            case_id: 'case-1',
            previous_status: 'open',
            new_status: 'closed',
          })
        );

        // Verify version was fetched and used
        expect(mockCasesClient.cases.get).toHaveBeenCalledWith({ id: 'case-1' });
        expect(mockCasesClient.cases.update).toHaveBeenCalledWith({
          cases: [
            expect.objectContaining({
              id: 'case-1',
              version: 'v1',
              status: 'closed',
            }),
          ],
        });
      });

      it('requires case_id for change_status', async () => {
        const result = (await tool.handler(
          { action: 'change_status', status: 'closed' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'case_id is required'
        );
      });

      it('requires status for change_status', async () => {
        const result = (await tool.handler(
          { action: 'change_status', case_id: 'case-1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0] as ErrorResult).data.message).toContain(
          'status is required'
        );
      });
    });

    describe('error handling', () => {
      it('handles errors from casesClient create', async () => {
        mockCasesClient.cases.create.mockRejectedValue(
          new Error('Cases service unavailable')
        );

        const result = (await tool.handler(
          { action: 'create', title: 'Failing Case' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errorResult = result.results[0] as ErrorResult;
        expect(errorResult.type).toBe(ToolResultType.error);
        expect(errorResult.data.message).toContain('Cases service unavailable');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('handles errors from casesClient get', async () => {
        mockCasesClient.cases.get.mockRejectedValue(new Error('Case not found'));

        const result = (await tool.handler(
          { action: 'get', case_id: 'nonexistent' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errorResult = result.results[0] as ErrorResult;
        expect(errorResult.type).toBe(ToolResultType.error);
        expect(errorResult.data.message).toContain('Case not found');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('handles errors from casesClient update', async () => {
        mockCasesClient.cases.get.mockResolvedValue({
          id: 'case-1',
          version: 'v1',
          status: 'open',
        });
        mockCasesClient.cases.update.mockRejectedValue(
          new Error('Conflict: version mismatch')
        );

        const result = (await tool.handler(
          { action: 'update', case_id: 'case-1', title: 'Updated' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errorResult = result.results[0] as ErrorResult;
        expect(errorResult.type).toBe(ToolResultType.error);
        expect(errorResult.data.message).toContain('Conflict: version mismatch');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('handles cases plugin not available', async () => {
        mockCore.getStartServices.mockResolvedValue([
          {} as never,
          {} as never, // No cases plugin
          {} as never,
        ]);

        const result = (await tool.handler(
          { action: 'get', case_id: 'case-1' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errorResult = result.results[0] as ErrorResult;
        expect(errorResult.type).toBe(ToolResultType.error);
        expect(errorResult.data.message).toContain('Cases plugin is not available');
      });

      it('handles errors from attachments bulkCreate', async () => {
        mockCasesClient.attachments.bulkCreate.mockRejectedValue(
          new Error('Bulk create failed')
        );

        const result = (await tool.handler(
          {
            action: 'attach_alerts',
            case_id: 'case-1',
            alert_ids: ['alert-1'],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errorResult = result.results[0] as ErrorResult;
        expect(errorResult.type).toBe(ToolResultType.error);
        expect(errorResult.data.message).toContain('Bulk create failed');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });
});
