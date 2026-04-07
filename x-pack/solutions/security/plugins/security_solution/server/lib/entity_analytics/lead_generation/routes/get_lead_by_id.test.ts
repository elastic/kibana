/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getLeadByIdRoute } from './get_lead_by_id';
import { GET_LEAD_BY_ID_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockGetLeadById = jest.fn();
jest.mock('../lead_data_client', () => ({
  createLeadDataClient: () => ({ getLeadById: mockGetLeadById }),
}));

describe('getLeadByIdRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    getLeadByIdRoute(server.router, logger);
  });

  it('returns 200 with the lead when found', async () => {
    const lead = { id: 'lead-1', title: 'Found Lead', priority: 8 };
    mockGetLeadById.mockResolvedValueOnce(lead);

    const request = requestMock.create({
      method: 'get',
      path: GET_LEAD_BY_ID_URL,
      params: { id: 'lead-1' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body.id).toBe('lead-1');
  });

  it('returns 404 when lead is not found', async () => {
    mockGetLeadById.mockResolvedValueOnce(null);

    const request = requestMock.create({
      method: 'get',
      path: GET_LEAD_BY_ID_URL,
      params: { id: 'nonexistent' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(404);
    expect(response.body.message).toContain('nonexistent');
  });

  it('returns 500 on unexpected error', async () => {
    mockGetLeadById.mockRejectedValueOnce(new Error('unexpected'));

    const request = requestMock.create({
      method: 'get',
      path: GET_LEAD_BY_ID_URL,
      params: { id: 'lead-1' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });
});
