/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers, getRandomString } from './lib';
import { registerHelpers } from './templates.helpers';

export default function({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const { cleanUp: cleanUpEsResources, catTemplate } = initElasticsearchHelpers(es);

  const {
    getAllTemplates,
    getOneTemplate,
    createTemplate,
    getTemplatePayload,
    deleteTemplates,
    updateTemplate,
  } = registerHelpers({ supertest });

  describe('index templates', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    describe('get all', () => {
      const templateName = `template-${getRandomString()}`;
      const payload = getTemplatePayload(templateName);

      beforeEach(async () => {
        await createTemplate(payload).expect(200);
      });

      it('should list all the index templates with the expected properties', async () => {
        const { body: templates } = await getAllTemplates().expect(200);

        const createdTemplate = templates.find(template => template.name === payload.name);
        const expectedKeys = [
          'name',
          'indexPatterns',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'ilmPolicy',
        ];
        expectedKeys.forEach(key => expect(Object.keys(createdTemplate).includes(key)).to.be(true));
      });
    });

    describe('get one', () => {
      const templateName = `template-${getRandomString()}`;
      const payload = getTemplatePayload(templateName);

      beforeEach(async () => {
        await createTemplate(payload).expect(200);
      });

      it('should list the index template with the expected properties', async () => {
        const { body } = await getOneTemplate(templateName).expect(200);
        const expectedKeys = [
          'name',
          'indexPatterns',
          'settings',
          'aliases',
          'mappings',
          'ilmPolicy',
        ];

        expect(body.name).to.equal(templateName);
        expectedKeys.forEach(key => expect(Object.keys(body).includes(key)).to.be(true));
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

      it('should validate the request payload', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        delete payload.indexPatterns; // index patterns are required

        const { body } = await createTemplate(payload);
        expect(body.message).to.contain(
          '[request body.indexPatterns]: expected value of type [array] '
        );
      });
    });

    describe('update', () => {
      it('should update an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        await createTemplate(payload).expect(200);

        let catTemplateResponse = await catTemplate(templateName);

        const { name, version } = payload;

        expect(
          catTemplateResponse.find(({ name: templateName }) => templateName === name).version
        ).to.equal(version.toString());

        // Update template with new version
        const updatedVersion = 2;
        await updateTemplate({ ...payload, version: updatedVersion }, templateName).expect(200);

        catTemplateResponse = await catTemplate(templateName);

        expect(
          catTemplateResponse.find(({ name: templateName }) => templateName === name).version
        ).to.equal(updatedVersion.toString());
      });
    });

    describe('delete', () => {
      it('should delete an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName);

        await createTemplate(payload).expect(200);

        let catTemplateResponse = await catTemplate(templateName);

        expect(catTemplateResponse.find(template => template.name === payload.name).name).to.equal(
          templateName
        );

        const { body } = await deleteTemplates([templateName]).expect(200);

        expect(body.errors).to.be.empty;
        expect(body.templatesDeleted[0]).to.equal(templateName);

        catTemplateResponse = await catTemplate(templateName);

        expect(catTemplateResponse.find(template => template.name === payload.name)).to.equal(
          undefined
        );
      });
    });
  });
}
