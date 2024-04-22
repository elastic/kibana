/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import {
  addObserverVersionTransform,
  ApmSynthtraceEsClient,
  deleteSummaryFieldTransform,
} from '@kbn/apm-synthtrace';
import {
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
} from '@kbn/apm-plugin/common/es_fields/apm';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { pipeline, Readable } from 'stream';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ApmApiClient } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('synthtraceEsClient');
  const es = getService('es');

  const baseTime = new Date('2023-10-01T00:00:00.000Z').getTime();
  const startLegacy = moment(baseTime).add(0, 'minutes');
  const start = moment(baseTime).add(5, 'minutes');
  const end = moment(baseTime).add(10, 'minutes');

  // FLAKY: https://github.com/elastic/kibana/issues/177534
  registry.when(
    'Time range metadata when there are multiple APM Server versions',
    { config: 'basic', archives: [] },
    () => {
      describe('when ingesting traces from APM Server with different versions', () => {
        before(async () => {
          await generateTraceDataForService({
            serviceName: 'synth-java-legacy',
            start: startLegacy,
            end,
            isLegacy: true,
            synthtrace,
          });

          await generateTraceDataForService({
            serviceName: 'synth-java',
            start,
            end,
            isLegacy: false,
            synthtrace,
          });
        });

        after(() => {
          return synthtrace.clean();
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
          expect(res.hits.total.value).to.be(10);
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
          expect(res.hits.total.value).to.be(20);
        });

        it('has transaction.duration.summary field for every document type', async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/time_range_metadata',
            params: {
              query: {
                start: start.toISOString(),
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
                source.documentType === ApmDocumentType.TransactionMetric &&
                source.rollupInterval !== RollupInterval.OneMinute
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
                end: end.toISOString(),
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

        it('does not have latency data for synth-java-legacy', async () => {
          const res = await getLatencyChartForService({
            serviceName: 'synth-java-legacy',
            start,
            end,
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
            end,
            apmApiClient,
            useDurationSummary: true,
          });

          expect(res.body.currentPeriod.latencyTimeseries.map(({ y }) => y)).to.eql([
            1000000,
            1000000,
            1000000,
            1000000,
            1000000,
            null,
          ]);
        });
      });
    }
  );
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
    const defaultPipeline = synthtrace.getDefaultPipeline()(
      base
    ) as unknown as NodeJS.ReadableStream;

    return pipeline(
      defaultPipeline,
      addObserverVersionTransform('8.5.0'),
      deleteSummaryFieldTransform(),
      (err) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    );
  };

  return synthtrace.index(events, isLegacy ? apmPipeline : undefined);
}
