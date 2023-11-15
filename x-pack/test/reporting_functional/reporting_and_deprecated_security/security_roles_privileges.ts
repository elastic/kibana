/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const DASHBOARD_TITLE = 'Ecom Dashboard';
const SAVEDSEARCH_TITLE = 'Ecommerce Data';
const VIS_TITLE = 'e-commerce pie chart';
const CANVAS_TITLE = 'The Very Cool Workpad for PDF Tests';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingFunctional = getService('reportingFunctional');

  describe('Security with `reporting_user` built-in role', () => {
    before(async () => {
      await reportingFunctional.initEcommerce();
    });
    after(async () => {
      await reportingFunctional.teardownEcommerce();
    });

    describe('Dashboard: Download CSV file', () => {
      it('does not allow user that does not have reporting_user role', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryDashboardDownloadCsvFail('Ecommerce Data');
      });

      it('does allow user with reporting_user role', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryDashboardDownloadCsvSuccess('Ecommerce Data');
      });
    });

    describe('Dashboard: Generate Screenshot', () => {
      it('does not allow user that does not have reporting_user role', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryGeneratePdfFail();
      });

      it('does allow user with reporting_user role', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryGeneratePdfSuccess();
      });
    });

    describe('Discover: Generate CSV', () => {
      it('does not allow user that does not have reporting_user role', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedSearch(SAVEDSEARCH_TITLE);
        await reportingFunctional.tryDiscoverCsvFail();
      });

      it('does allow user with reporting_user role', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedSearch(SAVEDSEARCH_TITLE);
        await reportingFunctional.tryDiscoverCsvSuccess();
      });
    });

    describe('Canvas: Generate PDF', () => {
      const reportingApi = getService('reportingAPI');
      const kibanaServer = getService('kibanaServer');

      before('initialize tests', async () => {
        await kibanaServer.importExport.load(
          'test/functional/fixtures/kbn_archiver/canvas/workpad_pdf_test'
        );
      });

      after('teardown tests', async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await reportingApi.deleteAllReports();
        await reportingFunctional.initEcommerce();
      });

      it('does not allow user that does not have reporting_user role', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openCanvasWorkpad(CANVAS_TITLE);
        await reportingFunctional.tryGeneratePdfFail();
      });

      it('does allow user with reporting_user role', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openCanvasWorkpad(CANVAS_TITLE);
        await reportingFunctional.tryGeneratePdfSuccess();
      });
    });

    describe('Visualize Editor: Generate Screenshot', () => {
      it('does not allow user that does not have reporting_user role', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedVisualization(VIS_TITLE);
        await reportingFunctional.tryGeneratePdfFail();
      });

      it('does allow user with reporting_user role', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedVisualization(VIS_TITLE);
        await reportingFunctional.tryGeneratePdfSuccess();
      });
    });
  });
}
