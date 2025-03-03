/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock, requestContextMock, requestMock } from '../../../../routes/__mocks__';

import { GET_RULE_EXECUTION_RESULTS_URL } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { getRuleExecutionResultsResponseMock } from '../../../../../../../common/api/detection_engine/rule_monitoring/mocks';
import { getRuleExecutionResultsRoute } from './get_rule_execution_results_route';

describe('getRuleExecutionResultsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  const getRuleExecutionResultsRequest = () =>
    requestMock.create({
      method: 'get',
      path: GET_RULE_EXECUTION_RESULTS_URL,
      params: {
        ruleId: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      },
      query: {
        start: '2022-03-31T22:02:01.622Z',
        end: '2022-03-31T22:02:31.622Z',
      },
    });

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    getRuleExecutionResultsRoute(server.router);
  });

  describe('when it finds results in rule execution log', () => {
    it('returns 200 response with the results', async () => {
      const results = getRuleExecutionResultsResponseMock.getSomeResponse();
      clients.ruleExecutionLog.getExecutionResults.mockResolvedValue(results);

      const response = await server.inject(
        getRuleExecutionResultsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(results);
    });
  });

  describe('when rule execution log client throws an error', () => {
    it('returns 500 response with it', async () => {
      clients.ruleExecutionLog.getExecutionResults.mockRejectedValue(new Error('Boom!'));

      const response = await server.inject(
        getRuleExecutionResultsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Boom!',
        status_code: 500,
      });
    });
  });
});
