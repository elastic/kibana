/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  describe('Fleet setup', async () => {
    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });

    it('should have installed placeholder indices', async function () {
      const resLogsIndexPatternPlaceholder = await es.transport.request({
        method: 'GET',
        path: `/logs-index_pattern_placeholder`,
      });
      expect(resLogsIndexPatternPlaceholder.statusCode).equal(200);
      const resMetricsIndexPatternPlaceholder = await es.transport.request({
        method: 'GET',
        path: `/metrics-index_pattern_placeholder`,
      });
      expect(resMetricsIndexPatternPlaceholder.statusCode).equal(200);
    });
  });
}
