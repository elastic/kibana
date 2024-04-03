/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'lens',
    'reporting',
    'timePicker',
    'visualize',
  ]);
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const listingTable = getService('listingTable');
  const security = getService('security');
  const browser = getService('browser');

  describe('lens reporting', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/reporting'
      );
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await security.testUser.setRoles(
        [
          'test_logstash_reader',
          'global_dashboard_read',
          'global_visualize_all',
          'reporting_user', // NOTE: the built-in role granting full reporting access is deprecated. See xpack.reporting.roles.enabled
        ],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
      await security.testUser.restoreDefaults();
    });

    it('should not cause PDF reports to fail', async () => {
      await PageObjects.dashboard.navigateToApp();
      await listingTable.clickItemLink('dashboard', 'Lens reportz');
      await PageObjects.reporting.openPdfReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();
      const url = await PageObjects.reporting.getReportURL(60000);
      expect(url).to.be.ok();
      if (await testSubjects.exists('toastCloseButton')) {
        await testSubjects.click('toastCloseButton');
      }
    });

    for (const type of ['PNG', 'PDF'] as const) {
      describe(`${type} report`, () => {
        it(`should not allow to download reports for incomplete visualization`, async () => {
          await PageObjects.visualize.gotoVisualizationLandingPage();
          await PageObjects.visualize.navigateToNewVisualization();
          await PageObjects.visualize.clickVisType('lens');
          await PageObjects.lens.goToTimeRange();

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'date_histogram',
            field: '@timestamp',
          });
          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          // now remove a dimension to make it incomplete
          await PageObjects.lens.removeDimension('lnsXY_yDimensionPanel');
          // open the share menu and check that reporting is disabled
          await PageObjects.lens.clickShareMenu();

          expect(await PageObjects.lens.isShareActionEnabled(`${type}Reports`));
        });

        it(`should be able to download report of the current visualization`, async () => {
          // make the configuration complete
          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          await PageObjects.lens.openReportingShare(type);
          await PageObjects.reporting.clickGenerateReportButton();
          const url = await PageObjects.reporting.getReportURL(60000);
          expect(url).to.be.ok();
          if (await testSubjects.exists('toastCloseButton')) {
            await testSubjects.click('toastCloseButton');
          }
        });

        it(`should show a warning message for curl reporting of unsaved visualizations`, async () => {
          await PageObjects.lens.openReportingShare(type);
          await testSubjects.click('shareReportingAdvancedOptionsButton');
          await testSubjects.existOrFail('shareReportingUnsavedState');
          expect(await testSubjects.getVisibleText('shareReportingUnsavedState')).to.eql(
            'Unsaved work\nSave your work before copying this URL.'
          );
        });

        it(`should enable curl reporting if the visualization is saved`, async () => {
          await PageObjects.lens.save(`ASavedVisualizationToShareIn${type}`);

          await PageObjects.lens.openReportingShare(type);
          await testSubjects.click('shareReportingAdvancedOptionsButton');
          await testSubjects.existOrFail('shareReportingCopyURL');
          expect(await testSubjects.getVisibleText('shareReportingCopyURL')).to.eql(
            'Copy POST URL'
          );
        });

        it(`should produce a valid URL for reporting`, async () => {
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.getReportURL(60000);
          if (await testSubjects.exists('toastCloseButton')) {
            await testSubjects.click('toastCloseButton');
          }
          // navigate to the reporting page
          await PageObjects.common.navigateToUrl('management', '/insightsAndAlerting');
          await testSubjects.click('reporting');
          // find the latest Lens report
          await testSubjects.click('reportJobRow > euiCollapsedItemActionsButton');
          // click on Open in Kibana and check that all is ok
          await testSubjects.click('reportOpenInKibanaApp');

          const [reportingWindowHandler, lensWindowHandle] = await browser.getAllWindowHandles();
          await browser.switchToWindow(lensWindowHandle);
          // verify some configuration
          expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
            'Average of bytes'
          );
          await browser.closeCurrentWindow();
          await browser.switchToWindow(reportingWindowHandler);
        });
      });
    }
  });
}
