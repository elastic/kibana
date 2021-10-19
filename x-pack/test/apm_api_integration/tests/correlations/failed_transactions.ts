/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { IKibanaSearchRequest } from '../../../../../src/plugins/data/common';

import type { FailedTransactionsCorrelationsParams } from '../../../../plugins/apm/common/search_strategies/failed_transactions_correlations/types';
import type { RawSearchStrategyClientParams } from '../../../../plugins/apm/common/search_strategies/types';
import { APM_SEARCH_STRATEGIES } from '../../../../plugins/apm/common/search_strategies/constants';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { parseBfetchResponse } from '../../common/utils/parse_b_fetch';

export default function ApiTest({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const getRequestBody = () => {
    const request: IKibanaSearchRequest<
      FailedTransactionsCorrelationsParams & RawSearchStrategyClientParams
    > = {
      params: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
        percentileThreshold: 95,
      },
    };

    return {
      batch: [
        {
          request,
          options: { strategy: APM_SEARCH_STRATEGIES.APM_FAILED_TRANSACTIONS_CORRELATIONS },
        },
      ],
    };
  };

  registry.when('failed transactions without data', { config: 'trial', archives: [] }, () => {
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

      expect(finalRawResponse?.failedTransactionsCorrelations.length).to.eql(
        0,
        `Expected 0 identified correlations, got ${finalRawResponse?.failedTransactionsCorrelations.length}.`
      );
    });
  });

  registry.when('failed transactions with data', { config: 'trial', archives: ['8.0.0'] }, () => {
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
      expect(finalRawResponse?.percentileThresholdValue).to.be(1309695.875);
      expect(finalRawResponse?.errorHistogram.length).to.be(101);
      expect(finalRawResponse?.overallHistogram.length).to.be(101);
      expect(finalRawResponse?.fieldStats.length).to.be(26);

      expect(finalRawResponse?.failedTransactionsCorrelations.length).to.eql(
        30,
        `Expected 30 identified correlations, got ${finalRawResponse?.failedTransactionsCorrelations.length}.`
      );

      expect(finalRawResponse?.log.map((d: string) => d.split(': ')[1])).to.eql([
        'Fetched 95th percentile value of 1309695.875 based on 1244 documents.',
        'Identified 68 fieldCandidates.',
        'Identified correlations for 68 fields out of 68 candidates.',
        'Identified 26 fields to sample for field statistics.',
        'Retrieved field statistics for 26 fields out of 26 fields.',
        'Identified 30 significant correlations relating to failed transactions.',
      ]);

      const sortedCorrelations = finalRawResponse?.failedTransactionsCorrelations.sort();
      const correlation = sortedCorrelations[0];

      expect(typeof correlation).to.be('object');
      expect(correlation?.doc_count).to.be(31);
      expect(correlation?.score).to.be(83.70467673605746);
      expect(correlation?.bg_count).to.be(31);
      expect(correlation?.fieldName).to.be('http.response.status_code');
      expect(correlation?.fieldValue).to.be(500);
      expect(typeof correlation?.pValue).to.be('number');
      expect(typeof correlation?.normalizedScore).to.be('number');
      expect(typeof correlation?.failurePercentage).to.be('number');
      expect(typeof correlation?.successPercentage).to.be('number');

      const fieldStats = finalRawResponse?.fieldStats[0];
      expect(typeof fieldStats).to.be('object');
      expect(fieldStats.topValues.length).to.greaterThan(0);
      expect(fieldStats.topValuesSampleSize).to.greaterThan(0);
    });
  });
}
