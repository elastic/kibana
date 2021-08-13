/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));
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
      },
    },
  });

  registry.when(`without data loaded`, { config: 'basic', archives: [] }, () => {
    it('transaction_error_rate (without data)', async () => {
      const options = getOptions();
      const response = await apmApiSupertest({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorRateChartPreview).to.eql([]);
    });

    it('transaction_error_count (without data)', async () => {
      const options = getOptions();
      options.params.query.transactionType = undefined;

      const response = await apmApiSupertest({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.errorCountChartPreview).to.eql([]);
    });

    it('transaction_duration (without data)', async () => {
      const options = getOptions();

      const response = await apmApiSupertest({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_duration',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [archiveName] }, () => {
    it('transaction_error_rate (with data)', async () => {
      const options = getOptions();
      const response = await apmApiSupertest({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(
        response.body.errorRateChartPreview.some(
          (item: { x: number; y: number | null }) => item.x && item.y
        )
      ).to.equal(true);
    });

    it('transaction_error_count (with data)', async () => {
      const options = getOptions();
      options.params.query.transactionType = undefined;

      const response = await apmApiSupertest({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
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
      const response = await apmApiSupertest({
        ...options,
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_duration',
      });

      expect(response.status).to.be(200);
      expect(
        response.body.latencyChartPreview.some(
          (item: { x: number; y: number | null }) => item.x && item.y
        )
      ).to.equal(true);
    });
  });
}
