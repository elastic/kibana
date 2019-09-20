/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_enrollment_rules', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return enrollment rules for a policy', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/policy/policy:1/enrollment-rules`)
        .expect(200);

      expect(apiResponse.success).to.be(true);
      expect(apiResponse.total).to.be(1);
      expect(apiResponse.list.length).to.be(1);
    });

    it('should add enrollment rules for a policy', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/policy/policy:1/enrollment-rules`)
        .set('kbn-xsrf', 'xxx')
        .send({
          types: ['PERMANENT'],
        })
        .expect(200);
      expect(apiResponse.success).to.be(true);
      expect(apiResponse.item).to.have.key(['id', 'created_at', 'types']);
    });

    it('should delete an enrollment rules for a policy', async () => {
      const { body: apiResponse } = await supertest
        .delete(`/api/policy/policy:1/enrollment-rules/rule:1`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(apiResponse.success).to.be(true);
    });
  });
}
