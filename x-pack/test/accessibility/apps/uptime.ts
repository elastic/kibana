/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { FtrProviderContext } from '../ftr_provider_context';
import { makeChecks } from '../../api_integration/apis/uptime/rest/helper/make_checks';

const A11Y_TEST_MONITOR_ID = 'a11yTestMonitor';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { uptime } = getPageObjects(['common', 'uptime']);
  const a11y = getService('a11y');
  const uptimeService = getService('uptime');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('uptime', () => {
    before(async () => {
      await esArchiver.load('uptime/blank');
      await makeChecks(es, A11Y_TEST_MONITOR_ID, 150, 1, 1000, {
        tls: {
          certificate_not_valid_after: moment().add(30, 'days').toISOString(),
          certificate_not_valid_before: moment().subtract(90, 'days').toISOString(),
          server: {
            x509: {
              subject: {
                common_name: 'a11y_common_name',
              },
              issuer: {
                common_name: 'a11y_issuer_name',
              },
            },
          },
        },
      });
    });

    beforeEach(async () => {
      await uptime.goToRoot();
    });

    after(async () => {
      await esArchiver.unload('uptime/blank');
    });

    it('overview page', async () => {
      await a11y.testAppSnapshot();
    });

    it('overview page with expanded monitor detail', async () => {
      await uptimeService.overview.expandMonitorDetail(A11Y_TEST_MONITOR_ID);
      await uptimeService.overview.openIntegrationsPopoverForMonitor(A11Y_TEST_MONITOR_ID);
      await a11y.testAppSnapshot();
    });

    it('overview alert popover controls', async () => {
      await uptimeService.overview.openAlertsPopover();
      await a11y.testAppSnapshot();
      await uptimeService.overview.navigateToNestedPopover();
      await a11y.testAppSnapshot();
    });

    it('detail page', async () => {
      await uptimeService.navigation.goToMonitor(A11Y_TEST_MONITOR_ID);
      await uptimeService.monitor.displayOverallAvailability('0.00 %');
      await a11y.testAppSnapshot();
    });

    it('settings page', async () => {
      await uptimeService.navigation.goToSettings();
      await a11y.testAppSnapshot();
    });

    it('certificates page', async () => {
      await uptimeService.navigation.goToCertificates();
      await a11y.testAppSnapshot();
    });
  });
}
