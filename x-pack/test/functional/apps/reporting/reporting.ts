/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['dashboard', 'common', 'reporting']);
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  const retry = getService('retry');

  describe('Reporting', function () {
    this.tags(['smoke', 'ciGroup2']);
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/packaging'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/packaging'
      );
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    it('downloaded PDF has OK status', async function () {
      this.timeout(180000);

      await pageObjects.common.navigateToApp('dashboards');
      await retry.waitFor('dashboard landing page', async () => {
        return await pageObjects.dashboard.onDashboardLandingPage();
      });
      await pageObjects.dashboard.loadSavedDashboard('dashboard');
      await pageObjects.reporting.openPdfReportingPanel();
      await pageObjects.reporting.clickGenerateReportButton();

      const url = await pageObjects.reporting.getReportURL(60000);
      const res = await pageObjects.reporting.getResponse(url);

      expect(res.status).to.equal(200);
      expect(res.get('content-type')).to.equal('application/pdf');
    });
  });
}
