/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enableInfrastructureHostsView } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const svlObltNavigation = getService('svlObltNavigation');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation', 'header']);

  const setHostsSetting = async (value: boolean) => {
    await kibanaServer.uiSettings.update({ [enableInfrastructureHostsView]: value });
    await browser.refresh();
    await pageObjects.svlCommonNavigation.expectExists();
  };

  const openInfraSection = async () => {
    await pageObjects.svlCommonNavigation.sidenav.openSection('observability_project_nav.metrics');
  };

  describe('Infra Side Navigation', () => {
    before(async () => {
      await pageObjects.svlCommonPage.login();
      await svlObltNavigation.navigateToLandingPage();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('when Hosts settings is on', () => {
      before(async () => {
        await setHostsSetting(true);
        await openInfraSection();
      });

      it("shows the 'Hosts' nav item", async () => {
        await pageObjects.svlCommonNavigation.sidenav.expectLinkExists({
          deepLinkId: 'metrics:hosts',
        });
      });
    });

    describe('when Hosts settings is off', () => {
      before(async () => {
        await setHostsSetting(false);
        await openInfraSection();
      });

      it("hides the 'Hosts' nav item", async () => {
        await pageObjects.svlCommonNavigation.sidenav.expectLinkMissing({
          deepLinkId: 'metrics:hosts',
        });
      });
    });
  });
};
