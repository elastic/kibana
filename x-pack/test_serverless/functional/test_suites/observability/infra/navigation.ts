/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const svlObltNavigation = getService('svlObltNavigation');
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation', 'header']);

  const openInfraSection = async () => {
    await pageObjects.svlCommonNavigation.sidenav.openPanel('metrics', { button: 'link' });
  };

  describe('Infra Side Navigation', () => {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsViewer();
      await svlObltNavigation.navigateToLandingPage();
    });

    describe('when Hosts settings is on', () => {
      before(async () => {
        await openInfraSection();
      });

      it("shows the 'Hosts' nav item", async () => {
        await pageObjects.svlCommonNavigation.sidenav.expectLinkExists({
          panelNavLinkId: 'metrics:hosts',
        });
      });
    });
  });
};
