/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
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

  const getTag = async (id: string, space?: string) =>
    kibanaServer.savedObjects
      .get({
        type: 'tag',
        id,
        ...(space && { space }),
      })
      .catch(() => {});

  const deleteTag = async (id: string) =>
    kibanaServer.savedObjects
      .delete({
        type: 'tag',
        id,
      })
      .catch(() => {});

  const deleteSpace = async (spaceId: string) => {
    await supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'xxxx').send();
  };
  describe('Assets tagging', () => {
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
        const defaultTag = await getTag('fleet-managed-default');
        expect(defaultTag).not.equal(undefined);

        const spaceTag = await getTag('fleet-managed-fleet_test_space', testSpaceId);
        expect(spaceTag).not.equal(undefined);
      });
      it('Should create package tag saved objects', async () => {
        const defaultTag = await getTag(`fleet-pkg-all_assets-default`);
        expect(defaultTag).not.equal(undefined);

        const spaceTag = await getTag(`fleet-pkg-${pkgName}-fleet_test_space`, testSpaceId);
        expect(spaceTag).not.equal(undefined);
      });
    });

    describe('Handles presence of legacy tags', async () => {
      before(async () => {
        if (!server.enabled) return;

        // first clean up any existing tag saved objects as they arent cleaned on uninstall
        await deleteTag('fleet-managed-default');
        await deleteTag(`fleet-pkg-${pkgName}-default`);

        // now create the legacy tags
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
        await deleteTag('managed');
        await deleteTag('tag');
      });

      it('Should not create space aware tag saved objects if legacy tags exist', async () => {
        const managedTag = await getTag('fleet-managed-default');
        expect(managedTag).equal(undefined);

        const pkgTag = await getTag(`fleet-pkg-${pkgName}-default`);
        expect(pkgTag).equal(undefined);
      });
    });

    describe('Handles presence of tags inside integration package', async () => {
      const testPackage = 'assets_with_tags';
      const testPackageVersion = '0.1.1';
      // tag corresponding to `OnlySomeAssets`
      const ONLY_SOME_ASSETS_TAG = `fleet-shared-tag-${testPackage}-ef823f10-b5af-5fcb-95da-2340a5257599-default`;
      // tag corresponding to `MixedTypesTag`
      const MIXED_TYPES_TAG = `fleet-shared-tag-${testPackage}-ef823f10-b5af-5fcb-95da-2340a5257599-default`;

      before(async () => {
        if (!server.enabled) return;

        const testPkgArchiveZip = path.join(
          path.dirname(__filename),
          '../fixtures/direct_upload_packages/assets_with_tags-0.1.1.zip'
        );
        const buf = fs.readFileSync(testPkgArchiveZip);
        await supertest
          .post(`/api/fleet/epm/packages`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(buf)
          .expect(200);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(testPackage, testPackageVersion);
        await deleteTag('managed');
      });

      it('Should create tags based on package spec tags', async () => {
        const managedTag = await getTag('fleet-managed-default');
        expect(managedTag).not.equal(undefined);

        const securitySolutionTag = await getTag('security-solution-default');
        expect(securitySolutionTag).not.equal(undefined);

        const pkgTag1 = await getTag(ONLY_SOME_ASSETS_TAG);
        expect(pkgTag1).equal(undefined);

        const pkgTag2 = await getTag(MIXED_TYPES_TAG);
        expect(pkgTag2).equal(undefined);
      });
    });
  });
}
