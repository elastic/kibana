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
import { generateErrorData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
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
      },
    },
  });

  const getOptionsWithFilterQuery = () => ({
    params: {
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        interval: '5m',
        searchConfiguration: JSON.stringify({
          query: {
            query: 'service.name: synth-go and transaction.type: request',
            language: 'kuery',
          },
        }),
        serviceName: undefined,
        transactionType: undefined,
        transactionName: undefined,
        environment: 'ENVIRONMENT_ALL',
      },
    },
  });

  registry.when(`without data loaded`, { config: 'basic', archives: [] }, () => {
    it('transaction_error_rate without data', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorRateChartPreview.series).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [] }, () => {
    // FLAKY: https://github.com/elastic/kibana/issues/176977
    describe('transaction_error_rate', () => {
      before(async () => {
        await generateErrorData({ serviceName: 'synth-go', start, end, apmSynthtraceEsClient });
        await generateErrorData({ serviceName: 'synth-java', start, end, apmSynthtraceEsClient });
      });

      after(() => apmSynthtraceEsClient.clean());

      it('with data', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.some((item: PreviewChartResponseItem) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);
      });

      it('with transaction name', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: 'synth-go',
              transactionName: 'GET /banana',
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              interval: '5m',
            },
          },
        };

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 50 }]);
      });

      it('with nonexistent transaction name', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: 'synth-go',
              transactionName: 'foo',
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              interval: '5m',
            },
          },
        };

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series).to.eql([]);
      });

      it('with no group by parameter', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 37.5 }]);
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
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 37.5 }]);
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
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(2);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: 'synth-go_production_request_GET /banana',
            y: 50,
          },
          {
            name: 'synth-go_production_request_GET /apple',
            y: 25,
          },
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
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request_GET /apple', y: 25 }]);
      });

      it.skip('with empty service name, transaction name and transaction type', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: '',
              transactionName: '',
              transactionType: '',
              environment: 'ENVIRONMENT_ALL',
              interval: '5m',
            },
          },
        };
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request', y: 37.5 },
          { name: 'synth-java_production_request', y: 37.5 },
        ]);
      });

      it('with empty service name, transaction name, transaction type and group by on transaction name', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: '',
              transactionName: '',
              transactionType: '',
              environment: 'ENVIRONMENT_ALL',
              interval: '5m',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: 'synth-go_production_request_GET /banana',
            y: 50,
          },
          {
            name: 'synth-java_production_request_GET /banana',
            y: 50,
          },
          {
            name: 'synth-go_production_request_GET /apple',
            y: 25,
          },
          {
            name: 'synth-java_production_request_GET /apple',
            y: 25,
          },
        ]);
      });
    });
  });

  registry.when(`with data loaded and using KQL filter`, { config: 'basic', archives: [] }, () => {
    // FLAKY: https://github.com/elastic/kibana/issues/176983
    describe('transaction_error_rate', () => {
      before(async () => {
        await generateErrorData({ serviceName: 'synth-go', start, end, apmSynthtraceEsClient });
        await generateErrorData({ serviceName: 'synth-java', start, end, apmSynthtraceEsClient });
      });

      after(() => apmSynthtraceEsClient.clean());

      it('with data', async () => {
        const options = getOptionsWithFilterQuery();
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.some((item: PreviewChartResponseItem) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);
      });

      it('with transaction name in filter query', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              searchConfiguration: JSON.stringify({
                query: {
                  query:
                    'service.name: synth-go and transaction.type: request and transaction.name: GET /banana',
                  language: 'kuery',
                },
              }),
            },
          },
        };

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 50 }]);
      });

      it('with nonexistent transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              searchConfiguration: JSON.stringify({
                query: {
                  query:
                    'service.name: synth-go and transaction.type: request and transaction.name: foo',
                  language: 'kuery',
                },
              }),
            },
          },
        };

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series).to.eql([]);
      });

      it('with no group by parameter', async () => {
        const options = getOptionsWithFilterQuery();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 37.5 }]);
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
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request', y: 37.5 }]);
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
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(2);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: 'synth-go_production_request_GET /banana',
            y: 50,
          },
          {
            name: 'synth-go_production_request_GET /apple',
            y: 25,
          },
        ]);
      });

      it('with group by on transaction name and filter on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              searchConfiguration: JSON.stringify({
                query: {
                  query:
                    'service.name: synth-go and transaction.type: request and transaction.name: GET /apple',
                  language: 'kuery',
                },
              }),
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production_request_GET /apple', y: 25 }]);
      });

      it('with empty filter query', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              searchConfiguration: JSON.stringify({
                query: {
                  query: '',
                  language: 'kuery',
                },
              }),
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production_request', y: 37.5 },
          { name: 'synth-java_production_request', y: 37.5 },
        ]);
      });

      it.skip('with empty filter query and group by on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              searchConfiguration: JSON.stringify({
                query: {
                  query: '',
                  language: 'kuery',
                },
              }),
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: 'synth-go_production_request_GET /banana',
            y: 50,
          },
          {
            name: 'synth-java_production_request_GET /banana',
            y: 50,
          },
          {
            name: 'synth-go_production_request_GET /apple',
            y: 25,
          },
          {
            name: 'synth-java_production_request_GET /apple',
            y: 25,
          },
        ]);
      });
    });
  });
}
