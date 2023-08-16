/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  ERROR_GROUP_ID,
} from '@kbn/apm-plugin/common/es_fields/apm';
import type { PreviewChartResponseItem } from '@kbn/apm-plugin/server/routes/alerts/route';
import { getErrorGroupingKey } from '@kbn/apm-synthtrace-client/src/lib/apm/instance';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateErrorData } from './generate_data';

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
        kqlFilter: 'service.name: synth-go',
        serviceName: undefined,
        errorGroupingKey: undefined,
        environment: 'ENVIRONMENT_ALL',
      },
    },
  });

  registry.when(`without data loaded`, { config: 'basic', archives: [] }, () => {
    it('error_count (without data)', async () => {
      const options = getOptions();

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorCountChartPreview.series).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [] }, () => {
    describe('error_count', () => {
      before(async () => {
        await generateErrorData({ serviceName: 'synth-go', start, end, synthtraceEsClient });
        await generateErrorData({ serviceName: 'synth-java', start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      it('with data', async () => {
        const options = getOptions();

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.some((item: PreviewChartResponseItem) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);
      });

      it('with error grouping key', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: 'synth-go',
              errorGroupingKey: `${getErrorGroupingKey('Error 1')}`,
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
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production', y: 250 }]);
      });

      it('with no group by parameter', async () => {
        const options = getOptions();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production', y: 375 }]);
      });

      it('with default group by fields', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production', y: 375 }]);
      });

      it('with group by on error grouping key', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(2);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 1')}`,
            y: 250,
          },
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
        ]);
      });

      it('with group by on error grouping key and filter on error grouping key', async () => {
        const options = {
          params: {
            query: {
              ...getOptions().params.query,
              errorGroupingKey: `${getErrorGroupingKey('Error 0')}`,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
        ]);
      });

      it('with empty service name', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: '',
              environment: 'ENVIRONMENT_ALL',
              interval: '5m',
            },
          },
        };
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production', y: 375 },
          { name: 'synth-java_production', y: 375 },
        ]);
      });

      it('with empty service name and group by on error grouping key', async () => {
        const options = {
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              serviceName: '',
              environment: 'ENVIRONMENT_ALL',
              interval: '5m',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
            },
          },
        };
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 1')}`,
            y: 250,
          },
          {
            name: `synth-java_production_${getErrorGroupingKey('Error 1')}`,
            y: 250,
          },
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
          {
            name: `synth-java_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
        ]);
      });
    });
  });

  registry.when(`with data loaded and using KQL filter`, { config: 'basic', archives: [] }, () => {
    describe('error_count', () => {
      before(async () => {
        await generateErrorData({ serviceName: 'synth-go', start, end, synthtraceEsClient });
        await generateErrorData({ serviceName: 'synth-java', start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      it('with data', async () => {
        const options = getOptionsWithFilterQuery();

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.some((item: PreviewChartResponseItem) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
          )
        ).to.equal(true);
      });

      it('with error grouping key in filter query', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter: `service.name: synth-go and error.grouping_key: ${getErrorGroupingKey(
                'Error 1'
              )}`,
            },
          },
        };

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
          ...options,
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production', y: 250 }]);
      });

      it('with no group by parameter', async () => {
        const options = getOptionsWithFilterQuery();
        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production', y: 375 }]);
      });

      it('with default group by fields', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([{ name: 'synth-go_production', y: 375 }]);
      });

      it('with group by on error grouping key', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(2);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 1')}`,
            y: 250,
          },
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
        ]);
      });

      it('with group by on error grouping key and filter on error grouping key', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter: `service.name: synth-go and error.grouping_key: ${getErrorGroupingKey(
                'Error 0'
              )}`,
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(response.body.errorCountChartPreview.series.length).to.equal(1);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
        ]);
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
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          { name: 'synth-go_production', y: 375 },
          { name: 'synth-java_production', y: 375 },
        ]);
      });

      it('with empty filter query and group by on error grouping key', async () => {
        const options = {
          params: {
            query: {
              ...getOptionsWithFilterQuery().params.query,
              kqlFilter: '',
              groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
            },
          },
        };

        const response = await apmApiClient.readUser({
          ...options,
          endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        });

        expect(response.status).to.be(200);
        expect(
          response.body.errorCountChartPreview.series.map((item: PreviewChartResponseItem) => ({
            name: item.name,
            y: item.data[0].y,
          }))
        ).to.eql([
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 1')}`,
            y: 250,
          },
          {
            name: `synth-java_production_${getErrorGroupingKey('Error 1')}`,
            y: 250,
          },
          {
            name: `synth-go_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
          {
            name: `synth-java_production_${getErrorGroupingKey('Error 0')}`,
            y: 125,
          },
        ]);
      });
    });
  });
}
