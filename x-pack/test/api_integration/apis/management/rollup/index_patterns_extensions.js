/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { FIELDS_FOR_WILDCARD_PATH as BASE_URI } from '@kbn/data-views-plugin/common/constants';
import expect from '@kbn/expect';
import { stringify } from 'query-string';
import { registerHelpers } from './rollup.test_helpers';
import { getRandomString } from './lib';
import { DataViewType } from '@kbn/data-views-plugin/common';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { createIndexWithMappings, getJobPayload, createJob, cleanUp } =
    registerHelpers(getService);

  describe('index patterns extension', () => {
    describe('Fields for wildcards', () => {
      describe('query params validation', () => {
        let uri;
        let body;

        it('"pattern" is required', async () => {
          uri = `${BASE_URI}`;
          ({ body } = await supertest
            .get(uri)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
            .expect(400));
          expect(body.message).to.contain(
            '[request query.pattern]: expected value of type [string]'
          );
        });

        it('should return 404 the rollup index to query does not exist', async () => {
          uri = `${BASE_URI}?${stringify(
            {
              pattern: 'foo',
              type: DataViewType.ROLLUP,
              rollup_index: 'bar',
            },
            { sort: false }
          )}`;
          ({ body } = await supertest
            .get(uri)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
            .expect(404));
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
          type: DataViewType.ROLLUP,
          rollup_index: rollupIndex,
        };
        const uri = `${BASE_URI}?${stringify(params, { sort: false })}`;
        const { body } = await supertest
          .get(uri)
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
          .expect(200);

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
