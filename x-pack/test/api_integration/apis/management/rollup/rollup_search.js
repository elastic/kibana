/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers } from './rollup.test_helpers';
import { API_BASE_PATH } from './constants';
import { getRandomString } from './lib';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const { createIndexWithMappings, getJobPayload, createJob, cleanUp } = registerHelpers({
    supertest,
    es,
  });

  describe('search', () => {
    const URI = `${API_BASE_PATH}/search`;

    it('return a 404 if the rollup index does not exist', async () => {
      const { body } = await supertest
        .post(URI)
        .set('kbn-xsrf', 'xxx')
        .send([{ index: 'unknown', query: {} }])
        .expect(404);

      expect(body.message).to.contain('no such index [unknown]');
    });

    it('should return a 200 when searching on existing rollup index', async () => {
      // Create a Rollup job on an index with the INDEX_TO_ROLLUP_MAPPINGS
      const indexName = await createIndexWithMappings();
      const rollupIndex = getRandomString();
      await createJob(getJobPayload(indexName, undefined, rollupIndex));

      const { body } = await supertest
        .post(URI)
        .set('kbn-xsrf', 'xxx')
        .send([{ index: rollupIndex, query: { size: 0 } }])
        .expect(200);

      // make sure total hits is an integer and not an object
      expect(body[0].hits.total).to.equal(0);

      await cleanUp();
    });
  });
}
