/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const find = getService('find');

  describe('Alerts table', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('triggersActionsUiExample/alerts_table');
      await waitTableIsLoaded();
    });

    afterEach(async () => {
      await browser.clearLocalStorage();
    });

    it('should load the table', async () => {
      const rows = await getRows();
      expect(rows.length).to.be(10);
      expect(rows[0].status).to.be('active');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:38.749Z');
      expect(rows[0].duration).to.be('1197194000');
      expect(rows[0].reason).to.be(
        'Failed transactions rate is greater than 5.0% (current value is 31%) for elastic-co-frontend'
      );
    });

    it('should let the user choose between fields', async () => {
      await waitAndClickByTestId('show-field-browser');
      await waitAndClickByTestId('categories-filter-button');
      await waitAndClickByTestId('categories-selector-option-name-base');
      await find.clickByCssSelector('#_id');
      await waitAndClickByTestId('close');

      const headers = await find.allByCssSelector('.euiDataGridHeaderCell');
      expect(headers.length).to.be(6);
    });

    it('should take into account the column type when sorting', async () => {
      const sortElQuery =
        '[data-test-subj="dataGridHeaderCellActionGroup-kibana.alert.duration.us"] > li:nth-child(2)';

      await waitAndClickByTestId('dataGridHeaderCell-kibana.alert.duration.us');

      await retry.try(async () => {
        const exists = await find.byCssSelector(sortElQuery);
        if (!exists) throw new Error('Still loading...');
      });

      const sortItem = await find.byCssSelector(sortElQuery);
      expect(await sortItem.getVisibleText()).to.be('Sort Low-High');
    });

    it('should sort properly', async () => {
      await find.clickDisplayedByCssSelector(
        '[data-test-subj="dataGridHeaderCell-event.action"] .euiDataGridHeaderCell__button'
      );

      const popoverButtons = await testSubjects.find('dataGridHeaderCellActionGroup-event.action');
      await (await popoverButtons.findAllByCssSelector('.euiListGroupItem__button'))[2].click();

      await waitTableIsLoaded();

      const rows = await getRows();
      expect(rows.length).to.be(10);
      expect(rows[0].status).to.be('open');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:26.974Z');
      expect(rows[0].duration).to.be('0');
      expect(rows[0].reason).to.be(
        'CPU usage is greater than a threshold of 40 (current value is 45.2%) for gke-edge-oblt-default-pool-350b44de-c3dd'
      );
    });

    it('should paginate properly', async () => {
      await testSubjects.click('pagination-button-1');

      await waitTableIsLoaded();

      const rows = await getRows();
      expect(rows.length).to.be(10);
      expect(rows[0].status).to.be('active');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:26.974Z');
      expect(rows[0].duration).to.be('63291000');
      expect(rows[0].reason).to.be(
        'CPU usage is greater than a threshold of 40 (current value is 40.8%) for gke-edge-oblt-default-pool-350b44de-3v4p'
      );
    });

    it('should open a flyout and paginate through the flyout', async () => {
      await testSubjects.click('expandColumnCellOpenFlyoutButton-0');
      await waitFlyoutOpen();
      await waitFlyoutIsLoaded();

      expect(await testSubjects.getVisibleText('alertsFlyoutName')).to.be(
        'APM Failed Transaction Rate (one)'
      );
      expect(await testSubjects.getVisibleText('alertsFlyoutReason')).to.be(
        'Failed transactions rate is greater than 5.0% (current value is 31%) for elastic-co-frontend'
      );

      await testSubjects.click('alertsFlyoutPagination > pagination-button-next');

      expect(await testSubjects.getVisibleText('alertsFlyoutName')).to.be(
        'APM Failed Transaction Rate (one)'
      );
      expect(await testSubjects.getVisibleText('alertsFlyoutReason')).to.be(
        'Failed transactions rate is greater than 5.0% (current value is 35%) for opbeans-python'
      );

      await testSubjects.click('alertsFlyoutPagination > pagination-button-previous');

      await waitTableIsLoaded();

      const rows = await getRows();
      expect(rows[0].status).to.be('active');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:38.749Z');
      expect(rows[0].duration).to.be('1197194000');
      expect(rows[0].reason).to.be(
        'Failed transactions rate is greater than 5.0% (current value is 31%) for elastic-co-frontend'
      );
    });

    async function waitTableIsLoaded() {
      return await retry.try(async () => {
        const exists = await testSubjects.exists('internalAlertsPageLoading');
        if (exists) throw new Error('Still loading...');
      });
    }

    async function waitFlyoutOpen() {
      return await retry.try(async () => {
        const exists = await testSubjects.exists('alertsFlyout');
        if (!exists) throw new Error('Still loading...');
      });
    }

    async function waitFlyoutIsLoaded() {
      return await retry.try(async () => {
        const exists = await testSubjects.exists('alertsFlyoutLoading');
        if (exists) throw new Error('Still loading...');
      });
    }

    async function getRows() {
      const euiDataGridRows = await find.allByCssSelector('.euiDataGridRow');
      const rows = [];
      for (const euiDataGridRow of euiDataGridRows) {
        const $ = await euiDataGridRow.parseDomContent();
        rows.push({
          status: $.findTestSubjects('dataGridRowCell')
            .find('[data-gridcell-column-id="event.action"] .euiDataGridRowCell__truncate')
            .text(),
          lastUpdated: $.findTestSubjects('dataGridRowCell')
            .find('[data-gridcell-column-id="@timestamp"] .euiDataGridRowCell__truncate')
            .text(),
          duration: $.findTestSubjects('dataGridRowCell')
            .find(
              '[data-gridcell-column-id="kibana.alert.duration.us"] .euiDataGridRowCell__truncate'
            )
            .text(),
          reason: $.findTestSubjects('dataGridRowCell')
            .find('[data-gridcell-column-id="kibana.alert.reason"] .euiDataGridRowCell__truncate')
            .text(),
        });
      }
      return rows;
    }
  });

  const waitAndClickByTestId = async (testId: string) => {
    retry.try(async () => {
      const exists = await testSubjects.exists(testId);
      if (!exists) throw new Error('Still loading...');
    });

    return find.clickDisplayedByCssSelector(`[data-test-subj="${testId}"]`);
  };
}
