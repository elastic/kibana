/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const INTEGRATION_NAME = 'my_custom_nginx';
const INTEGRATION_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const uninstallPackage = async () => {
    await supertest
      .delete(`/api/fleet/epm/packages/${INTEGRATION_NAME}/${INTEGRATION_VERSION}`)
      .set('kbn-xsrf', 'xxxx');
  };

  describe('Installing custom integrations', async () => {
    afterEach(async () => {
      await uninstallPackage();
    });

    it("Correcty installs a custom integration and all of it's assets", async () => {
      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: 'my_custom_nginx',
          datasets: [
            { name: 'access', type: 'logs' },
            { name: 'error', type: 'metrics' },
            { name: 'warning', type: 'logs' },
          ],
        })
        .expect(200);

      const expectedIngestPipelines = [
        'logs-my_custom_nginx.access-1.0.0',
        'metrics-my_custom_nginx.error-1.0.0',
        'logs-my_custom_nginx.warning-1.0.0',
      ];
      const expectedIndexTemplates = [
        'logs-my_custom_nginx.access',
        'metrics-my_custom_nginx.error',
        'logs-my_custom_nginx.warning',
      ];
      const expectedComponentTemplates = [
        'logs-my_custom_nginx.access@package',
        'logs-my_custom_nginx.access@custom',
        'metrics-my_custom_nginx.error@package',
        'metrics-my_custom_nginx.error@custom',
        'logs-my_custom_nginx.warning@package',
        'logs-my_custom_nginx.warning@custom',
      ];

      expect(response.body._meta.install_source).to.be('custom');

      const actualIngestPipelines = response.body.items
        .filter((item: any) => item.type === 'ingest_pipeline')
        .map((pipeline: any) => pipeline.id);

      const actualIndexTemplates = response.body.items
        .filter((item: any) => item.type === 'index_template')
        .map((template: any) => template.id);

      const actualComponentTemplates = response.body.items
        .filter((item: any) => item.type === 'component_template')
        .map((template: any) => template.id);

      expectedIngestPipelines.forEach((pipeline) => {
        expect(actualIngestPipelines).to.contain(pipeline);
      });
      expectedIndexTemplates.forEach((template) => {
        expect(actualIndexTemplates).to.contain(template);
      });
      expectedComponentTemplates.forEach((template) => {
        expect(actualComponentTemplates).to.contain(template);
      });

      const installation = await kibanaServer.savedObjects.get({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: INTEGRATION_NAME,
      });

      expect(installation.attributes.name).to.be(INTEGRATION_NAME);
      expect(installation.attributes.version).to.be(INTEGRATION_VERSION);
      expect(installation.attributes.install_source).to.be('custom');
      expect(installation.attributes.install_status).to.be('installed');
    });
  });
}
