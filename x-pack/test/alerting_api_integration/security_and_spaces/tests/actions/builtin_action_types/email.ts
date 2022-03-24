/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('create email action', () => {
    let createdActionId = '';
    let createdMSExchangeActionId = '';

    it('should return 200 when creating an email action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            service: '__json',
            from: 'bob@example.com',
            hasAuth: true,
          },
          secrets: {
            user: 'bob',
            password: 'supersecret',
          },
        })
        .expect(200);

      createdActionId = createdAction.id;
      expect(createdAction).to.eql({
        id: createdActionId,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          service: '__json',
          hasAuth: true,
          host: null,
          port: null,
          secure: null,
          clientId: null,
          oauthTokenUrl: null,
          tenantId: null,
          from: 'bob@example.com',
        },
      });

      expect(typeof createdActionId).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdActionId}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          from: 'bob@example.com',
          service: '__json',
          hasAuth: true,
          host: null,
          port: null,
          secure: null,
          clientId: null,
          oauthTokenUrl: null,
          tenantId: null,
        },
      });
    });

    it('should return the message data when firing the __json service', async () => {
      await supertest
        .post(`/api/actions/connector/${createdActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to: ['kibana-action-test@elastic.co'],
            subject: 'email-subject',
            message: 'email-message',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body.data.message.messageId).to.be.a('string');
          expect(resp.body.data.messageId).to.be.a('string');

          delete resp.body.data.message.messageId;
          delete resp.body.data.messageId;

          expect(resp.body.data).to.eql({
            envelope: {
              from: 'bob@example.com',
              to: ['kibana-action-test@elastic.co'],
            },
            message: {
              from: { address: 'bob@example.com', name: '' },
              to: [
                {
                  address: 'kibana-action-test@elastic.co',
                  name: '',
                },
              ],
              cc: null,
              bcc: null,
              subject: 'email-subject',
              html: `<p>email-message</p>\n<p>--</p>\n<p>This message was sent by Kibana. <a href=\"https://localhost:5601\">Go to Kibana</a>.</p>\n`,
              text: 'email-message\n\n--\n\nThis message was sent by Kibana. [Go to Kibana](https://localhost:5601).',
              headers: {},
            },
          });
        });
    });

    it('should render html from markdown', async () => {
      await supertest
        .post(`/api/actions/connector/${createdActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to: ['kibana-action-test@elastic.co'],
            subject: 'message with markdown',
            message: '_italic_ **bold** https://elastic.co link',
          },
        })
        .expect(200)
        .then((resp: any) => {
          const { text, html } = resp.body.data.message;
          expect(text).to.eql(
            '_italic_ **bold** https://elastic.co link\n\n--\n\nThis message was sent by Kibana. [Go to Kibana](https://localhost:5601).'
          );
          expect(html).to.eql(
            `<p><em>italic</em> <strong>bold</strong> <a href="https://elastic.co">https://elastic.co</a> link</p>\n<p>--</p>\n<p>This message was sent by Kibana. <a href=\"https://localhost:5601\">Go to Kibana</a>.</p>\n`
          );
        });
    });

    it('should allow customizing the kibana footer link', async () => {
      await supertest
        .post(`/api/actions/connector/${createdActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to: ['kibana-action-test@elastic.co'],
            subject: 'message with markdown',
            message: 'message',
            kibanaFooterLink: {
              path: '/my/path',
              text: 'View my path in Kibana',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          const { text, html } = resp.body.data.message;
          expect(text).to.eql(
            'message\n\n--\n\nThis message was sent by Kibana. [View my path in Kibana](https://localhost:5601/my/path).'
          );
          expect(html).to.eql(
            `<p>message</p>\n<p>--</p>\n<p>This message was sent by Kibana. <a href=\"https://localhost:5601/my/path\">View my path in Kibana</a>.</p>\n`
          );
        });
    });

    it('should respond with a 400 Bad Request when creating an email action with an invalid config', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: [from]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should respond with a 400 Bad Request when creating an email action with a server not added to allowedHosts', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            service: 'gmail', // not added to allowedHosts in the config for this test
            from: 'bob@example.com',
          },
          secrets: {
            user: 'bob',
            password: 'changeme',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              "error validating action type config: [service] value 'gmail' resolves to host 'smtp.gmail.com' which is not in the allowedHosts configuration",
          });
        });

      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            host: 'stmp.gmail.com', // not added to allowedHosts in the config for this test
            port: 666,
            from: 'bob@example.com',
          },
          secrets: {
            user: 'bob',
            password: 'changeme',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              "error validating action type config: [host] value 'stmp.gmail.com' is not in the allowedHosts configuration",
          });
        });
    });

    it('should handle creating an email action with a server added to allowedHosts', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            host: 'some.non.existent.com', // added to allowedHosts in the config for this test
            port: 666,
            from: 'bob@example.com',
          },
          secrets: {
            user: 'bob',
            password: 'changeme',
          },
        })
        .expect(200);
      expect(typeof createdAction.id).to.be('string');
    });

    it('should handle an email action with no auth', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action with no auth',
          connector_type_id: '.email',
          config: {
            service: '__json',
            from: 'jim@example.com',
            hasAuth: false,
          },
        })
        .expect(200);

      await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to: ['kibana-action-test@elastic.co'],
            subject: 'email-subject',
            message: 'email-message',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body.data.message.messageId).to.be.a('string');
          expect(resp.body.data.messageId).to.be.a('string');

          delete resp.body.data.message.messageId;
          delete resp.body.data.messageId;

          expect(resp.body.data).to.eql({
            envelope: {
              from: 'jim@example.com',
              to: ['kibana-action-test@elastic.co'],
            },
            message: {
              from: { address: 'jim@example.com', name: '' },
              to: [
                {
                  address: 'kibana-action-test@elastic.co',
                  name: '',
                },
              ],
              cc: null,
              bcc: null,
              subject: 'email-subject',
              html: `<p>email-message</p>\n<p>--</p>\n<p>This message was sent by Kibana. <a href=\"https://localhost:5601\">Go to Kibana</a>.</p>\n`,
              text: 'email-message\n\n--\n\nThis message was sent by Kibana. [Go to Kibana](https://localhost:5601).',
              headers: {},
            },
          });
        });
    });

    it('should return 200 when creating an email action without defining service', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            from: 'bob@example.com',
            host: 'some.non.existent.com',
            port: 25,
            hasAuth: true,
          },
          secrets: {
            user: 'bob',
            password: 'supersecret',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          service: 'other',
          hasAuth: true,
          host: 'some.non.existent.com',
          port: 25,
          secure: null,
          from: 'bob@example.com',
          clientId: null,
          oauthTokenUrl: null,
          tenantId: null,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          from: 'bob@example.com',
          service: 'other',
          hasAuth: true,
          host: 'some.non.existent.com',
          port: 25,
          secure: null,
          clientId: null,
          oauthTokenUrl: null,
          tenantId: null,
        },
      });
    });

    it('should return 200 when creating an email action with nodemailer well-defined service', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            from: 'bob@example.com',
            service: 'hotmail',
            hasAuth: true,
          },
          secrets: {
            user: 'bob',
            password: 'supersecret',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          service: 'hotmail',
          hasAuth: true,
          host: null,
          port: null,
          secure: null,
          from: 'bob@example.com',
          clientId: null,
          oauthTokenUrl: null,
          tenantId: null,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          from: 'bob@example.com',
          service: 'hotmail',
          hasAuth: true,
          host: null,
          port: null,
          secure: null,
          clientId: null,
          oauthTokenUrl: null,
          tenantId: null,
        },
      });
    });

    it('should return 200 when creating an email connector for MS Exchange successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
          config: {
            service: 'exchange_server',
            from: 'bob@example.com',
            hasAuth: true,
            clientId: '12345',
            tenantId: '1234567',
            oauthTokenUrl: `${kibanaServer.resolveUrl(
              getExternalServiceSimulatorPath(ExternalServiceSimulator.MS_EXCHANGE)
            )}/1234567/oauth2/v2.0/token`,
          },
          secrets: {
            clientSecret: 'test-secret',
          },
        })
        .expect(200);

      createdMSExchangeActionId = createdAction.id;
      expect(createdAction).to.eql({
        id: createdMSExchangeActionId,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          service: 'exchange_server',
          hasAuth: true,
          clientId: '12345',
          tenantId: '1234567',
          host: null,
          port: null,
          secure: null,
          oauthTokenUrl: `${kibanaServer.resolveUrl(
            getExternalServiceSimulatorPath(ExternalServiceSimulator.MS_EXCHANGE)
          )}/1234567/oauth2/v2.0/token`,
          from: 'bob@example.com',
        },
      });

      expect(typeof createdMSExchangeActionId).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdMSExchangeActionId}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        name: 'An email action',
        connector_type_id: '.email',
        is_missing_secrets: false,
        config: {
          from: 'bob@example.com',
          service: 'exchange_server',
          hasAuth: true,
          host: null,
          port: null,
          secure: null,
          oauthTokenUrl: `${kibanaServer.resolveUrl(
            getExternalServiceSimulatorPath(ExternalServiceSimulator.MS_EXCHANGE)
          )}/1234567/oauth2/v2.0/token`,
          clientId: '12345',
          tenantId: '1234567',
        },
      });
    });

    it('should return 200 when executing email action with MS Exchange Graph API', async () => {
      await supertest
        .post(`/api/actions/connector/${createdMSExchangeActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to: ['kibana-action-test@elastic.co'],
            subject: 'email-subject',
            message: 'email-message',
          },
        })
        .expect(200);
    });
  });
}
