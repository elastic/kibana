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
  const esArchiver = getService('esArchiver');
  const pkgName = 'error_handling';
  const goodPackageVersion = '0.1.0';
  const badPackageVersion = '0.2.0';

  const installPackage = async (pkg: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const getPackageInfo = async (pkg: string, version: string) => {
    return await supertest.get(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('package installation error handling and rollback', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('on a fresh install, it should uninstall a broken package during rollback', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/${pkgName}/${badPackageVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(422); // the broken package contains a broken visualization triggering a 422 from Kibana

      const pkgInfoResponse = await getPackageInfo(pkgName, badPackageVersion);
      expect(JSON.parse(pkgInfoResponse.text).item.status).to.be('not_installed');
    });

    it('on an upgrade, it should fall back to the previous good version during rollback', async function () {
      await installPackage(pkgName, goodPackageVersion);
      await supertest
        .post(`/api/fleet/epm/packages/${pkgName}/${badPackageVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(422); // the broken package contains a broken visualization triggering a 422 from Kibana

      const goodPkgInfoResponse = await getPackageInfo(pkgName, goodPackageVersion);
      expect(JSON.parse(goodPkgInfoResponse.text).item.status).to.be('installed');
      expect(JSON.parse(goodPkgInfoResponse.text).item.version).to.be('0.1.0');
    });
  });
}
