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

  describe('Observability overview >', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const retry = getService('retry');

    describe('Without data', function () {
      it('navigate and open alerts section', async () => {
        await observability.overview.common.navigateToOverviewPageWithoutAlerts();
        await observability.overview.common.waitForOverviewNoDataPrompt();
      });
    });

    describe('With data', function () {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

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
