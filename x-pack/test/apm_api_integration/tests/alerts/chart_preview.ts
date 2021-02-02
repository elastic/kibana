/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const archiveName = 'apm_8.0.0';
  const { end } = archives[archiveName];
  const start = new Date(Date.parse(end) - 600000).toISOString();

  const apis = [
    {
      pathname: '/api/apm/alerts/chart_preview/transaction_error_rate',
      params: { transactionType: 'request' },
    },
    { pathname: '/api/apm/alerts/chart_preview/transaction_error_count', params: {} },
    {
      pathname: '/api/apm/alerts/chart_preview/transaction_duration',
      params: { transactionType: 'request' },
    },
  ];

  apis.forEach((api) => {
    const url = format({
      pathname: api.pathname,
      query: {
        start,
        end,
        serviceName: 'opbeans-java',
        ...api.params,
      },
    });

    registry.when(
      `GET ${api.pathname} without data loaded`,
      { config: 'basic', archives: [] },
      () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      }
    );

    registry.when(
      `GET ${api.pathname} with data loaded`,
      { config: 'basic', archives: [archiveName] },
      () => {
        it('returns the correct data', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(
            response.body.some((item: { x: number; y: number | null }) => item.x && item.y)
          ).to.equal(true);
        });
      }
    );
  });
}
