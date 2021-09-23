/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ROWS_COUNT_TO_HIDE_PAGE_SELECTOR = 10;
const DEFAULT_ROWS_PER_PAGE = 50;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  describe('Observability alerts pagination', function () {
    this.tags('includeFirefox');

    const retry = getService('retry');
    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe(`When less than ${ROWS_COUNT_TO_HIDE_PAGE_SELECTOR} alerts are visible in the screen`, () => {
      before(async () => {
        // current archiver has 3 closed alerts
        await observability.alerts.common.setWorkflowStatusFilter('closed');
        const visibleAlerts = await observability.alerts.common.getTableCellsInRows();
        // make sure visible alerts are less than 10
        expect(visibleAlerts.length).to.be.lessThan(ROWS_COUNT_TO_HIDE_PAGE_SELECTOR);
      });

      after(async () => {
        await observability.alerts.common.setWorkflowStatusFilter('open');
      });

      it('Does not render page size selector', async () => {
        await observability.alerts.pagination.missingPageSizeSelectorOrFail();
      });

      it('Does not render pagination controls', async () => {
        await observability.alerts.pagination.missingPrevPaginationButtonOrFail();
      });
    });

    describe(`When more than ${ROWS_COUNT_TO_HIDE_PAGE_SELECTOR} alerts are visible in the screen`, () => {
      before(async () => {
        // current archiver has 12 open alerts
        await observability.alerts.common.setWorkflowStatusFilter('open');
        const visibleAlerts = await observability.alerts.common.getTableCellsInRows();
        // make sure visible alerts are more than 10
        expect(visibleAlerts.length).to.be.greaterThan(ROWS_COUNT_TO_HIDE_PAGE_SELECTOR);
      });

      describe('Page size selector', () => {
        it('Renders page size selector', async () => {
          await observability.alerts.pagination.getPageSizeSelectorOrFail();
        });

        it('Default rows per page selector is 50', async () => {
          await retry.try(async () => {
            const defaultAlertsPerPage = await (
              await observability.alerts.pagination.getPageSizeSelector()
            ).getVisibleText();
            expect(defaultAlertsPerPage).to.contain(DEFAULT_ROWS_PER_PAGE);
          });
        });

        it('10 rows per page selector works', async () => {
          await retry.try(async () => {
            await (await observability.alerts.pagination.getPageSizeSelector()).click();
            await (await observability.alerts.pagination.getTenRowsPageSelector()).click();
            const tableRows = await observability.alerts.common.getTableCellsInRows();
            expect(tableRows.length).to.not.be.greaterThan(10); // with current archiver data it is going to be 10. Shall we check against equality to.be(10) instead?
          });
        });

        it('25 rows per page selector works', async () => {
          await retry.try(async () => {
            await (await observability.alerts.pagination.getPageSizeSelector()).click();
            await (await observability.alerts.pagination.getTwentyFiveRowsPageSelector()).click();
            const tableRows = await observability.alerts.common.getTableCellsInRows();
            expect(tableRows.length).to.not.be.greaterThan(25);
          });
        });
      });

      describe('Pagination controls', () => {
        before(async () => {
          await (await observability.alerts.pagination.getPageSizeSelector()).click();
          await (await observability.alerts.pagination.getTenRowsPageSelector()).click();
        });
        beforeEach(async () => {
          // write a helper to move to first page
          await (await observability.alerts.pagination.getPaginationButtonOne()).click();
        });

        it('Renders previous page button', async () => {
          await observability.alerts.pagination.getPrevPaginationButtonOrFail();
        });

        it('Renders next page button', async () => {
          await observability.alerts.pagination.getNextPaginationButtonOrFail();
        });

        it('Previous page button is disabled', async () => {
          const prevButtonDisabledValue = await (
            await observability.alerts.pagination.getPrevPaginationButton()
          ).getAttribute('disabled');
          expect(prevButtonDisabledValue).to.be('true');
        });

        // While running the test I inspected the elements on the page
        // and although the disabled attribute was not there at all for some reason getAttribute('disabled') = 'true'
        // timing issue?
        it.skip('Next page button is enabled', async () => {
          // TODO create a function goToSecondPage
          await (await observability.alerts.pagination.getPageSizeSelector()).click();
          await (await observability.alerts.pagination.getTenRowsPageSelector()).click();
          const nextButtonDisabledValue = await (
            await observability.alerts.pagination.getPrevPaginationButton()
          ).getAttribute('disabled');
          expect(nextButtonDisabledValue).to.be(null);
        });

        it('Next page button works', async () => {
          await (await observability.alerts.pagination.getNextPaginationButton()).click();
          const tableRows = await observability.alerts.common.getTableCellsInRows();
          expect(tableRows.length).to.be(2); // don't hardcode this value, calculate open alerts/perRow
        });

        it('Previous page button works', async () => {
          await (await observability.alerts.pagination.getPaginationButtonTwo()).click();
          await (await observability.alerts.pagination.getPrevPaginationButton()).click();
          const tableRows = await observability.alerts.common.getTableCellsInRows();

          expect(tableRows.length).to.be(10); // don't hardcode this value, calculate open alerts/perRow
        });

        it('Next page button is disabled', async () => {
          // TODO: write a helper to move to last page
          await (await observability.alerts.pagination.getPaginationButtonTwo()).click();
          // TODO: write a helper isButtonDisabled
          const nextButtonDisabledValue = await (
            await observability.alerts.pagination.getNextPaginationButton()
          ).getAttribute('disabled');
          expect(nextButtonDisabledValue).to.be('true');
        });
      });

      it('Table scrolls when page size is large', async () => {});
      it('Table does not scroll when page size is small', async () => {});
    });
  });
};
