/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { IKibanaSearchRequest } from '../../../../../src/plugins/data/common';

import type { LatencyCorrelationsParams } from '../../../../plugins/apm/common/search_strategies/latency_correlations/types';
import type { RawSearchStrategyClientParams } from '../../../../plugins/apm/common/search_strategies/types';
import { APM_SEARCH_STRATEGIES } from '../../../../plugins/apm/common/search_strategies/constants';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { parseBfetchResponse } from '../../common/utils/parse_b_fetch';

export default function ApiTest({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const getRequestBody = () => {
    const request: IKibanaSearchRequest<LatencyCorrelationsParams & RawSearchStrategyClientParams> =
      {
        params: {
          environment: 'ENVIRONMENT_ALL',
          start: '2020',
          end: '2021',
          kuery: '',
          percentileThreshold: 95,
          analyzeCorrelations: true,
        },
      };

    return {
      batch: [
        {
          request,
          options: { strategy: APM_SEARCH_STRATEGIES.APM_LATENCY_CORRELATIONS },
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
        expect(finalRawResponse?.latencyCorrelations.length).to.be(0);
        expect(finalRawResponse?.log.map((d: string) => d.split(': ')[1])).to.eql([
          'Fetched 95th percentile value of undefined based on 0 documents.',
          'Abort service since percentileThresholdValue could not be determined.',
        ]);
      });
    }
  );

  registry.when(
    'correlations latency with data and opbeans-node args',
    { config: 'trial', archives: ['8.0.0'] },
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
        expect(result?.isRestored).to.eql(
          false,
          `Expected response result to be not restored. Got: '${result?.isRestored}'`
        );
        expect(typeof result?.rawResponse).to.be('object');

        const { rawResponse } = result;

        expect(typeof rawResponse?.took).to.be('number');
        expect(rawResponse?.latencyCorrelations).to.eql([]);

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
          `Finished search strategy should not return an error, got: ${JSON.stringify(
            followUpResponse?.error
          )}`
        );

        const followUpResult = followUpResponse.result;
        expect(followUpResult?.isRunning).to.eql(
          false,
          `Expected finished result not to be running. Got: ${followUpResult?.isRunning}`
        );
        expect(followUpResult?.isPartial).to.eql(
          false,
          `Expected finished result not to be partial. Got: ${followUpResult?.isPartial}`
        );
        expect(followUpResult?.id).to.be(searchStrategyId);
        expect(followUpResult?.isRestored).to.be(true);
        expect(followUpResult?.loaded).to.be(100);
        expect(followUpResult?.total).to.be(100);

        expect(typeof followUpResult?.rawResponse).to.be('object');

        const { rawResponse: finalRawResponse } = followUpResult;

        expect(typeof finalRawResponse?.took).to.be('number');
        expect(finalRawResponse?.percentileThresholdValue).to.be(1309695.875);
        expect(finalRawResponse?.overallHistogram.length).to.be(101);
        expect(finalRawResponse?.fieldStats.length).to.be(12);

        expect(finalRawResponse?.latencyCorrelations.length).to.eql(
          13,
          `Expected 13 identified correlations, got ${finalRawResponse?.latencyCorrelations.length}.`
        );
        expect(finalRawResponse?.log.map((d: string) => d.split(': ')[1])).to.eql([
          'Fetched 95th percentile value of 1309695.875 based on 1244 documents.',
          'Loaded histogram range steps.',
          'Loaded overall histogram chart data.',
          'Loaded percentiles.',
          'Identified 69 fieldCandidates.',
          'Identified 379 fieldValuePairs.',
          'Loaded fractions and totalDocCount of 1244.',
          'Identified 13 significant correlations out of 379 field/value pairs.',
          'Identified 12 fields to sample for field statistics.',
          'Retrieved field statistics for 12 fields out of 12 fields.',
        ]);

        const correlation = finalRawResponse?.latencyCorrelations[0];

        expect(typeof correlation).to.be('object');
        expect(correlation?.fieldName).to.be('transaction.result');
        expect(correlation?.fieldValue).to.be('success');
        expect(correlation?.correlation).to.be(0.6275246559191225);
        expect(correlation?.ksTest).to.be(4.806503252860024e-13);
        expect(correlation?.histogram.length).to.be(101);

        const fieldStats = finalRawResponse?.fieldStats[0];
        expect(typeof fieldStats).to.be('object');
        expect(fieldStats.topValues.length).to.greaterThan(0);
        expect(fieldStats.topValuesSampleSize).to.greaterThan(0);
      });
    }
  );
}
