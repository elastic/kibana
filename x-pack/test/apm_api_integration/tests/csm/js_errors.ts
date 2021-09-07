/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function rumJsErrorsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('CSM JS errors with data', { config: 'trial', archives: [] }, () => {
    it('returns no js errors', async () => {
      const response = await supertest.get(
        '/api/apm/rum-client/js-errors?pageSize=5&pageIndex=0&start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D'
      );

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatchInline(`
          Object {
            "totalErrorGroups": 0,
            "totalErrorPages": 0,
            "totalErrors": 0,
          }
        `);
    });
  });

  registry.when(
    'CSM JS errors without data',
    { config: 'trial', archives: ['8.0.0', 'rum_test_data'] },
    () => {
      it('returns js errors', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/js-errors?start=2021-01-18T12%3A20%3A17.202Z&end=2021-01-18T12%3A25%3A17.203Z&uiFilters=%7B%22environment%22%3A%22ENVIRONMENT_ALL%22%2C%22serviceName%22%3A%5B%22elastic-co-frontend%22%5D%7D&pageSize=5&pageIndex=0'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "items": Array [
              Object {
                "count": 5,
                "errorGroupId": "de32dc81e2ee5165cbff20046c080a27",
                "errorMessage": "SyntaxError: Document.querySelector: '' is not a valid selector",
              },
              Object {
                "count": 2,
                "errorGroupId": "34d83587e17711a7c257ffb080ddb1c6",
                "errorMessage": "Uncaught SyntaxError: Failed to execute 'querySelector' on 'Document': The provided selector is empty.",
              },
              Object {
                "count": 43,
                "errorGroupId": "3dd5604267b928139d958706f09f7e09",
                "errorMessage": "Script error.",
              },
              Object {
                "count": 1,
                "errorGroupId": "cd3a2b01017ff7bcce70479644f28318",
                "errorMessage": "Unhandled promise rejection: TypeError: can't convert undefined to object",
              },
              Object {
                "count": 3,
                "errorGroupId": "23539422cf714db071aba087dd041859",
                "errorMessage": "Unable to get property 'left' of undefined or null reference",
              },
            ],
            "totalErrorGroups": 6,
            "totalErrorPages": 120,
            "totalErrors": 2846,
          }
        `);
      });
    }
  );
}
