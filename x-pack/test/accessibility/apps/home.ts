/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');
  const retry = getService('retry');
  const globalNav = getService('globalNav');

  describe('Kibana Home', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('home');
    });

    it('Kibana Home view', async () => {
      await a11y.testAppSnapshot();
    });

    it('all plugins view page meets a11y requirements', async () => {
      await PageObjects.home.clickAllKibanaPlugins();
      await a11y.testAppSnapshot();
    });

    it('visualize & explore details tab meets a11y requirements', async () => {
      await PageObjects.home.clickVisualizeExplorePlugins();
      await a11y.testAppSnapshot();
    });

    it('administrative detail tab meets a11y requirements', async () => {
      await PageObjects.home.clickAdminPlugin();
      await a11y.testAppSnapshot();
    });

    it('navigating to console app from administration tab meets a11y requirements', async () => {
      await PageObjects.home.clickOnConsole();
      // wait till dev tools app is loaded (lazy loading the bundle)
      await retry.waitFor(
        'switched to dev tools',
        async () => (await globalNav.getLastBreadcrumb()) === 'Dev Tools'
      );
      await a11y.testAppSnapshot();
    });

    // issue:  https://github.com/elastic/kibana/issues/38980
    it.skip('navigating back to home page from console meets a11y requirements', async () => {
      await PageObjects.home.clickOnLogo();
      await a11y.testAppSnapshot();
    });

    // Extra clickon logo step here will be removed after preceding test is fixed.
    it('click on Add logs panel to open all log examples page meets a11y requirements ', async () => {
      await PageObjects.home.clickOnLogo();
      await PageObjects.home.ClickOnLogsData();
      await a11y.testAppSnapshot();
    });

    it('click on ActiveMQ logs panel to open tutorial meets a11y requirements', async () => {
      await PageObjects.home.clickOnLogsTutorial();
      await a11y.testAppSnapshot();
    });

    it('click on cloud tutorial meets a11y requirements', async () => {
      await PageObjects.home.clickOnCloudTutorial();
      await a11y.testAppSnapshot();
    });
  });
}
