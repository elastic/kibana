/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { prefixPkgName } from '@kbn/fleet-plugin/server/services/epm/packages/custom_integrations';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const INTEGRATION_NAME = 'my_nginx';
const INTEGRATION_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const uninstallPackage = async () => {
    await supertest
      .delete(`/api/fleet/epm/packages/${prefixPkgName(INTEGRATION_NAME)}/${INTEGRATION_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
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
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: 'access', type: 'logs' },
            { name: 'error', type: 'metrics' },
            { name: 'warning', type: 'logs' },
          ],
        })
        .expect(200);

      const expectedIngestPipelines = [
        `logs-${prefixPkgName(INTEGRATION_NAME)}.access-1.0.0`,
        `metrics-${prefixPkgName(INTEGRATION_NAME)}.error-1.0.0`,
        `logs-${prefixPkgName(INTEGRATION_NAME)}.warning-1.0.0`,
      ];
      const expectedIndexTemplates = [
        `logs-${prefixPkgName(INTEGRATION_NAME)}.access`,
        `metrics-${prefixPkgName(INTEGRATION_NAME)}.error`,
        `logs-${prefixPkgName(INTEGRATION_NAME)}.warning`,
      ];
      const expectedComponentTemplates = [
        `logs-${prefixPkgName(INTEGRATION_NAME)}.access@package`,
        `logs-${prefixPkgName(INTEGRATION_NAME)}.access@custom`,
        `metrics-${prefixPkgName(INTEGRATION_NAME)}.error@package`,
        `metrics-${prefixPkgName(INTEGRATION_NAME)}.error@custom`,
        `logs-${prefixPkgName(INTEGRATION_NAME)}.warning@package`,
        `logs-${prefixPkgName(INTEGRATION_NAME)}.warning@custom`,
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
        id: prefixPkgName(INTEGRATION_NAME),
      });
      expect(installation.attributes.name).to.be(prefixPkgName(INTEGRATION_NAME));
      expect(installation.attributes.version).to.be(INTEGRATION_VERSION);
      expect(installation.attributes.install_source).to.be('custom');
      expect(installation.attributes.install_status).to.be('installed');
    });

    it('Throws an error when there is a naming collision', async () => {
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: 'access', type: 'logs' },
            { name: 'error', type: 'metrics' },
            { name: 'warning', type: 'logs' },
          ],
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: 'access', type: 'logs' },
            { name: 'error', type: 'metrics' },
            { name: 'warning', type: 'logs' },
          ],
        })
        .expect(409);
    });
  });
}
