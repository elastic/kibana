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
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateData } from '../errors/generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const serviceName = 'synth-go';

  const getOptions = () => ({
    params: {
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        serviceName: 'synth-go',
        transactionType: 'request' as string | undefined,
        environment: 'ENVIRONMENT_ALL',
        interval: '5m',
      },
    },
  });

  registry.when(`without data loaded`, { config: 'basic', archives: [] }, () => {
    it('transaction_error_rate (without data)', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorRateChartPreview).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [] }, () => {
    describe('errors distribution', () => {
      before(async () => {
        await generateData({ serviceName, start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      it('transaction_error_rate (with data)', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorRateChartPreview.some(
            (item: { name: string; data: Array<{ x: number; y: number | null }> }) =>
              item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);

        expect(response.body.errorRateChartPreview[0].name).to.eql('synth-go_production_request');
        expect(response.body.errorRateChartPreview[0].data[1]).to.eql({
          x: 1609459500000,
          y: 37.5,
        });
      });

      it('transaction_error_rate with transaction name', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: 'synth-go',
              transactionName: 'GET /banana 🍌',
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
        expect(response.body.errorRateChartPreview[0].data[0]).to.eql({
          x: 1609459200000,
          y: 50,
        });
      });

      it('transaction_error_rate with nonexistent transaction name', async () => {
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
        expect(response.body.errorRateChartPreview).to.eql([]);
      });

      it('transaction_error_rate with no group by parameter', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.map(
            (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
          )
        ).to.eql(['synth-go_production_request']);
      });

      it('transaction_error_rate with default group by fields', async () => {
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
        expect(response.body.errorRateChartPreview.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.map(
            (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
          )
        ).to.eql(['synth-go_production_request']);
      });

      it('transaction_error_rate with group by on transaction name', async () => {
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
        expect(response.body.errorRateChartPreview.length).to.equal(2);
        expect(response.body.errorRateChartPreview[0].name).to.eql(
          'synth-go_production_request_GET /apple 🍎 '
        );
        expect(response.body.errorRateChartPreview[1].name).to.eql(
          'synth-go_production_request_GET /banana 🍌'
        );
        expect(response.body.errorRateChartPreview[0].data[0]).to.eql({
          x: 1609459200000,
          y: 25,
        });
        expect(response.body.errorRateChartPreview[1].data[0]).to.eql({
          x: 1609459200000,
          y: 50,
        });
      });

      it('transaction_error_rate with group by on transaction name and filter on transaction name', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              transactionName: 'GET /apple 🍎 ',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorRateChartPreview.length).to.equal(1);
        expect(
          response.body.errorRateChartPreview.map(
            (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
          )
        ).to.eql(['synth-go_production_request_GET /apple 🍎 ']);
      });

      it('transaction_error_rate with empty service name, transaction name and transaction type', async () => {
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
          response.body.errorRateChartPreview.map(
            (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
          )
        ).to.eql(['synth-go_production_request']);
      });

      it('transaction_error_rate with empty service name, transaction name, transaction type and group by on transaction name', async () => {
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
          response.body.errorRateChartPreview
            .map(
              (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
            )
            .slice(0, 5)
        ).to.eql([
          'synth-go_production_request_GET /apple 🍎 ',
          'synth-go_production_request_GET /banana 🍌',
        ]);
      });
    });
  });
}
