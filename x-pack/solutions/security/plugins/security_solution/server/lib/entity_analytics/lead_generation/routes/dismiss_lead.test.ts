/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { dismissLeadRoute } from './dismiss_lead';
import { DISMISS_LEAD_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockDismissLead = jest.fn();
jest.mock('../lead_data_client', () => ({
  createLeadDataClient: () => ({ dismissLead: mockDismissLead }),
}));

describe('dismissLeadRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    dismissLeadRoute(server.router, logger);
  });

  it('returns 200 with success when lead is dismissed', async () => {
    mockDismissLead.mockResolvedValueOnce(true);

    const request = requestMock.create({
      method: 'post',
      path: DISMISS_LEAD_URL,
      params: { id: 'lead-1' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: true });
  });

  it('returns 404 when lead is not found', async () => {
    mockDismissLead.mockResolvedValueOnce(false);

    const request = requestMock.create({
      method: 'post',
      path: DISMISS_LEAD_URL,
      params: { id: 'nonexistent' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(404);
  });

  it('returns 500 on unexpected error', async () => {
    mockDismissLead.mockRejectedValueOnce(new Error('unexpected'));

    const request = requestMock.create({
      method: 'post',
      path: DISMISS_LEAD_URL,
      params: { id: 'lead-1' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });
});
