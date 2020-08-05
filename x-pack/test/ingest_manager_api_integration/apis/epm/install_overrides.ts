/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const dockerServers = getService('dockerServers');
  const log = getService('log');

  const deletePackage = async (pkgkey: string) => {
    await supertest.delete(`/api/ingest_manager/epm/packages/${pkgkey}`).set('kbn-xsrf', 'xxxx');
  };

  const mappingsPackage = 'overrides-0.1.0';
  const server = dockerServers.get('registry');

  describe('installs packages that include settings and mappings overrides', async () => {
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(mappingsPackage);
      }
    });

    it('should install the overrides package correctly', async function () {
      if (server.enabled) {
        let { body } = await supertest
          .post(`/api/ingest_manager/epm/packages/${mappingsPackage}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const templateName = body.response[0].id;

        ({ body } = await es.transport.request({
          method: 'GET',
          path: `/_index_template/${templateName}`,
        }));

        // make sure it has the right composed_of array, the contents should be the component templates
        // that were installed
        expect(body.index_templates[0].index_template.composed_of).to.contain(
          `${templateName}-mappings`
        );
        expect(body.index_templates[0].index_template.composed_of).to.contain(
          `${templateName}-settings`
        );

        ({ body } = await es.transport.request({
          method: 'GET',
          path: `/_component_template/${templateName}-mappings`,
        }));

        // Make sure that the `dynamic` field exists and is set to false (as it is in the package)
        expect(body.component_templates[0].component_template.template.mappings.dynamic).to.be(
          false
        );
        // Make sure that the `@timestamp` field exists and is set to date
        // this can be removed once https://github.com/elastic/elasticsearch/issues/58956 is resolved
        expect(
          body.component_templates[0].component_template.template.mappings.properties['@timestamp']
            .type
        ).to.be('date');

        ({ body } = await es.transport.request({
          method: 'GET',
          path: `/_component_template/${templateName}-settings`,
        }));

        // Make sure that the lifecycle name gets set correct in the settings
        expect(
          body.component_templates[0].component_template.template.settings.index.lifecycle.name
        ).to.be('reference');
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
