/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ROWS_NEEDED_FOR_PAGINATION = 10;
const DEFAULT_ROWS_PER_PAGE = 50;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  // FAILING: https://github.com/elastic/kibana/issues/113486
  describe.skip('Observability alerts pagination', function () {
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

    describe(`When less than ${ROWS_NEEDED_FOR_PAGINATION} alerts are found`, () => {
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

    describe(`When ${ROWS_NEEDED_FOR_PAGINATION} alerts are found`, () => {
      before(async () => {
        // current archiver has 12 open alerts
        await observability.alerts.common.setWorkflowStatusFilter('open');
      });

      describe('Page size selector', () => {
        it('Renders page size selector', async () => {
          await observability.alerts.pagination.getPageSizeSelectorOrFail();
        });

        it('Default rows per page is 50', async () => {
          await retry.try(async () => {
            const defaultAlertsPerPage = await (
              await observability.alerts.pagination.getPageSizeSelector()
            ).getVisibleText();
            expect(defaultAlertsPerPage).to.contain(DEFAULT_ROWS_PER_PAGE);
          });
        });

        it('Shows up to 10 rows per page', async () => {
          await retry.try(async () => {
            await (await observability.alerts.pagination.getPageSizeSelector()).click();
            await (await observability.alerts.pagination.getTenRowsPageSelector()).click();
            const tableRows = await observability.alerts.common.getTableCellsInRows();
            expect(tableRows.length).to.not.be.greaterThan(10);
          });
        });

        it('Shows up to 25 rows per page', async () => {
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

        it('Goes to next page', async () => {
          await observability.alerts.pagination.goToNextPage();
          const tableRows = await observability.alerts.common.getTableCellsInRows();
          expect(tableRows.length).to.be(2);
        });

        it('Goes to previous page', async () => {
          await (await observability.alerts.pagination.getPaginationButtonTwo()).click();
          await observability.alerts.pagination.goToPrevPage();
          const tableRows = await observability.alerts.common.getTableCellsInRows();

          expect(tableRows.length).to.be(10);
        });
      });
    });
  });
};
