/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const ALL_ALERTS = 10;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  describe('Observability overview', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const retry = getService('retry');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('Without alerts', function () {
      it('navigate and open alerts section', async () => {
        await observability.overview.common.navigateToOverviewPage();
        await observability.overview.common.openAlertsSectionAndWaitToAppear();
      });

      it('should show no data message', async () => {
        await retry.try(async () => {
          await observability.overview.common.getAlertsTableNoDataOrFail();
        });
      });
    });

    describe('With alerts', function () {
      it('navigate and open alerts section', async () => {
        await observability.overview.common.navigateToOverviewPageWithAlerts();
        await observability.overview.common.openAlertsSectionAndWaitToAppear();
      });

      it('should show alerts correctly', async () => {
        await retry.try(async () => {
          const tableRows = await observability.alerts.common.getTableCellsInRows();
          expect(tableRows.length).to.be(ALL_ALERTS);
        });
      });
    });
  });
};
