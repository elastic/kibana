/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const notifyUsage = async (featureName: string, usedAt: number) => {
    await supertest.get(`/api/feature_usage_test/hit?featureName=${featureName}&usedAt=${usedAt}`);
  };

  const toISO = (time: number) => new Date(time).toISOString();

  describe('/api/licensing/feature_usage', () => {
    it('returns a map of last feature usages', async () => {
      const timeA = Date.now();
      await notifyUsage('Test feature C', timeA);

      const timeB = Date.now() - 4567;
      await notifyUsage('Test feature B', timeB);

      const response = await supertest.get('/api/licensing/feature_usage').expect(200);

      const testFeaturesResponse = {
        ...response.body,
        features: response.body.features.filter((feature: { name: string }) =>
          feature.name.startsWith('Test feature ')
        ),
      };

      expect(testFeaturesResponse).to.eql({
        features: [
          {
            last_used: null,
            license_level: 'basic',
            name: 'Test feature A',
          },
          {
            last_used: toISO(timeB),
            license_level: 'gold',
            name: 'Test feature B',
          },
          {
            last_used: toISO(timeA),
            license_level: 'platinum',
            name: 'Test feature C',
          },
        ],
      });
    });
  });
}
