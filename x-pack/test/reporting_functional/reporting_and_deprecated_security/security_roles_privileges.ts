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
        await reportingFunctional.tryDashboardGenerateCsvFail('Ecommerce Data');
      });

      it('does allow user with reporting_user role', async () => {
        await reportingFunctional.loginReportingUser();
        await reportingFunctional.openSavedDashboard(DASHBOARD_TITLE);
        await reportingFunctional.tryDashboardGenerateCsvSuccess('Ecommerce Data');
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
