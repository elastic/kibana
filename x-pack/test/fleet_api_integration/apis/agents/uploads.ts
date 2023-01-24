/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  FILE_STORAGE_DATA_AGENT_INDEX,
  FILE_STORAGE_METADATA_AGENT_INDEX,
} from '@kbn/fleet-plugin/server/constants';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');

  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

  describe('fleet_uploads', () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    before(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();

      await esClient.create({
        index: AGENT_ACTIONS_INDEX,
        id: new Date().toISOString(),
        refresh: true,
        body: {
          type: 'REQUEST_DIAGNOSTICS',
          action_id: 'action1',
          agents: ['agent1'],
          '@timestamp': '2022-10-07T11:00:00.000Z',
        },
      });

      await esClient.create(
        {
          index: AGENT_ACTIONS_RESULTS_INDEX,
          id: new Date().toISOString(),
          refresh: true,
          body: {
            action_id: 'action1',
            agent_id: 'agent1',
            '@timestamp': '2022-10-07T12:00:00.000Z',
            data: {
              file_id: 'file1',
            },
          },
        },
        ES_INDEX_OPTIONS
      );

      await esClient.update({
        index: FILE_STORAGE_METADATA_AGENT_INDEX,
        id: 'file1',
        refresh: true,
        body: {
          doc_as_upsert: true,
          doc: {
            file: {
              ChunkSize: 4194304,
              extension: 'zip',
              hash: {},
              mime_type: 'application/zip',
              mode: '0644',
              name: 'elastic-agent-diagnostics-2022-10-07T12-00-00Z-00.zip',
              path: '/agent/elastic-agent-diagnostics-2022-10-07T12-00-00Z-00.zip',
              size: 24917,
              Status: 'READY',
              type: 'file',
            },
          },
        },
      });
    });
    after(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it('should get agent uploads', async () => {
      const { body } = await supertest
        .get(`/api/fleet/agents/agent1/uploads`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.items[0]).to.eql({
        actionId: 'action1',
        createTime: '2022-10-07T12:00:00.000Z',
        filePath:
          '/api/fleet/agents/files/file1/elastic-agent-diagnostics-2022-10-07T12-00-00Z-00.zip',
        id: 'file1',
        name: 'elastic-agent-diagnostics-2022-10-07T12-00-00Z-00.zip',
        status: 'READY',
      });
    });

    it('should get agent uploaded file', async () => {
      await esClient.update({
        index: FILE_STORAGE_DATA_AGENT_INDEX,
        id: 'file1.0',
        refresh: true,
        body: {
          doc_as_upsert: true,
          doc: {
            last: true,
            bid: 'file1',
            data: 'test',
          },
        },
      });

      const { header } = await supertest
        .get(`/api/fleet/agents/files/file1/elastic-agent-diagnostics-2022-10-07T12-00-00Z-00.zip`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(header['content-type']).to.eql('application/octet-stream');
      expect(header['content-disposition']).to.eql(
        'attachment; filename="elastic-agent-diagnostics-2022-10-07T12-00-00Z-00.zip"'
      );
    });
  });
}
