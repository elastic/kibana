/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const OPEN_ALERTS_ROWS_COUNT = 12;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  describe('alert workflow status', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const retry = getService('retry');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('is filtered to only show "open" alerts by default', async () => {
      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(OPEN_ALERTS_ROWS_COUNT);
      });
    });

    it('can be set to "acknowledged" using the row menu', async () => {
      await observability.alerts.common.setWorkflowStatusForRow(0, 'acknowledged');

      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(11);
      });
    });

    it('can be filtered to only show "acknowledged" alerts using the filter button', async () => {
      await observability.alerts.common.setWorkflowStatusFilter('acknowledged');

      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(3);
      });
    });

    it('can be set to "closed" using the row menu', async () => {
      await observability.alerts.common.setWorkflowStatusForRow(0, 'closed');

      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(2);
      });
    });

    it('can be filtered to only show "closed" alerts using the filter button', async () => {
      await observability.alerts.common.setWorkflowStatusFilter('closed');

      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(4);
      });
    });

    it('can be set to "open" using the row menu', async () => {
      await observability.alerts.common.setWorkflowStatusForRow(0, 'open');

      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(3);
      });
    });

    it('can be filtered to only show "open" alerts using the filter button', async () => {
      await observability.alerts.common.setWorkflowStatusFilter('open');

      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(12);
      });
    });
  });
};
