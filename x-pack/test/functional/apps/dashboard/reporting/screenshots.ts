/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../../ftr_provider_context';

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const browser = getService('browser');
  const log = getService('log');
  const config = getService('config');
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const reporting = getService('reporting');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  describe('Dashboard Reporting Screenshots', () => {
    before('initialize tests', async () => {
      await kibanaServer.uiSettings.replace({
        defaultIndex: '5193f870-d861-11e9-a311-0fa548c5f953',
      });

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load(ecommerceSOPath);
      await browser.setWindowSize(1600, 850);

      await security.role.create('test_dashboard_user', {
        elasticsearch: {
          cluster: [],
          indices: [
            {
              names: ['ecommerce'],
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
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.unload(ecommerceSOPath);
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
      await security.testUser.restoreDefaults();
    });

    describe('Print PDF button', () => {
      it('is available if new', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        await (await testSubjects.find('kibanaChrome')).clickMouseButton(); // close popover
      });

      it('is available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PDF Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Print Layout', () => {
      it('downloads a PDF file', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
        // function is taking about 15 seconds per comparison in jenkins.
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.checkUsePrintLayout();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
      });
    });

    describe('Print PNG button', () => {
      it('is available if new', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openPngReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        await (await testSubjects.find('kibanaChrome')).clickMouseButton(); // close popover
      });

      it('is available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PNG Dash');
        await PageObjects.reporting.openPngReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('PNG Layout', () => {
      it('downloads a PNG file: small dashboard', async function () {
        this.timeout(300000);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPngReportingPanel();
        await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
        await PageObjects.reporting.clickGenerateReportButton();
        await PageObjects.reporting.removeForceSharedItemsContainerSize();

        const url = await PageObjects.reporting.getReportURL(60000);
        const reportData = await PageObjects.reporting.getRawPdfReportData(url);
        const reportFileName = 'small_dashboard_preserve_layout';
        const sessionReportPath = await PageObjects.reporting.writeSessionReport(
          reportFileName,
          'png',
          reportData,
          REPORTS_FOLDER
        );
        const percentDiff = await reporting.checkIfPngsMatch(
          sessionReportPath,
          PageObjects.reporting.getBaselineReportPath(reportFileName, 'png', REPORTS_FOLDER),
          config.get('screenshots.directory'),
          log
        );

        expect(percentDiff).to.be.lessThan(0.09);
      });

      it('downloads a PNG file: large dashboard', async function () {
        this.timeout(300000);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Large Dashboard');
        await PageObjects.reporting.openPngReportingPanel();
        await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
        await PageObjects.reporting.clickGenerateReportButton();
        await PageObjects.reporting.removeForceSharedItemsContainerSize();

        const url = await PageObjects.reporting.getReportURL(200000);
        const reportData = await PageObjects.reporting.getRawPdfReportData(url);
        const reportFileName = 'large_dashboard_preserve_layout';
        const sessionReportPath = await PageObjects.reporting.writeSessionReport(
          reportFileName,
          'png',
          reportData,
          REPORTS_FOLDER
        );
        const percentDiff = await reporting.checkIfPngsMatch(
          sessionReportPath,
          PageObjects.reporting.getBaselineReportPath(reportFileName, 'png', REPORTS_FOLDER),
          config.get('screenshots.directory'),
          log
        );

        expect(percentDiff).to.be.lessThan(0.09);
      });
    });

    describe('Preserve Layout', () => {
      it('downloads a PDF file: small dashboard', async function () {
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
      });

      it('downloads a PDF file: large dashboard', async function () {
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Large Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
      });

      it('downloads a PDF file with saved search given EuiDataGrid enabled', async function () {
        await kibanaServer.uiSettings.update({ 'doc_table:legacy': false });
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        await kibanaServer.uiSettings.replace({});
      });
    });
  });
}
