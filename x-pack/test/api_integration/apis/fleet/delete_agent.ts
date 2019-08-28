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

  describe('fleet_delete_agent', () => {
    before(async () => {
      await esArchiver.load('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 404 if there is no agent to delete', async () => {
      await supertest
        .delete(`/api/fleet/agents/i-do-not-exist`)
        .set('kbn-xsrf', 'xx')
        .expect(404);
    });

    it('should return a 200 after deleting an agent', async () => {
      const { body: apiResponse } = await supertest
        .delete(`/api/fleet/agents/agent1`)
        .set('kbn-xsrf', 'xx')
        .expect(200);
      expect(apiResponse).to.eql({
        success: true,
        action: 'deleted',
      });
    });
  });
}
