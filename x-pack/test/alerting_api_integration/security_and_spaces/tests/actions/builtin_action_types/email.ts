/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('create email action', () => {
    after(() => esArchiver.unload('empty_kibana'));

    let createdActionId = '';

    it('should return 200 when creating an email action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
          config: {
            service: '__json',
            from: 'bob@example.com',
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
        name: 'An email action',
        actionTypeId: '.email',
        config: {
          service: '__json',
          host: null,
          port: null,
          secure: null,
          from: 'bob@example.com',
        },
      });

      expect(typeof createdActionId).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdActionId}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        name: 'An email action',
        actionTypeId: '.email',
        config: {
          from: 'bob@example.com',
          service: '__json',
          host: null,
          port: null,
          secure: null,
        },
      });
    });

    it('should return the message data when firing the __json service', async () => {
      await supertest
        .post(`/api/action/${createdActionId}/_execute`)
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
              html: '<p>email-message</p>\n',
              text: 'email-message',
              headers: {},
            },
          });
        });
    });

    it('should render html from markdown', async () => {
      await supertest
        .post(`/api/action/${createdActionId}/_execute`)
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
          expect(text).to.eql('_italic_ **bold** https://elastic.co link');
          expect(html).to.eql(
            '<p><em>italic</em> <strong>bold</strong> <a href="https://elastic.co">https://elastic.co</a> link</p>\n'
          );
        });
    });

    it('should respond with a 400 Bad Request when creating an email action with an invalid config', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
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

    it('should respond with a 400 Bad Request when creating an email action with non-whitelisted server', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
          config: {
            service: 'gmail', // not whitelisted in the config for this test
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
              "error validating action type config: [service] value 'gmail' resolves to host 'smtp.gmail.com' which is not in the whitelistedHosts configuration",
          });
        });

      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
          config: {
            host: 'stmp.gmail.com', // not whitelisted in the config for this test
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
              "error validating action type config: [host] value 'stmp.gmail.com' is not in the whitelistedHosts configuration",
          });
        });
    });

    it('should handle creating an email action with a whitelisted server', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
          config: {
            host: 'some.non.existent.com', // whitelisted in the config for this test
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
  });
}
