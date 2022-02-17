/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  const PageObjects = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'timePicker',
    'visualize',
    'visEditor',
  ]);

  describe('Visualize Reporting Screenshots', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load(ecommerceSOPath);
      await browser.setWindowSize(1600, 850);
      await kibanaServer.uiSettings.replace({
        'timepicker:timeDefaults':
          '{  "from": "2019-04-27T23:56:51.374Z",  "to": "2019-08-23T16:18:51.821Z"}',
      });
    });
    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.unload(ecommerceSOPath);
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
      await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
    });

    describe('Print PDF button', () => {
      it('is available if new', async () => {
        await PageObjects.common.navigateToUrl('visualize', 'new', { useActualUrl: true });
        await PageObjects.visualize.clickAggBasedVisualizations();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch('ecommerce');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('becomes available when saved', async () => {
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

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
      });
    });
  });
}
