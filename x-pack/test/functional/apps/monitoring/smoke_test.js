/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);
  const find = getService('find');

  const overview = getService('monitoringClusterOverview');

  const pauseForInspection = (component = 'page') => {
    log.info(`=== PAUSE for inspection of ${component}, press enter when ready ===`);
    return new Promise((resolve) => process.stdin.once('data', resolve));
  };

  // eslint-disable-next-line mocha/no-exclusive-tests
  describe.only('smoke test', () => {
    before(async () => {
      const originalWindowSize = await browser.getWindowSize();
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height * 2);

      await PageObjects.common.navigateToApp('monitoring');
      await overview.closeAlertsModal();
    });

    it('shows overview with panels for each stack component', async () => {
      expect(await overview.getEsNumberOfNodes()).to.match(/Nodes: \d+/);

      expect(await overview.getKbnStatus()).to.be('Healthy');
      expect(await overview.getKbnInstances()).to.match(/Instances: \d+/);

      expect(await overview.getLsNodes()).to.match(/Nodes: \d+/);

      await pauseForInspection('overview');
    });

    it('shows logstash monitoring data', async() => {
      await PageObjects.common.navigateToApp('monitoring');
      await overview.clickLsOverview();

      await pauseForInspection('logstash overview');

      await find.clickByCssSelector('.euiTabs [title="Nodes"]');

      await pauseForInspection('logstash nodes');

      await find.clickByCssSelector('.euiTabs [title="Pipelines"]');

      await pauseForInspection('logstash pipelines');
    });
  });
}
