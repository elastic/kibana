/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['reporting', 'common', 'discover']);
  const filterBar = getService('filterBar');

  describe('Discover', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('reporting/ecommerce');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('reporting/ecommerce');
    });

    describe('Generate CSV button', () => {
      beforeEach(() => pageObjects.common.navigateToApp('discover'));

      it('is not available if new', async () => {
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
      });

      it('becomes available when saved', async () => {
        await pageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton');
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('becomes available/not available when a saved search is created, changed and saved again', async () => {
        // create new search, csv export is not available
        await pageObjects.discover.clickNewSearchButton();
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
        // save search, csv export is available
        await pageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton 2');
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        // add filter, csv export is not available
        await filterBar.addFilter('currency', 'is', 'EUR');
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
        // save search again, csv export is available
        await pageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton 2');
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('generates a report with data', async () => {
        await pageObjects.discover.clickNewSearchButton();
        await pageObjects.reporting.setTimepickerInDataRange();
        await pageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.canReportBeCreated()).to.be(true);
      });

      it('generates a report with no data', async () => {
        await pageObjects.reporting.setTimepickerInNoDataRange();
        await pageObjects.discover.saveSearch('my search - no data - expectReportCanBeCreated');
        await pageObjects.reporting.openCsvReportingPanel();
        expect(await pageObjects.reporting.canReportBeCreated()).to.be(true);
      });
    });
  });
}
