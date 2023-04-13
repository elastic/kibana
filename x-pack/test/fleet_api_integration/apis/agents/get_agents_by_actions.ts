/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('fleet_get_agents_by_actions', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await es.create({
        index: '.fleet-actions',
        refresh: 'wait_for',
        id: uuidv4(),
        body: {
          '@timestamp': new Date().toISOString(),
          expiration: new Date().toISOString(),
          agents: ['agent1', 'agent2'],
          action_id: 'action000001',
          data: {},
          type: 'UPGRADE',
        },
      });

      await es.create({
        index: '.fleet-actions',
        refresh: 'wait_for',
        id: uuidv4(),
        body: {
          '@timestamp': new Date().toISOString(),
          expiration: new Date().toISOString(),
          agents: ['agent3', 'agent4', 'agent5'],
          action_id: 'action000002',
          data: {},
          type: 'UNENROLL',
        },
      });

      await es.create({
        index: '.fleet-actions',
        refresh: 'wait_for',
        id: uuidv4(),
        body: {
          '@timestamp': new Date().toISOString(),
          expiration: new Date().toISOString(),
          action_id: 'action000003',
          data: {},
          type: 'UNENROLL',
        },
      });
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('POST /agents/', () => {
      it('should return a list of agents corresponding to the payload action_ids', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000001', 'action000002'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql(['agent3', 'agent4', 'agent5', 'agent1', 'agent2']);
      });

      it('should return a list of agents corresponding to the payload action_ids', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000002'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql(['agent3', 'agent4', 'agent5']);
      });

      it('should return an empty list of agents if there are not agents on the action', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['action000003'],
          })
          .expect(200);

        expect(apiResponse.items).to.eql([]);
      });

      it('should return a 404 when action_ids are empty', async () => {
        await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: [],
          })
          .expect(404);
      });

      it('should return a 404 when action_ids do not exist', async () => {
        await supertest
          .post(`/api/fleet/agents`)
          .set('kbn-xsrf', 'xx')
          .send({
            actionIds: ['non_existent_action'],
          })
          .expect(404);
      });
    });
  });
}
