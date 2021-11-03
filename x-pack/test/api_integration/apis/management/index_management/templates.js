/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers, getRandomString } from './lib';
import { registerHelpers } from './templates.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { cleanUp: cleanUpEsResources, catTemplate } = initElasticsearchHelpers(getService);

  const {
    getAllTemplates,
    getOneTemplate,
    createTemplate,
    getTemplatePayload,
    deleteTemplates,
    updateTemplate,
    cleanUpTemplates,
  } = registerHelpers({ supertest });

  describe('index templates', () => {
    after(() => Promise.all([cleanUpEsResources(), cleanUpTemplates()]));

    describe('get all', () => {
      const templateName = `template-${getRandomString()}`;
      const indexTemplate = getTemplatePayload(templateName, [getRandomString()]);
      const legacyTemplate = getTemplatePayload(templateName, [getRandomString()], true);

      beforeEach(async () => {
        const res1 = await createTemplate(indexTemplate);
        if (res1.status !== 200) {
          throw new Error(res1.body.message);
        }

        const res2 = await createTemplate(legacyTemplate);
        if (res2.status !== 200) {
          throw new Error(res2.body.message);
        }
      });

      it('should list all the index templates with the expected parameters', async () => {
        const { body: allTemplates } = await getAllTemplates().expect(200);

        // Index templates (composable)
        const indexTemplateFound = allTemplates.templates.find(
          (template) => template.name === indexTemplate.name
        );

        if (!indexTemplateFound) {
          throw new Error(
            `Index template "${indexTemplate.name}" not found in ${JSON.stringify(
              allTemplates.templates,
              null,
              2
            )}`
          );
        }

        const expectedKeys = [
          'name',
          'indexPatterns',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'ilmPolicy',
          'priority',
          'composedOf',
          'version',
          '_kbnMeta',
        ].sort();

        expect(Object.keys(indexTemplateFound).sort()).to.eql(expectedKeys);

        // Legacy index templates
        const legacyTemplateFound = allTemplates.legacyTemplates.find(
          (template) => template.name === legacyTemplate.name
        );

        if (!legacyTemplateFound) {
          throw new Error(
            `Legacy template "${legacyTemplate.name}" not found in ${JSON.stringify(
              allTemplates.legacyTemplates,
              null,
              2
            )}`
          );
        }

        const expectedLegacyKeys = [
          'name',
          'indexPatterns',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'ilmPolicy',
          'order',
          'version',
          '_kbnMeta',
        ].sort();

        expect(Object.keys(legacyTemplateFound).sort()).to.eql(expectedLegacyKeys);
      });
    });

    describe('get one', () => {
      const templateName = `template-${getRandomString()}`;

      it('should return an index template with the expected parameters', async () => {
        const template = getTemplatePayload(templateName, [getRandomString()]);
        await createTemplate(template).expect(200);

        const { body } = await getOneTemplate(templateName).expect(200);
        const expectedKeys = [
          'name',
          'indexPatterns',
          'template',
          'composedOf',
          'ilmPolicy',
          'priority',
          'version',
          '_kbnMeta',
        ].sort();
        const expectedTemplateKeys = ['aliases', 'mappings', 'settings'].sort();

        expect(body.name).to.equal(templateName);
        expect(Object.keys(body).sort()).to.eql(expectedKeys);
        expect(Object.keys(body.template).sort()).to.eql(expectedTemplateKeys);
      });

      it('should return a legacy index template with the expected parameters', async () => {
        const legacyTemplate = getTemplatePayload(templateName, [getRandomString()], true);
        await createTemplate(legacyTemplate).expect(200);

        const { body } = await getOneTemplate(templateName, true).expect(200);
        const expectedKeys = [
          'name',
          'indexPatterns',
          'template',
          'ilmPolicy',
          'order',
          'version',
          '_kbnMeta',
        ].sort();
        const expectedTemplateKeys = ['aliases', 'mappings', 'settings'].sort();

        expect(body.name).to.equal(templateName);
        expect(Object.keys(body).sort()).to.eql(expectedKeys);
        expect(Object.keys(body.template).sort()).to.eql(expectedTemplateKeys);
      });
    });

    describe('create', () => {
      it('should create an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()]);

        await createTemplate(payload).expect(200);
      });

      it('should create a legacy index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()], true);

        await createTemplate(payload).expect(200);
      });

      it('should throw a 409 conflict when trying to create 2 templates with the same name', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()], true);

        await createTemplate(payload);

        await createTemplate(payload).expect(409);
      });

      it('should validate the request payload', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()], true);

        delete payload.indexPatterns; // index patterns are required

        const { body } = await createTemplate(payload);
        expect(body.message).to.contain(
          '[request body.indexPatterns]: expected value of type [array] '
        );
      });

      it('should parse the ES error and return the cause', async () => {
        const templateName = `template-create-parse-es-error}`;
        const payload = getTemplatePayload(templateName, ['create-parse-es-error']);
        const runtime = {
          myRuntimeField: {
            type: 'boolean',
            script: {
              source: 'emit("hello with error', // error in script
            },
          },
        };
        payload.template.mappings = { ...payload.template.mappings, runtime };
        const { body } = await createTemplate(payload).expect(400);

        expect(body.attributes).an('object');
        expect(body.attributes.error.reason).contain('template after composition is invalid');
        // one of the item of the cause array should point to our script
        expect(body.attributes.causes.join(',')).contain('"hello with error');
      });
    });

    describe('update', () => {
      it('should update an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const indexTemplate = getTemplatePayload(templateName, [getRandomString()]);

        await createTemplate(indexTemplate).expect(200);

        let { body: catTemplateResponse } = await catTemplate(templateName);

        const { name, version } = indexTemplate;

        expect(
          catTemplateResponse.find(({ name: templateName }) => templateName === name).version
        ).to.equal(version.toString());

        // Update template with new version
        const updatedVersion = 2;
        await updateTemplate({ ...indexTemplate, version: updatedVersion }, templateName).expect(
          200
        );

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(
          catTemplateResponse.find(({ name: templateName }) => templateName === name).version
        ).to.equal(updatedVersion.toString());
      });

      it('should update a legacy index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const legacyIndexTemplate = getTemplatePayload(templateName, [getRandomString()], true);

        await createTemplate(legacyIndexTemplate).expect(200);

        let { body: catTemplateResponse } = await catTemplate(templateName);

        const { name, version } = legacyIndexTemplate;

        expect(
          catTemplateResponse.find(({ name: templateName }) => templateName === name).version
        ).to.equal(version.toString());

        // Update template with new version
        const updatedVersion = 2;
        await updateTemplate(
          { ...legacyIndexTemplate, version: updatedVersion },
          templateName
        ).expect(200);

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(
          catTemplateResponse.find(({ name: templateName }) => templateName === name).version
        ).to.equal(updatedVersion.toString());
      });

      it('should parse the ES error and return the cause', async () => {
        const templateName = `template-update-parse-es-error}`;
        const payload = getTemplatePayload(templateName, ['update-parse-es-error']);
        const runtime = {
          myRuntimeField: {
            type: 'keyword',
            script: {
              source: 'emit("hello")',
            },
          },
        };

        // Add runtime field
        payload.template.mappings = { ...payload.template.mappings, runtime };

        await createTemplate(payload).expect(200);

        // Update template with an error in the runtime field script
        payload.template.mappings.runtime.myRuntimeField.script = 'emit("hello with error';
        const { body } = await updateTemplate(payload, templateName).expect(400);

        expect(body.attributes).an('object');
        // one of the item of the cause array should point to our script
        expect(body.attributes.causes.join(',')).contain('"hello with error');
      });
    });

    describe('delete', () => {
      it('should delete an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()]);

        const { status: createStatus, body: createBody } = await createTemplate(payload);
        if (createStatus !== 200) {
          throw new Error(`Error creating template: ${createStatus} ${createBody.message}`);
        }

        let { body: catTemplateResponse } = await catTemplate(templateName);

        expect(
          catTemplateResponse.find((template) => template.name === payload.name).name
        ).to.equal(templateName);

        const { status: deleteStatus, body: deleteBody } = await deleteTemplates([
          { name: templateName },
        ]);
        if (deleteStatus !== 200) {
          throw new Error(`Error deleting template: ${deleteBody.message}`);
        }

        expect(deleteBody.errors).to.be.empty;
        expect(deleteBody.templatesDeleted[0]).to.equal(templateName);

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(catTemplateResponse.find((template) => template.name === payload.name)).to.equal(
          undefined
        );
      });

      it('should delete a legacy index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()], true);

        await createTemplate(payload).expect(200);

        let { body: catTemplateResponse } = await catTemplate(templateName);

        expect(
          catTemplateResponse.find((template) => template.name === payload.name).name
        ).to.equal(templateName);

        const { body } = await deleteTemplates([
          { name: templateName, isLegacy: payload._kbnMeta.isLegacy },
        ]).expect(200);

        expect(body.errors).to.be.empty;
        expect(body.templatesDeleted[0]).to.equal(templateName);

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(catTemplateResponse.find((template) => template.name === payload.name)).to.equal(
          undefined
        );
      });
    });
  });
}
