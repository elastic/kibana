/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_request_diagnostics', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    async function verifyActionResult(agentCount: number) {
      const { body } = await supertest
        .get(`/api/fleet/agents/action_status`)
        .set('kbn-xsrf', 'xxx');
      const actionStatus = body.items[0];

      expect(actionStatus.nbAgentsActionCreated).to.eql(agentCount);
      expect(
        moment(actionStatus.expiration).diff(moment(actionStatus.creationTime), 'minutes') > 170 &&
          moment(actionStatus.expiration).diff(moment(actionStatus.creationTime), 'minutes') < 190
      ).to.eql(true);
    }

    it('should respond 403 if user lacks fleet read permissions', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/agents/agent1/request_diagnostics`)
        .set('kbn-xsrf', 'xxx')
        .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
        .expect(403);
    });

    it('/agents/{agent_id}/request_diagnostics should work', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/agents/agent1/request_diagnostics`)
        .set('kbn-xsrf', 'xxx')
        .auth(testUsers.fleet_agents_read_only.username, testUsers.fleet_agents_read_only.password)
        .expect(200);

      await verifyActionResult(1);
    });

    it('/agents/bulk_request_diagnostics should work for multiple agents by id', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/agents/bulk_request_diagnostics`)
        .set('kbn-xsrf', 'xxx')
        .auth(testUsers.fleet_agents_read_only.username, testUsers.fleet_agents_read_only.password)
        .send({
          agents: ['agent2', 'agent3'],
        });

      await verifyActionResult(2);
    });

    it('/agents/bulk_request_diagnostics should work for multiple agents by kuery', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/agents/bulk_request_diagnostics`)
        .set('kbn-xsrf', 'xxx')
        .auth(testUsers.fleet_agents_read_only.username, testUsers.fleet_agents_read_only.password)
        .send({
          agents: '',
        })
        .expect(200);

      await verifyActionResult(4);
    });

    it('/agents/bulk_request_diagnostics should work for multiple agents by kuery in batches async', async () => {
      const { body } = await supertestWithoutAuth
        .post(`/api/fleet/agents/bulk_request_diagnostics`)
        .auth(testUsers.fleet_agents_read_only.username, testUsers.fleet_agents_read_only.password)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: '',
          batchSize: 2,
        })
        .expect(200);

      const actionId = body.actionId;

      await new Promise((resolve, reject) => {
        let attempts = 0;
        const intervalId = setInterval(async () => {
          if (attempts > 5) {
            clearInterval(intervalId);
            reject(new Error('action timed out'));
          }
          ++attempts;
          const {
            body: { items: actionStatuses },
          } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

          const action = actionStatuses?.find((a: any) => a.actionId === actionId);
          if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
            clearInterval(intervalId);
            resolve({});
          }
        }, 3000);
      }).catch((e) => {
        throw e;
      });
    });

    it('should create action with additional_metrics when api contains CPU option', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/request_diagnostics`)
        .set('kbn-xsrf', 'xxx')
        .send({
          additional_metrics: ['CPU'],
        })
        .expect(200);
      const actionsRes = await es.search({
        index: '.fleet-actions',
        body: {
          sort: [{ '@timestamp': { order: 'desc' } }],
        },
      });
      const action: any = actionsRes.hits.hits[0]._source;
      expect(action.data.additional_metrics).contain('CPU');
    });

    it('/agents/bulk_request_diagnostics should add CPU option to action doc', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/agents/bulk_request_diagnostics`)
        .set('kbn-xsrf', 'xxx')
        .auth(testUsers.fleet_agents_read_only.username, testUsers.fleet_agents_read_only.password)
        .send({
          agents: ['agent2', 'agent3'],
          additional_metrics: ['CPU'],
        });

      const actionsRes = await es.search({
        index: '.fleet-actions',
        body: {
          sort: [{ '@timestamp': { order: 'desc' } }],
        },
      });
      const action: any = actionsRes.hits.hits[0]._source;
      expect(action.data.additional_metrics).contain('CPU');
    });
  });
}
