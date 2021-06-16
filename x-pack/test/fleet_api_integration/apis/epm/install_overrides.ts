/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const dockerServers = getService('dockerServers');

  const mappingsPackage = 'overrides-0.1.0';
  const server = dockerServers.get('registry');

  const deletePackage = async (pkgkey: string) =>
    supertest.delete(`/api/fleet/epm/packages/${pkgkey}`).set('kbn-xsrf', 'xxxx');

  describe('installs packages that include settings and mappings overrides', async () => {
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(mappingsPackage);
      }
    });

    it('should install the overrides package correctly', async function () {
      let { body } = await supertest
        .post(`/api/fleet/epm/packages/${mappingsPackage}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const templateName = body.response[0].id;

      const { body: indexTemplateResponse } = await es.transport.request({
        method: 'GET',
        path: `/_index_template/${templateName}`,
      });

      // the index template composed_of has the correct component templates in the correct order
      const indexTemplate = indexTemplateResponse.index_templates[0].index_template;
      expect(indexTemplate.composed_of).to.eql([
        `${templateName}-mappings`,
        `${templateName}-settings`,
        `${templateName}-user_settings`,
      ]);

      ({ body } = await es.transport.request({
        method: 'GET',
        path: `/_component_template/${templateName}-mappings`,
      }));

      // The mappings override provided in the package is set in the mappings component template
      expect(body.component_templates[0].component_template.template.mappings.dynamic).to.be(false);

      ({ body } = await es.transport.request({
        method: 'GET',
        path: `/_component_template/${templateName}-settings`,
      }));

      // The settings override provided in the package is set in the settings component template
      expect(
        body.component_templates[0].component_template.template.settings.index.lifecycle.name
      ).to.be('reference');

      ({ body } = await es.transport.request({
        method: 'GET',
        path: `/_component_template/${templateName}-user_settings`,
      }));

      // The user_settings component template is an empty/stub template at first
      const storedTemplate = body.component_templates[0].component_template.template.settings;
      expect(storedTemplate).to.eql({});

      // Update the user_settings component template
      ({ body } = await es.transport.request({
        method: 'PUT',
        path: `/_component_template/${templateName}-user_settings`,
        body: {
          template: {
            settings: {
              number_of_shards: 3,
              index: {
                lifecycle: { name: 'overridden by user' },
                number_of_shards: 123,
              },
            },
          },
        },
      }));

      // simulate the result
      ({ body } = await es.transport.request({
        method: 'POST',
        path: `/_index_template/_simulate/${templateName}`,
        // body: indexTemplate, // I *think* this should work, but it doesn't
        body: {
          index_patterns: [`${templateName}-*`],
          composed_of: [
            `${templateName}-mappings`,
            `${templateName}-settings`,
            `${templateName}-user_settings`,
          ],
        },
      }));

      expect(body).to.eql({
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'overridden by user',
              },
              number_of_shards: '3',
            },
          },
          mappings: {
            dynamic: 'false',
          },
          aliases: {},
        },
        overlapping: [
          {
            name: 'logs',
            index_patterns: ['logs-*-*'],
          },
        ],
      });
    });
  });
}
