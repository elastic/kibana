/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const dockerServers = getService('dockerServers');

  const mappingsPackage = 'overrides';
  const mappingsPackageVersion = '0.1.0';
  const server = dockerServers.get('registry');

  const deletePackage = async (pkg: string, version: string) =>
    supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');

  describe('installs packages that include settings and mappings overrides', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(mappingsPackage, mappingsPackageVersion);
      }
    });

    it('should install the overrides package correctly', async function () {
      let { body } = await supertest
        .post(`/api/fleet/epm/packages/${mappingsPackage}/${mappingsPackageVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const templateName = body.items[0].id;

      const { body: indexTemplateResponse } = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_index_template/${templateName}`,
        },
        { meta: true }
      );

      // the index template composed_of has the correct component templates in the correct order
      const indexTemplate = indexTemplateResponse.index_templates[0].index_template;
      expect(indexTemplate.composed_of).to.eql([
        `${templateName}@package`,
        `${templateName}@custom`,
        '.fleet_globals-1',
        '.fleet_agent_id_verification-1',
      ]);

      ({ body } = await es.transport.request(
        {
          method: 'GET',
          path: `/_component_template/${templateName}@package`,
        },
        {
          meta: true,
        }
      ));

      // The mappings override provided in the package is set in the package component template
      expect(body.component_templates[0].component_template.template.mappings.dynamic).to.be(false);

      // The settings override provided in the package is set in the package component template
      expect(
        body.component_templates[0].component_template.template.settings.index.lifecycle.name
      ).to.be('reference');

      ({ body } = await es.transport.request(
        {
          method: 'GET',
          path: `/_component_template/${templateName}@custom`,
        },
        { meta: true }
      ));

      // The user_settings component template is an empty/stub template at first
      const storedTemplate = body.component_templates[0].component_template.template.settings;
      expect(storedTemplate).to.eql({});

      // Update the user_settings component template
      ({ body } = await es.transport.request({
        method: 'PUT',
        path: `/_component_template/${templateName}@custom`,
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
      ({ body } = await es.transport.request(
        {
          method: 'POST',
          path: `/_index_template/_simulate/${templateName}`,
          // body: indexTemplate, // I *think* this should work, but it doesn't
          body: {
            index_patterns: [`${templateName}-*`],
            composed_of: [`${templateName}@package`, `${templateName}@custom`],
          },
        },
        { meta: true }
      ));
      // omit routings
      delete body.template.settings.index.routing;

      expect(body).to.eql({
        template: {
          settings: {
            index: {
              codec: 'best_compression',
              lifecycle: {
                name: 'overridden by user',
              },
              mapping: {
                total_fields: {
                  limit: '10000',
                },
              },
              number_of_shards: '3',
            },
          },
          mappings: {
            dynamic: 'false',
            properties: {
              '@timestamp': {
                type: 'date',
              },
              data_stream: {
                properties: {
                  dataset: {
                    type: 'constant_keyword',
                  },
                  namespace: {
                    type: 'constant_keyword',
                  },
                  type: {
                    type: 'constant_keyword',
                  },
                },
              },
            },
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
