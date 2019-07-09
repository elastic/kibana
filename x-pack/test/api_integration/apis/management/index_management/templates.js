/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers, getRandomString } from './lib';
import { registerHelpers } from './templates.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    cleanUp: cleanUpEsResources,
    catTemplate,
  } = initElasticsearchHelpers(es);

  const {
    list,
    createTemplate,
    getTemplatePayload,
    deleteTemplates,
  } = registerHelpers({ supertest });

  describe('index templates', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    describe('list', function () {
      it('should list all the index templates with the expected properties', async function () {
        const { body } = await list().expect(200);
        const expectedKeys = ['name', 'indexPatterns', 'settings', 'aliases', 'mappings'];

        expectedKeys.forEach(key => expect(Object.keys(body[0]).includes(key)).to.be(true));
      });
    });

    describe('create', () => {
      it('should create an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        await createTemplate(payload).expect(200);
      });

      it('should throw a 409 conflict when trying to create 2 templates with the same name', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        await createTemplate(payload);

        await createTemplate(payload).expect(409);
      });

      it('should handle ES errors', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        delete payload.indexPatterns; // index patterns are required

        const { body } = await createTemplate(payload);
        expect(body.message).to.contain('index patterns are missing');
      });
    });

    describe('delete', () => {
      it('should delete an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        await createTemplate(payload).expect(200);

        let catTemplateResponse = await catTemplate(templateName);

        expect(catTemplateResponse.find(template => template.name === payload.name).name).to.equal(templateName);

        const { body } = await deleteTemplates([templateName]).expect(200);

        expect(body.errors).to.be.empty;
        expect(body.templatesDeleted[0]).to.equal(templateName);

        catTemplateResponse = await catTemplate(templateName);

        expect(catTemplateResponse.find(template => template.name === payload.name)).to.equal(undefined);
      });
    });
  });
}
