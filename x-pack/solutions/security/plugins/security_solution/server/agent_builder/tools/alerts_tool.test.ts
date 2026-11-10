/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { alertsTool, MAX_ALERT_ROWS, SECURITY_ALERTS_TOOL_ID } from './alerts_tool';

jest.mock('@kbn/agent-builder-genai-utils/tools', () => ({
  runSearchTool: jest.fn(),
}));

describe('alertsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockModelProvider = agentBuilderMocks.createModelProvider();
  mockModelProvider.getDefaultModel.mockResolvedValue({ model: 'test-model' } as never);
  const mockEvents = {
    reportProgress: jest.fn(),
    sendUiEvent: jest.fn(),
  };
  const tool = alertsTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    // Existing handler tests assume the space alerts alias is present.
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
  });

  describe('schema', () => {
    it('validates correct schema with required query', () => {
      const result = tool.schema.safeParse({
        query: 'find all alerts',
      });

      expect(result.success).toBe(true);
    });

    it('strips a provided index field (parameter removed for space isolation)', () => {
      const result = tool.schema.safeParse({
        query: 'find alerts',
        index: '.alerts-security.alerts-*',
      });

      // Zod strips unknown keys by default; the handler never reads `index`.
      expect(result.success && !('index' in result.data)).toBe(true);
    });

    it('validates schema with optional isCount', () => {
      const result = tool.schema.safeParse({
        query: 'how many alerts',
        isCount: true,
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing query', () => {
      const result = tool.schema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('rejects non-string query', () => {
      const result = tool.schema.safeParse({
        query: 123,
      });

      expect(result.success).toBe(false);
    });

    it('rejects query longer than 4000 characters', () => {
      const result = tool.schema.safeParse({
        query: 'a'.repeat(4001),
      });

      expect(result.success).toBe(false);
    });

    it('rejects non-boolean isCount', () => {
      const result = tool.schema.safeParse({
        query: 'test',
        isCount: 'yes',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_ALERTS_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'alerts']);
    });

    it('tells the model about the row limit and that grouped results are not cut', () => {
      expect(tool.description).toContain(`at most ${MAX_ALERT_ROWS} alert rows`);
      expect(tool.description).toContain('Grouped (STATS) results are not cut');
    });

    it('describes space-scoped search behavior', () => {
      expect(tool.description).toContain("current space's exact alerts alias");
      expect(tool.description).toMatch(/^Do NOT use platform\.core\.generate_esql/);
      expect(tool.description).toContain('execute_esql');
    });
  });

  describe('handler', () => {
    it('returns 0 alerts without searching when the space alerts alias does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValue(false);

      const result = await tool.handler(
        { query: 'how many alerts', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'testing',
        })
      );

      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: `${DEFAULT_ALERTS_INDEX}-testing`,
      });
      expect(runSearchTool).not.toHaveBeenCalled();
      expect(isToolHandlerStandardReturn(result)).toBe(true);
      expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
      expect((result as ToolHandlerStandardReturn).results[0]).toMatchObject({
        type: ToolResultType.other,
        data: {
          count: 0,
          spaceId: 'testing',
          index: `${DEFAULT_ALERTS_INDEX}-testing`,
          message: expect.stringContaining('There are 0 security alerts'),
        },
      });
    });

    it('calls runSearchTool with the current space alerts alias', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue(mockResults);

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: `${DEFAULT_ALERTS_INDEX}-default`,
      });
      expect(runSearchTool).toHaveBeenCalledWith({
        nlQuery: expect.stringContaining('find all alerts'),
        index: `${DEFAULT_ALERTS_INDEX}-default`,
        esClient: mockEsClient.asCurrentUser,
        modelProvider: mockModelProvider,
        events: mockEvents,
        logger: mockLogger,
        rowLimit: MAX_ALERT_ROWS + 1,
      });
    });

    it('enhances the query with a KEEP clause for essential alert fields', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);
      const fieldsList = ESSENTIAL_ALERT_FIELDS.filter(
        (field) => field !== '_id' && field !== '_index'
      )
        .map((field) => `\`${field}\``)
        .join(', ');

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain(fieldsList);
    });

    describe('result size cap', () => {
      const buildEsqlResult = (
        rowCount: number,
        query = 'FROM alerts | LIMIT 100',
        columnName = 'kibana.alert.uuid'
      ) => ({
        tool_result_id: 'esql-result',
        type: ToolResultType.esqlResults,
        data: {
          query,
          columns: [{ name: columnName, type: 'keyword' }],
          values: Array.from({ length: rowCount }, (_, i) => [`alert-${i}`]),
        },
      });

      const callHandler = async () =>
        (await tool.handler(
          { query: 'find all alerts' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
            modelProvider: mockModelProvider,
            events: mockEvents as ToolHandlerContext['events'],
          })
        )) as ToolHandlerStandardReturn;

      // Why one more than the cap: the generator writes `LIMIT <rowLimit>` when the user gives no
      // number. With a limit equal to the cap, a full page of 25 rows looks the same as "exactly 25
      // rows exist", and the model cannot tell that rows are missing. One extra row shows it.
      it('asks the query generator for one row more than the cap, to detect overflow', async () => {
        (runSearchTool as jest.Mock).mockResolvedValue([]);

        await callHandler();

        expect(runSearchTool).toHaveBeenCalledWith(
          expect.objectContaining({ rowLimit: MAX_ALERT_ROWS + 1 })
        );
      });

      // Why: one 100-row result pushed the agent context to ~160k tokens in security-team#20696.
      it('truncates results above the cap and tells the model how many rows were dropped', async () => {
        const total = MAX_ALERT_ROWS + 35;
        (runSearchTool as jest.Mock).mockResolvedValue([buildEsqlResult(total)]);

        const { results } = await callHandler();

        const [esqlResult, note] = results;
        expect((esqlResult.data as { values: unknown[][] }).values).toHaveLength(MAX_ALERT_ROWS);
        expect((esqlResult.data as { values: unknown[][] }).values[0]).toEqual(['alert-0']);
        expect(note).toMatchObject({
          type: ToolResultType.other,
          data: {
            message: expect.stringContaining(`${MAX_ALERT_ROWS} of at least ${total}`),
          },
        });
      });

      it('returns results at or below the cap unchanged, without a note', async () => {
        const atCap = buildEsqlResult(MAX_ALERT_ROWS);
        (runSearchTool as jest.Mock).mockResolvedValue([atCap]);

        const { results } = await callHandler();

        expect(results).toEqual([atCap]);
      });

      // Why: grouped rows are small, and a user who asks for "top 40 rules" must get 40 rows.
      it('does not truncate aggregated results, which are small and were asked for by number', async () => {
        const grouped = buildEsqlResult(
          MAX_ALERT_ROWS + 15,
          'FROM alerts | STATS count = COUNT(*) BY kibana.alert.rule.name | SORT count DESC | LIMIT 40',
          'kibana.alert.rule.name'
        );
        (runSearchTool as jest.Mock).mockResolvedValue([grouped]);

        const { results } = await callHandler();

        expect(results).toEqual([grouped]);
      });

      // Why: the word STATS can appear in a value, a comment or a quoted name. Only a `| STATS` command
      // makes a result aggregated. Treating a raw query as aggregated would skip the cap.
      it.each([
        ['a quoted value', 'FROM alerts | WHERE host.name == "stats-prod" | LIMIT 100'],
        ['a triple-quoted value', 'FROM alerts | WHERE message == """a STATS b""" | LIMIT 100'],
        ['a comment', 'FROM alerts // STATS later\n| LIMIT 100'],
        ['a quoted identifier', 'FROM alerts | KEEP `STATS` | LIMIT 100'],
      ])('still caps a raw result when STATS only appears in %s', async (_label, query) => {
        const total = MAX_ALERT_ROWS + 35;
        (runSearchTool as jest.Mock).mockResolvedValue([buildEsqlResult(total, query)]);

        const { results } = await callHandler();

        expect((results[0].data as { values: unknown[][] }).values).toHaveLength(MAX_ALERT_ROWS);
        expect(results[1]).toMatchObject({
          data: { message: expect.stringContaining(`${MAX_ALERT_ROWS} of at least ${total}`) },
        });
      });

      it.each([
        [
          'after a quoted pipe',
          'FROM alerts | WHERE message == "a | b" | STATS count = COUNT(*) BY host.name | LIMIT 40',
        ],
        ['on its own line', 'FROM alerts\n| STATS count = COUNT(*) BY host.name\n| LIMIT 40'],
        ['in lower case', 'from alerts | stats count = count(*) by host.name | limit 40'],
      ])(
        'treats a real STATS command %s as aggregated and does not cut it',
        async (_label, query) => {
          const grouped = buildEsqlResult(MAX_ALERT_ROWS + 15, query, 'host.name');
          (runSearchTool as jest.Mock).mockResolvedValue([grouped]);

          const { results } = await callHandler();

          expect(results).toEqual([grouped]);
        }
      );

      it('cuts the probe row and says that more rows exist when the generator hit its default limit', async () => {
        (runSearchTool as jest.Mock).mockResolvedValue([buildEsqlResult(MAX_ALERT_ROWS + 1)]);

        const { results } = await callHandler();

        const [esqlResult, note] = results;
        expect((esqlResult.data as { values: unknown[][] }).values).toHaveLength(MAX_ALERT_ROWS);
        expect(note).toMatchObject({
          data: {
            message: expect.stringContaining(`${MAX_ALERT_ROWS} of at least ${MAX_ALERT_ROWS + 1}`),
          },
        });
      });

      // Why: a grouped result at the default limit may be cut by the generator, and nothing else says so.
      it('keeps a grouped result at the default limit and says that more groups may exist', async () => {
        const groupedQuery = 'FROM alerts | STATS count = COUNT(*) BY host.name | LIMIT 26';
        const grouped = buildEsqlResult(MAX_ALERT_ROWS + 1, groupedQuery, 'host.name');
        (runSearchTool as jest.Mock).mockResolvedValue([grouped]);

        const { results } = await callHandler();

        expect(results[0]).toEqual(grouped);
        expect(results[1]).toMatchObject({
          type: ToolResultType.other,
          data: { message: expect.stringContaining('may be more groups') },
        });
      });

      it('passes error results through untouched', async () => {
        const errorResult = { type: ToolResultType.error, data: { message: 'boom' } };
        (runSearchTool as jest.Mock).mockResolvedValue([errorResult]);

        const { results } = await callHandler();

        expect(results).toEqual([errorResult]);
      });
    });

    it('uses handler context spaceId when building the alerts alias', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);

      await tool.handler(
        { query: 'find all alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'custom-space',
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.index).toBe(`${DEFAULT_ALERTS_INDEX}-custom-space`);
    });

    it('forwards time_window_hours to runSearchTool as a time range', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);

      await tool.handler(
        { query: 'find alerts', time_window_hours: 72 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.timeRange).toEqual({ from: 'now-72h', to: 'now' });
    });

    it('leaves the time range unset when time_window_hours is not provided (24h default preserved)', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);

      await tool.handler(
        { query: 'find alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.timeRange).toBeUndefined();
    });

    it('ignores a caller-supplied index and still uses the space alias', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);

      await tool.handler(
        // Simulate a stale model/tool call that still sends index; schema strips it,
        // and the handler never reads it.
        { query: 'find alerts', index: '.alerts-security.alerts-*' } as { query: string },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
          spaceId: 'qa',
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.index).toBe(`${DEFAULT_ALERTS_INDEX}-qa`);
    });

    it('enhances query with count instructions when isCount is true', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);

      await tool.handler(
        { query: 'how many alerts', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      const callArgs = (runSearchTool as jest.Mock).mock.calls[0][0];
      expect(callArgs.nlQuery).toContain('STATS count = COUNT(*)');
    });

    it('logs debug message with correct parameters', async () => {
      (runSearchTool as jest.Mock).mockResolvedValue([]);

      await tool.handler(
        { query: 'test query', isCount: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `alerts tool called with query: test query, index: ${DEFAULT_ALERTS_INDEX}-default, isCount: true, timeWindowHours: default`
      );
    });

    it('returns results from runSearchTool', async () => {
      const mockResults = [{ type: ToolResultType.other, data: 'test results' }];
      (runSearchTool as jest.Mock).mockResolvedValue(mockResults);

      const result = await tool.handler(
        { query: 'find alerts' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          modelProvider: mockModelProvider,
          events: mockEvents as ToolHandlerContext['events'],
        })
      );

      expect(result).toEqual({ results: mockResults });
    });
  });
});
