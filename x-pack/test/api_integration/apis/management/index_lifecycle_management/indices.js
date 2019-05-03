/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers } from './indices.helpers';
import { initElasticsearchIndicesHelpers, getRandomString } from './lib';
import { getTemplatePayload } from './fixtures';
import { INDEX_TEMPLATE_NAME, INDEX_TEMPLATE_PATTERN_PREFIX } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const { createIndex, createIndexTemplate } = initElasticsearchIndicesHelpers(es);

  const {
    getIndicesAffectedByTemplate,
    cleanUp,
  } = registerHelpers({ supertest, es });

  describe('indices', () => {
    after(() => cleanUp());

    describe('Get affected', () => {
      it('should list of indices affected by a template', async () => {
        // Create index template
        const template = getTemplatePayload();
        await createIndexTemplate(INDEX_TEMPLATE_NAME, template);

        // Create index matching template index pattern
        const index = INDEX_TEMPLATE_PATTERN_PREFIX + getRandomString();
        await createIndex(index);

        const { body } = await getIndicesAffectedByTemplate(INDEX_TEMPLATE_NAME).expect(200);
        expect(body).to.contain(index);
      });
    });
  });
}
