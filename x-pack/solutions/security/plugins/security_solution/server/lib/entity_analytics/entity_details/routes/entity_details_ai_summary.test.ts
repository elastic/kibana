/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  MAX_ENTITY_SUMMARY_HIGHLIGHTS,
  MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS,
} from '@kbn/entity-store/common/entity_summary';
import {
  ENTITY_METADATA,
  ENTITY_SCHEMA_VERSION_V2,
  getEntityIndexPattern,
} from '@kbn/entity-store/common';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import { ENTITY_AI_SUMMARY_PERSISTED_EVENT } from '../../../telemetry/event_based/events';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockBulkAppendMetadata = jest.fn();
const mockCreateEntityMetadataClient = jest.fn(() => ({
  bulkAppendMetadata: mockBulkAppendMetadata,
}));

const mockCheckPrivileges = jest.fn();
const mockCheckPrivilegesDynamicallyWithRequest = jest.fn(() => mockCheckPrivileges);
const mockGetStartServices = jest.fn();

// Import after mocks are set up
import { entityDetailsAiSummaryRoute } from './entity_details_ai_summary';

const BASE_REQUEST_BODY = {
  entityId: 'user:alice@local',
  entityType: 'user',
  summary: {
    highlights: [{ title: 'Risk overview', text: 'Entity has elevated risk.' }],
    recommended_actions: ['Investigate login activity'],
    generated_at: 1748771200000,
    staleness: {
      enabled_signals: ['risk_score'],
      snapshot: { risk_score: 72.5 },
    },
  },
};

