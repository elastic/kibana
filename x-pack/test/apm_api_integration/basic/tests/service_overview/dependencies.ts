/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import url from 'url';
import { sortBy } from 'lodash';
import { APIReturnType } from '../../../../../plugins/apm/public/services/rest/createCallApmApi';
import { ENVIRONMENT_ALL } from '../../../../../plugins/apm/common/environment_filter_values';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  describe('Service overview dependencies', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/dependencies`,
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql([]);
      });
    });

    // skip until es archive can be updated
    describe.skip('when data is loaded', () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;
      };

      before(async () => {
        await esArchiver.load(archiveName);

        response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/dependencies`,
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          })
        );
      });

      after(() => esArchiver.unload(archiveName));

      it('returns a successful response', () => {
        expect(response.status).to.be(200);
      });

      it('returns at least one item', () => {
        expect(response.body.length).to.be.greaterThan(0);
      });

      it('returns the right names', () => {
        const names = response.body.map((item) => item.name);
        expectSnapshot(names.sort()).toMatchInline();
      });

      it('returns the right service names', () => {
        const serviceNames = response.body.map((item) => item.serviceName).filter(Boolean);

        expectSnapshot(serviceNames.sort()).toMatchInline();
      });

      it('returns the right latency values', () => {
        const latencyValues = sortBy(
          response.body.map((item) => ({ name: item.name, latency: item.latency.value })),
          'name'
        );

        expectSnapshot(latencyValues).toMatchInline();
      });

      it('returns the right throughput values', () => {
        const throughputValues = sortBy(
          response.body.map((item) => ({ name: item.name, latency: item.throughput.value })),
          'name'
        );

        expectSnapshot(throughputValues).toMatchInline();
      });
    });
  });
}
