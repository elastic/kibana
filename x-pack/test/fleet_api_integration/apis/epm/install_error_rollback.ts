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
  const pkgName = 'error_handling';
  const goodPackageVersion = '0.1.0';
  const badPackageVersion = '0.2.0';
  const goodUpgradePackageVersion = '0.3.0';
  const kibanaServer = getService('kibanaServer');

  const installPackage = (pkg: string, version: string) => {
    return supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const getPackageInfo = async (pkg: string, version: string) => {
    return await supertest
      .get(`/api/fleet/epm/packages/${pkg}/${version}?prerelease=true`)
      .set('kbn-xsrf', 'xxxx');
  };

  describe('package installation error handling and rollback', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await uninstallPackage(pkgName, goodPackageVersion);
      await uninstallPackage(pkgName, goodUpgradePackageVersion);
    });

    it('on a fresh install, it should uninstall a broken package during rollback', async function () {
      // the broken package contains a broken visualization triggering a 422 from Kibana
      await installPackage(pkgName, badPackageVersion).expect(422);

      const pkgInfoResponse = await getPackageInfo(pkgName, badPackageVersion);
      expect(JSON.parse(pkgInfoResponse.text).item.status).to.be('not_installed');
      expect(pkgInfoResponse.body.item.savedObject).to.be(undefined);
    });

    it('on an upgrade, it should fall back to the previous good version during rollback', async function () {
      await installPackage(pkgName, goodPackageVersion);
      // the broken package contains a broken visualization triggering a 422 from Kibana
      await installPackage(pkgName, badPackageVersion).expect(422);

      const goodPkgInfoResponse = await getPackageInfo(pkgName, goodPackageVersion);
      expect(JSON.parse(goodPkgInfoResponse.text).item.status).to.be('installed');
      expect(JSON.parse(goodPkgInfoResponse.text).item.version).to.be('0.1.0');
      const latestInstallFailedAttempts =
        goodPkgInfoResponse.body.item.savedObject.attributes.latest_install_failed_attempts;
      expect(latestInstallFailedAttempts).to.have.length(1);
      expect(latestInstallFailedAttempts[0].target_version).to.be('0.2.0');
      expect(latestInstallFailedAttempts[0].error.message).to.contain(
        'Document "sample_visualization" belongs to a more recent version of Kibana [12.7.0]'
      );
    });

    it('on a succesfull upgrade, it should clear previous upgrade errors', async function () {
      await installPackage(pkgName, goodPackageVersion);
      await installPackage(pkgName, badPackageVersion).expect(422);
      await installPackage(pkgName, goodUpgradePackageVersion).expect(200);

      const goodPkgInfoResponse = await getPackageInfo(pkgName, goodUpgradePackageVersion);
      expect(JSON.parse(goodPkgInfoResponse.text).item.status).to.be('installed');
      expect(JSON.parse(goodPkgInfoResponse.text).item.version).to.be('0.3.0');
      const latestInstallFailedAttempts =
        goodPkgInfoResponse.body.item.savedObject.attributes.latest_install_failed_attempts;
      expect(latestInstallFailedAttempts).to.have.length(0);
    });
  });
}
