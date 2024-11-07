/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import expect from '@kbn/expect';
import type { FailedTransactionsCorrelationsResponse } from '@kbn/apm-plugin/common/correlations/failed_transactions_correlations/types';
import { EVENT_OUTCOME } from '@kbn/apm-plugin/common/es_fields/apm';
import { EventOutcome } from '@kbn/apm-plugin/common/event_outcome';
import { LatencyDistributionChartType } from '@kbn/apm-plugin/common/latency_distribution_chart_types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

// These tests go through the full sequence of queries required
// to get the final results for a failed transactions correlation analysis.
export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');
  // This matches the parameters used for the other tab's queries in `../correlations/*`.
  const getOptions = () => ({
    environment: 'ENVIRONMENT_ALL',
    start: '2020',
    end: '2021',
    kuery: '',
  });

  describe('failed transactions', () => {
    describe('without data', () => {
      it('handles the empty state', async () => {
        const overallDistributionResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
          params: {
            body: {
              ...getOptions(),
              percentileThreshold: 95,
              chartType: LatencyDistributionChartType.failedTransactionsCorrelations,
            },
          },
        });

        expect(overallDistributionResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${overallDistributionResponse.status}'`
        );

        const errorDistributionResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
          params: {
            body: {
              ...getOptions(),
              percentileThreshold: 95,
              termFilters: [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }],
              chartType: LatencyDistributionChartType.failedTransactionsCorrelations,
            },
          },
        });

        expect(errorDistributionResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${errorDistributionResponse.status}'`
        );

        const fieldCandidatesResponse = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/correlations/field_candidates/transactions',
          params: {
            query: getOptions(),
          },
        });

        expect(fieldCandidatesResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${fieldCandidatesResponse.status}'`
        );

        const failedTransactionsCorrelationsResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations/p_values/transactions',
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

    describe('with data', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('runs queries and returns results', async () => {
        const overallDistributionResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
          params: {
            body: {
              ...getOptions(),
              percentileThreshold: 95,
              chartType: LatencyDistributionChartType.failedTransactionsCorrelations,
            },
          },
        });

        expect(overallDistributionResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${overallDistributionResponse.status}'`
        );

        const errorDistributionResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
          params: {
            body: {
              ...getOptions(),
              percentileThreshold: 95,
              termFilters: [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }],
              chartType: LatencyDistributionChartType.failedTransactionsCorrelations,
            },
          },
        });

        expect(errorDistributionResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${errorDistributionResponse.status}'`
        );

        const fieldCandidatesResponse = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/correlations/field_candidates/transactions',
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

        // Identified 80 fieldCandidates.
        expect(fieldCandidates.length).to.eql(
          80,
          `Expected field candidates length to be '80', got '${fieldCandidates.length}'`
        );

        const failedTransactionsCorrelationsResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations/p_values/transactions',
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
        if (
          failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations.length > 0
        ) {
          failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations.forEach(
            (d) => {
              fieldsToSample.add(d.fieldName);
            }
          );
        }

        const finalRawResponse: FailedTransactionsCorrelationsResponse = {
          ccsWarning: failedTransactionsCorrelationsResponse.body?.ccsWarning,
          percentileThresholdValue: overallDistributionResponse.body?.percentileThresholdValue,
          overallHistogram: overallDistributionResponse.body?.overallHistogram,
          errorHistogram: errorDistributionResponse.body?.overallHistogram,
          failedTransactionsCorrelations:
            failedTransactionsCorrelationsResponse.body?.failedTransactionsCorrelations,
        };

        expect(finalRawResponse?.percentileThresholdValue).to.be(1309695.875);
        expect(finalRawResponse?.errorHistogram?.length).to.be(101);
        expect(finalRawResponse?.overallHistogram?.length).to.be(101);

        expect(finalRawResponse?.failedTransactionsCorrelations?.length).to.eql(
          29,
          `Expected 29 identified correlations, got ${finalRawResponse?.failedTransactionsCorrelations?.length}.`
        );

        const sortedCorrelations = orderBy(
          finalRawResponse?.failedTransactionsCorrelations,
          ['score', 'fieldName', 'fieldValue'],
          ['desc', 'asc', 'asc']
        );
        const correlation = sortedCorrelations?.[0];

        expect(typeof correlation).to.be('object');
        expect(correlation?.doc_count).to.be(31);
        expect(correlation?.score).to.be(83.70467673605746);
        expect(correlation?.bg_count).to.be(31);
        expect(correlation?.fieldName).to.be('transaction.result');
        expect(correlation?.fieldValue).to.be('HTTP 5xx');
        expect(typeof correlation?.pValue).to.be('number');
        expect(typeof correlation?.normalizedScore).to.be('number');
        expect(typeof correlation?.failurePercentage).to.be('number');
        expect(typeof correlation?.successPercentage).to.be('number');
      });
    });
  });
}
