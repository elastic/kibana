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

  describe('fleet_enroll_agent', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should not allow to enroll an agent with a invalid enrollment', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-fleet-enrollment-token', 'NotavalidJSONTOKEN')
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {},
            user_provided: {},
          },
        })
        .expect(401);

      expect(apiResponse.message).to.match(/Enrollment token is not valid/);
    });

    it('should not allow to enroll an agent with a shared id if it already exists ', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'kbn-fleet-enrollment-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiRU5ST0xMTUVOVF9UT0tFTiIsInBvbGljeV9pZCI6InBvbGljeToxIiwiaWF0IjoxNTcwNzI1MDcyfQ.H41P_J2wsjfeZDOEAMYPj9TMRhCsUY3NZoLGZ9VQWpg'
        )
        .send({
          shared_id: 'agent2_filebeat',
          type: 'PERMANENT',
          metadata: {
            local: {},
            user_provided: {},
          },
        })
        .expect(400);
      expect(apiResponse.message).to.match(/Impossible to enroll an already active agent/);
    });

    it('should allow to enroll an agent with a valid enrollment token', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'kbn-fleet-enrollment-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiRU5ST0xMTUVOVF9UT0tFTiIsInBvbGljeV9pZCI6InBvbGljeToxIiwiaWF0IjoxNTcwNzI1MDcyfQ.H41P_J2wsjfeZDOEAMYPj9TMRhCsUY3NZoLGZ9VQWpg'
        )
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {},
            user_provided: {},
          },
        })
        .expect(200);
      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.item).to.have.keys('id', 'active', 'access_token', 'type', 'policy_id');
    });
  });
}
