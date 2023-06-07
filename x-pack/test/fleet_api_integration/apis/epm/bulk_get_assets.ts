/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GetBulkAssetsResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('Bulk get assets', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    describe('installs all assets when installing a package for the first time', async () => {
      before(async () => {
        if (!server.enabled) return;
        await installPackage(pkgName, pkgVersion);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgName, pkgVersion);
      });

      it('should get the assets based on the required objects', async () => {
        const { body }: { body: GetBulkAssetsResponse } = await supertest
          .post(`/api/fleet/epm/bulk_assets`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            assetIds: [
              {
                type: 'dashboard',
                id: 'sample_dashboard',
              },
              {
                id: 'sample_visualization',
                type: 'visualization',
              },
            ],
          })
          .expect(200);
        const asset1 = body.items[0];
        expect(asset1.id).to.equal('sample_dashboard');
        expect(asset1.type).to.equal('dashboard');
        expect(asset1.attributes).to.eql({
          title: '[Logs Sample] Overview ECS',
          description: 'Sample dashboard',
        });

        const asset2 = body.items[1];
        expect(asset2.id).to.equal('sample_visualization');
        expect(asset2.type).to.equal('visualization');
        expect(asset2.attributes).to.eql({
          title: 'sample vis title',
          description: 'sample visualization update',
        });
      });
    });
  });
}
