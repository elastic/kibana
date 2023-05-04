/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SampleDataTestResourcesServiceProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  return {
    async installKibanaSampleData(sampleDataId: 'ecommerce' | 'flights' | 'logs') {
      await supertest.post(`/api/sample_data/${sampleDataId}`).set('kbn-xsrf', 'true').expect(200);
    },

    async removeKibanaSampleData(sampleDataId: 'ecommerce' | 'flights' | 'logs') {
      await supertest
        .delete(`/api/sample_data/${sampleDataId}`)
        .set('kbn-xsrf', 'true')
        .expect(204);
    },

    async installAllKibanaSampleData() {
      await this.installKibanaSampleData('ecommerce');
      await this.installKibanaSampleData('flights');
      await this.installKibanaSampleData('logs');

      // Sample data is shifted to be relative to current time
      // This means that a static timerange will return different documents
      // Setting the time range to a window larger than the sample data set
      // ensures all documents are coverered by time query so the ES results will always be the same
      const SAMPLE_DATA_RANGE = `[
        {
          "from": "now-180d",
          "to": "now+180d",
          "display": "sample data range"
        }
      ]`;

      await kibanaServer.uiSettings.update({
        [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: SAMPLE_DATA_RANGE,
      });
    },

    async removeAllKibanaSampleData() {
      await this.removeKibanaSampleData('ecommerce');
      await this.removeKibanaSampleData('flights');
      await this.removeKibanaSampleData('logs');
    },
  };
}
