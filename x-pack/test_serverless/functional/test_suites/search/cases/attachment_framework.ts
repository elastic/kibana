/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboard = getPageObject('dashboard');
  const lens = getPageObject('lens');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const settings = getPageObject('settings');

  describe('persistable attachment', () => {
    before(async () => {
      await svlCommonPage.loginWithRole('developer');
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    describe('lens visualization', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );

        await settings.refreshDataViewFieldList('default:all-data', { ignoreMissing: true });

        await svlSearchNavigation.navigateToLandingPage();

        await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });

        await dashboard.clickNewDashboard();

        await lens.createAndAddLensFromDashboard({ ignoreTimeFilter: true });
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );
      });

      it('does not show actions to add lens visualization to case', async () => {
        await testSubjects.click('embeddablePanelToggleMenuIcon');
        await testSubjects.click('embeddablePanelMore-mainMenu');
        await testSubjects.missingOrFail('embeddablePanelAction-embeddable_addToExistingCase');
      });
    });
  });
};
