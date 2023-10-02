/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esTestConfig } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export const ECOMMERCE_INDEX_PATTERN = 'kibana_sample_data_ecommerce';
export const FLIGHTS_INDEX_PATTERN = 'kibana_sample_data_flights';
export const LOGS_INDEX_PATTERN = 'kibana_sample_data_logs';

export default function ({ getPageObject, getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const ml = getService('ml');
  const sampleData = getService('sampleData');
  const securityPage = getPageObject('security');

  describe('response ops docs', function () {
    this.tags(['responseOps']);

    before(async () => {
      await sampleData.testResources.installAllKibanaSampleData();
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.testResources.disableKibanaAnnouncements();
      await browser.setWindowSize(1920, 1080);
      await securityPage.login(
        esTestConfig.getUrlParts().username,
        esTestConfig.getUrlParts().password
      );
    });

    after(async () => {
      await securityPage.forceLogout();
      await sampleData.testResources.removeAllKibanaSampleData();
      await ml.testResources.resetKibanaTimeZone();
      await ml.testResources.resetKibanaAnnouncements();
    });

    loadTestFile(require.resolve('./stack_alerting'));
    loadTestFile(require.resolve('./stack_cases'));
    loadTestFile(require.resolve('./stack_connectors'));
    loadTestFile(require.resolve('./maintenance_windows'));
    loadTestFile(require.resolve('./observability_alerting'));
    loadTestFile(require.resolve('./observability_cases'));
    loadTestFile(require.resolve('./security_cases'));
  });
}
