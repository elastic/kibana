/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, dashboard, lens, reporting, timePicker, visualize } = getPageObjects([
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
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();

      // need reporting privileges in dashboard
      await security.role.create('test_dashboard_user', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: { dashboard: ['minimal_read', 'generate_report'] },
          },
        ],
      });

      await security.testUser.setRoles(
        [
          'test_logstash_reader',
          'global_dashboard_read',
          'global_visualize_all',
          'test_dashboard_user',
        ],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
      await security.testUser.restoreDefaults();
    });

    afterEach(async () => {
      if (await testSubjects.exists('shareContextModal')) {
        await lens.closeShareModal();
      }
    });

    it('should not cause PDF reports to fail', async () => {
      await dashboard.navigateToApp();
      await listingTable.clickItemLink('dashboard', 'Lens reportz');
      await reporting.openExportTab();
      await reporting.clickGenerateReportButton();
      await lens.closeShareModal();
      const url = await reporting.getReportURL(60000);
      expect(url).to.be.ok();
      if (await testSubjects.exists('toastCloseButton')) {
        await testSubjects.click('toastCloseButton');
      }
      await lens.closeShareModal();
    });

    for (const type of ['PNG', 'PDF'] as const) {
      describe(`${type} report`, () => {
        it(`should not allow to download reports for incomplete visualization`, async () => {
          await visualize.gotoVisualizationLandingPage();
          await visualize.navigateToNewVisualization();
          await visualize.clickVisType('lens');

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

          // now remove a dimension to make it incomplete
          await lens.removeDimension('lnsXY_yDimensionPanel');
          // open the share menu and check that reporting is disabled
          await lens.clickShareModal();

          expect(await testSubjects.exists('export')).to.be(false);
          await lens.closeShareModal();
        });

        it(`should be able to download report of the current visualization`, async () => {
          // make the configuration complete
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });

          await lens.openReportingShare(type);
          await reporting.clickGenerateReportButton();

          const url = await reporting.getReportURL(60000);

          await lens.closeShareModal();

          expect(url).to.be.ok();
          if (await testSubjects.exists('toastCloseButton')) {
            await testSubjects.click('toastCloseButton');
          }
        });

        it(`should enable curl reporting if the visualization is saved`, async () => {
          await lens.save(`ASavedVisualizationToShareIn${type}`);

          await lens.openReportingShare(type);
          await testSubjects.existOrFail('shareReportingCopyURL');
          expect(await testSubjects.getVisibleText('shareReportingCopyURL')).to.eql(
            'Copy Post URL'
          );
          await lens.closeShareModal();
        });

        it(`should produce a valid URL for reporting`, async () => {
          await lens.openReportingShare(type);
          await reporting.clickGenerateReportButton();
          await reporting.getReportURL(60000);
          if (await testSubjects.exists('toastCloseButton')) {
            await testSubjects.click('toastCloseButton');
          }
          // navigate to the reporting page
          await common.navigateToUrl('management', '/insightsAndAlerting');
          await testSubjects.click('reporting');
          // find the latest Lens report
          await testSubjects.click('reportJobRow > euiCollapsedItemActionsButton');
          // click on Open in Kibana and check that all is ok
          await testSubjects.click('reportOpenInKibanaApp');

          const [reportingWindowHandler, lensWindowHandle] = await browser.getAllWindowHandles();
          await browser.switchToWindow(lensWindowHandle);
          // verify some configuration
          expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
            'Average of bytes'
          );
          await browser.closeCurrentWindow();
          await browser.switchToWindow(reportingWindowHandler);
        });
      });
    }
  });
}
