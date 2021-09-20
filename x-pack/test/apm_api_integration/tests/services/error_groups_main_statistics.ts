/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';

type ErrorGroupsMainStatistics =
  APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;

  registry.when(
    'Error groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/main_statistics`,
            query: {
              start,
              end,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          })
        );

        expect(response.status).to.be(200);

        expect(response.status).to.be(200);
        expect(response.body.error_groups).to.empty();
        expect(response.body.is_aggregation_accurate).to.eql(true);
      });
    }
  );

  registry.when(
    'Error groups main statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/main_statistics`,
            query: {
              start,
              end,
              transactionType: 'request',
              environment: 'production',
              kuery: '',
            },
          })
        );

        expect(response.status).to.be(200);

        const errorGroupMainStatistics = response.body as ErrorGroupsMainStatistics;

        expect(errorGroupMainStatistics.is_aggregation_accurate).to.eql(true);
        expect(errorGroupMainStatistics.error_groups.length).to.be.greaterThan(0);

        expectSnapshot(errorGroupMainStatistics.error_groups.map(({ name }) => name))
          .toMatchInline(`
          Array [
            "Response status 404",
            "No converter found for return value of type: class com.sun.proxy.$Proxy162",
            "Response status 404",
            "Broken pipe",
            "java.io.IOException: Connection reset by peer",
            "Request method 'POST' not supported",
            "java.io.IOException: Connection reset by peer",
            "null",
          ]
        `);

        const occurences = errorGroupMainStatistics.error_groups.map(
          ({ occurrences }) => occurrences
        );

        occurences.forEach((occurence) => expect(occurence).to.be.greaterThan(0));

        expectSnapshot(occurences).toMatchInline(`
          Array [
            17,
            12,
            4,
            4,
            3,
            2,
            1,
            1,
          ]
        `);

        const firstItem = errorGroupMainStatistics.error_groups[0];

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "group_id": "d16d39e7fa133b8943cea035430a7b4e",
            "lastSeen": 1627975146078,
            "name": "Response status 404",
            "occurrences": 17,
          }
        `);
      });
    }
  );
}
