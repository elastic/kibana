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
  const fleetAndAgents = getService('fleetAndAgents');

  const pkgName = 'multiple_versions';
  const pkgOlderVersion = '0.1.0';
  const pkgLatestVersion = '0.3.0';

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('bulk package install api', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    it('should install the latest version by default', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/packages/_bulk?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: [pkgName] })
        .expect(200);

      expect(response.body.items.length).equal(1);
      expect(response.body.items[0].version).equal(pkgLatestVersion);

      await uninstallPackage(pkgName, pkgLatestVersion);
    });

    it('should install an older version if force is true', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/packages/_bulk?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: [{ name: pkgName, version: pkgOlderVersion }], force: true })
        .expect(200);

      expect(response.body.items.length).equal(1);
      expect(response.body.items[0].version).equal(pkgOlderVersion);

      await uninstallPackage(pkgName, pkgOlderVersion);
    });

    it('should install an older version if force is true when package is already installed', async () => {
      // install latest package
      await supertest
        .post(`/api/fleet/epm/packages/_bulk?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: [pkgName] })
        .expect(200);

      const response = await supertest
        .post(`/api/fleet/epm/packages/_bulk?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: [{ name: pkgName, version: pkgOlderVersion }], force: true })
        .expect(200);

      expect(response.body.items.length).equal(1);
      expect(response.body.items[0].version).equal(pkgOlderVersion);

      await uninstallPackage(pkgName, pkgOlderVersion);
    });

    it('should reject installing an older version if force is false', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/packages/_bulk?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: [{ name: pkgName, version: pkgOlderVersion }] })
        .expect(200);

      expect(response.body.items[0].statusCode).equal(400);
      expect(response.body.items[0].error).equal(
        'multiple_versions-0.1.0 is out-of-date and cannot be installed or updated'
      );
    });
  });
}
