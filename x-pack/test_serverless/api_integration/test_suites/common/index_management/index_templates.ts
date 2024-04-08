/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const randomness = getService('randomness');
  const indexManagementService = getService('indexManagement');
  let getTemplatePayload: typeof indexManagementService['templates']['helpers']['getTemplatePayload'];
  let catTemplate: typeof indexManagementService['templates']['helpers']['catTemplate'];
  let getSerializedTemplate: typeof indexManagementService['templates']['helpers']['getSerializedTemplate'];
  let createTemplate: typeof indexManagementService['templates']['api']['createTemplate'];
  let updateTemplate: typeof indexManagementService['templates']['api']['updateTemplate'];
  let deleteTemplates: typeof indexManagementService['templates']['api']['deleteTemplates'];
  let simulateTemplate: typeof indexManagementService['templates']['api']['simulateTemplate'];
  let cleanUpTemplates: typeof indexManagementService['templates']['api']['cleanUpTemplates'];

  let getRandomString: () => string;
  describe('Index templates', function () {
    before(async () => {
      ({
        templates: {
          helpers: { getTemplatePayload, catTemplate, getSerializedTemplate },
          api: {
            createTemplate,
            updateTemplate,
            deleteTemplates,
            simulateTemplate,
            cleanUpTemplates,
          },
        },
      } = indexManagementService);
      getRandomString = () => randomness.string({ casing: 'lower', alpha: true });
    });

    after(async () => {
      await cleanUpTemplates({ 'x-elastic-internal-origin': 'xxx' });
    });

    describe('get', () => {
      let templateName: string;

      before(async () => {
        templateName = `template-${getRandomString()}`;
        const indexTemplate = {
          name: templateName,
          body: {
            index_patterns: ['test*'],
          },
        };
        // Create a new index template to test against
        try {
          await es.indices.putIndexTemplate(indexTemplate);
        } catch (err) {
          log.debug('[Setup error] Error creating index template');
          throw err;
        }
      });

      after(async () => {
        // Cleanup template created for testing purposes
        try {
          await es.indices.deleteIndexTemplate({
            name: templateName,
          });
        } catch (err) {
          log.debug('[Cleanup error] Error deleting index template');
          throw err;
        }
      });

      describe('all', () => {
        it('should list all the index templates with the expected parameters', async () => {
          const { body: allTemplates } = await supertest
            .get(`${API_BASE_PATH}/index_templates`)
            .set('kbn-xsrf', 'xxx')
            .set('x-elastic-internal-origin', 'xxx')
            .expect(200);

          // Legacy templates are not applicable on serverless
          expect(allTemplates.legacyTemplates.length).to.eql(0);

          const indexTemplateFound = allTemplates.templates.find(
            (template: { name: string }) => template.name === templateName
          );

          expect(indexTemplateFound).to.be.ok();

          const expectedKeys = [
            'name',
            'indexPatterns',
            'hasSettings',
            'hasAliases',
            'hasMappings',
            '_kbnMeta',
            'allowAutoCreate',
            'composedOf',
            'ignoreMissingComponentTemplates',
          ].sort();

          expect(Object.keys(indexTemplateFound).sort()).to.eql(expectedKeys);
        });
      });

      describe('one', () => {
        it('should return an index template with the expected parameters', async () => {
          const { body } = await supertest
            .get(`${API_BASE_PATH}/index_templates/${templateName}`)
            .set('kbn-xsrf', 'xxx')
            .set('x-elastic-internal-origin', 'xxx')
            .expect(200);

          const expectedKeys = [
            'name',
            'indexPatterns',
            'template',
            '_kbnMeta',
            'allowAutoCreate',
            'composedOf',
            'ignoreMissingComponentTemplates',
          ].sort();

          expect(body.name).to.eql(templateName);
          expect(Object.keys(body).sort()).to.eql(expectedKeys);
        });
      });
    });

    describe('create', () => {
      it('should create an index template', async () => {
        const payload = getTemplatePayload(`template-${getRandomString()}`, [getRandomString()]);
        await createTemplate(payload).set('x-elastic-internal-origin', 'xxx').expect(200);
      });

      it('should throw a 409 conflict when trying to create 2 templates with the same name', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()]);

        await createTemplate(payload).set('x-elastic-internal-origin', 'xxx');

        await createTemplate(payload).set('x-elastic-internal-origin', 'xxx').expect(409);
      });

      it('should validate the request payload', async () => {
        const templateName = `template-${getRandomString()}`;
        // need to cast as any to avoid errors after deleting index patterns
        const payload = getTemplatePayload(templateName, [getRandomString()]) as any;

        delete payload.indexPatterns; // index patterns are required

        const { body } = await createTemplate(payload).set('x-elastic-internal-origin', 'xxx');
        expect(body.message).to.contain(
          '[request body.indexPatterns]: expected value of type [array] '
        );
      });

      it('should parse the ES error and return the cause', async () => {
        const templateName = `template-create-parse-es-error`;
        const payload = getTemplatePayload(templateName, ['create-parse-es-error']);
        const runtime = {
          myRuntimeField: {
            type: 'boolean',
            script: {
              source: 'emit("hello with error', // error in script
            },
          },
        };
        payload.template!.mappings = { ...payload.template!.mappings, runtime };
        const { body } = await createTemplate(payload)
          .set('x-elastic-internal-origin', 'xxx')
          .expect(400);

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

        await createTemplate(indexTemplate).set('x-elastic-internal-origin', 'xxx').expect(200);

        let { body: catTemplateResponse } = await catTemplate(templateName);

        const { name, version } = indexTemplate;

        expect(
          catTemplateResponse.find(({ name: catTemplateName }) => catTemplateName === name)?.version
        ).to.equal(version?.toString());

        // Update template with new version
        const updatedVersion = 2;
        await updateTemplate({ ...indexTemplate, version: updatedVersion }, templateName)
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(
          catTemplateResponse.find(({ name: catTemplateName }) => catTemplateName === name)?.version
        ).to.equal(updatedVersion.toString());
      });

      it('should parse the ES error and return the cause', async () => {
        const templateName = `template-update-parse-es-error`;
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
        payload.template!.mappings = { ...payload.template!.mappings, runtime };

        await createTemplate(payload).set('x-elastic-internal-origin', 'xxx').expect(200);

        // Update template with an error in the runtime field script
        payload.template!.mappings.runtime.myRuntimeField.script = 'emit("hello with error';
        const { body } = await updateTemplate(payload, templateName)
          .set('x-elastic-internal-origin', 'xxx')
          .expect(400);

        expect(body.attributes).an('object');
        // one of the item of the cause array should point to our script
        expect(body.attributes.causes.join(',')).contain('"hello with error');
      });
    });

    describe('delete', () => {
      it('should delete an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()]);

        const { status: createStatus, body: createBody } = await createTemplate(payload).set(
          'x-elastic-internal-origin',
          'xxx'
        );
        if (createStatus !== 200) {
          throw new Error(`Error creating template: ${createStatus} ${createBody.message}`);
        }

        let { body: catTemplateResponse } = await catTemplate(templateName);

        expect(
          catTemplateResponse.find((template) => template.name === payload.name)?.name
        ).to.equal(templateName);

        const { status: deleteStatus, body: deleteBody } = await deleteTemplates([
          { name: templateName },
        ]).set('x-elastic-internal-origin', 'xxx');
        if (deleteStatus !== 200) {
          throw new Error(`Error deleting template: ${deleteBody.message}`);
        }

        expect(deleteBody.errors).to.be.empty();
        expect(deleteBody.templatesDeleted[0]).to.equal(templateName);

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(catTemplateResponse.find((template) => template.name === payload.name)).to.equal(
          undefined
        );
      });
    });

    describe('simulate', () => {
      it('should simulate an index template', async () => {
        const payload = getSerializedTemplate([getRandomString()]);

        const { body } = await simulateTemplate(payload)
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);
        expect(body.template).to.be.ok();
      });
    });
  });
}
