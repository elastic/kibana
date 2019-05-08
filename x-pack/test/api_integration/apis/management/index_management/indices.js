/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers } from './lib';
import { registerHelpers } from './indices.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    createIndex,
    cleanUp: cleanUpEsResources
  } = initElasticsearchHelpers(es);

  const {
    closeIndex,
  } = registerHelpers({ supertest });

  describe('indices', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    describe('clear cache', () => {
      // TODO
    });

    describe('close index', () => {
      it('should close an index', async () => {
        const indexName = await createIndex();

        // Make sure the index is open
        const [cat1] = await es.cat.indices({ index: indexName, format: 'json' });
        expect(cat1.status).to.be('open');

        await closeIndex(indexName).expect(200);

        // Make sure the index has been closed
        const [cat2] = await es.cat.indices({ index: indexName, format: 'json' });
        expect(cat2.status).to.be('close');
      });
    });
  });
}
