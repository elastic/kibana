/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import {
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
} from '@kbn/apm-plugin/common/es_fields/apm';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { Readable } from 'stream';
import type { ApmApiClient } from '../../../../services/apm_api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const es = getService('es');

  const baseTime = new Date('2023-10-01T00:00:00.000Z').getTime();
  const startLegacy = moment(baseTime).add(0, 'minutes');
  const start = moment(baseTime).add(5, 'minutes');
  const endLegacy = moment(baseTime).add(10, 'minutes');
  const end = moment(baseTime).add(15, 'minutes');

  describe('Time range metadata when there are multiple APM Server versions', () => {
    describe('when ingesting traces from APM Server with different versions', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateTraceDataForService({
          serviceName: 'synth-java-legacy',
          start: startLegacy,
          end: endLegacy,
          isLegacy: true,
          synthtrace: apmSynthtraceEsClient,
        });

        await generateTraceDataForService({
          serviceName: 'synth-java',
          start,
          end,
          isLegacy: false,
          synthtrace: apmSynthtraceEsClient,
        });
      });

      after(() => {
        return apmSynthtraceEsClient.clean();
      });

      it('ingests transaction metrics with transaction.duration.summary', async () => {
        const res = await es.search({
          index: 'metrics-apm*',
          body: {
            query: {
              bool: {
                filter: [
                  { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
                  { exists: { field: TRANSACTION_DURATION_SUMMARY } },
                ],
              },
            },
          },
        });

        // @ts-expect-error
        expect(res.hits.total.value).to.be(20);
      });

      it('ingests transaction metrics without transaction.duration.summary', async () => {
        const res = await es.search({
          index: 'metrics-apm*',
          body: {
            query: {
              bool: {
                filter: [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }],
                must_not: [{ exists: { field: TRANSACTION_DURATION_SUMMARY } }],
              },
            },
          },
        });

        // @ts-expect-error
        expect(res.hits.total.value).to.be(10);
      });

      it('has transaction.duration.summary field for every document type', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/time_range_metadata',
          params: {
            query: {
              start: endLegacy.toISOString(),
              end: end.toISOString(),
              enableContinuousRollups: true,
              enableServiceTransactionMetrics: true,
              useSpanName: false,
              kuery: '',
            },
          },
        });

        const allHasSummaryField = response.body.sources
          .filter(
            (source) =>
              source.documentType !== ApmDocumentType.TransactionEvent &&
              source.rollupInterval !== RollupInterval.SixtyMinutes // there is not enough data for 60 minutes
          )
          .every((source) => {
            return source.hasDurationSummaryField;
          });

        expect(allHasSummaryField).to.eql(true);
      });

      it('does not support transaction.duration.summary when the field is not supported by all APM server versions', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/time_range_metadata',
          params: {
            query: {
              start: startLegacy.toISOString(),
              end: endLegacy.toISOString(),
              enableContinuousRollups: true,
              enableServiceTransactionMetrics: true,
              useSpanName: false,
              kuery: '',
            },
          },
        });

        const allHasSummaryField = response.body.sources.every((source) => {
          return source.hasDurationSummaryField;
        });

        expect(allHasSummaryField).to.eql(false);
      });

      it('does not support transaction.duration.summary for transactionMetric 1m when not all documents within the range support it ', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/time_range_metadata',
          params: {
            query: {
              start: startLegacy.toISOString(),
              end: end.toISOString(),
              enableContinuousRollups: true,
              enableServiceTransactionMetrics: true,
              useSpanName: false,
              kuery: '',
            },
          },
        });

        const hasDurationSummaryField = response.body.sources.find(
          (source) =>
            source.documentType === ApmDocumentType.TransactionMetric &&
            source.rollupInterval === RollupInterval.OneMinute // there is not enough data for 60 minutes in the timerange defined for the tests
        )?.hasDurationSummaryField;

        expect(hasDurationSummaryField).to.eql(false);
      });

      it('does not have latency data for synth-java-legacy', async () => {
        const res = await getLatencyChartForService({
          serviceName: 'synth-java-legacy',
          start,
          end: endLegacy,
          apmApiClient,
          useDurationSummary: true,
        });

        expect(res.body.currentPeriod.latencyTimeseries.map(({ y }) => y)).to.eql([
          null,
          null,
          null,
          null,
          null,
          null,
        ]);
      });

      it('has latency data for synth-java service', async () => {
        const res = await getLatencyChartForService({
          serviceName: 'synth-java',
          start,
          end: endLegacy,
          apmApiClient,
          useDurationSummary: true,
        });

        expect(res.body.currentPeriod.latencyTimeseries.map(({ y }) => y)).to.eql([
          1000000, 1000000, 1000000, 1000000, 1000000, 1000000,
        ]);
      });
    });
  });
}

// This will retrieve latency data expecting the `transaction.duration.summary` field to be present
function getLatencyChartForService({
  serviceName,
  start,
  end,
  apmApiClient,
  useDurationSummary,
}: {
  serviceName: string;
  start: moment.Moment;
  end: moment.Moment;
  apmApiClient: ApmApiClient;
  useDurationSummary: boolean;
}) {
  return apmApiClient.readUser({
    endpoint: `GET /internal/apm/services/{serviceName}/transactions/charts/latency`,
    params: {
      path: { serviceName },
      query: {
        start: start.toISOString(),
        end: end.toISOString(),
        environment: 'production',
        latencyAggregationType: LatencyAggregationType.avg,
        transactionType: 'request',
        kuery: '',
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
        bucketSizeInSeconds: 60,
        useDurationSummary,
      },
    },
  });
}

function generateTraceDataForService({
  serviceName,
  start,
  end,
  isLegacy,
  synthtrace,
}: {
  serviceName: string;
  start: moment.Moment;
  end: moment.Moment;
  isLegacy?: boolean;
  synthtrace: ApmSynthtraceEsClient;
}) {
  const instance = apm
    .service({
      name: serviceName,
      environment: 'production',
      agentName: 'java',
    })
    .instance(`instance`);

  const events = timerange(start, end)
    .ratePerMinute(6)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: 'GET /order/{id}' })
        .timestamp(timestamp)
        .duration(1000)
        .success()
    );

  const apmPipeline = (base: Readable) => {
    return synthtrace.getDefaultPipeline({ versionOverride: '8.5.0' })(base);
  };

  return synthtrace.index(events, isLegacy ? apmPipeline : undefined);
}
