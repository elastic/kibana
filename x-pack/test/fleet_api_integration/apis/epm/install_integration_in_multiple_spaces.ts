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

const testSpaceId = 'fleet_test_space';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const esArchiver = getService('esArchiver');
  const server = dockerServers.get('registry');
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
    await supertest
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

  // FLAKY: https://github.com/elastic/kibana/issues/161624
  describe.skip('When installing system integration in multiple spaces', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    before(async () => {
      if (!server.enabled) return;
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
      const resIndexPatternLogs = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'logs-*',
      });
      expect(resIndexPatternLogs.id).equal('logs-*');
      const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'metrics-*',
      });
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
  });
}
