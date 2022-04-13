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
      .send({ force: true });
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

  describe('installs and uninstalls all assets (non default space)', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    before(async () => {
      await createSpace(testSpaceId);
    });

    after(async () => {
      await deleteSpace(testSpaceId);
    });
    describe('installs all assets when installing a package for the first time in non default space', async () => {
      before(async () => {
        if (!server.enabled) return;
        await installPackageInSpace(pkgName, pkgVersion, testSpaceId);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgName, pkgVersion);
      });

      expectAssetsInstalled({
        pkgVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });

    describe('uninstalls all assets when uninstalling a package from a different space', async () => {
      before(async () => {
        if (!server.enabled) return;
        await installPackageInSpace(pkgName, pkgVersion, testSpaceId);
        await uninstallPackage(pkgName, pkgVersion);
      });

      it('should have uninstalled the kibana assets', async function () {
        let resDashboard;
        try {
          resDashboard = await kibanaServer.savedObjects.get({
            type: 'dashboard',
            id: 'test_dashboard',
            space: testSpaceId,
          });
        } catch (err) {
          resDashboard = err;
        }
        expect(resDashboard.response.data.statusCode).equal(404);

        let resVis;
        try {
          resVis = await kibanaServer.savedObjects.get({
            type: 'visualization',
            id: 'test_visualization',
            space: testSpaceId,
          });
        } catch (err) {
          resVis = err;
        }
        expect(resVis.response.data.statusCode).equal(404);
        let resSearch;
        try {
          resVis = await kibanaServer.savedObjects.get({
            type: 'search',
            id: 'test_search',
            space: testSpaceId,
          });
        } catch (err) {
          resSearch = err;
        }
        expect(resSearch.response.data.statusCode).equal(404);
      });
    });
  });
}

const expectAssetsInstalled = ({
  pkgVersion,
  pkgName,
  es,
  kibanaServer,
}: {
  pkgVersion: string;
  pkgName: string;
  es: Client;
  kibanaServer: any;
}) => {
  it('should have installed the kibana assets', async function () {
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

    // These are the assets from the package
    const resDashboard = await kibanaServer.savedObjects.get({
      type: 'dashboard',
      id: 'test_dashboard',
      space: testSpaceId,
    });
    expect(resDashboard.id).equal('test_dashboard');

    const resVis = await kibanaServer.savedObjects.get({
      type: 'visualization',
      id: 'test_visualization',
      space: testSpaceId,
    });
    expect(resVis.id).equal('test_visualization');
    const resSearch = await kibanaServer.savedObjects.get({
      type: 'search',
      id: 'test_search',
      space: testSpaceId,
    });
    expect(resSearch.id).equal('test_search');
  });
};
