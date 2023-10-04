/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import expect from '@kbn/expect';
import type { GetAgentsResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, generateAgent } from '../helpers';
import { setupFleetAndAgents } from './agents/services';

const AGENT_COUNT_WAIT_ATTEMPTS = 3;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  let agentCount = 0;
  let pkgVersion: string;
  describe('fleet_telemetry', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    setupFleetAndAgents(providerContext);

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      if (pkgVersion) {
        await supertest.delete(`/api/fleet/epm/packages/fleet_server/${pkgVersion}`);
      }
    });

    before(async () => {
      // we must first force install the fleet_server package to override package verification error on policy create
      // https://github.com/elastic/kibana/issues/137450
      const getPkRes = await supertest
        .get(`/api/fleet/epm/packages/fleet_server`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      pkgVersion = getPkRes.body.item.version;
      await supertest
        .post(`/api/fleet/epm/packages/fleet_server/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

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
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-default-123',
          name: 'Default',
          is_default: true,
          host_urls: ['https://test.com:8080', 'https://test.com:8081'],
        })
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
      await generateAgent(providerContext, 'inactive', `agent-${++agentCount}`, agentPolicy.id);
      await generateAgent(providerContext, 'degraded', `agent-${++agentCount}`, agentPolicy.i);
      await generateAgent(
        providerContext,
        'error-unenrolling',
        `agent-${++agentCount}`,
        agentPolicy.id
      );
    });

    async function waitForAgents(
      expectedAgentCount: number,
      attempts: number,
      _attemptsMade = 0
    ): Promise<GetAgentsResponse> {
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?showInactive=true`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      if (apiResponse.list.length === expectedAgentCount) {
        return apiResponse;
      }

      if (_attemptsMade >= attempts) {
        throw new Error(
          `Agents not loaded correctly, failing test. All agents: \n: ${JSON.stringify(
            apiResponse.list,
            null,
            2
          )}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      return waitForAgents(expectedAgentCount, attempts, _attemptsMade + 1);
    }

    it('should return the correct telemetry values for fleet', async () => {
      // it appears agent 9 is not being loaded sometimes
      // first check if all the agents have been correctly loaded
      await waitForAgents(agentCount, AGENT_COUNT_WAIT_ATTEMPTS);

      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      expect(apiResponse.stack_stats.kibana.plugins.fleet.agents).eql({
        total_enrolled: 8, // does not include inactive
        healthy: 3,
        unhealthy: 3,
        offline: 1,
        unenrolled: 0,
        inactive: 1,
        updating: 1, // includes enrolling + unenrolling + updating
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
