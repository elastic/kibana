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

  describe('Observability Alert Details page', function () {
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

    it('should show error when the alert does not exist', async () => {
      await observability.alerts.common.navigateToAlertDetails('deleted-alert-Id');
      await retry.waitFor(
        'Error message to be visible',
        async () => await testSubjects.exists('alertDetailsError')
      );
    });

    describe('Alert components', () => {
      before(async () => {
        await observability.alerts.common.navigateToTimeWithData();
      });

      it('should show tabbed view', async () => {
        await observability.alerts.common.navigateToAlertDetails(
          '4c87bd11-ff31-4a05-8a04-833e2da94858'
        );

        await retry.waitFor(
          'Overview tab to be visible',
          async () => await testSubjects.exists('overviewTab')
        );

        await retry.waitFor(
          'Metadata tab to be visible',
          async () => await testSubjects.exists('metadataTab')
        );
      });

      /* TODO: Add more test cases */
    });
  });
};
