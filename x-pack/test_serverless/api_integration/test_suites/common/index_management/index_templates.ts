/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlTemplatesHelpers = getService('svlTemplatesHelpers');
  const svlTemplatesApi = getService('svlTemplatesApi');

  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  const es = getService('es');
  const log = getService('log');
  const randomness = getService('randomness');

  const getRandomString: () => string = () => randomness.string({ casing: 'lower', alpha: true });

  describe('Index templates', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlTemplatesApi.cleanUpTemplates(roleAuthc);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
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
          const { status, body: allTemplates } = await supertestWithoutAuth
            .get(`${API_BASE_PATH}/index_templates`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).to.eql(200);

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
          const { body, status } = await supertestWithoutAuth
            .get(`${API_BASE_PATH}/index_templates/${templateName}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).to.eql(200);

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
        const payload = svlTemplatesHelpers.getTemplatePayload(
          `template-${getRandomString()}`,
          [getRandomString()],
          undefined,
          false
        );

        const { status } = await svlTemplatesApi.createTemplate(payload, roleAuthc);
        expect(status).to.eql(200);
      });

      it('should throw a 409 conflict when trying to create 2 templates with the same name', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = svlTemplatesHelpers.getTemplatePayload(
          templateName,
          [getRandomString()],
          undefined,
          false
        );

        await svlTemplatesApi.createTemplate(payload, roleAuthc);

        const { status } = await svlTemplatesApi.createTemplate(payload, roleAuthc);

        expect(status).to.eql(409);
      });

      it('should validate the request payload', async () => {
        const templateName = `template-${getRandomString()}`;
        // need to cast as any to avoid errors after deleting index patterns
        const payload = svlTemplatesHelpers.getTemplatePayload(
          templateName,
          [getRandomString()],
          undefined,
          false
        ) as any;

        delete payload.indexPatterns; // index patterns are required

        const { body } = await svlTemplatesApi.createTemplate(payload, roleAuthc);
        expect(body.message).to.contain(
          '[request body.indexPatterns]: expected value of type [array] '
        );
      });

      it('should parse the ES error and return the cause', async () => {
        const templateName = `template-create-parse-es-error`;
        const payload = svlTemplatesHelpers.getTemplatePayload(
          templateName,
          ['create-parse-es-error'],
          undefined,
          false
        );
        const runtime = {
          myRuntimeField: {
            type: 'boolean',
            script: {
              source: 'emit("hello with error', // error in script
            },
          },
        };
        payload.template!.mappings = { ...payload.template!.mappings, runtime };
        const { body, status } = await svlTemplatesApi.createTemplate(payload, roleAuthc);
        expect(status).to.eql(400);

        expect(body.attributes).an('object');
        expect(body.attributes.error.reason).contain('template after composition is invalid');
        // one of the item of the cause array should point to our script
        expect(body.attributes.causes.join(',')).contain('"hello with error');
      });
    });

    describe('update', () => {
      it('should update an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const indexTemplate = svlTemplatesHelpers.getTemplatePayload(
          templateName,
          [getRandomString()],
          undefined,
          false
        );

        const { status } = await svlTemplatesApi.createTemplate(indexTemplate, roleAuthc);
        expect(status).to.eql(200);

        const { body: templates } = await svlTemplatesApi.getAllTemplates(roleAuthc);
        const { name, version } = indexTemplate;
        expect(
          templates.templates.find(
            ({ name: catTemplateName }: { name: string }) => catTemplateName === name
          )?.version
        ).to.equal(version);

        // Update template with new version
        const updatedVersion = 2;
        const { status: updateStatus } = await svlTemplatesApi.updateTemplate(
          { ...indexTemplate, version: updatedVersion },
          templateName,
          roleAuthc
        );
        expect(updateStatus).to.eql(200);

        const { body: templates2 } = await svlTemplatesApi.getAllTemplates(roleAuthc);

        expect(
          templates2.templates.find(
            ({ name: catTemplateName }: { name: string }) => catTemplateName === name
          )?.version
        ).to.equal(updatedVersion);
      });

      it('should parse the ES error and return the cause', async () => {
        const templateName = `template-update-parse-es-error`;
        const payload = svlTemplatesHelpers.getTemplatePayload(
          templateName,
          ['update-parse-es-error'],
          undefined,
          false
        );
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

        const { status: createStatus } = await svlTemplatesApi.createTemplate(payload, roleAuthc);
        expect(createStatus).to.eql(200);

        // Update template with an error in the runtime field script
        payload.template!.mappings.runtime.myRuntimeField.script = 'emit("hello with error';
        const { status: updateStatus, body } = await svlTemplatesApi.updateTemplate(
          payload,
          templateName,
          roleAuthc
        );

        expect(updateStatus).to.eql(400);

        expect(body.attributes).an('object');
        // one of the item of the cause array should point to our script
        expect(body.attributes.causes.join(',')).contain('"hello with error');
      });
    });

    describe('delete', () => {
      it('should delete an index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = svlTemplatesHelpers.getTemplatePayload(
          templateName,
          [getRandomString()],
          undefined,
          false
        );

        const { status: createStatus, body: createBody } = await svlTemplatesApi.createTemplate(
          payload,
          roleAuthc
        );
        if (createStatus !== 200)
          throw new Error(`Error creating template: ${createStatus} ${createBody.message}`);

        const { body: allTemplates } = await svlTemplatesApi.getAllTemplates(roleAuthc);

        expect(
          allTemplates.templates.find(({ name }: { name: string }) => name === payload.name)?.name
        ).to.equal(templateName);

        const { status: deleteStatus, body: deleteBody } = await svlTemplatesApi.deleteTemplates(
          [{ name: templateName }],
          roleAuthc
        );

        if (deleteStatus !== 200) throw new Error(`Error deleting template: ${deleteBody.message}`);

        expect(deleteBody.errors).to.be.empty();
        expect(deleteBody.templatesDeleted[0]).to.equal(templateName);

        const { body: allTemplates2 } = await svlTemplatesApi.getAllTemplates(roleAuthc);

        expect(
          allTemplates2.templates.find(({ name }: { name: string }) => name === payload.name)
        ).to.equal(undefined);
      });
    });

    describe('simulate', () => {
      it('should simulate an index template', async () => {
        const payload = svlTemplatesHelpers.getSerializedTemplate([getRandomString()], false);

        const { status, body } = await svlTemplatesApi.simulateTemplate(payload, roleAuthc);
        expect(status).to.eql(200);
        expect(body.template).to.be.ok();
      });
    });
  });
}
