/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GET_ILM_EXPLAIN } from '../../common/constants';

import { fetchILMExplain } from '../lib';

import { serverMock } from '../__mocks__/server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { getILMExplainRoute } from './get_ilm_explain';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

jest.mock('../lib', () => ({
  fetchILMExplain: jest.fn(),
}));

describe('getILMExplainRoute route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let logger: MockedLogger;

  const req = requestMock.create({
    method: 'get',
    path: GET_ILM_EXPLAIN,
    params: {
      pattern: '.internal.alerts-security.alerts-default-000001',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    logger = loggerMock.create();
    ({ context } = requestContextMock.createTools());

    getILMExplainRoute(server.router, logger);
  });

  test('Returns index ilm information', async () => {
    const mockIlmExplain = {
      indices: {
        '.internal.alerts-security.alerts-default-000001': {
          index: '.internal.alerts-security.alerts-default-000001',
          managed: true,
          policy: '.alerts-ilm-policy',
          index_creation_date_millis: 1673997720742,
          time_since_index_creation: '13.96d',
          lifecycle_date_millis: 1673997720742,
          age: '13.96d',
          phase: 'hot',
          phase_time_millis: 1673997721040,
          action: 'rollover',
          action_time_millis: 1673997721040,
          step: 'check-rollover-ready',
          step_time_millis: 1673997721040,
          phase_execution: {
            policy: '.alerts-ilm-policy',
            phase_definition: {
              min_age: '0ms',
              actions: {
                rollover: {
                  max_primary_shard_size: '50gb',
                  max_age: '30d',
                },
              },
            },
            version: 1,
            modified_date_in_millis: 1673996949964,
          },
        },
      },
    };

    (fetchILMExplain as jest.Mock).mockResolvedValue(mockIlmExplain);

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockIlmExplain.indices);
  });

  test('Handles error', async () => {
    const errorMessage = 'Error!';
    (fetchILMExplain as jest.Mock).mockRejectedValue({ message: errorMessage });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
  });
});

describe('request validation', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: MockedLogger;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();

    getILMExplainRoute(server.router, logger);
  });

  test('disallows invalid pattern', () => {
    const request = requestMock.create({
      method: 'get',
      path: GET_ILM_EXPLAIN,
      params: {
        pattern: 123,
      },
    });
    const result = server.validate(request);

    expect(result.badRequest).toHaveBeenCalled();
  });
});
