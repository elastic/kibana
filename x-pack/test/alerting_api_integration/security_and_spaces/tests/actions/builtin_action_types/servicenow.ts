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

// node ../scripts/functional_test_runner.js --grep "servicenow" --config=test/alerting_api_integration/security_and_spaces/config.ts

const mapping = [
  {
    source: 'title',
    target: 'description',
    actionType: 'nothing',
  },
  {
    source: 'description',
    target: 'short_description',
    actionType: 'nothing',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'nothing',
  },
];

// eslint-disable-next-line import/no-default-export
export default function servicenowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const mockServiceNow = {
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
      casesConfiguration: { mapping: [...mapping] },
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
    params: {
      caseId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
      title: 'A title',
      description: 'A description',
      comments: [
        {
          commentId: '123',
          version: 'WzU3LDFd',
          comment: 'A comment',
        },
        {
          commentId: '456',
          version: 'WzU5LVFd',
          comment: 'Another comment',
        },
      ],
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
            casesConfiguration: { ...mockServiceNow.config.casesConfiguration },
          },
          secrets: { ...mockServiceNow.secrets },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        name: 'A servicenow action',
        actionTypeId: '.servicenow',
        config: {
          apiUrl: servicenowSimulatorURL,
          casesConfiguration: { ...mockServiceNow.config.casesConfiguration },
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
          casesConfiguration: { ...mockServiceNow.config.casesConfiguration },
        },
      });
    });

    it('should respond with a 400 Bad Request when creating a servicenow action with no apiUrl', async () => {
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

    it('should respond with a 400 Bad Request when creating a servicenow action with a non whitelisted apiUrl', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: 'http://servicenow.mynonexistent.com',
            casesConfiguration: { ...mockServiceNow.config.casesConfiguration },
          },
          secrets: { ...mockServiceNow.secrets },
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
            casesConfiguration: { ...mockServiceNow.config.casesConfiguration },
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

    it('should respond with a 400 Bad Request when creating a servicenow action without casesConfiguration', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
          },
          secrets: { ...mockServiceNow.secrets },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: [casesConfiguration.mapping]: expected value of type [array] but got [undefined]',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating a servicenow action with empty mapping', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
            casesConfiguration: { mapping: [] },
          },
          secrets: { ...mockServiceNow.secrets },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: [casesConfiguration.mapping]: expected non-empty but got empty',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating a servicenow action with wrong actionType', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
            casesConfiguration: {
              mapping: [
                {
                  source: 'title',
                  target: 'description',
                  actionType: 'non-supported',
                },
              ],
            },
          },
          secrets: { ...mockServiceNow.secrets },
        })
        .expect(400);
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
            casesConfiguration: { ...mockServiceNow.config.casesConfiguration },
          },
          secrets: { ...mockServiceNow.secrets },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle executing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: { caseId: 'success' },
        })
        .expect(200);

      expect(result).to.eql('ok');
    });

    it('should handle failing with a simulated success without caseId', async () => {
      await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {},
        })
        .then((resp: any) => {
          expect(resp.body).to.eql({
            actionId: simulatedActionId,
            status: 'error',
            retry: false,
            message:
              'error validating action params: [caseId]: expected value of type [string] but got [undefined]',
          });
        });
    });
  });
}
