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
      it('does not allow user that does not have reporting privileges', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryDashboardDownloadCsvNotAvailable('Ecommerce Data');
      });

      it('does allow user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryDashboardDownloadCsvSuccess('Ecommerce Data');
      });
    });

    describe('Dashboard: Generate Screenshot', () => {
      it('does not allow user that does not have reporting privileges', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryReportsNotAvailable();
      });

      it('does allow PDF generation user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryGeneratePdfSuccess();
      });

      it('does allow PNG generation user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryGeneratePngSuccess();
      });
    });

    describe('Discover: Generate CSV', () => {
      it('does not allow user that does not have reporting privileges', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedSearch(SAVEDSEARCH_TITLE);
        await reportingFunctional.tryDiscoverCsvNotAvailable();
      });

      it('does allow user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedSearch(SAVEDSEARCH_TITLE);
        await reportingFunctional.tryDiscoverCsvSuccess();
      });
    });

    describe('Canvas: Generate PDF', () => {
      const esArchiver = getService('esArchiver');
      const reportingApi = getService('reportingAPI');
      before('initialize tests', async () => {
        await esArchiver.load('canvas/reports');
      });

      after('teardown tests', async () => {
        await esArchiver.unload('canvas/reports');
        await reportingApi.deleteAllReports();
        await reportingFunctional.initEcommerce();
      });

      it('does not allow user that does not have reporting privileges', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openCanvasWorkpad(CANVAS_TITLE);
        await reportingFunctional.tryGeneratePdfNotAvailable();
      });

      it('does allow user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openCanvasWorkpad(CANVAS_TITLE);
        await reportingFunctional.tryGeneratePdfSuccess();
      });
    });

    describe('Visualize Editor: Generate Screenshot', () => {
      it('does not allow user that does not have reporting privileges', async () => {
        await reportingFunctional.loginDataAnalyst();
        await reportingFunctional.openSavedVisualization(VIS_TITLE);
        await reportingFunctional.tryReportsNotAvailable();
      });

      it('does allow PDF generation user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedVisualization(VIS_TITLE);
        await reportingFunctional.tryGeneratePdfSuccess();
      });

      it('does allow PNG generation user with reporting privileges', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedVisualization(VIS_TITLE);
        await reportingFunctional.tryGeneratePngSuccess();
      });
    });
  });
}
