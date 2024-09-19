/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers } from './lib';
import { registerHelpers } from './mapping.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { createIndex, cleanUp: cleanUpEsResources } = initElasticsearchHelpers(getService);

  const { getIndexMapping } = registerHelpers({ supertest });

  describe('mapping', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    it('should fetch the index mapping', async () => {
      const mappings = {
        properties: {
          total: { type: 'long' },
          tag: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      };
      const index = await createIndex(undefined, { mappings });

      const { body } = await getIndexMapping(index).expect(200);

      expect(body.mappings).to.eql(mappings);
    });
  });
}
