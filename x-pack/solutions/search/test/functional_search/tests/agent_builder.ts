/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { solutionNavigation } = getPageObjects(['solutionNavigation']);
  const testSubjects = getService('testSubjects');
  const searchSpace = getService('searchSpace');
  const appsMenu = getService('appsMenu');

  describe('Agent Builder', function () {
    describe('search solution navigation', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };
      before(async () => {
        ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
          'agent-builder-solution-nav'
        ));
        await searchSpace.navigateTo(spaceCreated.id);
      });
      after(async () => {
        // Clean up space created
        await cleanUp();
      });

      it('should have side nav link for agents', async () => {
        await solutionNavigation.sidenav.expectLinkExists({ deepLinkId: 'agent_builder' });
        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'agent_builder' });
        await testSubjects.existOrFail('onechatPageConversations');
        await solutionNavigation.sidenav.expectLinkActive({ deepLinkId: 'agent_builder' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Agent Chat' });
      });
    });
    describe('classic navigation', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };
      before(async () => {
        ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
          'agent-builder-classic-nav',
          'classic'
        ));
        await searchSpace.navigateTo(spaceCreated.id);
      });
      after(async () => {
        // Clean up space created
        await cleanUp();
      });

      it('should have agent builder in global nav', async () => {
        await testSubjects.existOrFail('toggleNavButton');
        await appsMenu.openCollapsibleNav();
        await appsMenu.linkExists('Agent Builder');
        await appsMenu.clickLink('Agent Builder');
        await testSubjects.existOrFail('onechatPageConversations');
      });
    });
  });
}