describe('POST /internal/entity_details/ai_summary - entityDetailsAiSummaryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let ctx: ReturnType<typeof requestContextMock.createTools>['context'];
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;
  let mockReportEvent: jest.Mock;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    ({ context: ctx } = requestContextMock.createTools());

    mockBulkAppendMetadata.mockReset().mockResolvedValue({ successful: 1, failed: 0 });
    mockCreateEntityMetadataClient.mockClear();
    mockCheckPrivileges.mockReset().mockResolvedValue({ hasAllRequested: true });
    mockCheckPrivilegesDynamicallyWithRequest.mockClear();

    // Mocks must be configured on the raw context before convertContext wraps it —
    // mutating the converted context.core does not propagate through to the route.
    // Authenticated user (getCurrentUser is already a jest.Mock on the core mock).
    (ctx.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'test-user',
    });

    // getSpaceId already returns 'default'. Use a stable analytics mock so the telemetry
    // assertions can inspect reportEvent regardless of how many times getAnalytics is called.
    mockReportEvent = jest.fn();
    (ctx.securitySolution.getAnalytics as jest.Mock).mockReturnValue({
      reportEvent: mockReportEvent,
    });

    context = requestContextMock.convertContext(ctx);

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
        security: {
          authz: {
            checkPrivilegesDynamicallyWithRequest: mockCheckPrivilegesDynamicallyWithRequest,
          },
        },
      },
    ]);

    entityDetailsAiSummaryRoute({
      router: server.router,
      getStartServices: mockGetStartServices,
      logger,
    } as unknown as Parameters<typeof entityDetailsAiSummaryRoute>[0]);
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

  it('derives Ai_summary.generated_by from the authenticated user, not the request body', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['Ai_summary.generated_by']).toBe('test-user');
  });

  it('sets entity.id and entity.type from the request body', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['entity.id']).toBe('user:alice@local');
    expect(docs[0]['entity.type']).toBe('user');
  });

  it('includes Ai_summary.highlights and Ai_summary.staleness from the request body', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['Ai_summary.highlights']).toEqual(BASE_REQUEST_BODY.summary.highlights);
    expect(docs[0]['Ai_summary.staleness']).toEqual(BASE_REQUEST_BODY.summary.staleness);
  });

  it('checks metadata read privileges, then writes via asInternalUser', async () => {
    const internalEsClient = { mock: 'internal-client' };
    mockGetStartServices.mockResolvedValue([
      {
        elasticsearch: {
          client: { asInternalUser: internalEsClient },
        },
      },
      {
        entityStore: { createEntityMetadataClient: mockCreateEntityMetadataClient },
        security: {
          authz: {
            checkPrivilegesDynamicallyWithRequest: mockCheckPrivilegesDynamicallyWithRequest,
          },
        },
      },
    ]);

    const request = buildRequest();
    await server.inject(request, context);

    expect(mockCheckPrivilegesDynamicallyWithRequest).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      elasticsearch: {
        cluster: [],
        index: {
          [getEntityIndexPattern({
            schemaVersion: ENTITY_SCHEMA_VERSION_V2,
            dataset: ENTITY_METADATA,
            namespace: 'default',
          })]: ['read'],
        },
      },
    });
    expect(mockCreateEntityMetadataClient).toHaveBeenCalledTimes(1);
    expect(mockCreateEntityMetadataClient).toHaveBeenCalledWith(internalEsClient, 'default');
  });

  it('returns { created: false } and does not persist when the user lacks metadata read access', async () => {
    mockCheckPrivileges.mockResolvedValue({ hasAllRequested: false });

    const request = buildRequest();
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ created: false });
    expect(mockBulkAppendMetadata).not.toHaveBeenCalled();
    expect(mockReportEvent).not.toHaveBeenCalled();
  });

  it('falls back to "unknown" for Ai_summary.generated_by when no authenticated user', async () => {
    // Same jest.Mock reference the converted context wraps, so this applies at request time.
    (ctx.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue(null);

    const request = buildRequest();
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['Ai_summary.generated_by']).toBe('unknown');
  });

  it('caps highlights and recommendedActions in the persisted document', async () => {
    const overshootHighlights = Array.from(
      { length: MAX_ENTITY_SUMMARY_HIGHLIGHTS + 2 },
      (_, i) => ({ title: `h${i}`, text: `t${i}` })
    );
    const overshootActions = Array.from(
      { length: MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS + 3 },
      (_, i) => `action ${i}`
    );

    const request = buildRequest({
      ...BASE_REQUEST_BODY,
      summary: {
        ...BASE_REQUEST_BODY.summary,
        highlights: overshootHighlights,
        recommended_actions: overshootActions,
      },
    });
    await server.inject(request, context);

    const [docs] = mockBulkAppendMetadata.mock.calls[0];
    expect(docs[0]['Ai_summary.highlights']).toHaveLength(MAX_ENTITY_SUMMARY_HIGHLIGHTS);
    expect(docs[0]['Ai_summary.highlights']).toEqual(
      overshootHighlights.slice(0, MAX_ENTITY_SUMMARY_HIGHLIGHTS)
    );
    expect(docs[0]['Ai_summary.recommended_actions']).toHaveLength(
      MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS
    );
    expect(docs[0]['Ai_summary.recommended_actions']).toEqual(
      overshootActions.slice(0, MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS)
    );
  });

  it('reports the model pre-cap counts supplied by the client (independent of the capped doc)', async () => {
    // The client sends raw model counts that exceed the caps; the persisted doc is still
    // capped, but telemetry must reflect the raw (pre-cap) numbers to reveal overshoot.
    const request = buildRequest({
      ...BASE_REQUEST_BODY,
      modelOutputCounts: {
        highlights: MAX_ENTITY_SUMMARY_HIGHLIGHTS + 2,
        recommendedActions: MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS + 3,
      },
    });
    await server.inject(request, context);

    expect(mockReportEvent).toHaveBeenCalledWith(ENTITY_AI_SUMMARY_PERSISTED_EVENT.eventType, {
      entityType: 'user',
      spaceId: 'default',
      highlightsCount: MAX_ENTITY_SUMMARY_HIGHLIGHTS + 2,
      recommendedActionsCount: MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS + 3,
    });
  });

  it('falls back to the persisted counts when the client omits modelOutputCounts', async () => {
    const request = buildRequest();
    await server.inject(request, context);

    expect(mockReportEvent).toHaveBeenCalledWith(ENTITY_AI_SUMMARY_PERSISTED_EVENT.eventType, {
      entityType: 'user',
      spaceId: 'default',
      highlightsCount: 1,
      recommendedActionsCount: 1,
    });
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

  it('returns 500 and does not report telemetry when the write is dropped (failed > 0)', async () => {
    // A dropped doc resolves (does not throw) to { successful: 0, failed: 1 }. The route
    // must surface this as an error so the client does not treat an unwritten summary as
    // persisted (it would read back as null on reopen).
    mockBulkAppendMetadata.mockResolvedValue({ successful: 0, failed: 1 });

    const request = buildRequest();
    const response = await server.inject(request, context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'AI summary document was dropped from the metadata bulk write',
      status_code: 500,
    });
    expect(mockReportEvent).not.toHaveBeenCalled();
  });

  it('returns 403 and does not persist when the license is below enterprise', async () => {
    // Simulate a cluster on a sub-enterprise license (e.g. basic): `withLicense` must
    // block before any persistence. Configure the downgrade on the raw context, then
    // re-convert so the gate observes it at request time.
    (ctx.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);
    const licenseGatedContext = requestContextMock.convertContext(ctx);

    const response = await server.inject(buildRequest(), licenseGatedContext);

    expect(response.status).toEqual(403);
    expect(mockBulkAppendMetadata).not.toHaveBeenCalled();
  });
});
