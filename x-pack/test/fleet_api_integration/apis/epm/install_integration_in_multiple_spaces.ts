/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import pRetry from 'p-retry';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

const testSpaceId = 'fleet_test_space';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const pkgName = 'system';
  const pkgVersion = '1.27.0';

  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
  };

  const installPackageInSpace = async (pkg: string, version: string, spaceId: string) => {
    return supertest
      .post(`/s/${spaceId}/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const createSpace = async (spaceId: string) => {
    await supertest.post(`/api/spaces/space`).set('kbn-xsrf', 'xxxx').send({
      name: spaceId,
      id: spaceId,
      initials: 's',
      color: '#D6BF57',
      disabledFeatures: [],
      imageUrl: '',
    });
  };

  const deleteSpace = async (spaceId: string) => {
    await supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'xxxx').send();
  };

  const getTag = async (id: string, space?: string) =>
    kibanaServer.savedObjects
      .get({
        type: 'tag',
        id,
        ...(space && { space }),
      })
      .catch(() => {});

  describe('When installing system integration in multiple spaces', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
      if (!isDockerRegistryEnabledOrSkipped(providerContext)) {
        return;
      }
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await installPackage(pkgName, pkgVersion);

      await createSpace(testSpaceId);
      await uninstallPackage(pkgName, pkgVersion);
      await installPackageInSpace(pkgName, pkgVersion, testSpaceId);
    });

    after(async () => {
      await deleteSpace(testSpaceId);
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it('should install kibana assets', async function () {
      // These are installed from Fleet along with every package
      const resIndexPatternLogs = await pRetry(
        () =>
          kibanaServer.savedObjects.get({
            type: 'index-pattern',
            id: 'logs-*',
          }),
        { retries: 3 }
      );
      expect(resIndexPatternLogs.id).equal('logs-*');

      const resIndexPatternMetrics = await pRetry(
        () =>
          kibanaServer.savedObjects.get({
            type: 'index-pattern',
            id: 'metrics-*',
          }),
        { retries: 3 }
      );
      expect(resIndexPatternMetrics.id).equal('metrics-*');
    });

    it('should correctly set installed_kibana_space_id on the SO', async function () {
      const resEPMPackages = await kibanaServer.savedObjects.get({
        type: 'epm-packages',
        id: pkgName,
      });
      expect(resEPMPackages.attributes.installed_kibana_space_id).to.eql('fleet_test_space');
    });

    it('should create managed tag saved objects', async () => {
      const defaultTag = await getTag('fleet-managed-default');
      expect(defaultTag).not.equal(undefined);

      const spaceTag = await getTag('fleet-managed-fleet_test_space', testSpaceId);
      expect(spaceTag).not.equal(undefined);
    });

    it('should create package tag saved objects', async () => {
      const spaceTag = await getTag(`fleet-pkg-${pkgName}-fleet_test_space`, testSpaceId);
      expect(spaceTag).not.equal(undefined);
    });

    it('should keep assets in space when format version is bumped', async () => {
      const nginxPkgName = 'nginx';
      const nginxPkgVersion = '1.17.0';

      const installResponse = await installPackageInSpace(
        nginxPkgName,
        nginxPkgVersion,
        testSpaceId
      );

      const firstAsset = installResponse.body.items.find((item: any) => item.type === 'dashboard');

      // Bump format version directly on installation saved object, then call setup to trigger a reinstall
      await es.update({
        index: INGEST_SAVED_OBJECT_INDEX,
        id: `${PACKAGES_SAVED_OBJECT_TYPE}:${nginxPkgName}`,
        body: {
          doc: {
            [PACKAGES_SAVED_OBJECT_TYPE]: {
              install_format_schema_version: '99.99.99',
            },
          },
        },
      });

      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').send();

      const res = await es.get({
        index: '.kibana_analytics',
        id: `${firstAsset.type}:${firstAsset.id}`,
      });

      expect(res.found).to.be(true);
      expect((res._source as any).namespaces).to.eql([testSpaceId]);
    });
  });
}
