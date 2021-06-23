/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const ml = getService('ml');
  const supertest = getService('supertest');

  const fleetPackages = ['apache', 'nginx'];

  describe('modules', function () {
    before(async () => {
      // Fleet need to be setup to be able to setup packages
      await supertest.post(`/api/fleet/setup`).set({ 'kbn-xsrf': 'some-xsrf-token' }).expect(200);
      for (const fleetPackage of fleetPackages) {
        await ml.testResources.installFleetPackage(fleetPackage);
      }
    });

    after(async () => {
      for (const fleetPackage of fleetPackages) {
        await ml.testResources.removeFleetPackage(fleetPackage);
      }
    });

    loadTestFile(require.resolve('./get_module'));
    loadTestFile(require.resolve('./recognize_module'));
    loadTestFile(require.resolve('./setup_module'));
  });
}
