/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  const retry = getService('retry');

  describe('Observability Alert Details page - Feature flag', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    it('should redirect the user to the alerts page when the feature flag is disabled', async () => {
      await observability.alerts.common.navigateToAlertDetails(uuid.v4());
      await retry.waitFor(
        'Alerts page to be visible',
        async () => await testSubjects.exists('alertsPageWithData')
      );
    });

    it('should open the flyout instead the alert of the alerts page when clicking on "View alert details" from the... (3 dots) button when the feature flag is disabled', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await observability.alerts.common.openActionsMenuForRow(0);
      await testSubjects.click('viewAlertDetailsFlyout');
      await retry.waitFor(
        'Alert flyout to be visible',
        async () => await testSubjects.exists('alertsFlyout')
      );
    });
    /* TODO: Add more test cases regarding the feature flag for:
     - alert details URL from the Action variable
     - alert details button from the alert flyout.
    */
  });
};
