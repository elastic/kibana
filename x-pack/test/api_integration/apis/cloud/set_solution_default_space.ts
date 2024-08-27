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

  describe('GET /internal/cloud/solution', () => {
    it('set solution for default space', async () => {
      await supertest
        .post('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .send({
          type: 'oblt',
        })
        .expect(200);

      const { body: defaultSpace } = await supertest
        .get('default/api/spaces/space/default')
        .set('kbn-xsrf', 'xxx');

      expect(defaultSpace.solution).to.eql('oblt');
    });
  });
}
