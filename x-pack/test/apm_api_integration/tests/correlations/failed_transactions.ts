/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { PartialSearchRequest } from '../../../../plugins/apm/server/lib/search_strategies/correlations/search_strategy';
import { parseBfetchResponse } from '../../common/utils/parse_b_fetch';

export default function ApiTest({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');

  const getRequestBody = () => {
    const partialSearchRequest: PartialSearchRequest = {
      params: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
      },
    };

    return {
      batch: [
        {
          request: partialSearchRequest,
          options: { strategy: 'apmFailedTransactionsCorrelationsSearchStrategy' },
        },
      ],
    };
  };

  registry.when('on trial license without data', { config: 'trial', archives: [] }, () => {
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

      expect(finalRawResponse?.values.length).to.eql(
        0,
        `Expected 0 identified correlations, got ${finalRawResponse?.values.length}.`
      );
    });
  });

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/109703
  registry.when.skip('on trial license with data', { config: 'trial', archives: ['8.0.0'] }, () => {
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

      expect(finalRawResponse?.values.length).to.eql(
        43,
        `Expected 43 identified correlations, got ${finalRawResponse?.values.length}.`
      );

      expect(finalRawResponse?.log.map((d: string) => d.split(': ')[1])).to.eql([
        'Identified 68 fieldCandidates.',
        'Identified correlations for 68 fields out of 68 candidates.',
        'Identified 43 significant correlations relating to failed transactions.',
      ]);

      const sortedCorrelations = finalRawResponse?.values.sort();
      const correlation = sortedCorrelations[0];

      expect(typeof correlation).to.be('object');
      expect(correlation?.key).to.be('HTTP 5xx');
      expect(correlation?.doc_count).to.be(31);
      expect(correlation?.score).to.be(100.17736139032642);
      expect(correlation?.bg_count).to.be(60);
      expect(correlation?.fieldName).to.be('transaction.result');
      expect(correlation?.fieldValue).to.be('HTTP 5xx');
      expect(typeof correlation?.pValue).to.be('number');
      expect(typeof correlation?.normalizedScore).to.be('number');
      expect(typeof correlation?.failurePercentage).to.be('number');
      expect(typeof correlation?.successPercentage).to.be('number');
    });
  });
}
