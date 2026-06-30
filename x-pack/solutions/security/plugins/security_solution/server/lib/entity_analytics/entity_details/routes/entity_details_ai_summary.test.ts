/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockBulkAppendMetadata = jest.fn();
const mockCreateEntityMetadataClient = jest.fn(() => ({
  bulkAppendMetadata: mockBulkAppendMetadata,
}));

const mockGetStartServices = jest.fn();

// Import after mocks are set up
import { entityDetailsAiSummaryRoute } from './entity_details_ai_summary';

const BASE_REQUEST_BODY = {
  entityId: 'user:alice@local',
  entityType: 'user',
  summary: {
    highlights: [{ title: 'Risk overview', text: 'Entity has elevated risk.' }],
    recommendedActions: ['Investigate login activity'],
    generated_at: 1748771200000,
    staleness: {
      enabled_signals: ['risk_score'],
      snapshot: { risk_score: 72.5 },
    },
  },
};

describe('POST /internal/entity_details/ai_summary - entityDetailsAiSummaryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockBulkAppendMetadata.mockReset().mockResolvedValue({ successful: 1, failed: 0 });
    mockCreateEntityMetadataClient.mockClear();

    // Set up authenticated user
    context.core.security.authc.getCurrentUser = jest.fn().mockReturnValue({ username: 'test-user' });
    context.securitySolution.getSpaceId = jest.fn().mockReturnValue('default');

    mockGetStartServices.mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: {},
          },
        },
      },
      {
        entityStore: {
          createEntityMetadataClient: mockCreateEntityMetadataClient,
        },
      },
    ]);

    entityDetailsAiSummaryRoute({
      router: server.router,
      getStartServices: mockGetStartServices,
      logger,
    } as Parameters<typeof entityDetailsAiSummaryRoute>[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (body: object = BASE_REQUEST_BODY) =>
    requestMock.create({
      method: 'post',
      path: ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL,
      body,
    });

  it('returns 200 with { created: true } on success', async () => {
    const request = buildRequest();
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ created: true });
  });

  it('calls bulkAppendMetadata with exactly 1 document', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    expect(mockBulkAppendMetadata).toHaveBeenCalledTimes(1);
    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs).toHaveLength(1);
  });

  it('sets event.action to "ai_summary_generated"', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['event.action']).toBe('ai_summary_generated');
    expect(docs[0]['event.kind']).toBe('event');
  });

  it('derives ai_summary.generated_by from the authenticated user, not the request body', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['ai_summary.generated_by']).toBe('test-user');
  });

  it('sets entity.id and entity.type from the request body', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['entity.id']).toBe('user:alice@local');
    expect(docs[0]['entity.type']).toBe('user');
  });

  it('includes ai_summary.highlights and ai_summary.staleness from the request body', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['ai_summary.highlights']).toEqual(BASE_REQUEST_BODY.summary.highlights);
    expect(docs[0]['ai_summary.staleness']).toEqual(BASE_REQUEST_BODY.summary.staleness);
  });

  it('uses asInternalUser — createEntityMetadataClient is called with the internal ES client', async () => {
    const internalEsClient = { mock: 'internal-client' };
    mockGetStartServices.mockResolvedValue([
      { elasticsearch: { client: { asInternalUser: internalEsClient } } },
      { entityStore: { createEntityMetadataClient: mockCreateEntityMetadataClient } },
    ]);

    const request = buildRequest();
    await server.inject(request, context);

    expect(mockCreateEntityMetadataClient).toHaveBeenCalledWith(internalEsClient, 'default');
  });

  it('falls back to "unknown" for ai_summary.generated_by when no authenticated user', async () => {
    context.core.security.authc.getCurrentUser = jest.fn().mockReturnValue(null);

    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['ai_summary.generated_by']).toBe('unknown');
  });

  it('returns 500 when bulkAppendMetadata throws', async () => {
    mockBulkAppendMetadata.mockRejectedValue(new Error('ES write failed'));

    const request = buildRequest();
    const response = await server.inject(request, context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: 'ES write failed', status_code: 500 });
    expect(logger.error).toHaveBeenCalledWith(
      '[EntityAiSummary] Failed to persist AI summary: ES write failed'
    );
  });
});
