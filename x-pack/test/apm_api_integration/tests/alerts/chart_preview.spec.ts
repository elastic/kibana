/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  });
}
