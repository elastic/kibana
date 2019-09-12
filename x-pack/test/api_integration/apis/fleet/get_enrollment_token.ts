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

  describe('fleet_get_tokens', () => {
    before(async () => {
      await esArchiver.load('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should allow to get an enrollment token', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/policy/policy:1/enrollment-tokens?regenerate=false`)
        .expect(200);

      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.item).to.have.keys(
        'id',
        'type',
        'token',
        'type',
        'policy_id',
        'policy_shared_id'
      );
    });

    it('should allow to regenerate an enrollment token', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/policy/policy:1/enrollment-tokens?regenerate=true`)
        .expect(200);

      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.item).to.have.keys(
        'id',
        'type',
        'token',
        'type',
        'policy_id',
        'policy_shared_id'
      );
    });
  });
}
