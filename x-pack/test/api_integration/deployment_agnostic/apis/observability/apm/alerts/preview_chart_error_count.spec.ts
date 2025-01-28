/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreviewChartResponseItem } from '@kbn/apm-plugin/server/routes/alerts/route';
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '@kbn/observability-shared-plugin/common';
import { generateLongIdWithSeed } from '@kbn/apm-synthtrace-client/src/lib/utils/generate_id';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { generateErrorData } from './generate_data';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
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
        searchConfiguration: JSON.stringify({
          query: {
            query: 'service.name: synth-go',
            language: 'kuery',
          },
        }),
        serviceName: undefined,
        errorGroupingKey: undefined,
        environment: 'ENVIRONMENT_ALL',
      },
    },
  });

  describe('preview chart error count', () => {
    describe(`without data loaded`, () => {
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

    describe(`with data loaded`, () => {
      describe('error_count: with data loaded', () => {
        let apmSynthtraceEsClient: ApmSynthtraceEsClient;
        before(async () => {
          apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
          await Promise.all([
            generateErrorData({ serviceName: 'synth-go', start, end, apmSynthtraceEsClient }),
            generateErrorData({ serviceName: 'synth-java', start, end, apmSynthtraceEsClient }),
          ]);
        });

        after(() => apmSynthtraceEsClient.clean());

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
                errorGroupingKey: `${generateLongIdWithSeed('Error 1')}`,
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
              name: `synth-go_production_${generateLongIdWithSeed('Error 1')}`,
              y: 250,
            },
            {
              name: `synth-go_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
          ]);
        });

        it('with group by on error grouping key and filter on error grouping key', async () => {
          const options = {
            params: {
              query: {
                ...getOptions().params.query,
                errorGroupingKey: `${generateLongIdWithSeed('Error 0')}`,
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
              name: `synth-go_production_${generateLongIdWithSeed('Error 0')}`,
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
              name: `synth-go_production_${generateLongIdWithSeed('Error 1')}`,
              y: 250,
            },
            {
              name: `synth-java_production_${generateLongIdWithSeed('Error 1')}`,
              y: 250,
            },
            {
              name: `synth-go_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
            {
              name: `synth-java_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
          ]);
        });
      });
    });

    describe(`with data loaded and using KQL filter`, () => {
      describe('error_count: with data loaded and using KQL filter', () => {
        let apmSynthtraceEsClient: ApmSynthtraceEsClient;
        before(async () => {
          apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
          await generateErrorData({ serviceName: 'synth-go', start, end, apmSynthtraceEsClient });
          await generateErrorData({ serviceName: 'synth-java', start, end, apmSynthtraceEsClient });
        });

        after(() => apmSynthtraceEsClient.clean());

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
                searchConfiguration: JSON.stringify({
                  query: {
                    query: `service.name: synth-go and error.grouping_key: ${generateLongIdWithSeed(
                      'Error 1'
                    )}`,
                    language: 'kuery',
                  },
                }),
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
              name: `synth-go_production_${generateLongIdWithSeed('Error 1')}`,
              y: 250,
            },
            {
              name: `synth-go_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
          ]);
        });

        it('with group by on error grouping key and filter on error grouping key', async () => {
          const options = {
            params: {
              query: {
                ...getOptionsWithFilterQuery().params.query,
                searchConfiguration: JSON.stringify({
                  query: {
                    query: `service.name: synth-go and error.grouping_key: ${generateLongIdWithSeed(
                      'Error 0'
                    )}`,
                    language: 'kuery',
                  },
                }),
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
              name: `synth-go_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
          ]);
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
                searchConfiguration: JSON.stringify({
                  query: {
                    query: '',
                    language: 'kuery',
                  },
                }),
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
              name: `synth-go_production_${generateLongIdWithSeed('Error 1')}`,
              y: 250,
            },
            {
              name: `synth-java_production_${generateLongIdWithSeed('Error 1')}`,
              y: 250,
            },
            {
              name: `synth-go_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
            {
              name: `synth-java_production_${generateLongIdWithSeed('Error 0')}`,
              y: 125,
            },
          ]);
        });
      });
    });
  });
}
