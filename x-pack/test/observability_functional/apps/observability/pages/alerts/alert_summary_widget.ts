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

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  describe('Alert summary widget >', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    it('shows number of total and active alerts', async () => {
      await observability.components.alertSummaryWidget.getFullSizeComponentSelectorOrFail();

      const activeAlertCount =
        await observability.components.alertSummaryWidget.getActiveAlertCount();
      const totalAlertCount =
        await observability.components.alertSummaryWidget.getTotalAlertCount();

      expect(activeAlertCount).to.be(`${ACTIVE_ALERTS} `);
      expect(totalAlertCount).to.be(`${ALL_ALERTS}`);
    });
  });
};
