/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  describe('uptime alert flyout', () => {
    const uptimeService = getService('uptime');
    const browserService = getService('browser');
    const retry = getService('retry');

    afterEach(async () => await browserService.refresh());

    it('can open status flyout', async () => {
      await retry.tryForTime(15000, async () => {
        await uptimeService.navigation.goToUptime();
        await uptimeService.alerts.openFlyout('monitorStatus');
        await uptimeService.alerts.assertMonitorStatusFlyoutSearchBarExists();
      });
    });

    it('can open tls flyout', async () => {
      await retry.tryForTime(15000, async () => {
        await uptimeService.navigation.goToUptime();
        await uptimeService.alerts.openFlyout('tls');
        await Promise.all([
          uptimeService.alerts.assertTlsFieldExists('expiration'),
          uptimeService.alerts.assertTlsFieldExists('age'),
        ]);
      });
    });
  });
};
