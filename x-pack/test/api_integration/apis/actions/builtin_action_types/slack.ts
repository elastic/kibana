/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

import { SLACK_ACTION_SIMULATOR_URI } from '../../../fixtures/plugins/actions';

// eslint-disable-next-line import/no-default-export
export default function slackTest({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('slack action', () => {
    let simulatedActionId = '';
    let slackSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      const kibanaServer = getService('kibanaServer');
      const kibanaUrl = kibanaServer.status && kibanaServer.status.kibanaServerUrl;
      slackSimulatorURL = `${kibanaUrl}${SLACK_ACTION_SIMULATOR_URI}`;
    });

    after(() => esArchiver.unload('empty_kibana'));

    it('should return 200 when creating a slack action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'A slack action',
            actionTypeId: '.slack',
            actionTypeConfig: {
              webhookUrl: 'http://example.com',
            },
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        type: 'action',
        id: fetchedAction.id,
        attributes: {
          description: 'A slack action',
          actionTypeId: '.slack',
          actionTypeConfig: {},
        },
        references: [],
        updated_at: fetchedAction.updated_at,
        version: fetchedAction.version,
      });
    });

    it('should respond with a 400 Bad Request when creating a slack action with no webhookUrl', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'A slack action',
            actionTypeId: '.slack',
            actionTypeConfig: {},
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'The actionTypeConfig is invalid: [webhookUrl]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should create our slack simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'A slack simulator',
            actionTypeId: '.slack',
            actionTypeConfig: {
              webhookUrl: slackSimulatorURL,
            },
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle firing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'success',
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');
    });

    it('should handle a 40x slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'invalid_payload',
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/an error occurred posting a slack message/);
    });

    it('should handle a 429 slack error', async () => {
      const dateStart = new Date().getTime();
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'rate_limit',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/an error occurred posting a slack message/);
      expect(result.message).to.match(/retry at/);

      const dateRetry = new Date(result.retry).getTime();
      expect(dateRetry).to.greaterThan(dateStart);
    });

    it('should handle a 500 slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'status_500',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/an error occurred posting a slack message/);
      expect(result.retry).to.equal(true);
    });
  });
}
