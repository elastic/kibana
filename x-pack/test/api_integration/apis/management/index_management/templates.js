/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers } from './lib';
import { registerHelpers } from './templates.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    cleanUp: cleanUpEsResources
  } = initElasticsearchHelpers(es);

  const {
    list,
  } = registerHelpers({ supertest });

  describe('index templates', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    describe('list', function () {
      it('should list all the index templates with the expected properties', async function () {
        const { body } = await list().expect(200);
        const expectedKeys = [
          'name',
          'version',
          'order',
          'indexPatterns',
          'settings',
          'aliases',
          'mappings',
        ];
        expect(Object.keys(body[0])).to.eql(expectedKeys);
      });
    });
  });
}
