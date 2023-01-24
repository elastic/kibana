/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesTestResourcesServiceProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

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
  };
}
