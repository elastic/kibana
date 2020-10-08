/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function indexTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('index action', () => {
    it('should return 200 when creating an index action', async () => {
      // create action with no config
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          actionTypeId: '.index',
          config: {
            index: 'foo',
          },
          secrets: {},
        })
        .expect(200);
    });
  });
}
