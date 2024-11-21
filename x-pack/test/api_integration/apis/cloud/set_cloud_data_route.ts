/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('POST /internal/cloud/solution', () => {
    it('set solution data', async () => {
      await supertest
        .post('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .send({
          onboardingData: {
            solutionType: 'search',
            token: 'connectors',
          },
        })
        .expect(200);

      const {
        body: { onboardingData },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);

      expect(onboardingData).to.eql({ solutionType: 'search', token: 'connectors' });
    });
  });
}
