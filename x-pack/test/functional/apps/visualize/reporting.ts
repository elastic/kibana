/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const pageObjects = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'visualize',
    'visEditor',
  ]);

  describe('Visualize', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('reporting/ecommerce');
      await esArchiver.loadIfNeeded('reporting/ecommerce_kibana');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    describe('Print PDF button', () => {
      it('is not available if new', async () => {
        await pageObjects.common.navigateToUrl('visualize', 'new', { useActualUrl: true });
        await pageObjects.visualize.clickAreaChart();
        await pageObjects.visualize.clickNewSearch('ecommerce');
        await pageObjects.reporting.openPdfReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
      });

      it('becomes available when saved', async () => {
        await pageObjects.reporting.setTimepickerInDataRange();
        await pageObjects.visEditor.clickBucket('X-axis');
        await pageObjects.visEditor.selectAggregation('Date Histogram');
        await pageObjects.visEditor.clickGo();
        await pageObjects.visualize.saveVisualization('my viz');
        await pageObjects.reporting.openPdfReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('downloaded PDF has OK status', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout
        this.timeout(180000);

        await pageObjects.common.navigateToApp('dashboard');
        await pageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await pageObjects.reporting.openPdfReportingPanel();
        await pageObjects.reporting.clickGenerateReportButton();

        const url = await pageObjects.reporting.getReportURL(60000);
        const res = await pageObjects.reporting.getResponse(url);

        expect(res.statusCode).to.equal(200);
        expect(res.headers['content-type']).to.equal('application/pdf');
      });
    });
  });
}
