/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');

  const testPackage = 'prerelease';
  const testPackageVersion = '0.1.0-dev.0+abc';
  const server = dockerServers.get('registry');

  const deletePackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installs package that has a prerelease version', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(testPackage, testPackageVersion);
      }
    });

    it('should install the package correctly', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/${testPackage}/${testPackageVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });
  });
}
