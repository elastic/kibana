/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';
interface FLSMappingResponse {
  flstest: {
    mappings: {
      runtime?: {
        [fieldName: string]: {
          type: string;
        };
      };
      properties: {
        [fieldName: string]: {
          type: string;
        };
      };
    };
  };
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  describe('Index Fields', () => {
    before(async () => {
      await esArchiver.load('security/flstest/data');
    });
    after(async () => {
      await esArchiver.unload('security/flstest/data');
    });

    describe('GET /internal/security/fields/{query}', () => {
      it('should return a list of available index mapping fields', async () => {
        await supertest
          .get('/internal/security/fields/.kibana')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            const sampleOfExpectedFields = [
              'type',
              'visualization.title',
              'dashboard.title',
              'search.columns',
              'space.name',
            ];

            sampleOfExpectedFields.forEach((field) => expect(response.body).to.contain(field));
          });
      });

      it('should not include runtime fields', async () => {
        // First, make sure the mapping actually includes a runtime field
        const mapping = (await es.indices.getMapping({ index: 'flstest' })) as FLSMappingResponse;

        expect(Object.keys(mapping.flstest.mappings)).to.contain('runtime');
        expect(Object.keys(mapping.flstest.mappings.runtime!)).to.contain('runtime_customer_ssn');

        // Now, make sure it's not returned here
        const { body: actualFields } = (await supertest
          .get('/internal/security/fields/flstest')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)) as { body: string[] };

        const expectedFields = [
          'customer_ssn',
          'customer_ssn.keyword',
          'customer_region',
          'customer_region.keyword',
          'customer_name',
          'customer_name.keyword',
        ];

        actualFields.sort();
        expectedFields.sort();

        expect(actualFields).to.eql(expectedFields);
      });
    });
  });
}
