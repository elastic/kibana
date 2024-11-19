/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';

import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers/get_proxy_server';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function torqTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');
  const retry = getService('retry');

  describe('Torq action', () => {
    let simulatedActionId = '';
    let torqSimulatorURL: string = '';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      torqSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.TORQ)
      );
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    it('Torq connector invalid token', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A Torq action',
          connector_type_id: '.torq',
          config: {
            webhookIntegrationUrl: torqSimulatorURL,
          },
          secrets: {
            token: 'invalidToken',
          },
        })
        .expect(200);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "test"}`,
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error triggering Torq workflow, unauthorised/);
    });

    it('Torq connector can be executed with token', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A Torq action',
          connector_type_id: '.torq',
          config: {
            webhookIntegrationUrl: torqSimulatorURL,
          },
          secrets: {
            token: 'someRandomToken',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A Torq action',
        connector_type_id: '.torq',
        is_missing_secrets: false,
        config: {
          webhookIntegrationUrl: torqSimulatorURL,
        },
      });

      expect(typeof createdAction.id).to.be('string');
    });

    it('should return unsuccessfully when default Torq webhookIntegrationUrl is not present in allowedHosts', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A Torq action',
          connector_type_id: '.torq',
          config: {
            webhookIntegrationUrl: 'https://test.torq.io/v1/something',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: error configuring send to Torq action: target url "https://test.torq.io/v1/something" is not added to the Kibana config xpack.actions.allowedHosts',
          });
        });
    });

    it('should create Torq simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A Torq simulator',
          connector_type_id: '.torq',
          config: {
            webhookIntegrationUrl: torqSimulatorURL,
          },
          secrets: {
            token: 'someRandomToken',
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle executing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "test"}`,
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result).to.eql({
        status: 'ok',
        connector_id: simulatedActionId,
        data: `{"msg": "test"}`,
      });
      const events: IValidatedEvent[] = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'action',
          id: simulatedActionId,
          provider: 'actions',
          actions: new Map([
            ['execute-start', { gte: 1 }],
            ['execute', { gte: 1 }],
          ]),
        });
      });

      const executeEvent = events[1];
      expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(14);
    });

    it('should handle a 400 Torq error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "respond-with-400"}`,
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error triggering Torq workflow, invalid response/);
    });

    it('should handle a 404 Torq error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "respond-with-404"}`,
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /error triggering Torq workflow, make sure the webhook URL is valid/
      );
    });

    it('should handle a 429 Torq error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "respond-with-429"}`,
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error triggering Torq workflow, retry later/);
    });

    it('should handle a 500 Torq error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "respond-with-502"}`,
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error triggering Torq workflow, retry later/);
      expect(result.retry).to.equal(true);
    });

    it('should handle a 405 Torq error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            body: `{"msg": "respond-with-405"}`,
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error triggering Torq workflow, method is not supported/);
    });

    after(() => {
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}
