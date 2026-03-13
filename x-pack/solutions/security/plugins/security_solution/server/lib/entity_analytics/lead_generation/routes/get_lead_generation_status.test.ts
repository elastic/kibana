/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getLeadGenerationStatusRoute } from './get_lead_generation_status';
import { LEAD_GENERATION_STATUS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockGetStatus = jest.fn();
jest.mock('../lead_data_client', () => ({
  createLeadDataClient: () => ({ getStatus: mockGetStatus }),
}));

describe('getLeadGenerationStatusRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    getLeadGenerationStatusRoute(server.router, logger);
  });

  it('returns 200 with engine status', async () => {
    mockGetStatus.mockResolvedValueOnce({
      isEnabled: false,
      indexExists: true,
      totalLeads: 42,
      lastRun: '2026-03-10T00:00:00.000Z',
    });

    const request = requestMock.create({
      method: 'get',
      path: LEAD_GENERATION_STATUS_URL,
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      isEnabled: false,
      indexExists: true,
      totalLeads: 42,
      lastRun: '2026-03-10T00:00:00.000Z',
    });
  });

  it('returns 500 on error', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('status check failed'));

    const request = requestMock.create({
      method: 'get',
      path: LEAD_GENERATION_STATUS_URL,
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });
});
