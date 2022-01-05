/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const overview = getService('monitoringClusterOverview');
  const PageObjects = getPageObjects(['common']);

  const pauseForInspection = (component = 'page') => {
    log.debug(`=== PAUSE for inspection of ${component}, press enter when ready ===`);
    return new Promise((resolve) => process.stdin.once('data', resolve));
  };

  // eslint-disable-next-line mocha/no-exclusive-tests
  describe.only('smoke test', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('monitoring');
      await overview.closeAlertsModal();
    });

    it('shows elasticsearch panel with data', async () => {
      expect(await overview.getEsStatus()).to.be('Healthy');
      expect(await overview.getEsNumberOfNodes()).to.match(/Nodes: \d+/);

      await pauseForInspection();
    });

    it('shows kibana panel', async () => {
      expect(await overview.getKbnStatus()).to.be('Healthy');
      expect(await overview.getKbnInstances()).to.match(/Instances: \d+/);

      await pauseForInspection();
    });
  });
}
