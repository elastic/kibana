/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from '../agents/services';
import { skipIfNoDockerRegistry } from '../../helpers';

const TEST_INDEX = 'logs-log.log-test';

const FINAL_PIPELINE_ID = '.fleet_final_pipeline';

let pkgKey: string;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  function indexUsingApiKey(body: any, apiKey: string): Promise<{ body: Record<string, unknown> }> {
    const supertestWithoutAuth = getService('esSupertestWithoutAuth');
    return supertestWithoutAuth
      .post(`/${TEST_INDEX}/_doc`)
      .set('Authorization', `ApiKey ${apiKey}`)
      .send(body)
      .expect(201);
  }

  describe('fleet_final_pipeline', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    // Use the custom log package to test the fleet final pipeline
    before(async () => {
      const { body: getPackagesRes } = await supertest.get(
        `/api/fleet/epm/packages?experimental=true`
      );

      const logPackage = getPackagesRes.response.find((p: any) => p.name === 'log');
      if (!logPackage) {
        throw new Error('No log package');
      }

      pkgKey = `log-${logPackage.version}`;

      await supertest
        .post(`/api/fleet/epm/packages/${pkgKey}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });
    after(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${pkgKey}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    after(async () => {
      const res = await es.search({
        index: TEST_INDEX,
      });

      for (const hit of res.body.hits.hits) {
        await es.delete({
          id: hit._id,
          index: hit._index,
        });
      }
    });

    it('should correctly setup the final pipeline and apply to fleet managed index template', async () => {
      const pipelineRes = await es.ingest.getPipeline({ id: FINAL_PIPELINE_ID });
      expect(pipelineRes.body).to.have.property(FINAL_PIPELINE_ID);

      const res = await es.indices.getIndexTemplate({ name: 'logs-log.log' });
      expect(res.body.index_templates.length).to.be(1);
      expect(
        res.body.index_templates[0]?.index_template?.template?.settings?.index?.final_pipeline
      ).to.be(FINAL_PIPELINE_ID);
    });

    it('For a doc written without api key should write the correct api key status', async () => {
      const res = await es.index({
        index: 'logs-log.log-test',
        body: {
          message: 'message-test-1',
          '@timestamp': '2020-01-01T09:09:00',
          agent: {
            id: 'agent1',
          },
        },
      });

      const { body: doc } = await es.get({
        id: res.body._id,
        index: res.body._index,
      });
      // @ts-expect-error
      const event = doc._source.event;

      expect(event.agent_id_status).to.be('no_api_key');
      expect(event).to.have.property('ingested');
    });

    const scenarios = [
      {
        name: 'API key without metadata',
        expectedStatus: 'missing_metadata',
        event: { agent: { id: 'agent1' } },
      },
      {
        name: 'API key with agent id metadata',
        expectedStatus: 'verified',
        apiKey: {
          metadata: {
            agent_id: 'agent1',
          },
        },
        event: { agent: { id: 'agent1' } },
      },
      {
        name: 'API key with agent id metadata and no agent id in event',
        expectedStatus: 'missing_metadata',
        apiKey: {
          metadata: {
            agent_id: 'agent1',
          },
        },
      },
      {
        name: 'API key with agent id metadata and tampered agent id in event',
        expectedStatus: 'agent_id_mismatch',
        apiKey: {
          metadata: {
            agent_id: 'agent2',
          },
        },
        event: { agent: { id: 'agent1' } },
      },
    ];

    for (const scenario of scenarios) {
      it(`Should write the correct event.agent_id_status for ${scenario.name}`, async () => {
        // Create an API key
        const { body: apiKeyRes } = await es.security.createApiKey({
          body: {
            name: `test api key`,
            ...(scenario.apiKey || {}),
          },
        });

        const res = await indexUsingApiKey(
          {
            message: 'message-test-1',
            '@timestamp': '2020-01-01T09:09:00',
            ...(scenario.event || {}),
          },
          Buffer.from(`${apiKeyRes.id}:${apiKeyRes.api_key}`).toString('base64')
        );

        const { body: doc } = await es.get({
          id: res.body._id as string,
          index: res.body._index as string,
        });
        // @ts-expect-error
        const event = doc._source.event;

        expect(event.agent_id_status).to.be(scenario.expectedStatus);
        expect(event).to.have.property('ingested');
      });
    }
  });
}
