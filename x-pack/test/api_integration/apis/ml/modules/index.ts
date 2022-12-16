/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const ml = getService('ml');

  const fleetPackages = ['apache', 'nginx'];
  const installedPackages: Array<{ pkgName: string; version: string }> = [];

  describe('modules', function () {
    before(async () => {
      // use await kibanaServer.savedObjects.cleanStandardList(); to make sure the fleet setup is removed correctly after the tests
      await kibanaServer.savedObjects.cleanStandardList();

      // Fleet need to be setup to be able to setup packages
      await ml.testResources.setupFleet();

      for (const fleetPackage of fleetPackages) {
        const version = await ml.testResources.installFleetPackage(fleetPackage);
        installedPackages.push({ pkgName: fleetPackage, version });
      }
    });

    after(async () => {
      for (const fleetPackage of installedPackages) {
        await ml.testResources.removeFleetPackage(fleetPackage.pkgName, fleetPackage.version);
      }
      await kibanaServer.savedObjects.cleanStandardList();
    });

    loadTestFile(require.resolve('./get_module'));
    loadTestFile(require.resolve('./recognize_module'));
    loadTestFile(require.resolve('./setup_module'));
    loadTestFile(require.resolve('./jobs_exist'));
  });
}
