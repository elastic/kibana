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

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the correct data', async () => {
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

        const items: APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'> =
          response.body;

        expect(items.length).to.be.greaterThan(0);

        const names = items.map((item) => item.name);

        const serviceNames = items.map((item) => item.serviceName).filter(Boolean);

        const latencyValues = sortBy(
          items.map((item) => ({ name: item.name, latency: item.latency.value })),
          'name'
        );

        const throughputValues = sortBy(
          items.map((item) => ({ name: item.name, latency: item.throughput.value })),
          'name'
        );

        expectSnapshot(names.sort()).toMatchInline();

        expectSnapshot(serviceNames.sort()).toMatchInline();

        expectSnapshot(latencyValues).toMatchInline();

        expectSnapshot(throughputValues).toMatchInline();
      });
    });
  });
}
