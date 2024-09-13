/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export const ECOMMERCE_INDEX_PATTERN = 'kibana_sample_data_ecommerce';
export const FLIGHTS_INDEX_PATTERN = 'kibana_sample_data_flights';
export const LOGS_INDEX_PATTERN = 'kibana_sample_data_logs';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const ml = getService('ml');
  const sampleData = getService('sampleData');
  const svlCommonApi = getService('svlCommonApi');

  describe('response ops docs', function () {
    this.tags(['responseOps']);

    before(async () => {
      await sampleData.testResources.installAllKibanaSampleData(
        svlCommonApi.getInternalRequestHeader()
      );
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.testResources.disableKibanaAnnouncements();
      await browser.setWindowSize(1920, 1080);
    });

    after(async () => {
      await sampleData.testResources.removeAllKibanaSampleData(
        svlCommonApi.getInternalRequestHeader()
      );
      await ml.testResources.resetKibanaTimeZone();
      await ml.testResources.resetKibanaAnnouncements();
    });

    loadTestFile(require.resolve('./stack_connectors'));
  });
}
