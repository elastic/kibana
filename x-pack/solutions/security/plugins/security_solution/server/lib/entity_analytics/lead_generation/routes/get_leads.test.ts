/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getLeadsRoute } from './get_leads';
import { GET_LEADS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockFindLeads = jest.fn();
jest.mock('../lead_data_client', () => ({
  createLeadDataClient: () => ({ findLeads: mockFindLeads }),
}));

describe('getLeadsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    getLeadsRoute(server.router, logger);
  });

  it('returns 200 with paginated leads', async () => {
    mockFindLeads.mockResolvedValueOnce({
      leads: [{ id: 'lead-1', title: 'Test' }],
      total: 1,
      page: 1,
      perPage: 20,
    });

    const request = requestMock.create({
      method: 'get',
      path: GET_LEADS_URL,
      query: { page: '1', perPage: '20' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body.total).toBe(1);
    expect(response.body.leads).toHaveLength(1);
  });

  it('passes query params through to findLeads', async () => {
    mockFindLeads.mockResolvedValueOnce({
      leads: [],
      total: 0,
      page: 2,
      perPage: 10,
    });

    const request = requestMock.create({
      method: 'get',
      path: GET_LEADS_URL,
      query: {
        page: '2',
        perPage: '10',
        sortField: 'timestamp',
        sortOrder: 'asc',
        status: 'dismissed',
      },
    });

    await server.inject(request, context);
    expect(mockFindLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        perPage: 10,
        sortField: 'timestamp',
        sortOrder: 'asc',
        status: 'dismissed',
      })
    );
  });

  it('applies default query params when not provided', async () => {
    mockFindLeads.mockResolvedValueOnce({
      leads: [],
      total: 0,
      page: 1,
      perPage: 20,
    });

    const request = requestMock.create({
      method: 'get',
      path: GET_LEADS_URL,
      query: {},
    });

    await server.inject(request, context);
    expect(mockFindLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        perPage: 20,
        sortField: 'priority',
        sortOrder: 'desc',
      })
    );
  });

  it('returns 500 when data client throws', async () => {
    mockFindLeads.mockRejectedValueOnce(new Error('ES failure'));

    const request = requestMock.create({
      method: 'get',
      path: GET_LEADS_URL,
      query: {},
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });
});
