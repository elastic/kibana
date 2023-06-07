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
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'apm_8.0.0';
  const { end } = archives[archiveName];
  const start = new Date(Date.parse(end) - 600000).toISOString();

  const getOptions = () => ({
    params: {
      query: {
        start,
        end,
        serviceName: 'opbeans-java',
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

    it('error_count (without data)', async () => {
      const options = getOptions();
      options.params.query.transactionType = undefined;

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorCountChartPreview).to.eql([]);
    });

    it('transaction_duration (without data)', async () => {
      const options = getOptions();

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [archiveName] }, () => {
    it('transaction_error_rate (with data)', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(
        response.body.errorRateChartPreview.some(
          (item: { x: number; y: number | null }) => item.x && item.y
        )
      ).to.equal(true);
    });

    it('transaction_error_rate with transaction name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
            transactionName: 'APIRestController#product',
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
      expect(response.body.errorRateChartPreview[0]).to.eql({
        x: 1627974600000,
        y: 1,
      });
    });

    it('transaction_error_rate with nonexistent transaction name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
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
      expect(
        response.body.errorRateChartPreview.every(
          (item: { x: number; y: number | null }) => item.y === null
        )
      ).to.equal(true);
    });

    it('error_count (with data)', async () => {
      const options = getOptions();
      options.params.query.transactionType = undefined;

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(
        response.body.errorCountChartPreview.some(
          (item: { x: number; y: number | null }) => item.x && item.y
        )
      ).to.equal(true);
    });

    it('error_count with error grouping key', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
            errorGroupingKey: 'd16d39e7fa133b8943cea035430a7b4e',
            environment: 'ENVIRONMENT_ALL',
            interval: '5m',
          },
        },
      };

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorCountChartPreview).to.eql([
        { x: 1627974600000, y: 4 },
        { x: 1627974900000, y: 2 },
        { x: 1627975200000, y: 0 },
      ]);
    });

    it('transaction_duration (with data)', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(
        response.body.latencyChartPreview.some(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
        )
      ).to.equal(true);
    });

    it('transaction_duration with transaction name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
            transactionName: 'DispatcherServlet#doGet',
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
            interval: '5m',
          },
        },
      };
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview[0].data[0]).to.eql({
        x: 1627973700000,
        y: 2399148.714285714,
      });
    });

    it('transaction_duration with nonexistent transaction name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
            transactionType: 'request',
            transactionName: 'foo',
            environment: 'ENVIRONMENT_ALL',
            interval: '5m',
          },
        },
      };
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview).to.eql([]);
    });

    it('transaction_duration with no group by parameter', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview.length).to.equal(1);
      expect(
        response.body.latencyChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql(['opbeans-java_production_request']);
    });

    it('transaction_duration with default group by fields', async () => {
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
      expect(response.body.latencyChartPreview.length).to.equal(1);
      expect(
        response.body.latencyChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql(['opbeans-java_production_request']);
    });

    it('transaction_duration with group by on transaction name', async () => {
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
      expect(response.body.latencyChartPreview.length).to.equal(12);
      expect(
        response.body.latencyChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql([
        'opbeans-java_production_request_DispatcherServlet#doGet',
        'opbeans-java_production_request_APIRestController#stats',
        'opbeans-java_production_request_APIRestController#product',
        'opbeans-java_production_request_APIRestController#order',
        'opbeans-java_production_request_APIRestController#products',
        'opbeans-java_production_request_APIRestController#customer',
        'opbeans-java_production_request_APIRestController#topProducts',
        'opbeans-java_production_request_APIRestController#customerWhoBought',
        'opbeans-java_production_request_APIRestController#orders',
        'opbeans-java_production_request_ResourceHttpRequestHandler',
        'opbeans-java_production_request_APIRestController#customers',
        'opbeans-java_production_request_DispatcherServlet#doPost',
      ]);
    });

    it('transaction_duration with group by on transaction name and filter on transaction name', async () => {
      const options = {
        params: {
          query: {
            ...getOptions().params.query,
            transactionName: 'DispatcherServlet#doGet',
            groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME],
          },
        },
      };

      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview.length).to.equal(1);
      expect(
        response.body.latencyChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql(['opbeans-java_production_request_DispatcherServlet#doGet']);
    });
  });
}
