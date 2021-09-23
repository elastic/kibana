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
      });

      after(async () => {
        await observability.alerts.common.setWorkflowStatusFilter('open');
      });

      it('Does not render page size selector', async () => {
        await observability.alerts.pagination.missingPageSizeSelectorOrFail();
      });

      it('Does not render pagination controls', async () => {
        await observability.alerts.pagination.missingPrevPageButtonOrFail();
      });
    });

    describe(`When more than ${ROWS_COUNT_TO_HIDE_PAGE_SELECTOR} alerts are visible in the screen`, () => {
      before(async () => {
        // current archiver has 12 open alerts
        await observability.alerts.common.setWorkflowStatusFilter('open');
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
            expect(tableRows.length).to.not.be.greaterThan(10);
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
          await observability.alerts.pagination.goToFirstPage();
        });

        it('Renders previous page button', async () => {
          await observability.alerts.pagination.getPrevPageButtonOrFail();
        });

        it('Renders next page button', async () => {
          await observability.alerts.pagination.getNextPageButtonOrFail();
        });

        it('Previous page button is disabled', async () => {
          const prevButtonDisabledValue =
            await observability.alerts.pagination.getPrevButtonDisabledValue();
          expect(prevButtonDisabledValue).to.be('true');
        });

        it('Next page button works', async () => {
          await observability.alerts.pagination.goToNextPage();
          const tableRows = await observability.alerts.common.getTableCellsInRows();
          expect(tableRows.length).to.be(2);
        });

        it('Previous page button works', async () => {
          await (await observability.alerts.pagination.getPaginationButtonTwo()).click();
          await observability.alerts.pagination.goToPrevPage();
          const tableRows = await observability.alerts.common.getTableCellsInRows();

          expect(tableRows.length).to.be(10);
        });

        it('Next page button is disabled', async () => {
          await (await observability.alerts.pagination.getPaginationButtonTwo()).click();
          const nextButtonDisabledValue =
            await observability.alerts.pagination.getPrevButtonDisabledValue();
          expect(nextButtonDisabledValue).to.be('true');
        });
      });
    });
  });
};
