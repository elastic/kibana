/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';

import { getHttpProxyServer } from '../../../../common/lib/get_proxy_server';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function xmattersTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('xmatters action', () => {
    let simulatedActionId = '';
    let xmattersSimulatorURL: string = '';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      xmattersSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.XMATTERS)
      );
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    it('xmatters connector can be executed without username and password, with secretsUrl', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An xmatters action',
          connector_type_id: '.xmatters',
          config: {
            configUrl: null,
            usesBasic: false,
          },
          secrets: {
            secretsUrl: xmattersSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An xmatters action',
        connector_type_id: '.xmatters',
        is_missing_secrets: false,
        config: {
          configUrl: null,
          usesBasic: false,
        },
      });

      expect(typeof createdAction.id).to.be('string');
    });

    it('xmatters connector can be executed with valid username and password', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An xmatters action',
          connector_type_id: '.xmatters',
          config: {
            configUrl: xmattersSimulatorURL,
            usesBasic: true,
          },
          secrets: {
            password: 'mypassphrase',
            user: 'username',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An xmatters action',
        connector_type_id: '.xmatters',
        is_missing_secrets: false,
        config: {
          configUrl: xmattersSimulatorURL,
          usesBasic: true,
        },
      });

      expect(typeof createdAction.id).to.be('string');
    });

    it('should return unsuccessfully when default xmatters configUrl is not present in allowedHosts', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A xmatters action',
          connector_type_id: '.xmatters',
          config: {
            configUrl: 'https://events.xmatters.com/v2/enqueue',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: Error configuring xMatters action: target url "https://events.xmatters.com/v2/enqueue" is not added to the Kibana config xpack.actions.allowedHosts',
          });
        });
    });

    it('should create xmatters simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A xmatters simulator',
          connector_type_id: '.xmatters',
          config: {
            usesBasic: false,
          },
          secrets: {
            secretsUrl: xmattersSimulatorURL,
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
            alertActionGroupName: 'success',
            signalId: 'abcd-1234:abcd-1234',
            severity: 'High',
            ruleName: 'SomeRule',
            date: '',
            spaceId: '',
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result).to.eql({
        status: 'ok',
        connector_id: simulatedActionId,
        data: {
          alertActionGroupName: 'success',
          signalId: 'abcd-1234:abcd-1234',
          severity: 'High',
          ruleName: 'SomeRule',
          date: '',
          spaceId: '',
        },
      });
    });

    it('should handle a 40x xmatters error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            alertActionGroupName: 'respond-with-400',
            signalId: 'abcd-1234:abcd-1234',
            severity: 'High',
            ruleName: 'SomeRule',
            date: '',
            spaceId: '',
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/Error triggering xMatters flow: unexpected status 400/);
    });

    it('should handle a 429 xmatters error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            alertActionGroupName: 'respond-with-429',
            signalId: 'abcd-1234:abcd-1234',
            severity: 'High',
            ruleName: 'SomeRule',
            date: '',
            spaceId: '',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /Error triggering xMatters flow: http status 429, retry later/
      );
    });

    it('should handle a 500 xmatters error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            alertActionGroupName: 'respond-with-502',
            signalId: 'abcd-1234:abcd-1234',
            severity: 'High',
            ruleName: 'SomeRule',
            date: '',
            spaceId: '',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /Error triggering xMatters flow: http status 502, retry later/
      );
      expect(result.retry).to.equal(true);
    });

    after(() => {
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}
