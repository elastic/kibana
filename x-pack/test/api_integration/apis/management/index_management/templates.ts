/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { TemplateDeserialized } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { templatesApi } from './lib/templates.api';
import { templatesHelpers } from './lib/templates.helpers';
import { getRandomString } from './lib/random';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const { catTemplate, getTemplatePayload, getSerializedTemplate } = templatesHelpers(getService);
  const {
    getAllTemplates,
    getOneTemplate,
    createTemplate,
    deleteTemplates,
    updateTemplate,
    cleanUpTemplates,
    simulateTemplate,
    simulateTemplateByName,
  } = templatesApi(getService);

  describe('index templates', () => {
    after(async () => await cleanUpTemplates());

    describe('get all', () => {
      const indexTemplate = getTemplatePayload(`template-${getRandomString()}`, [
        getRandomString(),
      ]);
      const legacyTemplate = getTemplatePayload(
        `template-${getRandomString()}`,
        [getRandomString()],
        true
      );
      const tmpTemplate = getTemplatePayload(`template-${getRandomString()}`, [getRandomString()]);
      const indexTemplateWithDSL = {
        ...tmpTemplate,
        dataStream: {},
        template: {
          ...tmpTemplate.template,
          lifecycle: {
            enabled: true,
            data_retention: '10d',
          },
        },
      };
      const tmpTemplate2 = getTemplatePayload(`template-${getRandomString()}`, [getRandomString()]);
      const indexTemplateWithILM = {
        ...tmpTemplate2,
        template: {
          ...tmpTemplate2.template,
          settings: {
            ...tmpTemplate2.template?.settings,
            index: {
              lifecycle: {
                name: 'my_policy',
              },
            },
          },
        },
      };

      beforeEach(async () => {
        try {
          await createTemplate(indexTemplate);
          await createTemplate(legacyTemplate);
          await createTemplate(indexTemplateWithDSL);
          await createTemplate(indexTemplateWithILM);
        } catch (err) {
          log.debug('[Setup error] Error creating index template');
          throw err;
        }
      });

      it('should list all the index templates with the expected parameters', async () => {
        const { body: allTemplates } = await getAllTemplates().expect(200);

        // Index templates (composable)
        const indexTemplateFound = allTemplates.templates.find(
          (template: TemplateDeserialized) => template.name === indexTemplate.name
        );

        expect(indexTemplateFound).to.be.ok();

        const expectedKeys = [
          'name',
          'indexPatterns',
          'indexMode',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'priority',
          'composedOf',
          'ignoreMissingComponentTemplates',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
        ].sort();

        expect(Object.keys(indexTemplateFound).sort()).to.eql(expectedKeys);

        // Legacy index templates
        const legacyTemplateFound = allTemplates.legacyTemplates.find(
          (template: TemplateDeserialized) => template.name === legacyTemplate.name
        );

        expect(legacyTemplateFound).to.be.ok();

        const expectedLegacyKeys = [
          'name',
          'indexPatterns',
          'indexMode',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'order',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
          'composedOf',
          'ignoreMissingComponentTemplates',
        ].sort();

        expect(Object.keys(legacyTemplateFound).sort()).to.eql(expectedLegacyKeys);

        // Index template with DSL
        const templateWithDSL = allTemplates.templates.find(
          (template: TemplateDeserialized) => template.name === indexTemplateWithDSL.name
        );

        expect(templateWithDSL).to.be.ok();

        const expectedWithDSLKeys = [
          'name',
          'indexPatterns',
          'indexMode',
          'lifecycle',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'priority',
          'composedOf',
          'ignoreMissingComponentTemplates',
          'dataStream',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
        ].sort();

        expect(Object.keys(templateWithDSL).sort()).to.eql(expectedWithDSLKeys);

        // Index template with ILM
        const templateWithILM = allTemplates.templates.find(
          (template: TemplateDeserialized) => template.name === indexTemplateWithILM.name
        );

        expect(templateWithILM).to.be.ok();

        const expectedWithILMKeys = [
          'name',
          'indexPatterns',
          'indexMode',
          'ilmPolicy',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'priority',
          'composedOf',
          'ignoreMissingComponentTemplates',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
        ].sort();

        expect(Object.keys(templateWithILM).sort()).to.eql(expectedWithILMKeys);
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
          'indexMode',
          'template',
          'composedOf',
          'ignoreMissingComponentTemplates',
          'priority',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
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
          'indexMode',
          'template',
          'order',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
          'composedOf',
          'ignoreMissingComponentTemplates',
        ].sort();
        const expectedTemplateKeys = ['aliases', 'mappings', 'settings'].sort();

        expect(body.name).to.equal(templateName);
        expect(Object.keys(body).sort()).to.eql(expectedKeys);
        expect(Object.keys(body.template).sort()).to.eql(expectedTemplateKeys);
      });

      describe('with logs-*-* index pattern', () => {
        const logsdbTemplateName = 'test-logsdb-template';
        before(async () => {
          const template = getTemplatePayload(logsdbTemplateName, ['logs-*-*']);
          await createTemplate(template).expect(200);
        });

        after(async () => {
          await deleteTemplates([{ name: logsdbTemplateName }]);
        });

        const logsdbSettings: Array<{
          enabled: boolean | null;
          prior_logs_usage: boolean;
          indexMode: string;
        }> = [
          { enabled: true, prior_logs_usage: true, indexMode: 'logsdb' },
          { enabled: false, prior_logs_usage: true, indexMode: 'standard' },
          // In stateful Kibana, if prior_logs_usage is set to true, the cluster.logsdb.enabled setting is false by default, so standard index mode
          { enabled: null, prior_logs_usage: true, indexMode: 'standard' },
          // In stateful Kibana, if prior_logs_usage is set to false, the cluster.logsdb.enabled setting is true by default, so logsdb index mode
          { enabled: null, prior_logs_usage: false, indexMode: 'logsdb' },
        ];

        // eslint-disable-next-line @typescript-eslint/naming-convention
        logsdbSettings.forEach(({ enabled, prior_logs_usage, indexMode }) => {
          it(`returns ${indexMode} index mode if logsdb.enabled setting is ${enabled}`, async () => {
            await es.cluster.putSettings({
              body: {
                persistent: {
                  cluster: {
                    logsdb: {
                      enabled,
                    },
                  },
                  logsdb: {
                    prior_logs_usage,
                  },
                },
              },
            });

            const { body } = await getOneTemplate(logsdbTemplateName).expect(200);
            expect(body.indexMode).to.equal(indexMode);
          });
        });
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
        const payload = getTemplatePayload(templateName, [getRandomString()]);

        await createTemplate(payload);

        await createTemplate(payload).expect(409);
      });

      it('should validate the request payload', async () => {
        const templateName = `template-${getRandomString()}`;
        // need to cast as any to avoid errors after deleting index patterns
        const payload = getTemplatePayload(templateName, [getRandomString()]) as any;

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
        payload.template!.mappings = { ...payload.template!.mappings, runtime };
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
          catTemplateResponse.find(({ name: catTemplateName }) => catTemplateName === name)?.version
        ).to.equal(version?.toString());

        // Update template with new version
        const updatedVersion = 2;
        await updateTemplate({ ...indexTemplate, version: updatedVersion }, templateName).expect(
          200
        );

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(
          catTemplateResponse.find(({ name: catTemplateName }) => catTemplateName === name)?.version
        ).to.equal(updatedVersion.toString());
      });

      it('should update a legacy index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const legacyIndexTemplate = getTemplatePayload(templateName, [getRandomString()], true);

        await createTemplate(legacyIndexTemplate).expect(200);

        let { body: catTemplateResponse } = await catTemplate(templateName);

        const { name, version } = legacyIndexTemplate;

        expect(
          catTemplateResponse.find(({ name: catTemplateName }) => catTemplateName === name)?.version
        ).to.equal(version?.toString());

        // Update template with new version
        const updatedVersion = 2;
        await updateTemplate(
          { ...legacyIndexTemplate, version: updatedVersion },
          templateName
        ).expect(200);

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

        await createTemplate(payload).expect(200);

        // Update template with an error in the runtime field script
        payload.template!.mappings.runtime.myRuntimeField.script = 'emit("hello with error';
        const { body } = await updateTemplate(payload, templateName).expect(400);

        expect(body.attributes).an('object');
        // one of the item of the cause array should point to our script
        expect(body.attributes.causes.join(',')).contain('"hello with error');
      });

      it('should update a deprecated index template', async () => {
        const templateName = `deprecated_template-${getRandomString()}`;
        const indexTemplate: TemplateDeserialized = {
          _kbnMeta: { hasDatastream: false, type: 'default' },
          name: templateName,
          indexPatterns: [getRandomString()],
          indexMode: 'standard',
          template: {},
          deprecated: true,
          allowAutoCreate: 'TRUE',
        };

        await createTemplate(indexTemplate).expect(200);

        await updateTemplate({ ...indexTemplate }, templateName).expect(200);
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
          catTemplateResponse.find((template) => template.name === payload.name)?.name
        ).to.equal(templateName);

        const { status: deleteStatus, body: deleteBody } = await deleteTemplates([
          { name: templateName },
        ]);
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

      it('should delete a legacy index template', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()], true);

        await createTemplate(payload).expect(200);

        let { body: catTemplateResponse } = await catTemplate(templateName);

        expect(
          catTemplateResponse.find((template) => template.name === payload.name)?.name
        ).to.equal(templateName);

        const { body } = await deleteTemplates([
          { name: templateName, isLegacy: payload._kbnMeta.isLegacy },
        ]).expect(200);

        expect(body.errors).to.be.empty();
        expect(body.templatesDeleted[0]).to.equal(templateName);

        ({ body: catTemplateResponse } = await catTemplate(templateName));

        expect(catTemplateResponse.find((template) => template.name === payload.name)).to.equal(
          undefined
        );
      });
    });

    describe('simulate', () => {
      it('should simulate an index template', async () => {
        const payload = getSerializedTemplate([getRandomString()]);

        const { body } = await simulateTemplate(payload).expect(200);
        expect(body.template).to.be.ok();
      });

      it('should simulate an index template by name', async () => {
        const templateName = `template-${getRandomString()}`;
        const payload = getTemplatePayload(templateName, [getRandomString()]);

        await createTemplate(payload).expect(200);

        await simulateTemplateByName(templateName).expect(200);

        // cleanup
        await deleteTemplates([{ name: templateName }]);
      });
    });
  });
}
