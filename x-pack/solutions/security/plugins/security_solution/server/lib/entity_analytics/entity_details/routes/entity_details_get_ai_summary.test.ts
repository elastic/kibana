/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AiSummaryMetadataDoc } from '@kbn/entity-store/common';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockGetLatestByEntityId = jest.fn();
const mockCreateEntityMetadataClient = jest.fn(() => ({
  getLatestByEntityId: mockGetLatestByEntityId,
}));

const mockGetStartServices = jest.fn();
const mockAsCurrentUser = { mock: 'current-user-client' };
const mockAsScoped = jest.fn(() => ({ asCurrentUser: mockAsCurrentUser }));

// Import after mocks are set up
import { entityDetailsGetAiSummaryRoute } from './entity_details_get_ai_summary';

const STORED_DOC: AiSummaryMetadataDoc = {
  '@timestamp': '2026-05-15T10:30:00.000Z',
  'event.kind': 'event',
  'event.action': 'ai_summary_generated',
  'entity.id': 'user:alice@local',
  'entity.type': 'user',
  'Ai_summary.generated_by': 'alice',
  'Ai_summary.generated_at': 1748771200000,
  'Ai_summary.highlights': [{ title: 'Risk overview', text: 'Elevated risk.' }],
  'Ai_summary.recommended_actions': ['Investigate login activity'],
  'Ai_summary.staleness': {
    enabled_signals: ['risk_score'],
    snapshot: { risk_score: 72.5 },
  },
};

describe('GET /internal/entity_details/ai_summary - entityDetailsGetAiSummaryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockGetLatestByEntityId.mockReset();
    mockCreateEntityMetadataClient.mockClear();
    mockAsScoped.mockClear();

    (context.securitySolution as unknown as { getSpaceId: jest.Mock }).getSpaceId = jest
      .fn()
      .mockReturnValue('default');

    mockGetStartServices.mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: mockAsScoped,
          },
        },
      },
      {
        entityStore: {
          createEntityMetadataClient: mockCreateEntityMetadataClient,
        },
      },
    ]);

    entityDetailsGetAiSummaryRoute({
      router: server.router,
      getStartServices: mockGetStartServices,
      logger,
    } as unknown as Parameters<typeof entityDetailsGetAiSummaryRoute>[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (entityId = 'user:alice@local', entityType = 'user') =>
    requestMock.create({
      method: 'get',
      path: ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL,
      query: { entityId, entityType },
    });

  it('returns the persisted summary mapped from the metadata doc with canRead: true', async () => {
    mockGetLatestByEntityId.mockResolvedValue(STORED_DOC);
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      canRead: true,
      summary: {
        highlights: [{ title: 'Risk overview', text: 'Elevated risk.' }],
        recommended_actions: ['Investigate login activity'],
        generated_at: 1748771200000,
        generated_by: 'alice',
        staleness: { enabled_signals: ['risk_score'], snapshot: { risk_score: 72.5 } },
      },
    });
  });

  it('includes author_profile_uid when present on the metadata doc', async () => {
    const uid = 'u_alice';
    mockGetLatestByEntityId.mockResolvedValue({
      ...STORED_DOC,
      'Ai_summary.author_profile_uid': uid,
    });
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body.summary.author_profile_uid).toBe(uid);
  });

  it('returns { summary: null, canRead: true } when no summary exists', async () => {
    mockGetLatestByEntityId.mockResolvedValue(null);
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ summary: null, canRead: true });
  });

  it('reads as the current user (asCurrentUser), honouring the caller index privileges', async () => {
    mockGetLatestByEntityId.mockResolvedValue(null);
    await server.inject(buildRequest(), context);

    expect(mockCreateEntityMetadataClient).toHaveBeenCalledWith(mockAsCurrentUser, 'default');
  });

  it('queries with the ai_summary_generated event action and the requested entityId', async () => {
    mockGetLatestByEntityId.mockResolvedValue(null);
    await server.inject(buildRequest('host:server-1', 'host'), context);

    expect(mockGetLatestByEntityId).toHaveBeenCalledWith({
      entityId: 'host:server-1',
      eventAction: 'ai_summary_generated',
    });
  });

  it('falls back to { summary: null, canRead: false } on a 403 (no metadata read access)', async () => {
    mockGetLatestByEntityId.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 })
    );
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ summary: null, canRead: false });
  });

  it('surfaces non-authz errors as an error response', async () => {
    mockGetLatestByEntityId.mockRejectedValue(
      Object.assign(new Error('ES read failed'), { statusCode: 500 })
    );
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(logger.error).toHaveBeenCalledWith(
      '[EntityAiSummary] Failed to read persisted AI summary: ES read failed'
    );
  });
});
