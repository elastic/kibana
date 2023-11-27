/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { indicesHelpers } from './lib/indices.helpers';
import { registerHelpers } from './stats.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { createIndex, deleteAllIndices } = indicesHelpers(getService);

  const { getIndexStats } = registerHelpers({ supertest });

  describe('stats', () => {
    after(async () => await deleteAllIndices());

    it('should fetch the index stats', async () => {
      const index = await createIndex();

      const { body } = await getIndexStats(index).expect(200);

      const expectedStats = [
        'docs',
        'store',
        'indexing',
        'get',
        'search',
        'merges',
        'refresh',
        'flush',
        'warmer',
        'query_cache',
        'fielddata',
        'completion',
        'segments',
        'translog',
        'request_cache',
        'recovery',
      ];

      // Make sure none of the stats have been removed from ES API
      expectedStats.forEach((stat) => {
        try {
          expect(body.stats.total.hasOwnProperty(stat)).to.be(true);
        } catch {
          throw new Error(`Expected stat "${stat}" not found.`);
        }
      });
    });
  });
}
