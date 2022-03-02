/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import type {
  LatencyCorrelation,
  LatencyCorrelationsResponse,
} from '../../../../plugins/apm/common/correlations/latency_correlations/types';

// These tests go through the full sequence of queries required
// to get the final results for a latency correlation analysis.
export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');

  // This matches the parameters used for the other tab's queries in `../correlations/*`.
  const getOptions = () => ({
    environment: 'ENVIRONMENT_ALL',
    start: '2020',
    end: '2021',
    kuery: '',
  });

  registry.when(
    'correlations latency overall without data',
    { config: 'trial', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const overallDistributionResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/latency/overall_distribution',
          params: {
            body: {
              ...getOptions(),
              percentileThreshold: 95,
            },
          },
        });

        expect(overallDistributionResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${overallDistributionResponse.status}'`
        );

        const fieldCandidatesResponse = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/correlations/field_candidates',
          params: {
            query: getOptions(),
          },
        });

        expect(fieldCandidatesResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${fieldCandidatesResponse.status}'`
        );

        const fieldValuePairsResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations/field_value_pairs',
          params: {
            body: {
              ...getOptions(),
              fieldCandidates: fieldCandidatesResponse.body?.fieldCandidates,
            },
          },
        });

        expect(fieldValuePairsResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${fieldValuePairsResponse.status}'`
        );

        const significantCorrelationsResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations/significant_correlations',
          params: {
            body: {
              ...getOptions(),
              fieldValuePairs: fieldValuePairsResponse.body?.fieldValuePairs,
            },
          },
        });

        expect(significantCorrelationsResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${significantCorrelationsResponse.status}'`
        );

        const finalRawResponse: LatencyCorrelationsResponse = {
          ccsWarning: significantCorrelationsResponse.body?.ccsWarning,
          percentileThresholdValue: overallDistributionResponse.body?.percentileThresholdValue,
          overallHistogram: overallDistributionResponse.body?.overallHistogram,
          latencyCorrelations: significantCorrelationsResponse.body?.latencyCorrelations,
        };

        expect(finalRawResponse?.percentileThresholdValue).to.be(undefined);
        expect(finalRawResponse?.overallHistogram).to.be(undefined);
        expect(finalRawResponse?.latencyCorrelations?.length).to.be(0);
      });
    }
  );

  registry.when(
    'correlations latency with data and opbeans-node args',
    { config: 'trial', archives: ['8.0.0'] },
    () => {
      // putting this into a single `it` because the responses depend on each other
      it('runs queries and returns results', async () => {
        const overallDistributionResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/latency/overall_distribution',
          params: {
            body: {
              ...getOptions(),
              percentileThreshold: 95,
            },
          },
        });

        expect(overallDistributionResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${overallDistributionResponse.status}'`
        );

        const fieldCandidatesResponse = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/correlations/field_candidates',
          params: {
            query: getOptions(),
          },
        });

        expect(fieldCandidatesResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${fieldCandidatesResponse.status}'`
        );

        // Identified 69 fieldCandidates.
        expect(fieldCandidatesResponse.body?.fieldCandidates.length).to.eql(
          69,
          `Expected field candidates length to be '69', got '${fieldCandidatesResponse.body?.fieldCandidates.length}'`
        );

        const fieldValuePairsResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations/field_value_pairs',
          params: {
            body: {
              ...getOptions(),
              fieldCandidates: fieldCandidatesResponse.body?.fieldCandidates,
            },
          },
        });

        expect(fieldValuePairsResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${fieldValuePairsResponse.status}'`
        );

        // Identified 379 fieldValuePairs.
        expect(fieldValuePairsResponse.body?.fieldValuePairs.length).to.eql(
          379,
          `Expected field value pairs length to be '379', got '${fieldValuePairsResponse.body?.fieldValuePairs.length}'`
        );

        // This replicates the code used in the `useLatencyCorrelations` hook to chunk requests for correlation analysis.
        // Tests turned out to be flaky and occasionally overload ES with a `search_phase_execution_exception`
        // when all 379 field value pairs from above are queried in parallel.
        // The chunking sends 10 field value pairs with each request to the Kibana API endpoint.
        // Kibana itself will then run those 10 requests in parallel against ES.
        const latencyCorrelations: LatencyCorrelation[] = [];
        let ccsWarning = false;
        const chunkSize = 10;

        const fieldValuePairChunks = chunk(
          fieldValuePairsResponse.body?.fieldValuePairs,
          chunkSize
        );

        for (const fieldValuePairChunk of fieldValuePairChunks) {
          const significantCorrelations = await apmApiClient.readUser({
            endpoint: 'POST /internal/apm/correlations/significant_correlations',
            params: {
              body: {
                ...getOptions(),
                fieldValuePairs: fieldValuePairChunk,
              },
            },
          });

          expect(significantCorrelations.status).to.eql(
            200,
            `Expected status to be '200', got '${significantCorrelations.status}'`
          );

          // Loaded fractions and totalDocCount of 1244.
          expect(significantCorrelations.body?.totalDocCount).to.eql(
            1244,
            `Expected 1244 total doc count, got ${significantCorrelations.body?.totalDocCount}.`
          );

          if (significantCorrelations.body?.latencyCorrelations.length > 0) {
            latencyCorrelations.push(...significantCorrelations.body?.latencyCorrelations);
          }

          if (significantCorrelations.body?.ccsWarning) {
            ccsWarning = true;
          }
        }

        const fieldsToSample = new Set<string>();
        if (latencyCorrelations.length > 0) {
          latencyCorrelations.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
        }

        const failedtransactionsFieldStats = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations/field_stats',
          params: {
            body: {
              ...getOptions(),
              fieldsToSample: [...fieldsToSample],
            },
          },
        });

        const finalRawResponse: LatencyCorrelationsResponse = {
          ccsWarning,
          percentileThresholdValue: overallDistributionResponse.body?.percentileThresholdValue,
          overallHistogram: overallDistributionResponse.body?.overallHistogram,
          latencyCorrelations,
          fieldStats: failedtransactionsFieldStats.body?.stats,
        };

        // Fetched 95th percentile value of 1309695.875 based on 1244 documents.
        expect(finalRawResponse?.percentileThresholdValue).to.be(1309695.875);
        expect(finalRawResponse?.overallHistogram?.length).to.be(101);
        expect(finalRawResponse?.fieldStats?.length).to.be(fieldsToSample.size);

        // Identified 13 significant correlations out of 379 field/value pairs.
        expect(finalRawResponse?.latencyCorrelations?.length).to.eql(
          13,
          `Expected 13 identified correlations, got ${finalRawResponse?.latencyCorrelations?.length}.`
        );

        const correlation = finalRawResponse?.latencyCorrelations?.sort(
          (a, b) => b.correlation - a.correlation
        )[0];
        expect(typeof correlation).to.be('object');
        expect(correlation?.fieldName).to.be('transaction.result');
        expect(correlation?.fieldValue).to.be('success');
        expect(correlation?.correlation).to.be(0.6275246559191225);
        expect(correlation?.ksTest).to.be(4.806503252860024e-13);
        expect(correlation?.histogram?.length).to.be(101);

        const fieldStats = finalRawResponse?.fieldStats?.[0];
        expect(typeof fieldStats).to.be('object');
        expect(
          Array.isArray(fieldStats?.topValues) && fieldStats?.topValues?.length
        ).to.greaterThan(0);
        expect(fieldStats?.topValuesSampleSize).to.greaterThan(0);
      });
    }
  );
}
