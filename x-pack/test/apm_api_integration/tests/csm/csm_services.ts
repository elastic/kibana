/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('CSM Services without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get(
        '/api/apm/rum-client/services?start=2020-06-28T10%3A24%3A46.055Z&end=2020-07-29T10%3A24%3A46.055Z&uiFilters=%7B%22agentName%22%3A%5B%22js-base%22%2C%22rum-js%22%5D%7D'
      );

      expect(response.status).to.be(200);
      expect(response.body.rumServices).to.eql([]);
    });
  });

  registry.when(
    'CSM services with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns rum services list', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/services?start=2020-06-28T10%3A24%3A46.055Z&end=2020-07-29T10%3A24%3A46.055Z&uiFilters=%7B%22agentName%22%3A%5B%22js-base%22%2C%22rum-js%22%5D%7D'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body.rumServices).toMatchInline(`Array []`);
      });
    }
  );
}
