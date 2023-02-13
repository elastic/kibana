/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { omit, sortBy } from 'lodash';
import moment, { Moment } from 'moment';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const esClient = getService('es');

  const start = moment('2022-01-01T00:00:00.000Z');
  const end = moment('2022-01-02T00:00:00.000Z').subtract(1, 'millisecond');

  async function getTimeRangeMedata(
    overrides: Partial<
      Omit<
        APIClientRequestParamsOf<'GET /internal/apm/time_range_metadata'>['params']['query'],
        'start' | 'end'
      >
    > & { start: Moment; end: Moment }
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/time_range_metadata',
      params: {
        query: {
          start: overrides.start.toISOString(),
          end: overrides.end.toISOString(),
          enableContinuousRollups: true,
          enableServiceTransactionMetrics: true,
          useSpanName: false,
          kuery: '',
          ...omit(overrides, 'start', 'end'),
        },
      },
    });

    return {
      ...response.body,
      sources: sortBy(response.body.sources, ['documentType', 'rollupInterval']),
    };
  }

  registry.when('Time range metadata without data', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await getTimeRangeMedata({
        start,
        end,
      });

      expect(response.isUsingServiceDestinationMetrics).to.eql(false);
      expect(response.sources.filter((source) => source.hasDocs)).to.eql([
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
          hasDocs: true,
        },
      ]);
    });
  });

  registry.when(
    'Time range metadata when generating data',
    { config: 'basic', archives: [] },
    () => {
      before(() => {
        const instance = apm.service('my-service', 'production', 'java').instance('instance');

        return synthtraceEsClient.index(
          timerange(moment(start).subtract(1, 'day'), end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return instance.transaction('GET /api').duration(100).timestamp(timestamp);
            })
        );
      });

      after(() => {
        return synthtraceEsClient.clean();
      });

      describe('with default settings', () => {
        it('returns all available document sources', async () => {
          const response = await getTimeRangeMedata({
            start,
            end,
          });

          expect(response.sources).to.eql([
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
          ]);
        });
      });

      describe('with continuous rollups disabled', () => {
        it('returns only 1m intervals', async () => {
          const response = await getTimeRangeMedata({
            start,
            end,
            enableContinuousRollups: false,
          });

          expect(response.sources).to.eql([
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
          ]);
        });
      });

      describe('with service metrics disabled', () => {
        it('only returns tx metrics and events as available sources', async () => {
          const response = await getTimeRangeMedata({
            start,
            end,
            enableServiceTransactionMetrics: false,
          });

          expect(response.sources).to.eql([
            {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
          ]);
        });
      });

      describe('when data is available before the time range', () => {
        it('marks all those sources as available', async () => {
          const response = await getTimeRangeMedata({
            start: moment(start).add(12, 'hours'),
            end: moment(end).add(12, 'hours'),
          });

          expect(response.sources).to.eql([
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
          ]);
        });
      });

      describe('when data is not available before the time range, but is within the time range', () => {
        it('marks those sources as available', async () => {
          const response = await getTimeRangeMedata({
            start: moment(start).add(6, 'hours'),
            end: moment(end).add(6, 'hours'),
          });

          expect(response.sources).to.eql([
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
          ]);
        });
      });

      describe('when service metrics are only available in the current time range', () => {
        before(async () => {
          await esClient.deleteByQuery({
            index: 'metrics-apm*',
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'metricset.name': ['service_transaction', 'service_summary'],
                    },
                  },
                  {
                    range: {
                      '@timestamp': {
                        lte: start.toISOString(),
                      },
                    },
                  },
                ],
              },
            },
            refresh: true,
            expand_wildcards: ['open', 'hidden'],
          });
        });

        it('marks service transaction metrics as unavailable', async () => {
          const response = await getTimeRangeMedata({
            start,
            end,
          });

          expect(
            response.sources.filter(
              (source) =>
                source.documentType === ApmDocumentType.ServiceTransactionMetric &&
                source.hasDocs === false
            ).length
          ).to.eql(3);

          expect(
            response.sources.filter(
              (source) =>
                source.documentType === ApmDocumentType.TransactionMetric && source.hasDocs === true
            ).length
          ).to.eql(3);
        });
      });

      describe('after deleting a specific data set', () => {
        before(async () => {
          await esClient.deleteByQuery({
            index: 'metrics-apm*',
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'metricset.name': ['transaction'],
                    },
                  },
                  {
                    term: {
                      'metricset.interval': '1m',
                    },
                  },
                ],
              },
            },
            refresh: true,
            expand_wildcards: ['open', 'hidden'],
          });
        });

        it('marks that data source as unavailable', async () => {
          const response = await getTimeRangeMedata({
            start,
            end,
          });

          expect(
            response.sources.filter(
              (source) => source.documentType === ApmDocumentType.TransactionMetric
            )
          ).to.eql([
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.TenMinutes,
              hasDocs: true,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              hasDocs: false,
            },
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
              hasDocs: true,
            },
          ]);
        });
      });

      after(() => synthtraceEsClient.clean());
    }
  );
}
