/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const ml = getService('ml');

  const fleetPackages = ['apache-0.5.0', 'nginx-0.5.0'];

  // Failing: See https://github.com/elastic/kibana/issues/102282
  // Failing: See https://github.com/elastic/kibana/issues/102283
  describe.skip('modules', function () {
    before(async () => {
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
