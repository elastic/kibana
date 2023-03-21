/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  const retry = getService('retry');

  describe('Observability Alert Details page - Feature flag', function () {
    this.tags('includeFirefox');

    before(async () => {
      await observability.alerts.common.setKibanaTimeZoneToUTC();
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    it('should show 404 page when the feature flag is disabled but the alert exists', async () => {
      await observability.alerts.common.navigateToAlertDetails(
        '4c87bd11-ff31-4a05-8a04-833e2da94858'
      );
      await retry.waitFor(
        'The 404 - Not found page to be visible',
        async () => await testSubjects.exists('pageNotFound')
      );
    });
    // This test is will be removed after removing the feature flag.
    // FLAKY for the same reason: https://github.com/elastic/kibana/issues/133799
    describe.skip('Alert Detail / Alert Flyout', () => {
      before(async () => {
        await observability.alerts.common.navigateToTimeWithData();
      });
      it('should open the flyout instead of the alerts details page when clicking on "View alert details" from the... (3 dots) button when the feature flag is disabled', async () => {
        await observability.alerts.common.openAlertsFlyout();
        await observability.alerts.common.getAlertsFlyoutOrFail();
      });
      /* TODO: Add more test cases regarding the feature flag for:
       - alert details URL from the Action variable
       - alert details button from the alert flyout.
      */
    });
  });
};
