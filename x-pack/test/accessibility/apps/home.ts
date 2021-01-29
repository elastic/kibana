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
  const testSubjects = getService('testSubjects');

  // FLAKY: https://github.com/elastic/kibana/issues/80929
  describe.skip('Kibana Home', () => {
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

    it('navigating back to home page from console meets a11y requirements', async () => {
      await PageObjects.home.clickOnLogo();
      await a11y.testAppSnapshot();
    });

    it('click on Add logs panel to open all log examples page meets a11y requirements ', async () => {
      await PageObjects.home.clickOnAddData();
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

    it('click on side nav to see all the side nav menu', async () => {
      await PageObjects.home.clickOnLogo();
      await PageObjects.home.clickOnToggleNavButton();
      await a11y.testAppSnapshot();
    });

    it('Dock the side nav', async () => {
      await PageObjects.home.dockTheSideNav();
      await a11y.testAppSnapshot();
    });

    it('click on collapse on observability in side nav to test a11y of collapse button', async () => {
      await PageObjects.home.collapseObservabibilitySideNav();
      await a11y.testAppSnapshot();
    });

    // TODO https://github.com/elastic/kibana/issues/77828
    it.skip('undock the side nav', async () => {
      await PageObjects.home.dockTheSideNav();
      await a11y.testAppSnapshot();
    });

    it('passes with searchbox open', async () => {
      await PageObjects.common.navigateToApp('home');
      await testSubjects.click('header-search');
      await a11y.testAppSnapshot();
    });
  });
}
