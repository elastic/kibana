/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
const testSpaceId = 'fleet_test_space';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');
  const es: Client = getService('es');
  const pkgName = 'only_dashboard';
  const pkgVersion = '0.1.0';

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackageInSpace = async (pkg: string, version: string, spaceId: string) => {
    await supertest
      .post(`/s/${spaceId}/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };
  const createSpace = async (spaceId: string) => {
    await supertest
      .post(`/api/spaces/space`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: spaceId,
        id: spaceId,
        initials: 's',
        color: '#D6BF57',
        disabledFeatures: [],
        imageUrl: '',
      })
      .expect(200);
  };

  const deleteSpace = async (spaceId: string) => {
    await supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'xxxx').send();
  };
  describe('asset tagging', () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    before(async () => {
      await createSpace(testSpaceId);
    });

    after(async () => {
      await deleteSpace(testSpaceId);
    });
    describe('creates correct tags when installing a package in non default space after installing in default space', async () => {
      before(async () => {
        if (!server.enabled) return;
        await installPackageInSpace('all_assets', pkgVersion, 'default');
        await installPackageInSpace(pkgName, pkgVersion, testSpaceId);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage('all_assets', pkgVersion);
        await uninstallPackage(pkgName, pkgVersion);
      });

      it('Should create managed tag saved objects', async () => {
        const defaultTag = await kibanaServer.savedObjects.get({
          type: 'tag',
          id: 'fleet-managed-default',
          space: 'default',
        });

        expect(defaultTag).not.equal(undefined);
        const spaceTag = await kibanaServer.savedObjects.get({
          type: 'tag',
          id: 'fleet-managed-fleet_test_space',
          space: testSpaceId,
        });
        expect(spaceTag).not.equal(undefined);
      });
      it('Should create package tag saved objects', async () => {
        const defaultTag = await kibanaServer.savedObjects.get({
          type: 'tag',
          id: `fleet-pkg-all_assets-default`,
          space: 'default',
        });

        expect(defaultTag).not.equal(undefined);
        const spaceTag = await kibanaServer.savedObjects.get({
          type: 'tag',
          id: `fleet-pkg-${pkgName}-fleet_test_space`,
          space: testSpaceId,
        });
        expect(spaceTag).not.equal(undefined);
      });
    });

    describe('Handles presence of legacy tags', async () => {
      before(async () => {
        if (!server.enabled) return;
        await kibanaServer.savedObjects.create({
          type: 'tag',
          id: 'managed',
          overwrite: false,
          attributes: {
            name: 'managed',
            description: '',
            color: '#FFFFFF',
          },
        });
        await kibanaServer.savedObjects.create({
          type: 'tag',
          id: pkgName,
          overwrite: false,
          attributes: {
            name: pkgName,
            description: '',
            color: '#FFFFFF',
          },
        });

        await installPackageInSpace(pkgName, pkgVersion, 'default');
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgName, pkgVersion);
        await kibanaServer.savedObjects.delete({ id: 'managed', type: 'tag' });
        await kibanaServer.savedObjects.delete({
          id: pkgName,
          type: 'tag',
        });
      });

      it('Should not create space aware tag saved objects if legacy tags exist', async () => {
        const managedTag = await kibanaServer.savedObjects
          .get({
            type: 'tag',
            id: 'fleet-managed-default',
            space: 'default',
          })
          .catch(() => {});

        expect(managedTag).equal(undefined);

        const pkgTag = await kibanaServer.savedObjects
          .get({
            type: 'tag',
            id: `fleet-pkg-${pkgName}-default`,
            space: 'default',
          })
          .catch(() => {});

        expect(pkgTag).equal(undefined);
      });
    });
  });
}
