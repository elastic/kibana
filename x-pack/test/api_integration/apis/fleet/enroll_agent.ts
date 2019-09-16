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
      await esArchiver.load('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should allow to enroll an agent', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'kbn-fleet-enrollment-token',
          // Token without expiration for test purpose
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiRU5ST0xNRU5UX1RPS0VOIiwicG9saWN5Ijp7ImlkIjoicG9saWN5OjEiLCJzaGFyZWRJZCI6InBvbGljeToxIn0sImlhdCI6MTU2ODY2MjMwOH0.KZ-LswnY7YXThEo9NRXP4QmJw-txg-dBXFhRKtwbs4s'
        )
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {},
            userProvided: {},
          },
        })
        .expect(200);
      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.item).to.have.keys(
        'id',
        'active',
        'access_token',
        'type',
        'policy_id',
        'policy_shared_id'
      );
    });
  });
}
