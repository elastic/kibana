/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';

import { buildDefaultEsqlQuery } from '@kbn/discoveries/impl/lib/build_default_esql_query';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';

jest.mock('@kbn/discoveries/impl/lib/build_default_esql_query');
jest.mock('@kbn/discoveries/impl/lib/helpers/get_space_id');
jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

const mockBuildDefaultEsqlQuery = buildDefaultEsqlQuery as jest.MockedFunction<
  typeof buildDefaultEsqlQuery
>;
const mockGetSpaceId = getSpaceId as jest.MockedFunction<typeof getSpaceId>;

const mockEsClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockRequest = {
  headers: {},
} as never;

const mockGetStartServices = jest.fn().mockResolvedValue({
  coreStart: {
    elasticsearch: {
      client: {
        asScoped: jest.fn().mockReturnValue({
          asCurrentUser: mockEsClient,
        }),
      },
    },
  } as unknown as CoreStart,
  pluginsStart: {
    spaces: {
      spacesService: {},
    },
  },
});

describe('GET /internal/attack_discovery/attack_discovery/queries/esql/default', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSpaceId.mockReturnValue('default');
    mockBuildDefaultEsqlQuery.mockResolvedValue(
      [
        'FROM .alerts-security.alerts-default',
        '    METADATA _id',
        '  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")',
        '  | WHERE kibana.alert.building_block_type IS NULL',
        '  | SORT kibana.alert.risk_score DESC, @timestamp DESC',
        '  | LIMIT 100',
        '  | KEEP',
        '      _id,',
        '      @timestamp,',
        '      host.name,',
        '      user.name',
      ].join('\n')
    );
  });

  it('calls getSpaceId with the request and spaces service', async () => {
    const { handleGetDefaultEsqlQuery } = await import('./get_default_esql_query');

    await handleGetDefaultEsqlQuery({
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(mockGetSpaceId).toHaveBeenCalledWith({
      request: mockRequest,
      spaces: expect.anything(),
    });
  });

  it('calls buildDefaultEsqlQuery with the user-scoped ES client and spaceId', async () => {
    const { handleGetDefaultEsqlQuery } = await import('./get_default_esql_query');

    await handleGetDefaultEsqlQuery({
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(mockBuildDefaultEsqlQuery).toHaveBeenCalledWith({
      esClient: mockEsClient,
      logger: mockLogger,
      spaceId: 'default',
    });
  });

  it('returns the query string from buildDefaultEsqlQuery', async () => {
    const { handleGetDefaultEsqlQuery } = await import('./get_default_esql_query');

    const result = await handleGetDefaultEsqlQuery({
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result).toEqual({
      query: expect.stringContaining('FROM .alerts-security.alerts-default'),
    });
  });

  it('uses the space ID from getSpaceId in the query', async () => {
    mockGetSpaceId.mockReturnValue('my-custom-space');
    mockBuildDefaultEsqlQuery.mockResolvedValue(
      [
        'FROM .alerts-security.alerts-my-custom-space',
        '    METADATA _id',
        '  | KEEP',
        '      _id,',
        '      @timestamp',
      ].join('\n')
    );

    const { handleGetDefaultEsqlQuery } = await import('./get_default_esql_query');

    await handleGetDefaultEsqlQuery({
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(mockBuildDefaultEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'my-custom-space' })
    );
  });

  it('throws when buildDefaultEsqlQuery fails', async () => {
    mockBuildDefaultEsqlQuery.mockRejectedValue(new Error('index_not_found_exception'));

    const { handleGetDefaultEsqlQuery } = await import('./get_default_esql_query');

    await expect(
      handleGetDefaultEsqlQuery({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
        request: mockRequest,
      })
    ).rejects.toThrow('index_not_found_exception');
  });
});

describe('registerGetDefaultEsqlQueryRoute feature flag', () => {
  it('returns 404 when the feature flag is disabled', async () => {
    const { assertWorkflowsEnabled } = await import('../../../lib/assert_workflows_enabled');
    (assertWorkflowsEnabled as jest.Mock).mockImplementationOnce(
      ({ response: r }: { response: ReturnType<typeof httpServerMock.createResponseFactory> }) =>
        r.notFound({ body: { message: 'Attack Discovery workflows are not enabled' } })
    );

    const { registerGetDefaultEsqlQueryRoute } = await import('./get_default_esql_query');

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetDefaultEsqlQueryRoute(router, mockLogger, {
      getStartServices: mockGetStartServices,
    });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await handler({}, request, response);

    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });
});
