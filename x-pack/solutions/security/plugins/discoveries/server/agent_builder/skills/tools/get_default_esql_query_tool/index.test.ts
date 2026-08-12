/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { GET_DEFAULT_ESQL_QUERY_TOOL_ID, getDefaultEsqlQueryTool } from '.';

const mockBuildDefaultEsqlQuery = jest.fn();

jest.mock('@kbn/discoveries/impl/lib/build_default_esql_query', () => ({
  buildDefaultEsqlQuery: (...args: unknown[]) => mockBuildDefaultEsqlQuery(...args),
}));

describe('GET_DEFAULT_ESQL_QUERY_TOOL_ID', () => {
  it('has the expected value', () => {
    expect(GET_DEFAULT_ESQL_QUERY_TOOL_ID).toBe('security.attack-discovery.get_default_esql_query');
  });
});

describe('getDefaultEsqlQueryTool', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockEsClient = elasticsearchClientMock.createScopedClusterClient();

  const mockContext = {
    ...agentBuilderMocks.tools.createHandlerContext(),
    esClient: mockEsClient,
    logger: mockLogger,
    spaceId: 'test-space',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a tool with the expected id', () => {
    const tool = getDefaultEsqlQueryTool();

    expect(tool.id).toBe(GET_DEFAULT_ESQL_QUERY_TOOL_ID);
  });

  it('returns a builtin tool type', () => {
    const tool = getDefaultEsqlQueryTool();

    expect(tool.type).toBe(ToolType.builtin);
  });

  it('has a non-empty description', () => {
    const tool = getDefaultEsqlQueryTool();

    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('has no required schema properties', () => {
    const tool = getDefaultEsqlQueryTool();

    const parsed = tool.schema.safeParse({});

    expect(parsed.success).toBe(true);
  });

  describe('handler', () => {
    const expectedQuery =
      'FROM .alerts-security.alerts-test-space\n  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")';

    it('calls buildDefaultEsqlQuery with the correct parameters', async () => {
      mockBuildDefaultEsqlQuery.mockResolvedValueOnce(expectedQuery);

      const tool = getDefaultEsqlQueryTool();

      await tool.handler({}, mockContext);

      expect(mockBuildDefaultEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        logger: mockLogger,
        spaceId: 'test-space',
      });
    });

    it('returns the query wrapped in an other-typed tool result', async () => {
      mockBuildDefaultEsqlQuery.mockResolvedValueOnce(expectedQuery);

      const tool = getDefaultEsqlQueryTool();

      const result = await tool.handler({}, mockContext);

      expect(result).toEqual({
        results: [
          {
            data: { query: expectedQuery },
            tool_result_id: expect.any(String),
            type: ToolResultType.other,
          },
        ],
      });
    });

    it('returns an error result when buildDefaultEsqlQuery throws', async () => {
      mockBuildDefaultEsqlQuery.mockRejectedValueOnce(new Error('ES connection failed'));

      const tool = getDefaultEsqlQueryTool();

      const result = await tool.handler({}, mockContext);

      expect(result).toEqual({
        results: [
          {
            data: {
              message: 'Failed to build default ES|QL query: ES connection failed',
            },
            tool_result_id: expect.any(String),
            type: ToolResultType.error,
          },
        ],
      });
    });

    it('handles non-Error thrown values', async () => {
      mockBuildDefaultEsqlQuery.mockRejectedValueOnce('unexpected string error');

      const tool = getDefaultEsqlQueryTool();

      const result = await tool.handler({}, mockContext);

      expect(result).toEqual({
        results: [
          {
            data: {
              message: 'Failed to build default ES|QL query: Unknown error',
            },
            tool_result_id: expect.any(String),
            type: ToolResultType.error,
          },
        ],
      });
    });
  });
});
