/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import expect from '@kbn/expect';
import type {
  CorrelationsResponse,
  UnifiedCorrelation,
} from '@kbn/apm-plugin/common/correlations/types';
import type {
  FailedTransactionsCorrelationsResponse,
  FailedTransactionsCorrelation,
} from '@kbn/apm-plugin/common/correlations/failed_transactions_correlations/types';
import type { LatencyCorrelationsResponse } from '@kbn/apm-plugin/common/correlations/latency_correlations/types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

// These tests verify the unified latency correlations endpoint that consolidates
// all the steps (overall distribution, field candidates, field value pairs, correlations)
// into a single API call.

function isFailedTransactionsCorrelation(
  c: UnifiedCorrelation
): c is UnifiedCorrelation & FailedTransactionsCorrelation {
  return (
    c.doc_count !== undefined &&
    c.bg_count !== undefined &&
    c.score !== undefined &&
    c.pValue !== undefined &&
    c.normalizedScore !== undefined &&
    c.failurePercentage !== undefined &&
    c.successPercentage !== undefined &&
    c.histogram !== undefined
  );
}

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');

  const getOptions = () => ({
    start: '2020',
    end: '2021',
    kuery: '',
    includeHistogram: true,
  });

  describe('latency and failure rate correlations api', () => {
    describe('latency without data', () => {
      it('handles the empty state', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              ...getOptions(),
              entityType: 'transaction',
              metric: 'latency',
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

    describe('failureRate without data', () => {
      it('handles the empty state', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              ...getOptions(),
              entityType: 'transaction',
              metric: 'failure_rate',
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

    describe('latency with data', () => {
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
              entityType: 'transaction',
              metric: 'latency',
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

      it('returns only correlations and field candidates when includeHistogram is omitted', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              start: '2020',
              end: '2021',
              kuery: '',
              entityType: 'transaction',
              metric: 'latency',
              percentileThreshold: 95,
            },
          },
        });

        expect(unifiedResponse.status).to.eql(
          200,
          `Expected status to be '200', got '${unifiedResponse.status}'`
        );

        const response = unifiedResponse.body as CorrelationsResponse;

        expect(response.fieldCandidates.length).to.be.greaterThan(0);
        expect(response.correlations.length).to.be.greaterThan(0);
        expect(response.percentileThresholdValue).to.be(undefined);
        expect(response.overallHistogram).to.be(undefined);
        expect(response.errorHistogram).to.be(undefined);
        expect(response.totalDocCount).to.eql(
          1244,
          `Expected 1244 total doc count, got ${response.totalDocCount}.`
        );

        for (const c of response.correlations) {
          expect(c.histogram).to.be(undefined);
        }
      });

      it('accepts requests without a kuery field', async () => {
        const unifiedResponse = await apmApiClient.readUser({
          endpoint: 'POST /internal/apm/correlations',
          params: {
            body: {
              start: '2020',
              end: '2021',
              entityType: 'transaction',
              metric: 'latency',
              percentileThreshold: 95,
              includeHistogram: true,
            },
          },
        });

        expect(unifiedResponse.status).to.eql(200);
        const response = unifiedResponse.body as CorrelationsResponse;
        expect(response.fieldCandidates.length).to.be.greaterThan(0);
      });
    });

    describe('failureRate with data', () => {
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
              entityType: 'transaction',
              metric: 'failure_rate',
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
            isFailedTransactionsCorrelation
          ),
          fallbackResult:
            response.fallbackResult && isFailedTransactionsCorrelation(response.fallbackResult)
              ? response.fallbackResult
              : undefined,
        };

        // Identified 29 significant correlations.
        // Note: The unified endpoint handles chunking internally, so we get all results in one call.
        expect(failedTransactionsResponse.failedTransactionsCorrelations?.length).to.eql(
          29,
          `Expected 29 identified correlations, got ${failedTransactionsResponse.failedTransactionsCorrelations?.length}.`
        );

        const normalizedScores = response.correlations.map((c) => c.normalizedScore ?? 0);
        expect(normalizedScores).to.eql(
          [...normalizedScores].sort((a, b) => b - a),
          'correlations should be sorted by normalizedScore descending'
        );

        const correlation = response.correlations[0];

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
