/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;

  registry.when('Error groups when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await supertest.get(
        url.format({
          pathname: `/api/apm/services/opbeans-java/error_groups`,
          query: {
            start,
            end,
            uiFilters: '{}',
            transactionType: 'request',
          },
        })
      );

      expect(response.status).to.be(200);

      expect(response.status).to.be(200);
      expect(response.body.error_groups).to.empty();
      expect(response.body.requestId).not.to.empty();
      expect(response.body.is_aggregation_accurate).to.eql(true);
      expect(response.body.total_error_groups).to.eql(0);
    });
  });

  registry.when(
    'Error groups when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups`,
            query: { start, end, uiFilters: '{}', transactionType: 'request' },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body.requestId).not.to.empty();
        expect(response.body.is_aggregation_accurate).to.eql(true);
        expect(response.body.total_error_groups).to.eql(5);
        expectSnapshot(response.body.error_groups).toMatchInline(`
        Array [
          Object {
            "group_id": "051f95eabf120ebe2f8b0399fe3e54c5",
            "last_seen": 1607437366098,
            "name": "Could not write JSON: Null return value fromadvice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getRevenue(); nested exception is com.fasterxml.jackson.databind.JsonMappingException: Null return value fromadvice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getRevenue() (through reference chain: co.elastic.apm.opbeans.repositories.Stats["numbers"]->com.sun.proxy.$Proxy132["revenue"])",
            "occurrences": Object {
              "value": 5,
            },
          },
          Object {
            "group_id": "3bb34b98031a19c277bf59c3db82d3f3",
            "last_seen": 1607436860546,
            "name": "java.io.IOException: Connection reset by peer",
            "occurrences": Object {
              "value": 3,
            },
          },
          Object {
            "group_id": "b1c3ff13ec52de11187facf9c6a82538",
            "last_seen": 1607437482385,
            "name": "java.io.IOException: Connection reset by peer",
            "occurrences": Object {
              "value": 2,
            },
          },
          Object {
            "group_id": "9581687a53eac06aba50ba17cbd959c5",
            "last_seen": 1607437468244,
            "name": "Could not write JSON: Unable to find co.elastic.apm.opbeans.model.Customer with id 7173; nested exception is com.fasterxml.jackson.databind.JsonMappingException: Unable to find co.elastic.apm.opbeans.model.Customer with id 7173 (through reference chain: co.elastic.apm.opbeans.model.Customer_$$_jvst101_3["email"])",
            "occurrences": Object {
              "value": 1,
            },
          },
          Object {
            "group_id": "97c2eef51fec10d177ade955670a2f15",
            "last_seen": 1607437475563,
            "name": "Request method 'POST' not supported",
            "occurrences": Object {
              "value": 1,
            },
          },
        ]
        `);
      });
    }
  );
}
