/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const DASHBOARD_TITLE = 'Ecom Dashboard';
const SAVEDSEARCH_TITLE = 'Ecommerce Data';

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
  });
}
