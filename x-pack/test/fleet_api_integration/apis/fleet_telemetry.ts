/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, generateAgent } from '../helpers';
import { setupFleetAndAgents } from './agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  let agentCount = 0;

  describe('fleet_telemetry', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    setupFleetAndAgents(providerContext);

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    before(async () => {
      // create agent policies
      let { body: apiResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'Fleet Server policy 1',
          namespace: 'default',
          has_fleet_server: true,
        })
        .expect(200);
      const fleetServerPolicy = apiResponse.item;

      ({ body: apiResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'Agent policy 1',
          namespace: 'default',
        })
        .expect(200));

      const agentPolicy = apiResponse.item;

      if (!fleetServerPolicy) {
        throw new Error('No Fleet server policy');
      }

      if (!agentPolicy) {
        throw new Error('No agent policy');
      }

      await supertest
        .put(`/api/fleet/settings`)
        .set('kbn-xsrf', 'xxxx')
        .send({ fleet_server_hosts: ['https://test1.fr', 'https://test2.fr'] })
        .expect(200);

      // Default Fleet Server
      await generateAgent(
        providerContext,
        'healthy',
        `agent-${++agentCount}`,
        fleetServerPolicy.id
      );
      await generateAgent(
        providerContext,
        'healthy',
        `agent-${++agentCount}`,
        fleetServerPolicy.id
      );
      await generateAgent(providerContext, 'error', `agent-${++agentCount}`, fleetServerPolicy.id);

      // Default policy
      await generateAgent(providerContext, 'healthy', `agent-${++agentCount}`, agentPolicy.id);
      await generateAgent(providerContext, 'offline', `agent-${++agentCount}`, agentPolicy.id);
      await generateAgent(providerContext, 'error', `agent-${++agentCount}`, agentPolicy.id);
      await generateAgent(providerContext, 'degraded', `agent-${++agentCount}`, agentPolicy.i);
      await generateAgent(
        providerContext,
        'error-unenrolling',
        `agent-${++agentCount}`,
        agentPolicy.id
      );
    });

    it('should return the correct telemetry values for fleet', async () => {
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/api/telemetry/v2/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      expect(apiResponse.stack_stats.kibana.plugins.fleet.agents).eql({
        total_enrolled: 8,
        healthy: 3,
        unhealthy: 3,
        offline: 1,
        updating: 1,
        total_all_statuses: 8,
      });

      expect(apiResponse.stack_stats.kibana.plugins.fleet.fleet_server).eql({
        total_all_statuses: 3,
        total_enrolled: 3,
        healthy: 2,
        unhealthy: 1,
        offline: 0,
        updating: 0,
        num_host_urls: 2,
      });
    });
  });
}
