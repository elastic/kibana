/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function slackTest({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('create slack action', () => {
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
              'The following actionTypeConfig attributes are invalid: webhookUrl [any.required]',
          });
        });
    });
  });

  // TODO: once we have the HTTP API fire action, test that with a webhook url pointing
  // back to the Kibana server
}
