/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify } from 'query-string';
import { registerHelpers } from './rollup.test_helpers';
import { INDEX_PATTERNS_EXTENSION_BASE_PATH } from './constants';
import { getRandomString } from './lib';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { createIndexWithMappings, getJobPayload, createJob, cleanUp } =
    registerHelpers(getService);

  describe('index patterns extension', () => {
    describe('Fields for wildcards', () => {
      const BASE_URI = `${INDEX_PATTERNS_EXTENSION_BASE_PATH}/_fields_for_wildcard`;

      describe('query params validation', () => {
        let uri;
        let body;

        it('"pattern" is required', async () => {
          uri = `${BASE_URI}`;
          ({ body } = await supertest.get(uri).expect(400));
          expect(body.message).to.contain(
            '[request query.pattern]: expected value of type [string]'
          );
        });

        it('should return 404 the rollup index to query does not exist', async () => {
          uri = `${BASE_URI}?${stringify(
            {
              pattern: 'foo',
              type: 'rollup',
              rollup_index: 'bar',
            },
            { sort: false }
          )}`;
          ({ body } = await supertest.get(uri).expect(404));
          expect(body.message).to.contain('No indices match "foo"');
        });
      });

      it('should return the correct fields', async () => {
        // Create a Rollup job on an index with the INDEX_TO_ROLLUP_MAPPINGS
        const indexName = await createIndexWithMappings();
        const rollupIndex = getRandomString();
        const payload = getJobPayload(indexName, undefined, rollupIndex);
        await createJob(payload);

        // Query for wildcard
        const params = {
          pattern: indexName,
          type: 'rollup',
          rollup_index: rollupIndex,
        };
        const uri = `${BASE_URI}?${stringify(params, { sort: false })}`;
        const { body } = await supertest.get(uri).expect(200);

        // Verify that the fields for wildcard correspond to our declared mappings
        // noting that testTotalField and testTagField are not shown in the field caps results
        const fieldsForWildcard = body.fields.map((field) => field.name);
        expect(fieldsForWildcard.sort()).eql(['testCreatedField']);

        // Cleanup
        await cleanUp();
      });
    });
  });
}
