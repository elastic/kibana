/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('Index templates', function () {
    const templateName = `template-${Math.random()}`;
    const indexTemplate = {
      name: templateName,
      body: {
        index_patterns: ['test*'],
      },
    };

    before(async () => {
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

    describe('get all', () => {
      it('should list all the index templates with the expected parameters', async () => {
        const { body: allTemplates } = await supertest
          .get(`${API_BASE_PATH}/index_templates`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        // Legacy templates are not applicable on serverless
        expect(allTemplates.legacyTemplates.length).toEqual(0);

        const indexTemplateFound = allTemplates.templates.find(
          (template: { name: string }) => template.name === indexTemplate.name
        );

        expect(indexTemplateFound).toBeTruthy();

        const expectedKeys = [
          'name',
          'indexPatterns',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          '_kbnMeta',
        ].sort();

        expect(Object.keys(indexTemplateFound).sort()).toEqual(expectedKeys);
      });
    });

    describe('get one', () => {
      it('should return an index template with the expected parameters', async () => {
        const { body } = await supertest
          .get(`${API_BASE_PATH}/index_templates/${templateName}`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        const expectedKeys = ['name', 'indexPatterns', 'template', '_kbnMeta'].sort();

        expect(body.name).toEqual(templateName);
        expect(Object.keys(body).sort()).toEqual(expectedKeys);
      });
    });
  });
}
