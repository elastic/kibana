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
        environment: 'ENVIRONMENT_ALL',
        interval: '5m',
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
      expect(response.body.errorCountChartPreview).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [archiveName] }, () => {
    it('error_count (with data)', async () => {
      const options = getOptions();

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(
        response.body.errorCountChartPreview.some(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
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
      expect(response.body.errorCountChartPreview[0].data[0]).to.eql({
        x: 1627973700000,
        y: 5,
      });
    });

    it('error_count with no group by parameter', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.errorCountChartPreview.length).to.equal(1);
      expect(
        response.body.errorCountChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql(['opbeans-java_production']);
    });

    it('error_count with default group by fields', async () => {
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
      expect(response.body.errorCountChartPreview.length).to.equal(1);
      expect(
        response.body.errorCountChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql(['opbeans-java_production']);
    });

    it('error_count with group by on error grouping key', async () => {
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
      expect(response.body.errorCountChartPreview.length).to.equal(8);
      expect(
        response.body.errorCountChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql([
        'opbeans-java_production_d16d39e7fa133b8943cea035430a7b4e',
        'opbeans-java_production_cc9272d7511c88a533ac41cc3e2ce54b',
        'opbeans-java_production_237562dfa8b8ab4eb94f22c87e42112b',
        'opbeans-java_production_25fae1b27007f121924df65fcee1b115',
        'opbeans-java_production_3bb34b98031a19c277bf59c3db82d3f3',
        'opbeans-java_production_97c2eef51fec10d177ade955670a2f15',
        'opbeans-java_production_e23c53c09672dcfc28d5d27d3e73779d',
        'opbeans-java_production_1f716bc1e7234ff5119ac615d1b90b6e',
      ]);
    });

    it('error_count with group by on error grouping key and filter on error grouping key', async () => {
      const options = {
        params: {
          query: {
            ...getOptions().params.query,
            errorGroupingKey: 'd16d39e7fa133b8943cea035430a7b4e',
            groupBy: [SERVICE_NAME, SERVICE_ENVIRONMENT, ERROR_GROUP_ID],
          },
        },
      };

      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.errorCountChartPreview.length).to.equal(1);
      expect(
        response.body.errorCountChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql(['opbeans-java_production_d16d39e7fa133b8943cea035430a7b4e']);
    });

    it('error_count with empty service name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
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
        response.body.errorCountChartPreview.map(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name
        )
      ).to.eql([
        'opbeans-rum_testing',
        'opbeans-python_production',
        'opbeans-java_production',
        'opbeans-ruby_production',
        'opbeans-go_testing',
        'opbeans-dotnet_production',
      ]);
    });

    it('error_count with empty service name and group by on error grouping key', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
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
        response.body.errorCountChartPreview
          .map((item: { name: string; data: Array<{ x: number; y: number | null }> }) => item.name)
          .slice(0, 5)
      ).to.eql([
        'opbeans-rum_testing_51d27e3b7067a9ed0c5028e4fa83407f',
        'opbeans-rum_testing_e39534271a064775a9dc9bc17592bc68',
        'opbeans-python_production_02fc6080da81976f60becbf6aacc8a2f',
        'opbeans-python_production_e90863d04b7a692435305f09bbe8c840',
        'opbeans-java_production_d16d39e7fa133b8943cea035430a7b4e',
      ]);
    });
  });
}
