/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation, svlCommonPage } = getPageObjects([
    'common',
    'solutionNavigation',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  describe('Agent Builder', function () {
    function agentsSideNavTest() {
      it('should have side nav link for agents', async () => {
        await solutionNavigation.sidenav.expectLinkExists({ deepLinkId: 'agent_builder' });
        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'agent_builder' });
        await testSubjects.existOrFail('onechatPageConversations');
        await solutionNavigation.sidenav.expectLinkActive({ deepLinkId: 'agent_builder' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Agent Chat' });
      });
    }
    describe('admin user', function () {
      before(async () => {
        await svlCommonPage.loginWithRole('admin');
        await common.navigateToApp('discover');
      });

      agentsSideNavTest();
    });
    describe('developer user', function () {
      before(async () => {
        await svlCommonPage.loginWithRole('developer');
        await common.navigateToApp('discover');
      });

      agentsSideNavTest();
    });
    describe('viewer user', function () {
      before(async () => {
        await svlCommonPage.loginWithRole('viewer');
        await common.navigateToApp('discover');
      });

      agentsSideNavTest();
    });
  });
}
