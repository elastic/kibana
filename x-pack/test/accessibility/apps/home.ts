/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  describe('Kibana Home', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('home');
    });

    it('Kibana Home view', async () => {
      await a11y.testAppSnapshot();
    });

    it('Kibana overview page meets a11y requirements ', async () => {
      await testSubjects.click('homSolutionPanel homSolutionPanel_kibana');
      await a11y.testAppSnapshot();
    });

    it('toggle side nav meets a11y requirements', async () => {
      await testSubjects.click('toggleNavButton');
      await a11y.testAppSnapshot();
    });

    it('Enterprise search overview page meets a11y requirements ', async () => {
      await testSubjects.click('homeLink');
      await testSubjects.click('homSolutionPanel homSolutionPanel_enterpriseSearch');
      await a11y.testAppSnapshot();
    });

    it('Observability overview page meets a11y requirements ', async () => {
      await testSubjects.click('toggleNavButton');
      await testSubjects.click('homeLink');
      await testSubjects.click('homSolutionPanel homSolutionPanel_observability');
      await a11y.testAppSnapshot();
    });

    it('Security overview page meets a11y requirements ', async () => {
      await testSubjects.click('toggleNavButton');
      await testSubjects.click('homeLink');
      await testSubjects.click('homSolutionPanel homSolutionPanel_securitySolution');
      await a11y.testAppSnapshot();
    });

    it('Add data page meets a11y requirements ', async () => {
      await testSubjects.click('toggleNavButton');
      await testSubjects.click('homeLink');
      await testSubjects.click('homeAddData');
      await a11y.testAppSnapshot();
    });

    it('Sample data page meets a11y requirements ', async () => {
      await testSubjects.click('homeTab-sampleData');
      await a11y.testAppSnapshot();
    });

    it('click on Add logs panel to open all log examples page meets a11y requirements ', async () => {
      await testSubjects.click('sampleDataSetCardlogs');
      await a11y.testAppSnapshot();
    });

    it('click on ActiveMQ logs panel to open tutorial meets a11y requirements', async () => {
      await testSubjects.click('homeTab-all');
      await testSubjects.click('homeSynopsisLinkactivemqlogs');
      await a11y.testAppSnapshot();
    });

    it('click on cloud tutorial meets a11y requirements', async () => {
      await testSubjects.click('onCloudTutorial');
      await a11y.testAppSnapshot();
    });

    it('Dock the side nav', async () => {
      await testSubjects.click('toggleNavButton');
      await PageObjects.home.dockTheSideNav();
      await a11y.testAppSnapshot();
    });

    it('click on collapse on observability in side nav to test a11y of collapse button', async () => {
      await find.clickByCssSelector(
        '[data-test-subj="collapsibleNavGroup-observability"] .euiCollapsibleNavGroup__title'
      );
      await a11y.testAppSnapshot();
    });

    // TODO https://github.com/elastic/kibana/issues/77828
    it.skip('undock the side nav', async () => {
      await PageObjects.home.dockTheSideNav();
      await a11y.testAppSnapshot();
    });

    it('passes with searchbox open', async () => {
      await testSubjects.click('nav-search-popover');
      await a11y.testAppSnapshot();
    });
  });
}
