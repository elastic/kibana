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

  describe('fleet_list_agent', () => {
    before(async () => {
      await esArchiver.load('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return the list of agents', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);
      expect(apiResponse).to.have.keys('success', 'page', 'total', 'list');
      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.total).to.eql(4);
    });
  });
}
