/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
// @ts-ignore
import { initElasticsearchHelpers } from './lib';
// @ts-ignore
import { API_BASE_PATH } from './constants';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const { createComponentTemplate, deleteComponentTemplate } = initElasticsearchHelpers(es);

  describe('Component templates', function() {
    describe('Get', () => {
      const COMPONENT_NAME = 'test_component_template';
      const COMPONENT = {
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
          mappings: {
            _source: {
              enabled: false,
            },
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      };

      before(() => createComponentTemplate({ body: COMPONENT, name: COMPONENT_NAME }));
      after(() => deleteComponentTemplate(COMPONENT_NAME));

      describe('all component templates', () => {
        it('should return an array of component templates', async () => {
          const { body: componentTemplates } = await supertest
            .get(`${API_BASE_PATH}/component_templates`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          const testComponentTemplate = componentTemplates.find(
            ({ name }: { name: string }) => name === COMPONENT_NAME
          );

          expect(testComponentTemplate).to.eql({
            name: COMPONENT_NAME,
            component_template: {
              ...COMPONENT,
            },
          });
        });
      });
    });
  });
}
