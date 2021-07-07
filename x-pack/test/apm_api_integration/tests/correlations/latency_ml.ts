/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

import { SearchServiceValue } from '../../../../plugins/apm/common/search_strategies/correlations/types';
import { PartialSearchRequest } from '../../../../plugins/apm/server/lib/search_strategies/correlations/search_strategy';

function parseBfetchResponse(resp: request.Response): Array<Record<string, any>> {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => JSON.parse(item));
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');

  const getRequestBody = () => {
    const partialSearchRequest: PartialSearchRequest = {
      params: {
        index: 'apm-*',
        serviceName: 'opbeans-node',
        start: '2020-07-05T22:00:00.000Z',
        end: '2021-07-06T13:21:46.005Z',
        environment: 'ENVIRONMENT_ALL',
        transactionType: 'request',
        percentileThreshold: 95,
      },
    };

    return {
      batch: [
        {
          request: partialSearchRequest,
          options: { strategy: 'apmCorrelationsSearchStrategy' },
        },
      ],
    };
  };

  registry.when(
    'correlations latency_ml overall without data',
    { config: 'trial', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const intialResponse = await supertest
          .post(`/internal/bsearch`)
          .set('kbn-xsrf', 'foo')
          .send(getRequestBody());

        expect(intialResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${intialResponse.status}'`
        );
        expect(intialResponse.body).to.eql(
          {},
          `Expected response body to be an empty object, actual response is in the text attribute. Got: '${JSON.stringify(
            intialResponse.body
          )}'`
        );

        const body = parseBfetchResponse(intialResponse)[0];

        expect(typeof body.result).to.be('object');
        const { result } = body;

        expect(typeof result?.id).to.be('string');

        // pass on id for follow up queries
        const searchStrategyId = result.id;

        // follow up request body including search strategy ID
        const reqBody = getRequestBody();
        reqBody.batch[0].request.id = searchStrategyId;

        let followUpResponse: Record<string, any> = {};

        // continues querying until the search strategy finishes
        await retry.waitForWithTimeout(
          'search strategy eventually completes and returns full results',
          5000,
          async () => {
            const response = await supertest
              .post(`/internal/bsearch`)
              .set('kbn-xsrf', 'foo')
              .send(reqBody);

            followUpResponse = parseBfetchResponse(response)[0];

            return (
              followUpResponse?.result?.isRunning === false || followUpResponse?.error !== undefined
            );
          }
        );

        expect(followUpResponse?.error).to.eql(
          undefined,
          `search strategy should not return an error, got: ${JSON.stringify(
            followUpResponse?.error
          )}`
        );

        const followUpResult = followUpResponse.result;
        expect(followUpResult?.isRunning).to.eql(false, 'search strategy should not be running');
        expect(followUpResult?.isPartial).to.eql(
          false,
          'search strategy result should not be partial'
        );
        expect(followUpResult?.id).to.eql(
          searchStrategyId,
          'search strategy id should match original id'
        );
        expect(followUpResult?.isRestored).to.eql(
          true,
          'search strategy response should be restored'
        );
        expect(followUpResult?.loaded).to.eql(100, 'loaded state should be 100');
        expect(followUpResult?.total).to.eql(100, 'total state should be 100');

        expect(typeof followUpResult?.rawResponse).to.be('object');

        const { rawResponse: finalRawResponse } = followUpResult;

        expect(typeof finalRawResponse?.took).to.be('number');
        expect(finalRawResponse?.percentileThresholdValue).to.be(undefined);
        expect(finalRawResponse?.overallHistogram).to.be(undefined);
        expect(finalRawResponse?.values.length).to.be(0);
      });
    }
  );

  registry.when(
    'Correlations latency_ml with data and opbeans-node args',
    { config: 'trial', archives: ['apm_8.0.0'] },
    () => {
      // putting this into a single `it` because the responses depend on each other
      it('queries the search strategy and returns results', async () => {
        const intialResponse = await supertest
          .post(`/internal/bsearch`)
          .set('kbn-xsrf', 'foo')
          .send(getRequestBody());

        expect(intialResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${intialResponse.status}'`
        );
        expect(intialResponse.body).to.eql(
          {},
          `Expected response body to be an empty object, actual response is in the text attribute. Got: '${JSON.stringify(
            intialResponse.body
          )}'`
        );

        const body = parseBfetchResponse(intialResponse)[0];

        expect(typeof body?.result).to.be('object');
        const { result } = body;

        expect(typeof result?.id).to.be('string');

        // pass on id for follow up queries
        const searchStrategyId = result.id;

        expect(result?.loaded).to.be(0);
        expect(result?.total).to.be(100);
        expect(result?.isRunning).to.be(true);
        expect(result?.isPartial).to.be(true);
        expect(result?.isRestored).to.be(false);
        expect(typeof result?.rawResponse).to.be('object');

        const { rawResponse } = result;

        expect(typeof rawResponse?.took).to.be('number');
        expect(rawResponse?.values).to.eql([]);

        // follow up request body including search strategy ID
        const reqBody = getRequestBody();
        reqBody.batch[0].request.id = searchStrategyId;

        let followUpResponse: Record<string, any> = {};

        // continues querying until the search strategy finishes
        await retry.waitForWithTimeout(
          'search strategy eventually completes and returns full results',
          5000,
          async () => {
            const response = await supertest
              .post(`/internal/bsearch`)
              .set('kbn-xsrf', 'foo')
              .send(reqBody);
            followUpResponse = parseBfetchResponse(response)[0];

            return (
              followUpResponse?.result?.isRunning === false || followUpResponse?.error !== undefined
            );
          }
        );

        const followUpResult = followUpResponse.result;
        expect(followUpResult?.isRunning).to.be(false);
        expect(followUpResult?.isPartial).to.be(false);
        expect(followUpResult?.id).to.be(searchStrategyId);
        expect(followUpResult?.isRestored).to.be(true);
        expect(followUpResult?.loaded).to.be(100);
        expect(followUpResult?.total).to.be(100);

        expect(typeof followUpResult?.rawResponse).to.be('object');

        const { rawResponse: finalRawResponse } = followUpResult;

        expect(typeof finalRawResponse?.took).to.be('number');
        expect(finalRawResponse?.percentileThresholdValue).to.be(1507326);
        expect(finalRawResponse?.overallHistogram.length).to.be(101);
        expect(finalRawResponse?.values.length).to.be(2);

        const eventOutcome = (finalRawResponse?.values as SearchServiceValue[]).find(
          (d) => d.field === 'event.outcome'
        );
        expect(typeof eventOutcome).to.be('object');
        expect(eventOutcome?.field).to.be('event.outcome');
        expect(eventOutcome?.value).to.be('unknown');
        expect(eventOutcome?.correlation).to.be(0.8314152072578924);
        expect(eventOutcome?.ksTest).to.be(0.012732005168249932);
        expect(eventOutcome?.histogram.length).to.be(101);

        const transactionResult = (finalRawResponse?.values as SearchServiceValue[]).find(
          (d) => d.field === 'transaction.result'
        );
        expect(transactionResult?.field).to.be('transaction.result');
        expect(transactionResult?.value).to.be('success');
        expect(transactionResult?.correlation).to.be(0.8314152072578924);
        expect(transactionResult?.ksTest).to.be(0.012732005168249932);
        expect(transactionResult?.histogram.length).to.be(101);
      });
    }
  );
}
