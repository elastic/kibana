/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('RUM Services', () => {
    describe('when there is no data', () => {
      it('returns empty list', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/services?start=2020-06-28T10%3A24%3A46.055Z&end=2020-07-29T10%3A24%3A46.055Z&uiFilters=%7B%22agentName%22%3A%5B%22js-base%22%2C%22rum-js%22%5D%7D'
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql([]);
      });
    });

    describe('when there is data', () => {
      before(async () => {
        await esArchiver.load('8.0.0');
        await esArchiver.load('rum_8.0.0');
      });
      after(async () => {
        await esArchiver.unload('8.0.0');
        await esArchiver.unload('rum_8.0.0');
      });

      it('returns rum services list', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/services?start=2020-06-28T10%3A24%3A46.055Z&end=2020-07-29T10%3A24%3A46.055Z&uiFilters=%7B%22agentName%22%3A%5B%22js-base%22%2C%22rum-js%22%5D%7D'
        );

        expect(response.status).to.be(200);

        expect(response.body).to.eql(['client', 'opbean-client-rum']);
      });
    });
  });
}
