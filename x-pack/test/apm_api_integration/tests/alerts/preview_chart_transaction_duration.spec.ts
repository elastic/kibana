/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-plugin/common/es_fields/apm';
import type { PreviewChartResponseItem } from '@kbn/apm-plugin/server/routes/alerts/route';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateLatencyData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  const getOptions = () => ({
    params: {
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        serviceName: 'synth-go',
        transactionType: 'request',
        environment: 'ENVIRONMENT_ALL',
        interval: '5m',
        kqlFilter: '',
      },
    },
  });

  const getOptionsWithFilterQuery = () => ({
    params: {
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        interval: '5m',
        kqlFilter: 'service.name: synth-go and transaction.type: request',
        serviceName: undefined,
        transactionType: undefined,
        transactionName: undefined,
        environment: 'ENVIRONMENT_ALL',
      },
    },
  });

  registry.when(`without data loaded`, { config: 'basic', archives: [] }, () => {
    it('transaction_duration (without data)', async () => {
      const options = getOptions();

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview.series).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [] }, () => {
    describe('transaction_duration', () => {
      before(async () => {
        await generateLatencyData({ serviceName: 'synth-go', start, end, synthtraceEsClient });
        await generateLatencyData({ serviceName: 'synth-java', start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      it('with data', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.latencyChartPreview.series.some((item: PreviewChartResponseItem) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);
      });

      it('with transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              transactionName: 'GET /banana',
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 5000 }]);
      });

      it('with nonexistent transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              transactionName: 'foo',
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series).to.eql([]);
      });

      it('with no group by parameter', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(1);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 7500 }]);
      });

      it('with default group by fields', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(1);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 7500 }]);
      });

      it('with group by on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(2);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request_GET /apple', y: 10000 },
          { name: 'synth-go_production_request_GET /banana', y: 5000 },
        ]);
      });

      it('with group by on transaction name and filter on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              transactionName: 'GET /apple',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(1);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request_GET /apple', y: 10000 }]);
      });

      it('with empty service name, transaction name and transaction type', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              serviceName: '',
              transactionName: '',
              transactionType: '',
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request', y: 7500 },
          { name: 'synth-java_production_request', y: 7500 },
        ]);
      });

      it('with empty service name, transaction name, transaction type and group by on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              serviceName: '',
              transactionName: '',
              transactionType: '',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(4);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request_GET /apple', y: 10000 },
          { name: 'synth-java_production_request_GET /apple', y: 10000 },
          { name: 'synth-go_production_request_GET /banana', y: 5000 },
          { name: 'synth-java_production_request_GET /banana', y: 5000 },
        ]);
      });
    });
  });

  registry.when(`with data loaded and using KQL filter`, { config: 'basic', archives: [] }, () => {
    describe('transaction_duration', () => {
      before(async () => {
        await generateLatencyData({ serviceName: 'synth-go', start, end, synthtraceEsClient });
        await generateLatencyData({ serviceName: 'synth-java', start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      it('with data', async () => {
        const options = getOptionsWithFilterQuery();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.latencyChartPreview.series.some((item: PreviewChartResponseItem) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);
      });

      it('with transaction name in filter query', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter:
                'service.name: synth-go and transaction.type: request and transaction.name: GET /banana',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 5000 }]);
      });

      it('with nonexistent transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter:
                'service.name: synth-go and transaction.type: request and transaction.name: foo',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series).to.eql([]);
      });

      it('with no group by parameter', async () => {
        const options = getOptionsWithFilterQuery();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(1);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 7500 }]);
      });

      it('with default group by fields', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(1);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 7500 }]);
      });

      it('with group by on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(2);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request_GET /apple', y: 10000 },
          { name: 'synth-go_production_request_GET /banana', y: 5000 },
        ]);
      });

      it('with group by on transaction name and filter on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter:
                'service.name: synth-go and transaction.type: request and transaction.name: GET /apple',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(1);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request_GET /apple', y: 10000 }]);
      });

      it('with empty filter query', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter: '',
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request', y: 7500 },
          { name: 'synth-java_production_request', y: 7500 },
        ]);
      });

      it('with empty filter query and group by on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter: '',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.latencyChartPreview.series.length).to.equal(4);
        expect(
          response.body.latencyChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request_GET /apple', y: 10000 },
          { name: 'synth-java_production_request_GET /apple', y: 10000 },
          { name: 'synth-go_production_request_GET /banana', y: 5000 },
          { name: 'synth-java_production_request_GET /banana', y: 5000 },
        ]);
      });
    });
  });
}
