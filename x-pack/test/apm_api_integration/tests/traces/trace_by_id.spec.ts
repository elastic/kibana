/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { SupertestReturnType } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;

  registry.when('Trace does not exist', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint: `GET /internal/apm/traces/{traceId}`,
        params: {
          path: { traceId: 'foo' },
          query: { start, end },
        },
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ exceedsMax: false, traceDocs: [], errorDocs: [] });
    });
  });

  registry.when('Trace exists', { config: 'basic', archives: [archiveName] }, () => {
    let response: SupertestReturnType<`GET /internal/apm/traces/{traceId}`>;
    before(async () => {
      response = await apmApiClient.readUser({
        endpoint: `GET /internal/apm/traces/{traceId}`,
        params: {
          path: { traceId: '64d0014f7530df24e549dd17cc0a8895' },
          query: { start, end },
        },
      });
    });

    it('returns the correct status code', async () => {
      expect(response.status).to.be(200);
    });

    it('returns the correct number of buckets', async () => {
      expectSnapshot(response.body.errorDocs.map((doc) => doc.error?.exception?.[0]?.message))
        .toMatchInline(`
        Array [
          "Test CaptureError",
          "Uncaught Error: Test Error in dashboard",
        ]
      `);
      expectSnapshot(
        response.body.traceDocs.map((doc) =>
          'span' in doc ? `${doc.span.name} (span)` : `${doc.transaction.name} (transaction)`
        )
      ).toMatchInline(`
        Array [
          "/dashboard (transaction)",
          "GET /api/stats (transaction)",
          "APIRestController#topProducts (transaction)",
          "Parsing the document, executing sync. scripts (span)",
          "GET /api/products/top (span)",
          "GET /api/stats (span)",
          "Requesting and receiving the document (span)",
          "SELECT FROM customers (span)",
          "SELECT FROM order_lines (span)",
          "http://opbeans-frontend:3000/static/css/main.7bd7c5e8.css (span)",
          "SELECT FROM products (span)",
          "SELECT FROM orders (span)",
          "SELECT FROM order_lines (span)",
          "Making a connection to the server (span)",
          "Fire \\"load\\" event (span)",
          "empty query (span)",
        ]
      `);
      expectSnapshot(response.body.exceedsMax).toMatchInline(`false`);
    });
  });
}
