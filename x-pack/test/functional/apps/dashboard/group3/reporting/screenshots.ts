/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({
  getPageObjects,
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard', 'share']);
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const browser = getService('browser');
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const png = getService('png');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  const loadEcommerce = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
    await kibanaServer.importExport.load(ecommerceSOPath);
    await kibanaServer.uiSettings.replace({
      defaultIndex: '5193f870-d861-11e9-a311-0fa548c5f953',
    });
  };
  const unloadEcommerce = async () => {
    await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
    await kibanaServer.importExport.unload(ecommerceSOPath);
  };

  // NOTE: Occasionally, you may need to run the test and copy the "session" image file and replace the
  // "baseline" image file to reflect current renderings. The source and destination file paths can be found in
  // the debug logs.
  describe('Dashboard Reporting Screenshots', () => {
    before('initialize tests', async () => {
      await loadEcommerce();
      await browser.setWindowSize(1600, 850);

      await security.role.create('test_dashboard_user', {
        elasticsearch: {
          cluster: [],
          indices: [
            {
              names: ['ecommerce', 'kibana_sample_data_ecommerce'],
              privileges: ['read'],
              field_security: { grant: ['*'], except: [] },
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: { dashboard: ['minimal_all'] },
          },
        ],
      });

      await security.testUser.setRoles([
        'test_dashboard_user',
        'reporting_user', // NOTE: the built-in role granting full reporting access is deprecated. See the xpack.reporting.roles.enabled setting
      ]);
    });
    after('clean up archives', async () => {
      await PageObjects.share.closeShareModal();
      await unloadEcommerce();
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
      await security.testUser.restoreDefaults();
    });

    describe('Print PDF button', () => {
      afterEach(async () => {
        await PageObjects.share.closeShareModal();
      });

      it('is available if new', async () => {
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openExportTab();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('is available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PDF Dashboard');
        await PageObjects.reporting.openExportTab();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Print Layout', () => {
      before(async () => {
        await loadEcommerce();
      });
      after(async () => {
        await unloadEcommerce();
      });

      it('downloads a PDF file', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
        // function is taking about 15 seconds per comparison in jenkins.
        this.timeout(300000);
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openExportTab();
        await PageObjects.reporting.checkUsePrintLayout();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url ?? '');

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        await PageObjects.share.closeShareModal();
      });
    });

    describe('Print PNG button', () => {
      before(async () => {
        await loadEcommerce();
      });
      after(async () => {
        await unloadEcommerce();
      });

      it('is available if new', async () => {
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openExportTab();
        await testSubjects.click('pngV2-radioOption');
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        await PageObjects.share.closeShareModal();
      });

      it('is available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PNG Dash');
        await PageObjects.reporting.openExportTab();
        await testSubjects.click('pngV2-radioOption');
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        await (await testSubjects.find('kibanaChrome')).clickMouseButton(); // close popover
      });
    });

    describe.skip('Preserve Layout', () => {
      before(async () => {
        await loadEcommerce();
      });

      after(async () => {
        await unloadEcommerce();
      });

      it('downloads a PDF file with saved search given EuiDataGrid enabled', async function () {
        await kibanaServer.uiSettings.update({ 'doc_table:legacy': false });
        this.timeout(300000);
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openExportTab();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url ?? '');
        await PageObjects.share.closeShareModal();

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        await kibanaServer.uiSettings.replace({});
      });
    });

    describe('Sample data from Kibana 7.6', () => {
      const reportFileName = 'sample_data_ecommerce_76';
      let sessionReportPath: string;
      let baselinePath: string;

      before(async () => {
        await kibanaServer.uiSettings.replace({
          defaultIndex: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        });

        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_76');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce_76.json'
        );

        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.loadSavedDashboard('[K7.6-eCommerce] Revenue Dashboard');

        await PageObjects.reporting.openExportTab();
        await testSubjects.click('pngV2-radioOption');
        await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
        await PageObjects.reporting.clickGenerateReportButton();
        await PageObjects.reporting.removeForceSharedItemsContainerSize();

        const url = await PageObjects.reporting.getReportURL(60000);
        const reportData = await PageObjects.reporting.getRawReportData(url ?? '');
        sessionReportPath = await PageObjects.reporting.writeSessionReport(
          reportFileName,
          'png',
          reportData,
          REPORTS_FOLDER
        );
        baselinePath = PageObjects.reporting.getBaselineReportPath(
          reportFileName,
          'png',
          REPORTS_FOLDER
        );
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_76');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce_76.json'
        );
      });

      it('PNG file matches the baseline image', async function () {
        this.timeout(300000);
        const percentDiff = await png.compareAgainstBaseline(
          sessionReportPath,
          baselinePath,
          REPORTS_FOLDER,
          updateBaselines
        );

        expect(percentDiff).to.be.lessThan(0.035);
      });
    });
  });
}
