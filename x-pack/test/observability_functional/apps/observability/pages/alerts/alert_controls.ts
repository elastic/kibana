/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const ALL_ALERTS = 40;
const ACTIVE_ALERTS = 10;
const RECOVERED_ALERTS = 30;

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const { alertControls, header } = getPageObjects(['alertControls', 'header']);

  describe('Alert controls >', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const retry = getService('retry');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    it('is filtered to only show "active" alerts by default', async () => {
      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(ACTIVE_ALERTS);
      });
    });

    it('can be filtered to only show "all" when filter is cleared', async () => {
      // Clear status filter
      await alertControls.clearControlSelections('0');
      await observability.alerts.common.waitForAlertTableToLoad();
      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(ALL_ALERTS);
      });
    });

    it('can be filtered to only show "recovered" alerts using the filter button', async () => {
      await header.waitUntilLoadingHasFinished();
      await alertControls.optionsListOpenPopover('0');
      await alertControls.optionsListPopoverSelectOption('recovered');
      await alertControls.optionsListEnsurePopoverIsClosed('0');
      await retry.try(async () => {
        const tableRows = await observability.alerts.common.getTableCellsInRows();
        expect(tableRows.length).to.be(RECOVERED_ALERTS);
      });
    });
  });
};
