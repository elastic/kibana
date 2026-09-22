/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { APP_ID } from '../../../../../common';
import { bulkUpdateLeadsRoute } from './bulk_update_leads';
import { BULK_UPDATE_LEADS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockBulkUpdateLeads = jest.fn();
jest.mock('../lead_data_client', () => ({
  createLeadDataClient: () => ({ bulkUpdateLeads: mockBulkUpdateLeads }),
}));

const makeEsSecurityException = () => ({
  statusCode: 403,
  body: { error: { type: 'security_exception', reason: 'access denied' } },
  meta: { body: { error: { type: 'security_exception', reason: 'access denied' } } },
});

describe('bulkUpdateLeadsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    bulkUpdateLeadsRoute(server.router, logger);
  });

  describe('route security config', () => {
    it('declares the required Kibana privileges so users without Security Solution access are rejected', () => {
      const [routeConfig] = server.router.versioned.post.mock.calls[0];
      const authz = routeConfig.security?.authz as { requiredPrivileges?: unknown } | undefined;
      expect(authz?.requiredPrivileges).toEqual(['securitySolution', `${APP_ID}-entity-analytics`]);
    });
  });

  it('returns 200 with updated count', async () => {
    mockBulkUpdateLeads.mockResolvedValueOnce(3);

    const request = requestMock.create({
      method: 'post',
      path: BULK_UPDATE_LEADS_URL,
      body: { ids: ['a', 'b', 'c'], status: 'dismissed' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ updated: 3 });
  });

  it('passes ids and status through to data client', async () => {
    mockBulkUpdateLeads.mockResolvedValueOnce(2);

    const request = requestMock.create({
      method: 'post',
      path: BULK_UPDATE_LEADS_URL,
      body: { ids: ['x', 'y'], status: 'active' },
    });

    await server.inject(request, context);
    expect(mockBulkUpdateLeads).toHaveBeenCalledWith(['x', 'y'], { status: 'active' });
  });

  it('returns 500 on unexpected error', async () => {
    mockBulkUpdateLeads.mockRejectedValueOnce(new Error('cluster down'));

    const request = requestMock.create({
      method: 'post',
      path: BULK_UPDATE_LEADS_URL,
      body: { ids: ['a'], status: 'dismissed' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });

  it('returns 403 when ES denies write access to the leads index', async () => {
    mockBulkUpdateLeads.mockRejectedValueOnce(makeEsSecurityException());

    const request = requestMock.create({
      method: 'post',
      path: BULK_UPDATE_LEADS_URL,
      body: { ids: ['a'], status: 'dismissed' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(403);
  });
});
