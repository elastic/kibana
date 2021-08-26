/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObject }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const common = getPageObject('common');
  const dashboard = getPageObject('dashboard');
  const reporting = getPageObject('reporting');

  describe('reporting dashbaord', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/performance/kbn_archives/reporting_dashboard'
      );
      await esArchiver.loadIfNeeded('x-pack/test/performance/es_archives/reporting_dashboard');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/performance/kbn_archives/reporting_dashboard'
      );
      await esArchiver.unload('x-pack/test/performance/es_archives/reporting_dashboard');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    it('downloaded PDF has OK status', async function () {
      this.timeout(180000);

      await common.navigateToApp('dashboards');
      await retry.waitFor('dashboard landing page', async () => {
        return await dashboard.onDashboardLandingPage();
      });
      await dashboard.loadSavedDashboard('dashboard');
      await reporting.openPdfReportingPanel();
      await reporting.clickGenerateReportButton();

      await reporting.getReportURL(60000);
    });
  });
}
