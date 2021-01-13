/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const archiveName = 'apm_8.0.0';
  const { end } = archives[archiveName];
  const start = new Date(Date.parse(end) - 600000).toISOString();

  describe('Alerting chart previews', () => {
    describe('GET /api/apm/alerts/chart_preview/transaction_error_rate', () => {
      const url = format({
        pathname: '/api/apm/alerts/chart_preview/transaction_error_rate',
        query: {
          start,
          end,
          transactionType: 'request',
          serviceName: 'opbeans-java',
        },
      });

      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });

      describe('when data is loaded', () => {
        before(() => esArchiver.load(archiveName));
        after(() => esArchiver.unload(archiveName));

        it('returns the correct data', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(
            response.body.some((item: { x: number; y: number | null }) => item.x && item.y)
          ).to.equal(true);
        });
      });
    });

    describe('GET /api/apm/alerts/chart_preview/transaction_error_count', () => {
      const url = format({
        pathname: '/api/apm/alerts/chart_preview/transaction_error_count',
        query: {
          start,
          end,
          serviceName: 'opbeans-java',
        },
      });

      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });

      describe('when data is loaded', () => {
        before(() => esArchiver.load(archiveName));
        after(() => esArchiver.unload(archiveName));

        it('returns the correct data', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(
            response.body.some((item: { x: number; y: number | null }) => item.x && item.y)
          ).to.equal(true);
        });
      });
    });

    describe('GET /api/apm/alerts/chart_preview/transaction_duration', () => {
      const url = format({
        pathname: '/api/apm/alerts/chart_preview/transaction_duration',
        query: {
          start,
          end,
          serviceName: 'opbeans-java',
          transactionType: 'request',
        },
      });

      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });

      describe('when data is loaded', () => {
        before(() => esArchiver.load(archiveName));
        after(() => esArchiver.unload(archiveName));

        it('returns the correct data', async () => {
          const response = await supertest.get(url);

          expect(response.status).to.be(200);
          expect(
            response.body.some((item: { x: number; y: number | null }) => item.x && item.y)
          ).to.equal(true);
        });
      });
    });
  });
}
