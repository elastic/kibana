/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import path from 'path';
import fs from 'fs';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

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
  const expectPkgFieldToExist = (fields: any[], fieldName: string, exists: boolean = true) => {
    const fieldExists = fields.find((field: { name: string }) => field.name === fieldName);
    if (exists) {
      expect(fieldExists).not.to.be(undefined);
    } else {
      expect(fieldExists).to.be(undefined);
    }
  };
  describe('installs and uninstalls multiple packages side effects', async () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      if (!server.enabled) return;
      await installPackages([pkgKey, experimentalPkgKey, experimental2PkgKey]);
      await installUploadPackage(uploadPkgKey);
    });
    after(async () => {
      if (!server.enabled) return;
      await uninstallPackages([pkgKey, experimentalPkgKey]);
    });
    it('should create index patterns from all installed packages: uploaded, experimental, beta', async () => {
      const resIndexPatternLogs = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'logs-*',
      });

      const fieldsLogs = JSON.parse(resIndexPatternLogs.attributes.fields);

      expectPkgFieldToExist(fieldsLogs, 'logs_test_name');
      expectPkgFieldToExist(fieldsLogs, 'logs_experimental_name');
      expectPkgFieldToExist(fieldsLogs, 'logs_experimental2_name');
      expectPkgFieldToExist(fieldsLogs, 'apache.error.uploadtest');
      const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'metrics-*',
      });
      const fieldsMetrics = JSON.parse(resIndexPatternMetrics.attributes.fields);
      expectPkgFieldToExist(fieldsMetrics, 'metrics_test_name');
      expectPkgFieldToExist(fieldsMetrics, 'metrics_experimental_name');
      expectPkgFieldToExist(fieldsMetrics, 'metrics_experimental2_name');
      expectPkgFieldToExist(fieldsMetrics, 'apache.status.uploadtest');
    });
    it('should correctly recreate index patterns when a package is uninstalled', async () => {
      await uninstallPackage(experimental2PkgKey);
      const resIndexPatternLogs = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'logs-*',
      });
      const fieldsLogs = JSON.parse(resIndexPatternLogs.attributes.fields);
      expectPkgFieldToExist(fieldsLogs, 'logs_test_name');
      expectPkgFieldToExist(fieldsLogs, 'logs_experimental_name');
      expectPkgFieldToExist(fieldsLogs, 'logs_experimental2_name', false);
      expectPkgFieldToExist(fieldsLogs, 'apache.error.uploadtest');
      const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'metrics-*',
      });
      const fieldsMetrics = JSON.parse(resIndexPatternMetrics.attributes.fields);

      expectPkgFieldToExist(fieldsMetrics, 'metrics_test_name');
      expectPkgFieldToExist(fieldsMetrics, 'metrics_experimental_name');
      expectPkgFieldToExist(fieldsMetrics, 'metrics_experimental2_name', false);
      expectPkgFieldToExist(fieldsMetrics, 'apache.status.uploadtest');
    });
    it('should correctly recreate index patterns when an uploaded package is uninstalled', async () => {
      await uninstallPackage(uploadPkgKey);
      const resIndexPatternLogs = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'logs-*',
      });
      const fieldsLogs = JSON.parse(resIndexPatternLogs.attributes.fields);
      expectPkgFieldToExist(fieldsLogs, 'logs_test_name');
      expectPkgFieldToExist(fieldsLogs, 'logs_experimental_name');
      expectPkgFieldToExist(fieldsLogs, 'apache.error.uploadtest', false);
      const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'metrics-*',
      });
      const fieldsMetrics = JSON.parse(resIndexPatternMetrics.attributes.fields);

      expectPkgFieldToExist(fieldsMetrics, 'metrics_test_name');
      expectPkgFieldToExist(fieldsMetrics, 'metrics_experimental_name');
      expectPkgFieldToExist(fieldsMetrics, 'apache.status.uploadtest', false);
    });
  });
}
