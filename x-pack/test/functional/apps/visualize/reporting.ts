/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const PageObjects = getPageObjects([
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
    });

    describe('Print PDF button', () => {
      it('is not available if new', async () => {
        await PageObjects.common.navigateToUrl('visualize', 'new', { useActualUrl: true });
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch('ecommerce');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
      });

      it('becomes available when saved', async () => {
        await PageObjects.reporting.setTimepickerInDataRange();
        await PageObjects.visEditor.clickBucket('X-axis');
        await PageObjects.visEditor.selectAggregation('Date Histogram');
        await PageObjects.visEditor.clickGo();
        await PageObjects.visualize.saveVisualization('my viz');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('downloaded PDF has OK status', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout
        this.timeout(180000);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.statusCode).to.equal(200);
        expect(res.headers['content-type']).to.equal('application/pdf');
      });
    });
  });
}
