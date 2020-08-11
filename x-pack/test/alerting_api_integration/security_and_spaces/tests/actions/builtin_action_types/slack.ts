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
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('slack action', () => {
    let simulatedActionId = '';
    let slackSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      slackSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SLACK)
      );
    });

    it('should return 200 when creating a slack action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          actionTypeId: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        isPreconfigured: false,
        name: 'A slack action',
        actionTypeId: '.slack',
        config: {},
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        isPreconfigured: false,
        name: 'A slack action',
        actionTypeId: '.slack',
        config: {},
      });
    });

    it('should respond with a 400 Bad Request when creating a slack action with no webhookUrl', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          actionTypeId: '.slack',
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: [webhookUrl]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating a slack action with a non whitelisted webhookUrl', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          actionTypeId: '.slack',
          secrets: {
            webhookUrl: 'http://slack.mynonexistent.com/other/stuff/in/the/path',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: error configuring slack action: target hostname "slack.mynonexistent.com" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating a slack action with a webhookUrl with no hostname', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          actionTypeId: '.slack',
          secrets: {
            webhookUrl: 'fee-fi-fo-fum',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: error configuring slack action: unable to parse host name from webhookUrl',
          });
        });
    });

    it('should create our slack simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack simulator',
          actionTypeId: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle firing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'success',
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');
    });

    it('should handle an empty message error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: '',
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error validating action params: \[message\]: /);
    });

    it('should handle a 40x slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'invalid_payload',
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/unexpected http response from slack: /);
    });

    it('should handle a 429 slack error', async () => {
      const dateStart = new Date().getTime();
      const { body: result } = await supertest
        .post(`/api/actions/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'rate_limit',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting a slack message, retry at \d\d\d\d-/);

      const dateRetry = new Date(result.retry).getTime();
      expect(dateRetry).to.greaterThan(dateStart);
    });

    it('should handle a 500 slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'status_500',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting a slack message, retry later/);
      expect(result.retry).to.equal(true);
    });
  });
}
