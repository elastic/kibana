/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);

  describe('Reporting Download CSV', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('reporting/ecommerce');
      await esArchiver.loadIfNeeded('reporting/ecommerce_kibana');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
    });

    it('Downloads a CSV export of a saved search panel', async function() {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
      await PageObjects.reporting.verifyDownloadCSVButton('embeddablePanelHeading-EcommerceData');
    });
  });
}
