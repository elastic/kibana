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

  const oldPackageKey = 'apm-0.1.0';
  const newPackageKey = 'apm-0.2.0';

  const installPackage = async (pkgkey: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgkey}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const getPackageInfo = async (pkgkey: string) => {
    return supertest.get(`/api/fleet/epm/packages/${pkgkey}`).set('kbn-xsrf', 'xxxx');
  };

  const callFleetSetup = async () => {
    await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx');
  };

  describe('managed packages', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('rolls back to last supported version on setup', async () => {
      await installPackage(newPackageKey);
      await callFleetSetup();

      const oldPackageInfoResponse = await getPackageInfo(oldPackageKey);
      expect(JSON.parse(oldPackageInfoResponse.text).response.status).to.be('not_installed');

      const newPackageInfoResponse = await getPackageInfo(newPackageKey);
      expect(JSON.parse(newPackageInfoResponse.text).response.status).to.be('installed');
    });
  });
}
