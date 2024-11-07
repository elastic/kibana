/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
const sleep = promisify(setTimeout);

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const uploadPkgName = 'apache';
  const uploadPkgVersion = '0.1.4';

  const installUploadPackage = async () => {
    const buf = fs.readFileSync(testPkgArchiveZip);
    await supertest
      .post(`/api/fleet/epm/packages`)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(buf)
      .expect(200);
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );

  const legacyComponentTemplates = [
    {
      name: 'logs-apache.access@settings',
      template: {
        settings: {
          index: {
            lifecycle: {
              name: 'idontexist',
            },
          },
        },
      },
      _meta: {
        package: {
          name: 'apache',
        },
      },
    },
    {
      name: 'logs-apache.access@mappings',
      template: {
        mappings: {
          dynamic: false,
        },
      },
      _meta: {
        package: {
          name: 'apache',
        },
      },
    },
  ];
  const createLegacyComponentTemplates = async () =>
    Promise.all(
      legacyComponentTemplates.map((tmpl) => esClient.cluster.putComponentTemplate(tmpl))
    );

  const deleteLegacyComponentTemplates = async () => {
    esClient.cluster
      .deleteComponentTemplate({ name: legacyComponentTemplates.map((t) => t.name) })
      .catch((e) => {});
  };

  const waitUntilLegacyComponentTemplatesCreated = async () => {
    const legacyTemplateNames = legacyComponentTemplates.map((t) => t.name);
    for (let i = 5; i > 0; i--) {
      const { component_templates: ctmps } = await esClient.cluster.getComponentTemplate();

      const createdTemplates = ctmps.filter((tmp) => legacyTemplateNames.includes(tmp.name));

      if (createdTemplates.length === legacyTemplateNames.length) return;

      await sleep(500);
    }

    throw new Error('Legacy component templates not created after 5 attempts');
  };
  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('Legacy component template removal', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    afterEach(async () => {
      if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
      await deleteLegacyComponentTemplates();
      await uninstallPackage(uploadPkgName, uploadPkgVersion);
    });

    after(async () => {
      await esClient.indices.deleteIndexTemplate({ name: 'testtemplate' });
    });

    it('should remove legacy component templates if not in use by index templates', async () => {
      await createLegacyComponentTemplates();

      await waitUntilLegacyComponentTemplatesCreated();
      await installUploadPackage();

      const { component_templates: allComponentTemplates } =
        await esClient.cluster.getComponentTemplate();
      const allComponentTemplateNames = allComponentTemplates.map((t) => t.name);

      expect(allComponentTemplateNames.includes('logs-apache.access@settings')).to.equal(false);
      expect(allComponentTemplateNames.includes('logs-apache.access@mappings')).to.equal(false);
    });

    it('should not remove legacy component templates if in use by index templates', async () => {
      await createLegacyComponentTemplates();

      await esClient.indices.putIndexTemplate({
        name: 'testtemplate',
        index_patterns: ['nonexistentindices'],
        template: {},
        composed_of: ['logs-apache.access@settings', 'logs-apache.access@mappings'],
      });

      await waitUntilLegacyComponentTemplatesCreated();
      // wait 10s before uploading again to avoid getting 429
      await sleep(10000);
      await installUploadPackage();

      const { component_templates: allComponentTemplates } =
        await esClient.cluster.getComponentTemplate();
      const allComponentTemplateNames = allComponentTemplates.map((t) => t.name);

      expect(allComponentTemplateNames.includes('logs-apache.access@settings')).to.equal(true);
      expect(allComponentTemplateNames.includes('logs-apache.access@mappings')).to.equal(true);
    });
  });
}
