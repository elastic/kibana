/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Alerting chart previews', () => {
    describe('GET /api/apm/alerts/chart_preview/transaction_error_rate', () => {
      const url = format({
        pathname: '/api/apm/alerts/chart_preview/transaction_error_rate',
        query: {
          serviceName: 'opbeans-java',
          threshold: 0.5,
          windowSize: 5,
          windowUnit: 'm',
        },
      });

      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });
    });

    describe('GET /api/apm/alerts/chart_preview/transaction_error_count', () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(
            format({
              pathname: '/api/apm/alerts/chart_preview/transaction_error_count',
              query: {
                serviceName: 'opbeans-java',
                threshold: 0.5,
                windowSize: 5,
                windowUnit: 'm',
              },
            })
          );

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });
    });

    describe('GET /api/apm/alerts/chart_preview/transaction_duration', () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(
            format({
              pathname: '/api/apm/alerts/chart_preview/transaction_duration',
              query: {
                serviceName: 'opbeans-java',
                threshold: 0.5,
                windowSize: 5,
                windowUnit: 'm',
              },
            })
          );

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });
    });
  });
}
