/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
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

    it('should load the table', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'triggersActions',
        '/_internal/alerts'
      );
      const headingText = await PageObjects.triggersActionsUI.getSectionHeadingText();
      expect(headingText).to.be('Rules and Connectors');

      await waitTableIsLoaded();

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
      expect(rows.length).to.be(10);
      expect(rows[0].status).to.be('active');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:38.749Z');
      expect(rows[0].duration).to.be('1197194000');
      expect(rows[0].reason).to.be(
        'Failed transactions rate is greater than 5.0% (current value is 31%) for elastic-co-frontend'
      );
    });

    it('should sort properly', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'triggersActions',
        '/_internal/alerts'
      );
      const headingText = await PageObjects.triggersActionsUI.getSectionHeadingText();
      expect(headingText).to.be('Rules and Connectors');

      await waitTableIsLoaded();

      await find.clickDisplayedByCssSelector(
        '[data-test-subj="dataGridHeaderCell-event.action"] .euiDataGridHeaderCell__button'
      );

      const popoverButtons = await testSubjects.find('dataGridHeaderCellActionGroup-event.action');
      await (await popoverButtons.findAllByCssSelector('.euiListGroupItem__button'))[2].click();

      await waitTableIsLoaded();

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
      expect(rows.length).to.be(10);
      expect(rows[0].status).to.be('open');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:26.974Z');
      expect(rows[0].duration).to.be('0');
      expect(rows[0].reason).to.be(
        'CPU usage is greater than a threshold of 40 (current value is 45.2%) for gke-edge-oblt-default-pool-350b44de-c3dd'
      );
    });

    it('should paginate properly', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'triggersActions',
        '/_internal/alerts'
      );
      const headingText = await PageObjects.triggersActionsUI.getSectionHeadingText();
      expect(headingText).to.be('Rules and Connectors');

      await waitTableIsLoaded();

      await testSubjects.click('pagination-button-1');

      await waitTableIsLoaded();

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
      expect(rows.length).to.be(10);
      expect(rows[0].status).to.be('active');
      expect(rows[0].lastUpdated).to.be('2021-10-19T15:20:26.974Z');
      expect(rows[0].duration).to.be('63291000');
      expect(rows[0].reason).to.be(
        'CPU usage is greater than a threshold of 40 (current value is 40.8%) for gke-edge-oblt-default-pool-350b44de-3v4p'
      );
    });

    async function waitTableIsLoaded() {
      return await retry.try(async () => {
        const exists = await testSubjects.exists('internalAlertsPageLoading');
        if (exists) throw new Error('Still loading...');
      });
    }
  });
};
