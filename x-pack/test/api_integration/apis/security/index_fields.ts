/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

interface FLSFieldMappingResponse {
  flstest: {
    mappings: {
      [fieldName: string]: {
        mapping: {
          [fieldName: string]: {
            type: string;
          };
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
        const fieldMapping = (await es.indices.getFieldMapping({
          index: 'flstest',
          fields: '*',
          includeDefaults: true,
        })) as FLSFieldMappingResponse;

        expect(Object.keys(fieldMapping.flstest.mappings)).to.contain('runtime_customer_ssn');
        expect(
          fieldMapping.flstest.mappings.runtime_customer_ssn.mapping.runtime_customer_ssn.type
        ).to.eql('runtime');

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
