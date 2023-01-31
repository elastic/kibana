/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import expect from '@kbn/expect';
import { promisify } from 'util';
import httpProxy from 'http-proxy';
import { KBN_KEY_PATH } from '@kbn/dev-utils';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../../common/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function oAuthAccessTokenTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('get oauth access token', () => {
    let servicenowSimulatorURL: string = '';
    let proxyServer: httpProxy | undefined;
    let testPrivateKey: string;
    const configService = getService('config');

    // need to wait for kibanaServer to settle ...
    before(async () => {
      testPrivateKey = await promisify(fs.readFile)(KBN_KEY_PATH, 'utf8');
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {}
      );
    });

    after(() => {
      if (proxyServer) {
        proxyServer.close();
      }
    });

    it('should return 200 when requesting a JWT access token with OAuth credentials', async () => {
      const { body: accessToken } = await supertest
        .post('/internal/actions/connector/_oauth_access_token')
        .set('kbn-xsrf', 'foo')
        .send({
          type: 'jwt',
          options: {
            tokenUrl: `${servicenowSimulatorURL}/oauth_token.do`,
            config: {
              clientId: 'abc',
              userIdentifierValue: 'elastic',
              jwtKeyId: 'def',
            },
            secrets: {
              clientSecret: 'xyz',
              privateKey: testPrivateKey,
            },
          },
        })
        .expect(200);

      expect(accessToken).to.eql({ accessToken: 'Bearer tokentokentoken' });
    });

    it('should return 200 when requesting a Client Credentials access token with OAuth credentials', async () => {
      const { body: accessToken } = await supertest
        .post('/internal/actions/connector/_oauth_access_token')
        .set('kbn-xsrf', 'foo')
        .send({
          type: 'client',
          options: {
            tokenUrl: `${kibanaServer.resolveUrl(
              getExternalServiceSimulatorPath(ExternalServiceSimulator.MS_EXCHANGE)
            )}/1234567/oauth2/v2.0/token`,
            scope: 'https://graph.microsoft.com/.default',
            config: {
              clientId: 'abc',
              tenantId: '98765',
            },
            secrets: {
              clientSecret: 'xyz',
            },
          },
        })
        .expect(200);

      expect(accessToken).to.eql({ accessToken: 'Bearer asdadasd' });
    });

    it('should return 400 when given incorrect options for requesting Client Credentials access token with OAuth credentials', async () => {
      await supertest
        .post('/internal/actions/connector/_oauth_access_token')
        .set('kbn-xsrf', 'foo')
        .send({
          type: 'client',
          options: {
            tokenUrl: `${servicenowSimulatorURL}/oauth_token.do`,
            config: {
              clientId: 'abc',
              userIdentifierValue: 'elastic',
              jwtKeyId: 'def',
            },
            secrets: {
              clientSecret: 'xyz',
              privateKey: testPrivateKey,
            },
          },
        })
        .expect(400);
    });

    it('should return 400 when given incorrect options for requesting JWT access token with OAuth credentials', async () => {
      await supertest
        .post('/internal/actions/connector/_oauth_access_token')
        .set('kbn-xsrf', 'foo')
        .send({
          type: 'jwt',
          options: {
            tokenUrl: `${kibanaServer.resolveUrl(
              getExternalServiceSimulatorPath(ExternalServiceSimulator.MS_EXCHANGE)
            )}/1234567/oauth2/v2.0/token`,
            scope: 'https://graph.microsoft.com/.default',
            config: {
              clientId: 'abc',
              tenantId: '98765',
            },
            secrets: {
              clientSecret: 'xyz',
            },
          },
        })
        .expect(400);
    });

    it('should return 400 when token url not included in allowlist', async () => {
      const { body } = await supertest
        .post('/internal/actions/connector/_oauth_access_token')
        .set('kbn-xsrf', 'foo')
        .send({
          type: 'jwt',
          options: {
            tokenUrl: `https://servicenow.nonexistent.com/oauth_token.do`,
            config: {
              clientId: 'abc',
              userIdentifierValue: 'elastic',
              jwtKeyId: 'def',
            },
            secrets: {
              clientSecret: 'xyz',
              privateKey: testPrivateKey,
            },
          },
        });

      expect(body.statusCode).to.equal(400);
      expect(body.message).to.equal(
        `target url "https://servicenow.nonexistent.com/oauth_token.do" is not added to the Kibana config xpack.actions.allowedHosts`
      );
    });
  });
}
