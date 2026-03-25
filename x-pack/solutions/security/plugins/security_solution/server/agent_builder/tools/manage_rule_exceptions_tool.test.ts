/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { coreMock } from '@kbn/core/server/mocks';
import type { SecuritySolutionPluginSetupDependencies } from '../../plugin_contract';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import {
  manageRuleExceptionsTool,
  SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID,
} from './manage_rule_exceptions_tool';

describe('manageRuleExceptionsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockExceptionListClient = {
    createExceptionList: jest.fn(),
    createExceptionListItem: jest.fn(),
    getExceptionList: jest.fn(),
  };
  const mockSetupPlugins: Pick<SecuritySolutionPluginSetupDependencies, 'lists'> = {
    lists: {
      getExceptionListClient: jest.fn().mockReturnValue(mockExceptionListClient),
    } as unknown as SecuritySolutionPluginSetupDependencies['lists'],
  };
  const mockRulesClient = {
    find: jest.fn(),
    update: jest.fn(),
  };

  const tool = manageRuleExceptionsTool(
    mockCore,
    mockSetupPlugins,
    mockLogger
  ) as BuiltinToolDefinition;
  const handlerContext = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = coreMock.createStart();
    mockCoreStart.security.authc.getCurrentUser = jest
      .fn()
      .mockReturnValue({ username: 'test-user' });
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        alerting: {
          getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClient),
        },
      },
      {},
    ]);
  });

  describe('metadata', () => {
    it('has the correct tool ID', () => {
      expect(tool.id).toBe(SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID);
      expect(tool.id).toBe('security.manage_rule_exceptions');
    });

    it('has tags', () => {
      expect(tool.tags).toContain('security');
      expect(tool.tags).toContain('exceptions');
    });
  });

  describe('schema', () => {
    it('validates correct input with match entry', () => {
      const input = {
        rule_id: 'test-rule-1',
        name: 'Allow admin tool',
        description: 'Known admin tool usage',
        entries: [
          { type: 'match', field: 'process.name', value: 'admin-tool.exe', operator: 'included' },
        ],
      };
      expect(tool.schema.safeParse(input).success).toBe(true);
    });

    it('validates correct input with match_any entry', () => {
      const input = {
        rule_id: 'test-rule-1',
        name: 'Allow known IPs',
        description: 'Known safe IPs',
        entries: [
          {
            type: 'match_any',
            field: 'source.ip',
            value: ['10.0.0.1', '10.0.0.2'],
            operator: 'included',
          },
        ],
      };
      expect(tool.schema.safeParse(input).success).toBe(true);
    });

    it('validates correct input with exists entry', () => {
      const input = {
        rule_id: 'test-rule-1',
        name: 'Exclude when field exists',
        description: 'Test exists',
        entries: [
          { type: 'exists', field: 'process.code_signature.subject_name', operator: 'included' },
        ],
      };
      expect(tool.schema.safeParse(input).success).toBe(true);
    });

    it('validates correct input with wildcard entry', () => {
      const input = {
        rule_id: 'test-rule-1',
        name: 'Allow wildcard',
        description: 'Test wildcard',
        entries: [
          {
            type: 'wildcard',
            field: 'process.executable',
            value: 'C:\\Program Files\\*',
            operator: 'included',
          },
        ],
      };
      expect(tool.schema.safeParse(input).success).toBe(true);
    });

    it('rejects empty entries array', () => {
      const input = {
        rule_id: 'test-rule-1',
        name: 'Bad',
        description: 'Bad',
        entries: [],
      };
      expect(tool.schema.safeParse(input).success).toBe(false);
    });

    it('rejects unknown entry type', () => {
      const input = {
        rule_id: 'test-rule-1',
        name: 'Bad',
        description: 'Bad',
        entries: [{ type: 'unknown', field: 'x', value: 'y' }],
      };
      expect(tool.schema.safeParse(input).success).toBe(false);
    });

    it('rejects rule_id with special characters', () => {
      const input = {
        rule_id: 'rule" OR "1"="1',
        name: 'Injection attempt',
        description: 'test',
        entries: [
          { type: 'match', field: 'process.name', value: 'test.exe', operator: 'included' },
        ],
      };
      expect(tool.schema.safeParse(input).success).toBe(false);
    });

    it('accepts valid rule_id formats', () => {
      const validIds = ['my-rule-1', 'rule_name.v2', 'RULE:123', 'abc123'];
      for (const ruleId of validIds) {
        const input = {
          rule_id: ruleId,
          name: 'Test',
          description: 'test',
          entries: [
            { type: 'match', field: 'process.name', value: 'test.exe', operator: 'included' },
          ],
        };
        expect(tool.schema.safeParse(input).success).toBe(true);
      }
    });
  });

  describe('handler', () => {
    it('returns error for nonexistent rule_id', async () => {
      mockRulesClient.find.mockResolvedValue({ total: 0, data: [] });

      const result = (await tool.handler(
        {
          rule_id: 'nonexistent-rule',
          name: 'Test',
          description: 'Test',
          entries: [
            { type: 'match', field: 'process.name', value: 'test.exe', operator: 'included' },
          ],
        },
        handlerContext
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('not found');
    });

    it('creates exception on rule with existing default exception list', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 1,
        data: [
          {
            id: 'rule-so-id',
            name: 'Test Rule',
            tags: ['security'],
            schedule: { interval: '5m' },
            actions: [],
            params: {
              ruleId: 'test-rule-1',
              exceptionsList: [{ list_id: 'existing-list-id', type: 'rule_default' }],
            },
          },
        ],
      });
      mockExceptionListClient.createExceptionListItem.mockResolvedValue({
        item_id: 'created-item-id',
      });

      const result = (await tool.handler(
        {
          rule_id: 'test-rule-1',
          name: 'Allow admin tool',
          description: 'Known admin tool',
          entries: [
            { type: 'match', field: 'process.name', value: 'admin-tool.exe', operator: 'included' },
          ],
        },
        handlerContext
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toMatchObject({
        success: true,
        exception_list_id: 'existing-list-id',
      });
      expect(mockExceptionListClient.createExceptionListItem).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: 'existing-list-id',
          name: 'Allow admin tool',
          description: 'Known admin tool',
        })
      );
    });

    it('auto-creates default exception list when rule has none', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 1,
        data: [
          {
            id: 'rule-so-id',
            name: 'Test Rule',
            tags: ['security'],
            schedule: { interval: '5m' },
            actions: [],
            params: {
              ruleId: 'test-rule-1',
              exceptionsList: [],
            },
          },
        ],
      });
      mockExceptionListClient.createExceptionList.mockResolvedValue({
        list_id: 'test-rule-1-default-exception-list',
      });
      mockExceptionListClient.createExceptionListItem.mockResolvedValue({
        item_id: 'created-item-id',
      });

      const result = (await tool.handler(
        {
          rule_id: 'test-rule-1',
          name: 'Allow admin tool',
          description: 'Known admin tool',
          entries: [
            { type: 'match', field: 'process.name', value: 'admin-tool.exe', operator: 'included' },
          ],
        },
        handlerContext
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toMatchObject({ success: true });
      expect(mockExceptionListClient.createExceptionList).toHaveBeenCalled();
      expect(mockRulesClient.update).toHaveBeenCalled();
    });

    it('returns error when lists plugin is not available', async () => {
      const toolWithoutLists = manageRuleExceptionsTool(
        mockCore,
        { lists: undefined } as Pick<SecuritySolutionPluginSetupDependencies, 'lists'>,
        mockLogger
      ) as BuiltinToolDefinition;

      mockRulesClient.find.mockResolvedValue({
        total: 1,
        data: [
          {
            id: 'rule-so-id',
            name: 'Test Rule',
            tags: [],
            schedule: { interval: '5m' },
            actions: [],
            params: { ruleId: 'test-rule-1', exceptionsList: [] },
          },
        ],
      });

      const result = (await toolWithoutLists.handler(
        {
          rule_id: 'test-rule-1',
          name: 'Test',
          description: 'Test',
          entries: [
            { type: 'match', field: 'process.name', value: 'test.exe', operator: 'included' },
          ],
        },
        handlerContext
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('not available');
    });

    it('returns error when createExceptionListItem throws', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 1,
        data: [
          {
            id: 'rule-so-id',
            name: 'Test Rule',
            tags: [],
            schedule: { interval: '5m' },
            actions: [],
            params: {
              ruleId: 'test-rule-1',
              exceptionsList: [{ list_id: 'existing-list-id', type: 'rule_default' }],
            },
          },
        ],
      });
      mockExceptionListClient.createExceptionListItem.mockRejectedValue(
        new Error('Saved object conflict')
      );

      const result = (await tool.handler(
        {
          rule_id: 'test-rule-1',
          name: 'Test',
          description: 'Test',
          entries: [
            { type: 'match', field: 'process.name', value: 'test.exe', operator: 'included' },
          ],
        },
        handlerContext
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Saved object conflict');
    });

    it('verifies rulesClient.update is called with correct exception list payload', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 1,
        data: [
          {
            id: 'rule-so-id',
            name: 'Test Rule',
            tags: ['security'],
            schedule: { interval: '5m' },
            actions: [],
            params: {
              ruleId: 'test-rule-1',
              exceptionsList: [],
            },
          },
        ],
      });
      mockExceptionListClient.createExceptionList.mockResolvedValue({
        list_id: 'test-rule-1-default-exception-list',
      });
      mockExceptionListClient.createExceptionListItem.mockResolvedValue({
        item_id: 'created-item-id',
      });

      await tool.handler(
        {
          rule_id: 'test-rule-1',
          name: 'Test exception',
          description: 'Test',
          entries: [
            { type: 'match', field: 'process.name', value: 'test.exe', operator: 'included' },
          ],
        },
        handlerContext
      );

      expect(mockRulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rule-so-id',
          data: expect.objectContaining({
            params: expect.objectContaining({
              exceptionsList: expect.arrayContaining([
                expect.objectContaining({
                  list_id: 'test-rule-1-default-exception-list',
                  type: 'rule_default',
                  namespace_type: 'single',
                }),
              ]),
            }),
          }),
        })
      );
    });
  });
});
