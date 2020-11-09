/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function rumHasDataApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('CSM has rum data api', () => {
    describe('when there is no data', () => {
      it('returns empty list', async () => {
        const response = await supertest.get(
          '/api/apm/observability_overview/has_rum_data?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters='
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`
          Object {
            "hasData": false,
          }
        `);
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

      it('returns that it has data and service name with most traffice', async () => {
        const response = await supertest.get(
          '/api/apm/observability_overview/has_rum_data?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters='
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "hasData": true,
            "serviceName": "client",
          }
        `);
      });
    });
  });
}
