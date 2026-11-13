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
const mockIsAuthorizedToBuildDefaultQuery = jest.fn();

jest.mock('./is_authorized_to_build_default_query', () => ({
  isAuthorizedToBuildDefaultQuery: (...args: unknown[]) =>
    mockIsAuthorizedToBuildDefaultQuery(...args),
}));

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

  const mockAuthz = { actions: {} };
  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {},
    pluginsStart: { security: { authz: mockAuthz } },
  });

  const createTool = () =>
    getDefaultEsqlQueryTool({
      getStartServices: mockGetStartServices as unknown as NonNullable<
        Parameters<typeof getDefaultEsqlQueryTool>[0]
      >['getStartServices'],
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthorizedToBuildDefaultQuery.mockResolvedValue(true);
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

      const tool = createTool();

      await tool.handler({}, mockContext);

      expect(mockBuildDefaultEsqlQuery).toHaveBeenCalledWith({
        anonymizationFieldsEsClient: mockEsClient.asInternalUser,
        esClient: mockEsClient.asCurrentUser,
        logger: mockLogger,
        spaceId: 'test-space',
      });
    });

    it('checks the caller against the request and space', async () => {
      mockBuildDefaultEsqlQuery.mockResolvedValueOnce(expectedQuery);

      const tool = createTool();

      await tool.handler({}, mockContext);

      expect(mockIsAuthorizedToBuildDefaultQuery).toHaveBeenCalledWith({
        authz: mockAuthz,
        request: mockContext.request,
        spaceId: 'test-space',
      });
    });

    describe('when the caller is not authorized', () => {
      beforeEach(() => {
        mockIsAuthorizedToBuildDefaultQuery.mockResolvedValue(false);
      });

      it('returns an error result without building the query', async () => {
        const tool = createTool();

        const result = await tool.handler({}, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                message: expect.stringContaining('Unauthorized'),
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.error,
            },
          ],
        });
        expect(mockBuildDefaultEsqlQuery).not.toHaveBeenCalled();
      });

      it('never touches the internal user client', async () => {
        const internalClientAccess = jest.fn();
        const guardedEsClient = Object.defineProperty(
          { asCurrentUser: mockEsClient.asCurrentUser },
          'asInternalUser',
          { get: internalClientAccess }
        );

        const tool = createTool();

        await tool.handler({}, { ...mockContext, esClient: guardedEsClient } as never);

        expect(internalClientAccess).not.toHaveBeenCalled();
      });
    });

    describe('when the tool cannot resolve the security services', () => {
      it('refuses to build the query', async () => {
        const tool = getDefaultEsqlQueryTool();

        const result = await tool.handler({}, mockContext);

        expect(result).toEqual({
          results: [
            {
              data: {
                message: expect.stringContaining('Unable to verify'),
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.error,
            },
          ],
        });
        expect(mockBuildDefaultEsqlQuery).not.toHaveBeenCalled();
      });
    });

    it('returns the query wrapped in an other-typed tool result', async () => {
      mockBuildDefaultEsqlQuery.mockResolvedValueOnce(expectedQuery);

      const tool = createTool();

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

      const tool = createTool();

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

      const tool = createTool();

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
