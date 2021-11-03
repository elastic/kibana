/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, home } = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  describe('Kibana Home', () => {
    before(async () => {
      await common.navigateToApp('home');
    });

    it('Kibana Home view', async () => {
      await a11y.testAppSnapshot();
    });

    it('Kibana overview page meets a11y requirements ', async () => {
      await testSubjects.click('homSolutionPanel homSolutionPanel_kibana');
      await a11y.testAppSnapshot();
    });

    /**
     * Test fails claiming that a user can focus on an element with aria-hidden
     * But axe does not recognize our focus trap which prevents a user from ever actually doing that
     * Open question on why this doesn't fail in other areas though but the structure is the
     */
    it.skip('toggle side nav meets a11y requirements', async () => {
      await home.openCollapsibleNav();
      await a11y.testAppSnapshot();
    });

    // skipped for same reason as above "toggle side nav meets a11y requirements" test
    it.skip('click on collapse on observability in side nav to test a11y of collapse button', async () => {
      await home.openCollapsibleNav();
      await find.clickByCssSelector(
        '[data-test-subj="collapsibleNavGroup-observability"] .euiCollapsibleNavGroup__title'
      );
      await a11y.testAppSnapshot();
    });

    it('Enterprise search overview page meets a11y requirements ', async () => {
      await home.clickGoHome();
      await testSubjects.click('homSolutionPanel homSolutionPanel_enterpriseSearch');
      await a11y.testAppSnapshot();
    });

    it('Observability overview page meets a11y requirements ', async () => {
      await home.clickGoHome();
      await testSubjects.click('homSolutionPanel homSolutionPanel_observability');
      await a11y.testAppSnapshot();
    });

    it('Security overview page meets a11y requirements ', async () => {
      await home.clickGoHome();
      await testSubjects.click('homSolutionPanel homSolutionPanel_securitySolution');
      await a11y.testAppSnapshot();
    });

    it('passes with searchbox open', async () => {
      await testSubjects.click('nav-search-popover');
      await a11y.testAppSnapshot();
    });
  });
}
