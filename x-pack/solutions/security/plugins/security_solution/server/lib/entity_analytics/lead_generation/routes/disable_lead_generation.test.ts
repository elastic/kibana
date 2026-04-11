/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { disableLeadGenerationRoute } from './disable_lead_generation';
import { DISABLE_LEAD_GENERATION_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

describe('disableLeadGenerationRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    disableLeadGenerationRoute(server.router, logger);
  });

  it('returns 200 with success (placeholder)', async () => {
    const request = requestMock.create({
      method: 'post',
      path: DISABLE_LEAD_GENERATION_URL,
      body: {},
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: true });
  });
});
