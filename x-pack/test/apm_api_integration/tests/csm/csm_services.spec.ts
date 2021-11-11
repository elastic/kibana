/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('CSM Services without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get('/internal/apm/ux/services').query({
        start: '2020-06-28T10:24:46.055Z',
        end: '2020-07-29T10:24:46.055Z',
        uiFilters: '{"agentName":["js-base","rum-js"]}',
      });

      expect(response.status).to.be(200);
      expect(response.body.rumServices).to.eql([]);
    });
  });

  registry.when(
    'CSM services with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns rum services list', async () => {
        const response = await supertest.get('/internal/apm/ux/services').query({
          start: '2020-06-28T10:24:46.055Z',
          end: '2020-07-29T10:24:46.055Z',
          uiFilters: '{"agentName":["js-base","rum-js"]}',
        });

        expect(response.status).to.be(200);

        expectSnapshot(response.body.rumServices).toMatchInline(`Array []`);
      });
    }
  );
}
