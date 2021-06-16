/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const dockerServers = getService('dockerServers');
  const log = getService('log');

  const testPackage = 'top_level_nested-0.1.0';
  const server = dockerServers.get('registry');

  const deletePackage = async (pkgkey: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkgkey}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installs packages that include a top level field of type nested', async () => {
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(testPackage);
      }
    });

    it('should install the package correctly', async function () {
      if (server.enabled) {
        let { body } = await supertest
          .post(`/api/fleet/epm/packages/${testPackage}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const templateName = body.response[0].id;

        ({ body } = await es.transport.request({
          method: 'GET',
          path: `/_index_template/${templateName}`,
        }));

        expect(
          body.index_templates[0].index_template.template.mappings.properties.MultiProcessRansomware
            .type
        ).to.be('nested');
        expect(
          body.index_templates[0].index_template.template.mappings.properties.MultiProcessRansomware
            .properties.Ransomware.properties.files.type
        ).to.be('nested');
        expect(
          body.index_templates[0].index_template.template.mappings.properties.MultiProcessRansomware
            .properties.Ransomware.properties.empty_nested.type
        ).to.be('nested');
        expect(
          body.index_templates[0].index_template.template.mappings.properties.MultiProcessRansomware
            .properties.Ransomware.properties.empty_nested.properties
        ).to.eql({});
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
