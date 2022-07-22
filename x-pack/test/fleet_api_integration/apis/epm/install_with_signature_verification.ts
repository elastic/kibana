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
  const server = dockerServers.get('registry');

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = (pkg: string, version: string, opts?: { force?: boolean }) => {
    return supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: !!opts?.force });
  };

  describe('Installs verified and unverified packages', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    describe('verified package', async () => {
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage('verified', '1.0.0');
      });
      it('should install a package with a valid signature', async () => {
        await installPackage('verified', '1.0.0').expect(200);
      });
      it('should force install a package with a valid signature', async () => {
        await installPackage('verified', '1.0.0').expect(200);
      });
    });
    describe('unverified packages', async () => {
      describe('unverified package content', async () => {
        after(async () => {
          if (!server.enabled) return;
          await uninstallPackage('unverified_content', '1.0.0');
        });
        it('should return 400 for valid signature but incorrect content', async () => {
          await installPackage('unverified_content', '1.0.0').expect(400);
        });
        it('should return 200 for valid signature but incorrect content force install', async () => {
          await installPackage('unverified_content', '1.0.0', { force: true }).expect(200);
        });
      });
    });
  });
}
