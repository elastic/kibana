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
  const testSubjects = getService('testSubjects');

  const overview = getService('monitoringClusterOverview');
  const clusterList = getService('monitoringClusterList');

  const pauseForInspection = (component = 'page') => {
    log.info(`=== PAUSE for inspection of ${component}`);
    log.info('=== press enter to continue');
    return new Promise((resolve) => process.stdin.once('data', resolve));
  };

  const makeWindowTaller = async () => {
    const originalWindowSize = await browser.getWindowSize();
    await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height * 2);
  };

  const findAsync = async (array, predicate) => {
    const promises = array.map(predicate);
    const results = await Promise.all(promises);
    const index = results.findIndex((result) => result);
    return array[index];
  };

  const openOverviewPage = async () => {
    await PageObjects.common.navigateToApp('monitoring');
    await overview.closeAlertsModal();

    const pageTitle = await testSubjects.find('monitoringPageTitle');
    const pageTitleText = await pageTitle.getVisibleText();

    switch (pageTitleText) {
      case 'Cluster listing':
        const clusterLinks = await clusterList.getClusterLinks();
        const firstAssociatedClusterLink = await findAsync(clusterLinks, async (link) => {
          const linkText = await link.getVisibleText();
          return !linkText.includes('Standalone Cluster');
        });
        if (firstAssociatedClusterLink === undefined) {
          throw new Error('Unable to find non-standalone cluster in cluster listing');
        }
        await firstAssociatedClusterLink.click();
        break;
      case 'Cluster overview':
        break;
      default:
        throw new Error(`Unexpected monitoring page title: ${pageTitleText}`);
    }
  };

  // eslint-disable-next-line mocha/no-exclusive-tests
  describe.only('smoke test', () => {
    before(async () => {
      await makeWindowTaller();
      await openOverviewPage();
    });

    it('shows overview with panels for each stack component', async () => {
      expect(await overview.getEsNumberOfNodes()).to.match(/Nodes: \d+/);

      expect(await overview.getKbnStatus()).to.be('Healthy');
      expect(await overview.getKbnInstances()).to.match(/Instances: \d+/);

      expect(await overview.getLsNodes()).to.match(/Nodes: \d+/);

      await pauseForInspection('overview');
    });

    it('shows logstash monitoring data', async () => {
      await overview.clickLsOverview();

      await pauseForInspection('logstash overview');

      await find.clickByCssSelector('.euiTabs [title="Nodes"]');

      await pauseForInspection('logstash nodes');

      await find.clickByCssSelector('.euiTabs [title="Pipelines"]');

      await pauseForInspection('logstash pipelines');
    });
  });
}
