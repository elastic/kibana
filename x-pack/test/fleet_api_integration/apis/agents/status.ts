/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_agents_status', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      // 2 agents online
      await es.update({
        id: 'agent1',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            last_checkin: new Date().toISOString(),
          },
        },
      });
      await es.update({
        id: 'agent2',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            last_checkin: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 2m online
          },
        },
      });
      // 1 agents offline
      await es.update({
        id: 'agent3',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            last_checkin: new Date(Date.now() - 1000 * 60 * 6).toISOString(), // 6m offline
          },
        },
      });
      // 1 agent upgrading
      await es.update({
        id: 'agent4',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            last_checkin: new Date().toISOString(),
            upgrade_started_at: new Date().toISOString(),
          },
        },
      });
      // 1 agent inactive
      await es.create({
        id: 'agent5',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            active: false,
            access_api_key_id: 'api-key-4',
            policy_id: 'policy1',
            type: 'PERMANENT',
            local_metadata: { host: { hostname: 'host5' } },
            user_provided_metadata: {},
            enrolled_at: '2022-06-21T12:17:25Z',
            last_checkin: '2022-06-27T12:29:29Z',
          },
        },
      });
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    it('should return the status of agents', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agent_status`).expect(200);

      expect(apiResponse).to.eql({
        results: {
          events: 0,
          total: 4,
          online: 2,
          error: 0,
          offline: 1,
          updating: 1,
          other: 2,
          inactive: 1,
        },
      });
    });

    it('should work with deprecated api', async () => {
      await supertest.get(`/api/fleet/agent-status`).expect(200);
    });
  });
}
