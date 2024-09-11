/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Moment from 'moment';
import expect from '@kbn/expect';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  FILE_STORAGE_DATA_AGENT_INDEX,
  FILE_STORAGE_METADATA_AGENT_INDEX,
} from '@kbn/fleet-plugin/server/constants';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

  const cleanupFiles = async () => {
    await esClient.deleteByQuery(
      {
        index: `${AGENT_ACTIONS_INDEX},${AGENT_ACTIONS_RESULTS_INDEX}`,
        refresh: true,
        ignore_unavailable: true,
        query: {
          prefix: {
            action_id: 'fleet_uploads_test',
          },
        },
      },
      ES_INDEX_OPTIONS
    );

    await esClient.deleteByQuery(
      {
        index: `${FILE_STORAGE_DATA_AGENT_INDEX},${FILE_STORAGE_METADATA_AGENT_INDEX}`,
        refresh: true,
        ignore_unavailable: true,
        query: {
          match_all: {},
        },
      },
      ES_INDEX_OPTIONS
    );
  };

  const createUploadBundle = async (
    fileName: string,
    opts: {
      agentId: string;
      expired?: boolean;
      inProgress?: boolean;
      error?: string;
      timestamp: string;
    } = {
      agentId: 'agent1',
      expired: false,
      inProgress: false,
      timestamp: Moment(Moment.now()).toISOString(),
    }
  ) => {
    const expiration = opts.expired
      ? Moment(opts.timestamp).subtract(6, 'hour')
      : Moment(opts.timestamp).add(6, 'hour');

    await esClient.index(
      {
        index: AGENT_ACTIONS_INDEX,
        refresh: true,
        op_type: 'create',
        body: {
          type: 'REQUEST_DIAGNOSTICS',
          action_id: `fleet_uploads_test-${fileName}-action`,
          agents: [opts.agentId],
          '@timestamp': opts.timestamp,
          expiration,
        },
      },
      ES_INDEX_OPTIONS
    );

    await esClient.index(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        refresh: true,
        op_type: 'create',
        body: {
          action_id: `fleet_uploads_test-${fileName}-action`,
          agent_id: opts.agentId,
          '@timestamp': opts.timestamp,
          data: {
            upload_id: fileName,
          },
          error: opts.error,
        },
      },
      ES_INDEX_OPTIONS
    );

    if (opts.error || opts.inProgress) {
      return;
    }

    await esClient.index(
      {
        index: FILE_STORAGE_METADATA_AGENT_INDEX,
        id: fileName,
        refresh: true,
        op_type: 'create',
        body: {
          '@timestamp': opts.timestamp,
          upload_id: fileName,
          action_id: `fleet_uploads_test-${fileName}-action`,
          agent_id: opts.agentId,
          file: {
            ChunkSize: 4194304,
            extension: 'zip',
            hash: {},
            mime_type: 'application/zip',
            mode: '0644',
            name: `elastic-agent-diagnostics-file-name.zip`,
            path: `/agent/elastic-agent-diagnostics-file-name.zip`,
            size: 24917,
            Status: 'READY',
            type: 'file',
          },
        },
      },
      ES_INDEX_OPTIONS
    );

    await esClient.index(
      {
        index: FILE_STORAGE_DATA_AGENT_INDEX,
        id: `${fileName}.0`,
        op_type: 'create',
        refresh: true,
        body: {
          '@timestamp': opts.timestamp,
          last: true,
          bid: fileName,
          data: 'test',
        },
      },
      ES_INDEX_OPTIONS
    );
  };

  describe('fleet_uploads', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
      await cleanupFiles();
    });
    after(async () => {
      await Promise.all([
        esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server'),
        cleanupFiles(),
      ]);
    });

    it('should get agent uploads', async () => {
      const fileName = 'file1';
      const agentId = 'agent1';
      const timestamp = Moment().toISOString();
      await createUploadBundle(fileName, { agentId, timestamp });
      const {
        body: { items },
      } = await supertest
        .get(`/api/fleet/agents/${agentId}/uploads`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const { id, filePath, ...rest } = items[0];
      expect(filePath).to.be.a('string');
      expect(rest).to.eql({
        actionId: `fleet_uploads_test-${fileName}-action`,
        createTime: timestamp,
        name: `elastic-agent-diagnostics-file-name.zip`,
        status: 'READY',
      });
    });

    it('should get agent uploaded file', async () => {
      const fileName = 'file2';
      const agentId = 'agent2';
      const timestamp = Moment().toISOString();
      await createUploadBundle(fileName, { agentId, timestamp });
      const { header } = await supertest
        .get(`/api/fleet/agents/files/${fileName}/elastic-agent-diagnostics-somefilename.zip`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(header['content-type']).to.eql('application/octet-stream');
      expect(header['content-disposition']).to.eql(
        `attachment; filename="elastic-agent-diagnostics-somefilename.zip"`
      );
    });

    it('should return failed status with error message', async () => {
      const fileName = 'failed-file';
      const agentId = 'agent3';
      const timestamp = Moment().toISOString();
      await createUploadBundle(fileName, { agentId, error: 'rate limit exceeded', timestamp });
      const { body } = await supertest
        .get(`/api/fleet/agents/${agentId}/uploads`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const { name, ...rest } = body.items[0];
      expect(name).to.be.a('string');
      expect(rest).to.eql({
        actionId: `fleet_uploads_test-${fileName}-action`,
        createTime: timestamp,
        filePath: '',
        id: `fleet_uploads_test-${fileName}-action`,
        status: 'FAILED',
        error: 'rate limit exceeded',
      });
    });

    it('should return expired status', async () => {
      const fileName = 'expired-failed';
      const agentId = 'agent4';
      const timestamp = Moment().toISOString();
      await createUploadBundle(fileName, {
        agentId,
        expired: true,
        error: 'rate limit exceeded',
        timestamp,
      });

      const { body } = await supertest
        .get(`/api/fleet/agents/${agentId}/uploads`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const { name, ...rest } = body.items[0];
      expect(name).to.be.a('string');
      expect(rest).to.eql({
        actionId: `fleet_uploads_test-${fileName}-action`,
        createTime: timestamp,
        filePath: '',
        id: `fleet_uploads_test-${fileName}-action`,
        status: 'EXPIRED',
        error: 'rate limit exceeded',
      });
    });

    it('should return in progress status', async () => {
      const fileName = 'in-progress-file';
      const agentId = 'agent6';
      const timestamp = Moment().toISOString();
      await createUploadBundle(fileName, { agentId, inProgress: true, timestamp });
      const {
        body: { items },
      } = await supertest
        .get(`/api/fleet/agents/${agentId}/uploads`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const { id, name, ...rest } = items[0];
      expect(id).to.be.a('string');
      expect(name).to.be.a('string');
      expect(rest).to.eql({
        actionId: `fleet_uploads_test-${fileName}-action`,
        createTime: timestamp,
        filePath: '',
        status: 'IN_PROGRESS',
      });
    });

    it('should delete agent uploaded file', async () => {
      const fileName = 'to-delete-file';
      const agentId = 'agent7';
      const timestamp = Moment().toISOString();
      await createUploadBundle(fileName, { agentId, timestamp });

      const { body } = await supertest
        .delete(`/api/fleet/agents/files/${fileName}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.deleted).to.eql(true);
    });

    it('should return error if file is not found for deletion', async () => {
      const fileName = 'unknown-file';
      await supertest
        .delete(`/api/fleet/agents/files/${fileName}`)
        .set('kbn-xsrf', 'xxx')
        .expect(400);
    });
  });
}
