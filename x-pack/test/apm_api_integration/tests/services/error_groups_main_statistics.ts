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

type ErrorGroupsMainStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

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
            "Could not write JSON: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getRevenue(); nested exception is com.fasterxml.jackson.databind.JsonMappingException: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getRevenue() (through reference chain: co.elastic.apm.opbeans.repositories.Stats[\\"numbers\\"]->com.sun.proxy.$Proxy132[\\"revenue\\"])",
            "java.io.IOException: Connection reset by peer",
            "java.io.IOException: Connection reset by peer",
            "Could not write JSON: Unable to find co.elastic.apm.opbeans.model.Customer with id 7173; nested exception is com.fasterxml.jackson.databind.JsonMappingException: Unable to find co.elastic.apm.opbeans.model.Customer with id 7173 (through reference chain: co.elastic.apm.opbeans.model.Customer_$$_jvst101_3[\\"email\\"])",
            "Request method 'POST' not supported",
          ]
        `);

        const occurences = errorGroupMainStatistics.error_groups.map(
          ({ occurrences }) => occurrences
        );

        occurences.forEach((occurence) => expect(occurence).to.be.greaterThan(0));

        expectSnapshot(occurences).toMatchInline(`
          Array [
            5,
            3,
            2,
            1,
            1,
          ]
        `);

        const firstItem = errorGroupMainStatistics.error_groups[0];

        expectSnapshot(firstItem).toMatchInline(`
          Object {
            "group_id": "051f95eabf120ebe2f8b0399fe3e54c5",
            "last_seen": 1607437366098,
            "name": "Could not write JSON: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getRevenue(); nested exception is com.fasterxml.jackson.databind.JsonMappingException: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getRevenue() (through reference chain: co.elastic.apm.opbeans.repositories.Stats[\\"numbers\\"]->com.sun.proxy.$Proxy132[\\"revenue\\"])",
            "occurrences": 5,
          }
        `);
      });
    }
  );
}
