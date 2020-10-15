/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';

  describe('Has data', () => {
    describe('when data is not loaded', () => {
      it('returns false when there is no data', async () => {
        const response = await supertest.get('/api/apm/observability_overview/has_data');
        expect(response.status).to.be(200);
        expect(response.body).to.eql(false);
      });
    });
    describe('when only onboarding data is loaded', () => {
      before(() => esArchiver.load('observability_overview'));
      after(() => esArchiver.unload('observability_overview'));
      it('returns false when there is only onboarding data', async () => {
        const response = await supertest.get('/api/apm/observability_overview/has_data');
        expect(response.status).to.be(200);
        expect(response.body).to.eql(false);
      });
    });
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns true when there is at least one document on transaction, error or metrics indices', async () => {
        const response = await supertest.get('/api/apm/observability_overview/has_data');
        expect(response.status).to.be(200);
        expect(response.body).to.eql(true);
      });
    });
  });
}
