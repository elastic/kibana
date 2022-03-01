/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fs from 'fs/promises';
import path from 'path';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const log = getService('log');

  const BUNDLED_PACKAGE_FIXTURES_DIR = path.join(
    path.dirname(__filename),
    '../fixtures/bundled_packages'
  );
  const BUNDLED_PACKAGES_DIR = path.join(
    path.dirname(__filename),
    '../../../../plugins/fleet/target/bundled_packages'
  );

  const bundlePackage = async (name: string) => {
    try {
      await fs.access(BUNDLED_PACKAGES_DIR);
    } catch (error) {
      await fs.mkdir(BUNDLED_PACKAGES_DIR);
    }

    await fs.copyFile(
      path.join(BUNDLED_PACKAGE_FIXTURES_DIR, `${name}.zip`),
      path.join(BUNDLED_PACKAGES_DIR, `${name}.zip`)
    );
  };

  const removeBundledPackages = async () => {
    try {
      const files = await fs.readdir(BUNDLED_PACKAGES_DIR);

      for (const file of files) {
        await fs.unlink(path.join(BUNDLED_PACKAGES_DIR, file));
      }
    } catch (error) {
      log.error('Error removing bundled packages');
      log.error(error);
    }
  };

  describe('installing bundled packages', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    afterEach(async () => {
      await removeBundledPackages();
    });

    describe('without registry', () => {
      it('installs from bundled source via api', async () => {
        await bundlePackage('elastic_agent-1.2.0');

        const response = await supertest
          .post(`/api/fleet/epm/packages/elastic_agent/1.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/json')
          .send({ force: true })
          .expect(200);

        expect(response.body._meta.install_source).to.be('bundled');
      });

      it('allows for upgrading from newer bundled source when outdated package was installed from bundled source', async () => {
        await bundlePackage('elastic_agent-1.0.0');
        await bundlePackage('elastic_agent-1.2.0');

        const installResponse = await supertest
          .post(`/api/fleet/epm/packages/elastic_agent/1.0.0`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/json')
          .send({ force: true })
          .expect(200);

        expect(installResponse.body._meta.install_source).to.be('bundled');

        const updateResponse = await supertest
          .post(`/api/fleet/epm/packages/elastic_agent/1.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/json')
          .send({ force: true })
          .expect(200);

        expect(updateResponse.body._meta.install_source).to.be('bundled');
      });
    });

    describe('with registry', () => {
      it('allows for updating from registry when outdated package is installed from bundled source', async () => {
        await bundlePackage('elastic_agent-1.2.0');

        const bundledInstallResponse = await supertest
          .post(`/api/fleet/epm/packages/elastic_agent/1.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/json')
          .send({ force: true })
          .expect(200);

        expect(bundledInstallResponse.body._meta.install_source).to.be('bundled');

        const registryUpdateResponse = await supertest
          .post(`/api/fleet/epm/packages/elastic_agent/1.3.0`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/json')
          .send({ force: true })
          .expect(200);

        expect(registryUpdateResponse.body._meta.install_source).to.be('registry');
      });
    });
  });
}
