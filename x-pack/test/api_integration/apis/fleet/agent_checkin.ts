/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const VALID_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiQUNDRVNTX1RPS0VOIiwiYWdlbnRJZCI6ImIzNWQ2ZDIwLWQwYTAtMTFlOS1iNTkwLThiMGEzYWY4NzUwZCIsImNvbmZpZyI6eyJpZCI6ImNvbmZpZzEiLCJzaGFyZWRJZCI6ImNvbmZpZzEifSwiaWF0IjoxNTY3NzcyNDIzfQ.UQJjI9Ki6JL3iX6zMGhd-LFZynq8a6-Fti1qcq9poFQ';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_agent_checkin', () => {
    before(async () => {
      await esArchiver.load('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 401 if this a not a valid checkin access', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('kbn-fleet-access-token', 'i-am-not-a-valid-token')
        .send({
          events: [],
        })
        .expect(401);
    });

    it('should return a 400 if for a malformed request payload', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('kbn-fleet-access-token', VALID_ACCESS_TOKEN)
        .send({
          events: ['i-am-not-valid-event'],
          metadata: {},
        })
        .expect(400);
    });

    it('should return a 200 if this a valid checkin access', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('kbn-fleet-access-token', VALID_ACCESS_TOKEN)
        .send({
          events: [
            {
              type: 'STATE',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              event: { type: 'STARTING', message: 'State change: STARTING' },
            },
          ],
          local_metadata: {
            cpu: 12,
          },
        })
        .expect(200);

      expect(apiResponse.action).to.be('checkin');
      expect(apiResponse.success).to.be(true);
      expect(apiResponse.actions).to.have.length(1);
    });
  });
}
