/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import fs from 'fs';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const experimentalPkgName = 'experimental';
  const experimentalPkgKey = `${experimentalPkgName}-${pkgVersion}`;
  const experimental2PkgName = 'experimental2';
  const experimental2PkgKey = `${experimental2PkgName}-${pkgVersion}`;

  const uploadPkgKey = 'apache-0.1.4';

  const installUploadPackage = async (pkg: string) => {
    const buf = fs.readFileSync(testPkgArchiveZip);
    await supertest
      .post(`/api/fleet/epm/packages`)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(buf)
      .expect(200);
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const installPackages = async (pkgs: string[]) => {
    const installingPackagesPromise = pkgs.map((pkg) => installPackage(pkg));
    return Promise.all(installingPackagesPromise);
  };
  const uninstallPackages = async (pkgs: string[]) => {
    const uninstallingPackagesPromise = pkgs.map((pkg) => uninstallPackage(pkg));
    return Promise.all(uninstallingPackagesPromise);
  };

  describe('installs and uninstalls multiple packages side effects', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    before(async () => {
      if (!server.enabled) return;
      await installPackages([pkgKey, experimentalPkgKey, experimental2PkgKey]);
      await installUploadPackage(uploadPkgKey);
    });
    after(async () => {
      if (!server.enabled) return;
      await uninstallPackages([pkgKey, experimentalPkgKey]);
    });
    it('should create index patterns (without fields)', async () => {
      const resIndexPatternLogs = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'logs-*',
      });
      expect(resIndexPatternLogs.attributes.fields).to.be(undefined);
      const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'metrics-*',
      });
      expect(resIndexPatternMetrics.attributes.fields).to.be(undefined);
    });
  });
}
