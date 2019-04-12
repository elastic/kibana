/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Feature } from '../../../../../plugins/xpack_main/types';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('/api/features', () => {
    describe('with trial license', () => {
      it('should return a full feature set', async () => {
        const { body } = await supertest
          .get('/api/features/v1')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.be.an(Array);

        const featureIds = body.map((b: Feature) => b.id);
        expect(featureIds.sort()).to.eql(
          [
            'discover',
            'visualize',
            'dashboard',
            'dev_tools',
            'advancedSettings',
            'indexPatterns',
            'timelion',
            'graph',
            'monitoring',
            'ml',
            'apm',
            'canvas',
            'infrastructure',
            'logs',
            'maps',
            'uptime',
          ].sort()
        );
      });
    });
  });
}
