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
    catIndex,
    cleanUp: cleanUpEsResources
  } = initElasticsearchHelpers(es);

  const {
    closeIndex,
    flushIndex,
  } = registerHelpers({ supertest });

  describe('indices', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    describe('clear cache', () => {
      // TODO
    });

    describe('close', () => {
      it('should close an index', async () => {
        const indexName = await createIndex();

        // Make sure the index is open
        const [cat1] = await catIndex(indexName);
        expect(cat1.status).to.be('open');

        await closeIndex(indexName).expect(200);

        // Make sure the index has been closed
        const [cat2] = await catIndex(indexName);
        expect(cat2.status).to.be('close');
      });
    });

    describe('flush', () => {
      it('should flush an index', async () => {
        const indexName = await createIndex();
        await flushIndex(indexName).expect(200);
      });
    });
  });
}
