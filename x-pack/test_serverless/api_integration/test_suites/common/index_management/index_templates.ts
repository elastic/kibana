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
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlTemplatesApi.cleanUpTemplates(roleAuthc);
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
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
