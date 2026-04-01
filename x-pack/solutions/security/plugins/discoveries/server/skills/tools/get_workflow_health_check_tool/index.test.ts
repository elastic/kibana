/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { WorkflowDetailDto } from '@kbn/workflows';

import {
  GET_WORKFLOW_HEALTH_CHECK_TOOL_ID,
  getWorkflowHealthCheckTool,
  type WorkflowFetcher,
} from '.';

const getMockWorkflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto => ({
  createdAt: '2026-03-13T00:00:00.000Z',
  createdBy: 'elastic',
  definition: null,
  description: 'Test workflow',
  enabled: true,
  id: 'workflow-1',
  lastUpdatedAt: '2026-03-13T00:00:00.000Z',
  lastUpdatedBy: 'elastic',
  name: 'Test Workflow',
  valid: true,
  yaml: 'name: Test Workflow\nsteps: []',
  ...overrides,
});

describe('GET_WORKFLOW_HEALTH_CHECK_TOOL_ID', () => {
  it('has the expected value', () => {
    expect(GET_WORKFLOW_HEALTH_CHECK_TOOL_ID).toBe(
      'security.attack-discovery.get_workflow_health_check'
    );
  });
});

describe('getWorkflowHealthCheckTool', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockEsClient = elasticsearchClientMock.createScopedClusterClient();
  const mockGetWorkflow = jest.fn<
    ReturnType<WorkflowFetcher['getWorkflow']>,
    Parameters<WorkflowFetcher['getWorkflow']>
  >();
  const mockGetWorkflowExecution = jest.fn<
    ReturnType<WorkflowFetcher['getWorkflowExecution']>,
    Parameters<WorkflowFetcher['getWorkflowExecution']>
  >();

  const mockContext: ToolHandlerContext = {
    attachments: {} as never,
    esClient: mockEsClient,
    events: {} as never,
    filestore: {} as never,
    logger: mockLogger,
    modelProvider: {} as never,
    prompts: {} as never,
    request: {} as never,
    resultStore: {} as never,
    runContext: { runId: 'test-run-id', stack: [] },
    runner: {} as never,
    savedObjectsClient: {} as never,
    skills: {} as never,
    spaceId: 'test-space',
    stateManager: {} as never,
    toolManager: {} as never,
    toolProvider: {} as never,
  };

  const mockFetcher: WorkflowFetcher = {
    getWorkflow: mockGetWorkflow,
    getWorkflowExecution: mockGetWorkflowExecution,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a tool with the expected id', () => {
    const tool = getWorkflowHealthCheckTool(mockFetcher);

    expect(tool.id).toBe(GET_WORKFLOW_HEALTH_CHECK_TOOL_ID);
  });

  it('returns a builtin tool type', () => {
    const tool = getWorkflowHealthCheckTool(mockFetcher);

    expect(tool.type).toBe(ToolType.builtin);
  });

  it('has a non-empty description', () => {
    const tool = getWorkflowHealthCheckTool(mockFetcher);

    expect(tool.description.length).toBeGreaterThan(0);
  });

  describe('schema', () => {
    it('accepts an empty workflow_ids array', () => {
      const tool = getWorkflowHealthCheckTool(mockFetcher);

      const parsed = tool.schema.safeParse({ workflow_ids: [] });

      expect(parsed.success).toBe(true);
    });

    it('accepts a single workflow_id', () => {
      const tool = getWorkflowHealthCheckTool(mockFetcher);

      const parsed = tool.schema.safeParse({ workflow_ids: ['wf-1'] });

      expect(parsed.success).toBe(true);
    });

    it('accepts multiple workflow_ids', () => {
      const tool = getWorkflowHealthCheckTool(mockFetcher);

      const parsed = tool.schema.safeParse({ workflow_ids: ['wf-1', 'wf-2', 'wf-3'] });

      expect(parsed.success).toBe(true);
    });

    it('rejects input without workflow_ids', () => {
      const tool = getWorkflowHealthCheckTool(mockFetcher);

      const parsed = tool.schema.safeParse({});

      expect(parsed.success).toBe(false);
    });
  });

  describe('handler', () => {
    describe('found and enabled workflow', () => {
      it('returns found: true, enabled: true, valid: true for an enabled valid workflow', async () => {
        mockGetWorkflow.mockResolvedValue(
          getMockWorkflow({ enabled: true, id: 'wf-1', name: 'My Workflow', valid: true })
        );

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: ['wf-1'] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                workflows: [
                  {
                    enabled: true,
                    found: true,
                    id: 'wf-1',
                    last_modified: '2026-03-13T00:00:00.000Z',
                    name: 'My Workflow',
                    valid: true,
                  },
                ],
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });

    describe('found but disabled workflow', () => {
      it('returns found: true, enabled: false for a disabled workflow', async () => {
        mockGetWorkflow.mockResolvedValue(
          getMockWorkflow({
            enabled: false,
            id: 'wf-disabled',
            name: 'Disabled Workflow',
            valid: true,
          })
        );

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: ['wf-disabled'] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                workflows: [
                  {
                    enabled: false,
                    found: true,
                    id: 'wf-disabled',
                    last_modified: '2026-03-13T00:00:00.000Z',
                    name: 'Disabled Workflow',
                    valid: true,
                  },
                ],
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });

    describe('found but invalid workflow', () => {
      it('returns found: true, valid: false for an invalid workflow', async () => {
        mockGetWorkflow.mockResolvedValue(
          getMockWorkflow({
            enabled: true,
            id: 'wf-invalid',
            name: 'Invalid Workflow',
            valid: false,
          })
        );

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: ['wf-invalid'] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                workflows: [
                  {
                    enabled: true,
                    found: true,
                    id: 'wf-invalid',
                    last_modified: '2026-03-13T00:00:00.000Z',
                    name: 'Invalid Workflow',
                    valid: false,
                  },
                ],
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });

    describe('workflow not found', () => {
      it('returns found: false, enabled: false, valid: false, name: null when workflow does not exist', async () => {
        mockGetWorkflow.mockResolvedValue(null);

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: ['wf-missing'] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                workflows: [
                  {
                    enabled: false,
                    found: false,
                    id: 'wf-missing',
                    name: null,
                    valid: false,
                  },
                ],
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });

    describe('mixed results', () => {
      it('returns correct health for each workflow when some are found and some are not', async () => {
        mockGetWorkflow
          .mockResolvedValueOnce(
            getMockWorkflow({ enabled: true, id: 'wf-ok', name: 'OK Workflow', valid: true })
          )
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            getMockWorkflow({ enabled: false, id: 'wf-off', name: 'Off Workflow', valid: true })
          );

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler(
          { workflow_ids: ['wf-ok', 'wf-missing', 'wf-off'] },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: {
                workflows: [
                  {
                    enabled: true,
                    found: true,
                    id: 'wf-ok',
                    last_modified: '2026-03-13T00:00:00.000Z',
                    name: 'OK Workflow',
                    valid: true,
                  },
                  { enabled: false, found: false, id: 'wf-missing', name: null, valid: false },
                  {
                    enabled: false,
                    found: true,
                    id: 'wf-off',
                    last_modified: '2026-03-13T00:00:00.000Z',
                    name: 'Off Workflow',
                    valid: true,
                  },
                ],
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });

    describe('empty input', () => {
      it('returns an empty workflows array when no workflow_ids are provided', async () => {
        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: [] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: { workflows: [] },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });

        expect(mockGetWorkflow).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('returns an error result when getWorkflow throws', async () => {
        mockGetWorkflow.mockRejectedValue(new Error('ES connection failed'));

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: ['wf-1'] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                message: expect.stringContaining('ES connection failed'),
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.error,
            },
          ],
        });
      });

      it('handles non-Error thrown values', async () => {
        mockGetWorkflow.mockRejectedValue('unexpected string error');

        const tool = getWorkflowHealthCheckTool(mockFetcher);

        const result = await tool.handler({ workflow_ids: ['wf-1'] }, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                message: expect.stringContaining('Unknown error'),
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.error,
            },
          ],
        });
      });
    });
  });
});
