/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

const TEST_INDEX = 'logs-log.log-test';

const FLEET_EVENT_INGESTED_PIPELINE_ID = '.fleet_event_ingested_pipeline-1';

// TODO: Use test package or move to input package version github.com/elastic/kibana/issues/154243
const LOG_INTEGRATION_VERSION = '1.1.2';

const FLEET_EVENT_INGESTED_PIPELINE_VERSION = 1;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_event_ingested_pipeline', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
      // Use the custom log package to test the fleet final pipeline
      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages/log/${LOG_INTEGRATION_VERSION}`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/fleet/epm/packages/log/${LOG_INTEGRATION_VERSION}`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      const res = await es.search({
        index: TEST_INDEX,
      });

      for (const hit of res.hits.hits) {
        await es.delete({
          id: hit._id!,
          index: hit._index,
        });
      }
    });

    it('should correctly update the event ingested pipeline', async () => {
      await es.ingest.putPipeline({
        id: FLEET_EVENT_INGESTED_PIPELINE_ID,
        body: {
          description: 'Test PIPELINE WITHOUT version',
          processors: [
            {
              set: {
                field: 'my-keyword-field',
                value: 'foo',
              },
            },
          ],
        },
      });
      await supertestWithoutAuth
        .post(`/api/fleet/setup`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx');
      const pipelineRes = await es.ingest.getPipeline({ id: FLEET_EVENT_INGESTED_PIPELINE_ID });
      expect(pipelineRes).to.have.property(FLEET_EVENT_INGESTED_PIPELINE_ID);
      expect(pipelineRes[FLEET_EVENT_INGESTED_PIPELINE_ID].version).to.be(1);
    });

    it('should correctly setup the event ingested pipeline and apply to fleet managed index template', async () => {
      const pipelineRes = await es.ingest.getPipeline({ id: FLEET_EVENT_INGESTED_PIPELINE_ID });
      expect(pipelineRes).to.have.property(FLEET_EVENT_INGESTED_PIPELINE_ID);
      const res = await es.indices.getIndexTemplate({ name: 'logs-log.log' });
      expect(res.index_templates.length).to.be(FLEET_EVENT_INGESTED_PIPELINE_VERSION);
      expect(res.index_templates[0]?.index_template?.composed_of).to.contain('ecs@mappings');
      expect(res.index_templates[0]?.index_template?.composed_of).to.contain('.fleet_globals-1');
      expect(res.index_templates[0]?.index_template?.composed_of).to.contain(
        '.fleet_event_ingested-1'
      );
    });

    it('all docs should contain event.ingested without sub-seconds', async () => {
      const res = await es.index({
        index: 'logs-log.log-test',
        body: {
          '@timestamp': '2020-01-01T09:09:00',
          message: 'hello',
        },
      });

      const doc = await es.get({
        id: res._id,
        index: res._index,
      });
      // @ts-expect-error
      const ingestTimestamp = doc._source.event.ingested;

      // 2021-06-30T12:06:28Z
      expect(ingestTimestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    it('should remove agent_id_status', async () => {
      const res = await es.index({
        index: 'logs-log.log-test',
        body: {
          message: 'message-test-1',
          '@timestamp': '2020-01-01T09:09:00',
          agent: {
            id: 'agent1',
          },
          event: {
            agent_id_status: 'dummy',
          },
        },
      });

      const doc = await es.get({
        id: res._id,
        index: res._index,
      });
      // @ts-expect-error
      const event = doc._source.event;

      expect(event.agent_id_status).to.be(undefined);
      expect(event).to.have.property('ingested');
    });

    it('removes event.original if preserve_original_event is not set', async () => {
      const res = await es.index({
        index: 'logs-log.log-test',
        body: {
          message: 'message-test-1',
          event: {
            original: JSON.stringify({ foo: 'bar' }),
          },
          '@timestamp': '2023-01-01T09:00:00',
          tags: [],
          agent: {
            id: 'agent1',
          },
        },
      });

      const doc: any = await es.get({
        id: res._id,
        index: res._index,
      });

      const event = doc._source.event;

      expect(event.original).to.be(undefined);
    });

    it('preserves event.original if preserve_original_event is set', async () => {
      const res = await es.index({
        index: 'logs-log.log-test',
        body: {
          message: 'message-test-1',
          event: {
            original: JSON.stringify({ foo: 'bar' }),
          },
          '@timestamp': '2023-01-01T09:00:00',
          tags: ['preserve_original_event'],
          agent: {
            id: 'agent1',
          },
        },
      });

      const doc: any = await es.get({
        id: res._id,
        index: res._index,
      });

      const event = doc._source.event;

      expect(event.original).to.eql(JSON.stringify({ foo: 'bar' }));
    });
  });
}
