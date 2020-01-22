/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions';

// node ../scripts/functional_test_runner.js --grep "Actions.servicenddd" --config=test/alerting_api_integration/security_and_spaces/config.ts

// eslint-disable-next-line import/no-default-export
export default function servicenowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const mockServiceNow = {
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
    params: {
      comments: 'hello cool service now incident',
      short_description: 'this is a cool service now incident',
    },
  };
  describe('servicenow', () => {
    let simulatedActionId = '';
    let servicenowSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    after(() => esArchiver.unload('empty_kibana'));

    it('should return 200 when creating a servicenow action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
          },
          secrets: mockServiceNow.secrets,
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        name: 'A servicenow action',
        actionTypeId: '.servicenow',
        config: {
          apiUrl: servicenowSimulatorURL,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        name: 'A servicenow action',
        actionTypeId: '.servicenow',
        config: {
          apiUrl: servicenowSimulatorURL,
        },
      });
    });

    it('should respond with a 400 Bad Request when creating a servicenow action with no webhookUrl', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating a servicenow action with a non whitelisted webhookUrl', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: 'http://servicenow.mynonexistent.com',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: error configuring servicenow action: target url "http://servicenow.mynonexistent.com" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating a servicenow action without secrets', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: [password]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should create our servicenow simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow simulator',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
          },
          secrets: mockServiceNow.secrets,
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle executing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            comments: 'success',
            short_description: 'success',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    it('should handle executing with a simulated success without comments', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            short_description: 'success',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    it('should handle failing with a simulated success without short_description', async () => {
      await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            comments: 'success',
          },
        })
        .then((resp: any) => {
          expect(resp.body).to.eql({
            actionId: simulatedActionId,
            status: 'error',
            retry: false,
            message:
              'error validating action params: [short_description]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should handle a 40x servicenow error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            comments: 'invalid_payload',
            short_description: 'invalid_payload',
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting servicenow event: unexpected status 400/);
    });

    it('should handle a 429 servicenow error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            comments: 'rate_limit',
            short_description: 'rate_limit',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.equal(
        'error posting servicenow event: http status 429, retry later'
      );
      expect(result.retry).to.equal(true);
    });

    it('should handle a 500 servicenow error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            comments: 'status_500',
            short_description: 'status_500',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.equal(
        'error posting servicenow event: http status 500, retry later'
      );
      expect(result.retry).to.equal(true);
    });
  });
}
