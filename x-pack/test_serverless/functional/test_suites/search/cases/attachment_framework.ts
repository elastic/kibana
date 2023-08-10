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
  const common = getPageObject('common');
  const dashboard = getPageObject('dashboard');
  const lens = getPageObject('lens');
  const timePicker = getPageObject('timePicker');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const dashboardAddPanel = getService('dashboardAddPanel');

  // duplicated from x-pack/test/functional/page_objects/lens_page.ts to convert args into object for better readability 
  const goToTimeRange = async ({ fromTime, toTime, skipLoadingIndicatorHiddenCheck }: { fromTime?: string, toTime?: string, skipLoadingIndicatorHiddenCheck?: boolean }) => {
    await timePicker.ensureHiddenNoDataPopover();
    fromTime = fromTime || timePicker.defaultStartTime;
    toTime = toTime || timePicker.defaultEndTime;
    await timePicker.setAbsoluteRange(fromTime, toTime, false, skipLoadingIndicatorHiddenCheck);
    await common.sleep(500);
  };

  describe('persistable attachment', () => {
    describe('lens visualization', () => {
      const skipLoadingIndicatorHiddenCheck = true;

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );

        await svlSearchNavigation.navigateToLandingPage();

        await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });

        await dashboard.clickNewDashboard();

        await dashboardAddPanel.clickCreateNewLink(skipLoadingIndicatorHiddenCheck);

        await goToTimeRange({ skipLoadingIndicatorHiddenCheck });

        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
  
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
  
        await lens.configureDimension({
          dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'ip',
        });

        await lens.saveAndReturn();
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
        await testSubjects.missingOrFail('embeddablePanelAction-embeddable_addToNewCase');
        await testSubjects.missingOrFail('embeddablePanelAction-embeddable_addToExistingCase');
      });
    });
  });
};
