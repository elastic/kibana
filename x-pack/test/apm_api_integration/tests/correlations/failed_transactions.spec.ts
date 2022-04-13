/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import type { FailedTransactionsCorrelationsResponse } from '../../../../plugins/apm/common/correlations/failed_transactions_correlations/types';
import { EVENT_OUTCOME } from '../../../../plugins/apm/common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../plugins/apm/common/event_outcome';

// These tests go through the full sequence of queries required
// to get the final results for a failed transactions correlation analysis.
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

  registry.when('failed transactions without data', { config: 'trial', archives: [] }, () => {
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

      const errorDistributionResponse = await apmApiClient.readUser({
        endpoint: 'POST /internal/apm/latency/overall_distribution',
        params: {
          body: {
            ...getOptions(),
            percentileThreshold: 95,
            termFilters: [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }],
          },
        },
      });

      expect(errorDistributionResponse.status).to.eql(
        200,
        `Expected status to be '200', got '${errorDistributionResponse.status}'`
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

      const failedTransactionsCorrelationsResponse = await apmApiClient.readUser({
        endpoint: 'POST /internal/apm/correlations/p_values',
        params: {
          body: {
            ...getOptions(),
            fieldCandidates: fieldCandidatesResponse.body?.fieldCandidates,
          },
        },
      });

      expect(failedTransactionsCorrelationsResponse.status).to.eql(
        200,
        `Expected status to be '200', got '${failedTransactionsCorrelationsResponse.status}'`
      );

      const finalRawResponse: FailedTransactionsCorrelationsResponse = {
        ccsWarning: failedTransactionsCorrelationsResponse.body?.ccsWarning,
        percentileThresholdValue: overallDistributionResponse.body?.percentileThresholdValue,
        overallHistogram: overallDistributionResponse.body?.overallHistogram,
        failedTransactionsCorrelations:
          failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations,
      };

      expect(finalRawResponse?.failedTransactionsCorrelations?.length).to.eql(
        0,
        `Expected 0 identified correlations, got ${finalRawResponse?.failedTransactionsCorrelations?.length}.`
      );
    });
  });

  registry.when('failed transactions with data', { config: 'trial', archives: ['8.0.0'] }, () => {
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

      const errorDistributionResponse = await apmApiClient.readUser({
        endpoint: 'POST /internal/apm/latency/overall_distribution',
        params: {
          body: {
            ...getOptions(),
            percentileThreshold: 95,
            termFilters: [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }],
          },
        },
      });

      expect(errorDistributionResponse.status).to.eql(
        200,
        `Expected status to be '200', got '${errorDistributionResponse.status}'`
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

      const fieldCandidates = fieldCandidatesResponse.body?.fieldCandidates.filter(
        (t) => !(t === EVENT_OUTCOME)
      );

      // Identified 68 fieldCandidates.
      expect(fieldCandidates.length).to.eql(
        68,
        `Expected field candidates length to be '68', got '${fieldCandidates.length}'`
      );

      const failedTransactionsCorrelationsResponse = await apmApiClient.readUser({
        endpoint: 'POST /internal/apm/correlations/p_values',
        params: {
          body: {
            ...getOptions(),
            fieldCandidates,
          },
        },
      });

      expect(failedTransactionsCorrelationsResponse.status).to.eql(
        200,
        `Expected status to be '200', got '${failedTransactionsCorrelationsResponse.status}'`
      );

      const fieldsToSample = new Set<string>();
      if (failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations.length > 0) {
        failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations.forEach((d) => {
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

      const finalRawResponse: FailedTransactionsCorrelationsResponse = {
        ccsWarning: failedTransactionsCorrelationsResponse.body?.ccsWarning,
        percentileThresholdValue: overallDistributionResponse.body?.percentileThresholdValue,
        overallHistogram: overallDistributionResponse.body?.overallHistogram,
        errorHistogram: errorDistributionResponse.body?.overallHistogram,
        failedTransactionsCorrelations:
          failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations,
        fieldStats: failedtransactionsFieldStats.body?.stats,
      };

      expect(finalRawResponse?.percentileThresholdValue).to.be(1309695.875);
      expect(finalRawResponse?.errorHistogram?.length).to.be(101);
      expect(finalRawResponse?.overallHistogram?.length).to.be(101);
      expect(finalRawResponse?.fieldStats?.length).to.be(fieldsToSample.size);

      expect(finalRawResponse?.failedTransactionsCorrelations?.length).to.eql(
        30,
        `Expected 30 identified correlations, got ${finalRawResponse?.failedTransactionsCorrelations?.length}.`
      );

      const sortedCorrelations = finalRawResponse?.failedTransactionsCorrelations?.sort(
        (a, b) => b.score - a.score
      );
      const correlation = sortedCorrelations?.[0];

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

      const fieldStats = finalRawResponse?.fieldStats?.[0];
      expect(typeof fieldStats).to.be('object');
      expect(Array.isArray(fieldStats?.topValues) && fieldStats?.topValues?.length).to.greaterThan(
        0
      );
      expect(fieldStats?.topValuesSampleSize).to.greaterThan(0);
    });
  });
}
