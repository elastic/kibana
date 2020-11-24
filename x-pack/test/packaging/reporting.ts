/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from 'test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['dashboard', 'common', 'reporting']);
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('Reporting', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('packaging');
    });

    after(async () => {
      await esArchiver.unload('packaging');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    it('downloaded PDF has OK status', async function () {
      this.timeout(180000);

      await pageObjects.common.navigateToApp('dashboards');
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
