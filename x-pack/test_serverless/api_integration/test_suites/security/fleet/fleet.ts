/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  expectDefaultElasticsearchOutput,
  expectDefaultFleetServer,
} from '../../common/fleet/default_setup';

export default function (ctx: FtrProviderContext) {
  const svlCommonApi = ctx.getService('svlCommonApi');
  const supertestWithoutAuth = ctx.getService('supertestWithoutAuth');
  const svlUserManager = ctx.getService('svlUserManager');
  const es = ctx.getService('es');
  let roleAuthc: RoleCredentials;

  describe('fleet', function () {
    let defaultFleetServerHostUrl: string = '';
    let defaultEsOutputUrl: string = '';

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      defaultFleetServerHostUrl = await expectDefaultFleetServer(ctx);
      expect(defaultFleetServerHostUrl).not.toBe('');

      defaultEsOutputUrl = await expectDefaultElasticsearchOutput(ctx);
      expect(defaultEsOutputUrl).not.toBe('');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('rejects request to create a new fleet server hosts if host url is different from default', async () => {
      const { body, status } = await supertestWithoutAuth
        .post('/api/fleet/fleet_server_hosts')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name: 'test',
          host_urls: ['https://localhost:8221'],
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: `Fleet server host must have default URL in serverless: ${defaultFleetServerHostUrl}`,
      });
      expect(status).toBe(403);
    });

    it('accepts request to create a new fleet server hosts if host url is same as default', async () => {
      const { body, status } = await supertestWithoutAuth
        .post('/api/fleet/fleet_server_hosts')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name: 'Test Fleet server host',
          host_urls: [defaultFleetServerHostUrl],
        });

      expect(body).toEqual({
        item: expect.objectContaining({
          name: 'Test Fleet server host',
          host_urls: [defaultFleetServerHostUrl],
        }),
      });
      expect(status).toBe(200);
    });

    it('rejects request to create a new elasticsearch output if host is different from default', async () => {
      const { body, status } = await supertestWithoutAuth
        .post('/api/fleet/outputs')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name: 'Test output',
          type: 'elasticsearch',
          hosts: ['https://localhost:9201'],
        });
      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: `Elasticsearch output host must have default URL in serverless: ${defaultEsOutputUrl}`,
      });
      expect(status).toBe(400);
    });

    it('accepts request to create a new elasticsearch output if host url is same as default', async () => {
      const { body, status } = await supertestWithoutAuth
        .post('/api/fleet/outputs')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name: 'Test output',
          type: 'elasticsearch',
          hosts: [defaultEsOutputUrl],
        });

      expect(body).toEqual({
        item: expect.objectContaining({
          name: 'Test output',
          hosts: [defaultEsOutputUrl],
        }),
      });
      expect(status).toBe(200);
    });

    describe('datastreams API', () => {
      before(async () => {
        await es.index({
          refresh: 'wait_for',
          index: 'logs-nginx.access-default',
          document: {
            agent: {
              name: 'docker-fleet-agent',
              id: 'ef5e274d-4b53-45e6-943a-a5bcf1a6f523',
              ephemeral_id: '34369a4a-4f24-4a39-9758-85fc2429d7e2',
              type: 'filebeat',
              version: '8.5.0',
            },
            nginx: {
              access: {
                remote_ip_list: ['127.0.0.1'],
              },
            },
            log: {
              file: {
                path: '/tmp/service_logs/access.log',
              },
              offset: 0,
            },
            elastic_agent: {
              id: 'ef5e274d-4b53-45e6-943a-a5bcf1a6f523',
              version: '8.5.0',
              snapshot: false,
            },
            source: {
              address: '127.0.0.1',
              ip: '127.0.0.1',
            },
            url: {
              path: '/server-status',
              original: '/server-status',
            },
            tags: ['nginx-access'],
            input: {
              type: 'log',
            },
            '@timestamp': new Date().toISOString(),
            _tmp: {},
            ecs: {
              version: '8.11.0',
            },
            related: {
              ip: ['127.0.0.1'],
            },
            data_stream: {
              namespace: 'default',
              type: 'logs',
              dataset: 'nginx.access',
            },
            host: {
              hostname: 'docker-fleet-agent',
              os: {
                kernel: '5.15.49-linuxkit',
                codename: 'focal',
                name: 'Ubuntu',
                family: 'debian',
                type: 'linux',
                version: '20.04.5 LTS (Focal Fossa)',
                platform: 'ubuntu',
              },
              containerized: false,
              ip: ['172.18.0.7'],
              name: 'docker-fleet-agent',
              id: '66392b0697b84641af8006d87aeb89f1',
              mac: ['02-42-AC-12-00-07'],
              architecture: 'x86_64',
            },
            http: {
              request: {
                method: 'GET',
              },
              response: {
                status_code: 200,
                body: {
                  bytes: 97,
                },
              },
              version: '1.1',
            },
            event: {
              agent_id_status: 'verified',
              ingested: '2022-12-09T10:39:40Z',
              created: '2022-12-09T10:39:38.896Z',
              kind: 'event',
              timezone: '+00:00',
              category: ['web'],
              type: ['access'],
              dataset: 'nginx.access',
              outcome: 'success',
            },
            user_agent: {
              original: 'curl/7.64.0',
              name: 'curl',
              device: {
                name: 'Other',
              },
              version: '7.64.0',
            },
          },
        });
      });

      after(async () => {
        await es.transport.request({
          path: `/_data_stream/logs-nginx.access-default`,
          method: 'delete',
        });
      });

      it('it works', async () => {
        const { body, status } = await supertestWithoutAuth
          .get('/api/fleet/data_streams')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader);

        expect(status).toBe(200);
        expect(body.data_streams?.[0]?.index).toBe('logs-nginx.access-default');
      });
    });
  });
}
