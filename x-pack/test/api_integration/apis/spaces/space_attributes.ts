/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('space attributes', () => {
    it('should allow a space to be created with a mixed-case hex color code', async () => {
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'xxx')
        .send({
          id: 'api-test-space',
          name: 'api test space',
          disabledFeatures: [],
          color: '#aaBB78',
        })
        .expect(200, {
          id: 'api-test-space',
          name: 'api test space',
          disabledFeatures: [],
          color: '#aaBB78',
        });
    });
  });
}
