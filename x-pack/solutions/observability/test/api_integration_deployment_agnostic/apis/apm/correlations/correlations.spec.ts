/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import expect from '@kbn/expect';
import { CorrelationType } from '@kbn/apm-plugin/common/correlations/types';
import type { CorrelationsResponse } from '@kbn/apm-plugin/common/correlations/types';
import type { FailedTransactionsCorrelationsResponse } from '@kbn/apm-plugin/common/correlations/failed_transactions_correlations/types';
import type { LatencyCorrelationsResponse } from '@kbn/apm-plugin/common/correlations/latency_correlations/types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

// These tests verify the unified latency correlations endpoint that consolidates
// all the steps (overall distribution, field candidates, field value pairs, correlations)
// into a single API call.
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

  describe('latency and failed transactions single correlations api', () => {
    describe('transaction_duration without data', () => {
      it('handles the empty state', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              ...getOptions(),
              correlationType: CorrelationType.TRANSACTION_DURATION,
              percentileThreshold: 95,
            },
          },
        });

        expect(unifiedResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${unifiedResponse.status}'`
        );

        const response = unifiedResponse.body as CorrelationsResponse;

        expect(response.percentileThresholdValue).to.be(undefined);
        expect(response.overallHistogram).to.be(undefined);
        expect(response.correlations.length).to.be(0);
        expect(response.fieldCandidates.length).to.be(0);
        expect(response.totalDocCount).to.be(0);
      });
    });

    describe('error_rate without data', () => {
      it('handles the empty state', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              ...getOptions(),
              correlationType: CorrelationType.ERROR_RATE,
              percentileThreshold: 95,
            },
          },
        });

        expect(unifiedResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${unifiedResponse.status}'`
        );

        const response = unifiedResponse.body as CorrelationsResponse;

        expect(response.percentileThresholdValue).to.be(undefined);
        expect(response.overallHistogram).to.be(undefined);
        expect(response.errorHistogram).to.be(undefined);
        expect(response.correlations.length).to.be(0);
        expect(response.fieldCandidates.length).to.be(0);
        expect(response.totalDocCount).to.be(0);
      });
    });

    describe('transaction_duration with data', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('runs unified query and returns results matching legacy endpoint', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              ...getOptions(),
              correlationType: CorrelationType.TRANSACTION_DURATION,
              percentileThreshold: 95,
            },
          },
        });

        expect(unifiedResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${unifiedResponse.status}'`
        );

        const response = unifiedResponse.body as CorrelationsResponse;

        // Verify field candidates (should match legacy endpoint: 81 candidates)
        expect(response.fieldCandidates.length).to.eql(
          81,
          `Expected field candidates length to be '81', got '${response.fieldCandidates.length}'`
        );

        // Verify overall distribution
        expect(response.percentileThresholdValue).to.be(1309695.875);
        expect(response.overallHistogram?.length).to.be(101);
        expect(response.totalDocCount).to.eql(
          1244,
          `Expected 1244 total doc count, got ${response.totalDocCount}.`
        );

        // Map unified response to LatencyCorrelationsResponse format for comparison
        const latencyResponse: LatencyCorrelationsResponse = {
          ccsWarning: response.ccsWarning,
          percentileThresholdValue: response.percentileThresholdValue,
          overallHistogram: response.overallHistogram,
          latencyCorrelations: response.correlations.filter(
            (c): c is typeof c & { correlation: number; ksTest: number } =>
              c.correlation !== undefined && c.ksTest !== undefined
          ),
        };

        // Identified 13 significant correlations out of field/value pairs.
        // Note: The unified endpoint handles chunking internally, so we get all results in one call.
        expect(latencyResponse.latencyCorrelations?.length).to.eql(
          13,
          `Expected 13 identified correlations, got ${latencyResponse.latencyCorrelations?.length}.`
        );

        // Match legacy test sorting: sort by 'score' (which doesn't exist, so all undefined),
        // then by fieldName and fieldValue. This makes agent.hostname come before transaction.result alphabetically.
        const sortedCorrelations = orderBy(
          latencyResponse.latencyCorrelations,
          ['score', 'fieldName', 'fieldValue'],
          ['desc', 'asc', 'asc']
        );
        const correlation = sortedCorrelations?.[0];

        expect(typeof correlation).to.be('object');
        expect(correlation?.fieldName).to.be('agent.hostname');
        expect(correlation?.fieldValue).to.be('rum-js');
        expect(correlation?.correlation).to.be(0.34798078715348596);
        expect(correlation?.ksTest).to.be(1.9848961005439386e-12);
        expect(correlation?.histogram?.length).to.be(101);
      });
    });

    describe('error_rate with data', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('runs unified query and returns results matching legacy endpoint', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              ...getOptions(),
              correlationType: CorrelationType.ERROR_RATE,
              percentileThreshold: 95,
            },
          },
        });

        expect(unifiedResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${unifiedResponse.status}'`
        );

        const response = unifiedResponse.body as CorrelationsResponse;

        // Verify field candidates (should match legacy endpoint: 80 candidates after filtering EVENT_OUTCOME)
        expect(response.fieldCandidates.length).to.eql(
          80,
          `Expected field candidates length to be '80', got '${response.fieldCandidates.length}'`
        );

        // Verify overall distribution
        expect(response.percentileThresholdValue).to.be(1309695.875);
        expect(response.overallHistogram?.length).to.be(101);
        expect(response.errorHistogram?.length).to.be(101);

        // Map unified response to FailedTransactionsCorrelationsResponse format for comparison
        const failedTransactionsResponse: FailedTransactionsCorrelationsResponse = {
          ccsWarning: response.ccsWarning,
          percentileThresholdValue: response.percentileThresholdValue,
          overallHistogram: response.overallHistogram,
          errorHistogram: response.errorHistogram,
          failedTransactionsCorrelations: response.correlations.filter(
            (
              c
            ): c is typeof c & {
              doc_count: number;
              bg_count: number;
              score: number;
              pValue: number | null;
              normalizedScore: number;
              failurePercentage: number;
              successPercentage: number;
            } =>
              c.doc_count !== undefined &&
              c.bg_count !== undefined &&
              c.score !== undefined &&
              c.pValue !== undefined &&
              c.normalizedScore !== undefined &&
              c.failurePercentage !== undefined &&
              c.successPercentage !== undefined
          ),
          fallbackResult: response.fallbackResult,
        };

        // Identified 29 significant correlations.
        // Note: The unified endpoint handles chunking internally, so we get all results in one call.
        expect(failedTransactionsResponse.failedTransactionsCorrelations?.length).to.eql(
          29,
          `Expected 29 identified correlations, got ${failedTransactionsResponse.failedTransactionsCorrelations?.length}.`
        );

        const sortedCorrelations = orderBy(
          failedTransactionsResponse.failedTransactionsCorrelations,
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
